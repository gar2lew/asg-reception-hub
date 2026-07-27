/**
 * Firebase Authentication adapter.
 *
 * Maps the four-digit PIN interface to Firebase custom-token authentication.
 * The client sends { accountKey, pin } to the `operationalLogin` Cloud Function.
 * On success, the function returns a custom token which is used with signInWithCustomToken.
 *
 * No PINs, derived passwords, or credential material exist in client-side code.
 */

import {
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

export type AccountKey = 'brisbane-reception' | 'perth-reception' | 'administrator';

export const ACCOUNT_MAP: Record<string, { key: AccountKey; email: string }> = {
  'Brisbane Reception': { key: 'brisbane-reception', email: '' },
  'Perth Reception': { key: 'perth-reception', email: '' },
  Administrator: { key: 'administrator', email: '' },
};

/**
 * Sign in using display name and PIN via the operationalLogin Cloud Function.
 * Sends { accountKey, pin } to the server. The function returns a custom token.
 * The PIN field is cleared immediately after the call.
 */
export async function signInWithPin(displayName: string, pin: string): Promise<User> {
  const entry = ACCOUNT_MAP[displayName];
  if (!entry) throw new Error(`Unknown account: ${displayName}`);

  // Import Firebase Functions dynamically to avoid bundling issues in local mode
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const auth = getFirebaseAuth();
  const functions = getFunctions(auth.app, 'australia-southeast1');
  const operationalLogin = httpsCallable<{ accountKey: string; pin: string }, { customToken: string }>(
    functions,
    'operationalLogin'
  );

  const result = await operationalLogin({ accountKey: entry.key, pin });
  const { customToken } = result.data;

  const cred = await signInWithCustomToken(auth, customToken);
  return cred.user;
}

/** Sign out the current Firebase user. */
export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  sessionStorage.removeItem('asg_reception_session');
  await firebaseSignOut(auth);
}

/** Subscribe to Firebase auth state changes. Returns unsubscribe function. */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}
