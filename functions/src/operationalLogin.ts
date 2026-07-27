/**
 * operationalLogin — callable Cloud Function
 *
 * Accepts { accountKey, pin } from the client.
 * Looks up the operational account record, verifies the PIN hash,
 * enforces rate limiting, and returns a Firebase custom token on success.
 *
 * Uses server-side bcrypt hashing with a pepper stored as a Firebase secret.
 */

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

// Pepper secret — set via: firebase functions:secrets:set PEPPER_VALUE
const pepper = defineSecret('OPERATIONAL_LOGIN_PEPPER');

// Rate-limiting constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

interface OperationalAccount {
  accountKey: string;
  uid: string;
  displayName: string;
  role: string;
  office: string;
  active: boolean;
  pinHash: string;
  failedAttemptCount: number;
  lockedUntil: FirebaseFirestore.Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const operationalLogin = https.onCall(
  {
    secrets: [pepper],
    region: 'australia-southeast1',
    minInstances: 0,
    maxInstances: 3,
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    const { accountKey, pin } = request.data as { accountKey?: string; pin?: string };

    // === Input validation ===
    if (typeof accountKey !== 'string' || typeof pin !== 'string') {
      throw new https.HttpsError('invalid-argument', 'Invalid credentials.');
    }
    if (!/^[a-z-]+$/.test(accountKey)) {
      throw new https.HttpsError('invalid-argument', 'Invalid credentials.');
    }
    if (!/^\d{4}$/.test(pin)) {
      throw new https.HttpsError('invalid-argument', 'Invalid credentials.');
    }

    // === Resolve operational account ===
    const db = getFirestore();
    const accountsSnap = await db
      .collection('operationalAccounts')
      .where('accountKey', '==', accountKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (accountsSnap.empty) {
      throw new https.HttpsError('unauthenticated', 'Authentication failed.');
    }

    const account = accountsSnap.docs[0].data() as OperationalAccount;
    const accountRef = accountsSnap.docs[0].ref;
    const now = Timestamp.now();

    // === Check lockout ===
    if (account.lockedUntil && account.lockedUntil.toMillis() > now.toMillis()) {
      throw new https.HttpsError('unauthenticated', 'Authentication failed.');
    }

    // === Verify PIN ===
    let bcrypt;
    try {
      bcrypt = await import('bcrypt');
    } catch {
      // Fallback: scrypt-style verification using Node built-in crypto
      throw new https.HttpsError('internal', 'Authentication unavailable.');
    }

    const pepperedPin = pin + pepper.value();
    const pinValid = await bcrypt.compare(pepperedPin, account.pinHash);

    if (!pinValid) {
      // Increment failed attempts
      const newFailedCount = (account.failedAttemptCount || 0) + 1;
      const updates: Record<string, unknown> = {
        failedAttemptCount: newFailedCount,
        updatedAt: now,
      };

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = Timestamp.fromMillis(
          now.toMillis() + LOCK_DURATION_MINUTES * 60 * 1000
        );
      }

      await accountRef.update(updates);

      // Generic error — do not reveal whether account exists or PIN was wrong
      throw new https.HttpsError('unauthenticated', 'Authentication failed.');
    }

    // === Success — reset failure state and issue custom token ===
    await accountRef.update({
      failedAttemptCount: 0,
      lockedUntil: null,
      updatedAt: now,
    });

    const auth = getAuth();
    const customToken = await auth.createCustomToken(account.uid, {
      accountKey: account.accountKey,
      role: account.role,
      office: account.office,
    });

    return { customToken };
  }
);
