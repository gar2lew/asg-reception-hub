import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let _auth: Auth | null = null;
let _db: Firestore | null = null;

function getOrCreateApp(): App {
  const apps = getApps();
  return apps.length > 0 ? apps[0] : initializeApp();
}

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getOrCreateApp());
    const value = (_auth as any)[prop];
    return typeof value === 'function' ? value.bind(_auth) : value;
  },
});

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore(getOrCreateApp());
    const value = (_db as any)[prop];
    return typeof value === 'function' ? value.bind(_db) : value;
  },
});
