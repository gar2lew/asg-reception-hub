import { StaffRepository } from '../repositories/localStorage/StaffRepository';
import { SessionRepository } from '../repositories/localStorage/SessionRepository';
import { verifyPinSimple } from '../utils/hash';
import { clearAll as clearAllStorage } from '../utils/storage';
import { getProvider } from '../firebase/config';
import { signInWithPin, signOutFirebase } from '../firebase/authAdapter';
import type { Session, Staff } from '../models';
const staffRepo = new StaffRepository();
const sessionRepo = new SessionRepository();

type LoginResult = { success: boolean; error?: string; session?: Session };

export async function login(name: string, pin: string): Promise<LoginResult> {
  const requestedName = name.trim();
  if (getProvider() === 'firebase') {
    try {
      const user = await signInWithPin(requestedName, pin);
      const token = await user.getIdTokenResult(true);
      const roleClaim = token.claims.role;
      const role = roleClaim === 'administrator' ? 'admin' : roleClaim === 'reception' ? 'reception' : null;
      const office = token.claims.office;

      if (!role || typeof office !== 'string' || !office) throw new Error('Invalid authentication claims.');

      const session: Session = {
        staffId: user.uid,
        name: user.displayName || requestedName,
        role,
        location: office,
        loginAt: new Date().toISOString(),
      };
      sessionRepo.set(session);
      return { success: true, session };
    } catch {
      return { success: false, error: 'Login failed.' };
    }
  }

  const staff = staffRepo.getByName(requestedName);
  if (!staff) return { success: false, error: 'Staff member not found.' };
  if (!staff.active) return { success: false, error: 'This account is not active.' };
  if (!verifyPinSimple(pin, staff.pinHash)) return { success: false, error: 'Incorrect PIN.' };
  const session: Session = {
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
    location: staff.location,
    loginAt: new Date().toISOString(),
  };
  sessionRepo.set(session);
  return { success: true, session };
}
export async function logout(): Promise<void> {
  try {
    if (getProvider() === 'firebase') await signOutFirebase();
  } finally {
    sessionRepo.clear();
  }
}
export function getSession(): Session | null {
  return sessionRepo.get();
}
export function isAuthenticated(): boolean {
  return sessionRepo.get() !== null;
}
export function isAdmin(): boolean {
  const s = sessionRepo.get();
  return s !== null && s.role === 'admin';
}
export function getCurrentStaff(): Staff | undefined {
  const s = sessionRepo.get();
  if (!s) return undefined;
  return staffRepo.getById(s.staffId);
}
export function resetAllData(): void {
  clearAllStorage();
}


