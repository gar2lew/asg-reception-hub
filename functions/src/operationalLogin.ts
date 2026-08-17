/**
 * operationalLogin — callable Cloud Function
 *
 * Accepts { accountKey, pin } from the client.
 * Looks up the operational account record, verifies the PIN hash,
 * enforces rate limiting, and returns a Firebase custom token on success.
 *
 * Uses server-side bcrypt hashing with a pepper stored as a Firebase secret.
 */

import { adminAuth, adminDb } from './admin.js';
import { Timestamp } from 'firebase-admin/firestore';
import * as https from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Pepper secret — set via: firebase functions:secrets:set PEPPER_VALUE
const pepper = defineSecret('OPERATIONAL_LOGIN_PEPPER');

// Rate-limiting constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const RECEPTION_OFFICES = new Set(['brisbane', 'perth']);

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

function validateTokenClaims(account: OperationalAccount) {
  const validAdministrator = account.role === 'administrator' && account.office === 'all';
  const validReception = account.role === 'reception' && RECEPTION_OFFICES.has(account.office);
  if (!validAdministrator && !validReception) {
    throw new https.HttpsError('failed-precondition', 'Operational account claims are invalid.');
  }
}

function sameVerifiedIdentity(verified: OperationalAccount, current: OperationalAccount) {
  const verifiedLockedUntil = verified.lockedUntil?.toMillis() ?? null;
  const currentLockedUntil = current.lockedUntil?.toMillis() ?? null;
  return verified.uid === current.uid
    && verified.accountKey === current.accountKey
    && verified.pinHash === current.pinHash
    && verified.role === current.role
    && verified.office === current.office
    && verified.active === current.active
    && verifiedLockedUntil === currentLockedUntil;
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
    if (!request.data || typeof request.data !== 'object' || Array.isArray(request.data)) {
      throw new https.HttpsError('invalid-argument', 'Invalid credentials.');
    }
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
    const db = adminDb;
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

    const pepperValue = pepper.value().trim();
    if (!pepperValue) {
      throw new https.HttpsError('internal', 'Authentication unavailable.');
    }
    const pepperedPin = pin + pepperValue;
    const pinValid = await bcrypt.compare(pepperedPin, account.pinHash);

    if (!pinValid) {
      await db.runTransaction(async (tx) => {
        const currentSnap = await tx.get(accountRef);
        if (!currentSnap.exists) return;
        const current = currentSnap.data() as OperationalAccount;
        if (current.lockedUntil && current.lockedUntil.toMillis() > now.toMillis()) return;

        const newFailedCount = (current.failedAttemptCount || 0) + 1;
        const updates: Record<string, unknown> = { failedAttemptCount: newFailedCount, updatedAt: now };
        if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
          updates.lockedUntil = Timestamp.fromMillis(now.toMillis() + LOCK_DURATION_MINUTES * 60 * 1000);
        }
        tx.update(accountRef, updates);
      });

      // Generic error — do not reveal whether account exists or PIN was wrong
      throw new https.HttpsError('unauthenticated', 'Authentication failed.');
    }

    // === Success — reset failure state and issue custom token ===
    const currentAccount = await db.runTransaction(async (tx) => {
      const currentSnap = await tx.get(accountRef);
      if (!currentSnap.exists) throw new https.HttpsError('unauthenticated', 'Authentication failed.');
      const current = currentSnap.data() as OperationalAccount;
      if (!current.active || (current.lockedUntil && current.lockedUntil.toMillis() > now.toMillis())) {
        throw new https.HttpsError('unauthenticated', 'Authentication failed.');
      }
      if (!sameVerifiedIdentity(account, current)) {
        throw new https.HttpsError('unauthenticated', 'Authentication failed.');
      }
      validateTokenClaims(current);
      tx.update(accountRef, { failedAttemptCount: 0, lockedUntil: null, updatedAt: now });
      return current;
    });

    const auth = adminAuth;
    const customToken = await auth.createCustomToken(currentAccount.uid, {
      accountKey: currentAccount.accountKey,
      role: currentAccount.role,
      office: currentAccount.office,
    });

    return { customToken };
  }
);
