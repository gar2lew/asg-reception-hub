/**
 * Firebase configuration for ASG Reception Hub.
 * Lazy initialisation — Firebase is only loaded when provider is "firebase".
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export function shouldUseFirebase(): boolean {
  return import.meta.env.VITE_DATA_PROVIDER === 'firebase';
}

export function requireFirebaseConfig(): void {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase configuration is missing. Create a .env.local file with VITE_FIREBASE_* variables.'
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  requireFirebaseConfig();
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.measurementId) return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getAnalytics(getFirebaseApp());
  } catch {
    return null;
  }
}

export function getProvider(): 'local' | 'firebase' {
  const provider = import.meta.env.VITE_DATA_PROVIDER;
  if (provider === 'firebase') return 'firebase';
  return 'local';
}

export function clearFirebaseInstances(): void {
  const existing = getApps();
  for (const app of existing) {
    import('firebase/app').then(m => m.deleteApp(app)).catch(() => {});
  }
}
