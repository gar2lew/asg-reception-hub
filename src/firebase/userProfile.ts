import { Timestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirestoreDb } from './config';

export type AccountKey = 'brisbane-reception' | 'perth-reception' | 'administrator';
export type UserRole = 'reception' | 'administrator';
export type Office = 'brisbane' | 'perth' | 'all';

export interface UserProfile {
  uid: string;
  accountKey: AccountKey;
  displayName: string;
  role: UserRole;
  office: Office;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION = 'userProfiles';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function createUserProfile(uid: string, profile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = getFirestoreDb();
  const now = Timestamp.now();
  await setDoc(doc(db, COLLECTION, uid), {
    ...profile,
    uid,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateUserProfile(uid: string, updates: Partial<Pick<UserProfile, 'displayName' | 'active'>>): Promise<void> {
  const db = getFirestoreDb();
  await updateDoc(doc(db, COLLECTION, uid), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export const ACCOUNT_PROFILES: Record<string, { accountKey: AccountKey; displayName: string; role: UserRole; office: Office }> = {
  'brisbane-reception': { accountKey: 'brisbane-reception', displayName: 'Brisbane Reception', role: 'reception', office: 'brisbane' },
  'perth-reception': { accountKey: 'perth-reception', displayName: 'Perth Reception', role: 'reception', office: 'perth' },
  'administrator': { accountKey: 'administrator', displayName: 'Administrator', role: 'administrator', office: 'all' },
};
