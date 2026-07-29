import { StaffRepository } from '../repositories/localStorage/StaffRepository';
import { SessionRepository } from '../repositories/localStorage/SessionRepository';
import { verifyPinSimple } from '../utils/hash';
import { clearAll as clearAllStorage } from '../utils/storage';
import type { Session, Staff } from '../models';
const staffRepo = new StaffRepository();
const sessionRepo = new SessionRepository();
export function login(name: string, pin: string): { success: boolean; error?: string; session?: Session } {
  const staff = staffRepo.getByName(name.trim());
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
export function logout(): void {
  sessionRepo.clear();
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


