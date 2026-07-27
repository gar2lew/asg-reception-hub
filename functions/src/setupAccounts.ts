/**
 * setupOperationalAccounts — callable Cloud Function (admin only, one-time use)
 *
 * Creates the three initial operational accounts in Firestore.
 * Reads PINs from environment variables (set via `firebase functions:secrets:set`)
 * to avoid committing credential material.
 *
 * After successful execution, this function should be disabled or removed.
 */

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

const pepper = defineSecret('OPERATIONAL_LOGIN_PEPPER');

const ACCOUNTS_CONFIG = [
  {
    accountKey: 'brisbane-reception',
    displayName: 'Brisbane Reception',
    role: 'reception',
    office: 'brisbane',
    email: 'brisbane.reception@receptionhub.internal',
    pinEnvVar: 'PIN_BRISBANE',
  },
  {
    accountKey: 'perth-reception',
    displayName: 'Perth Reception',
    role: 'reception',
    office: 'perth',
    email: 'perth.reception@receptionhub.internal',
    pinEnvVar: 'PIN_PERTH',
  },
  {
    accountKey: 'administrator',
    displayName: 'Administrator',
    role: 'administrator',
    office: 'all',
    email: 'administrator@receptionhub.internal',
    pinEnvVar: 'PIN_ADMIN',
  },
];

export const setupOperationalAccounts = https.onCall(
  {
    secrets: [pepper],
    region: 'australia-southeast1',
  },
  async (request) => {
    // Verify the caller is authenticated and has admin role
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Authentication required.');
    }

    // Verify admin claims
    const callerUid = request.auth.uid;
    const auth = getAuth();
    const caller = await auth.getUser(callerUid);
    const customClaims = caller.customClaims || {};

    if (customClaims.role !== 'administrator') {
      throw new https.HttpsError('permission-denied', 'Administrator access required.');
    }

    const db = getFirestore();
    const results: Array<{ accountKey: string; status: string; uid?: string }> = [];

    for (const cfg of ACCOUNTS_CONFIG) {
      // Check if already exists — idempotent
      const existing = await db
        .collection('operationalAccounts')
        .where('accountKey', '==', cfg.accountKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        results.push({ accountKey: cfg.accountKey, status: 'already exists' });
        continue;
      }

      // Read PIN from environment variable
      const pinValue = process.env[cfg.pinEnvVar];
      if (!pinValue || !/^\d{4}$/.test(pinValue)) {
        results.push({ accountKey: cfg.accountKey, status: 'skipped: PIN not configured' });
        continue;
      }

      // Create Firebase Auth user
      let uid: string;
      try {
        const userRecord = await auth.createUser({
          email: cfg.email,
          emailVerified: false,
          disabled: false,
          displayName: cfg.displayName,
        });
        uid = userRecord.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          // Look up existing UID
          const existingUser = await auth.getUserByEmail(cfg.email);
          uid = existingUser.uid;
        } else {
          results.push({ accountKey: cfg.accountKey, status: `error: ${err.message}` });
          continue;
        }
      }

      // Set custom claims
      await auth.setCustomUserClaims(uid, {
        accountKey: cfg.accountKey,
        role: cfg.role,
        office: cfg.office,
      });

      // Hash the PIN with bcrypt and pepper
      let bcrypt;
      try {
        bcrypt = await import('bcrypt');
      } catch {
        results.push({ accountKey: cfg.accountKey, status: 'error: bcrypt not available' });
        continue;
      }

      const pepperedPin = pinValue + pepper.value();
      const pinHash = await bcrypt.hash(pepperedPin, 12);

      // Create Firestore operational account document
      const now = Timestamp.now();
      await db.collection('operationalAccounts').doc(uid).set({
        accountKey: cfg.accountKey,
        uid,
        displayName: cfg.displayName,
        role: cfg.role,
        office: cfg.office,
        active: true,
        pinHash,
        failedAttemptCount: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      });

      // Create user profile document
      await db.collection('userProfiles').doc(uid).set({
        uid,
        accountKey: cfg.accountKey,
        displayName: cfg.displayName,
        role: cfg.role,
        office: cfg.office,
        active: true,
        createdAt: now,
        updatedAt: now,
      });

      results.push({ accountKey: cfg.accountKey, status: 'created', uid });
    }

    return { results };
  }
);
