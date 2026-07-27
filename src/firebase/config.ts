/**
 * Firebase configuration for ASG Reception Hub.
 *
 * To complete the Firebase setup:
 *   1. Go to https://console.firebase.google.com/
 *   2. Create or select your Firebase project
 *   3. Register a Web App and copy the SDK config snippet
 *   4. Create a .env file in the project root with these values
 *
 * Environment variables (create .env file):
 *   VITE_FIREBASE_API_KEY=your-api-key
 *   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 *   VITE_FIREBASE_PROJECT_ID=your-project-id
 *   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
 *   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
