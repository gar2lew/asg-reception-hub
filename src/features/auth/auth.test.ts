import { describe, it, expect, beforeEach } from 'vitest';
import { StaffRepository } from '../../repositories/localStorage/StaffRepository';
import { login, logout, getSession, isAuthenticated, isAdmin } from '../../services/authService';
import { simpleHash } from '../../utils/hash';
beforeEach(() => {
  localStorage.clear();
  const repo = new StaffRepository();
  repo.seed([
    { id: 'admin-1', name: 'Admin User', pinHash: simpleHash('1234'), role: 'admin', active: true, createdAt: '', updatedAt: '' },
    { id: 'rec-1', name: 'Reception User', pinHash: simpleHash('5678'), role: 'receptionist', active: true, createdAt: '', updatedAt: '' },
    { id: 'inactive-1', name: 'Inactive User', pinHash: simpleHash('0000'), role: 'receptionist', active: false, createdAt: '', updatedAt: '' },
  ]);
});
describe('Auth', () => {
  it('should login with correct name and PIN', () => {
    const result = login('Admin User', '1234');
    expect(result.success).toBe(true);
    expect(result.session?.role).toBe('admin');
  });
  it('should fail with incorrect PIN', () => {
    const result = login('Admin User', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Incorrect PIN.');
  });
  it('should fail for non-existent staff', () => {
    const result = login('Unknown', '1234');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Staff member not found.');
  });
  it('should fail for inactive accounts', () => {
    const result = login('Inactive User', '0000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('This account is not active.');
  });
  it('should persist session after login', () => {
    login('Admin User', '1234');
    expect(isAuthenticated()).toBe(true);
    expect(getSession()?.name).toBe('Admin User');
  });
  it('should clear session on logout', () => {
    login('Admin User', '1234');
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getSession()).toBeNull();
  });
  it('should detect admin role', () => {
    login('Admin User', '1234');
    expect(isAdmin()).toBe(true);
  });
  it('should detect non-admin role', () => {
    login('Reception User', '5678');
    expect(isAdmin()).toBe(false);
  });
});
describe('Role Protection', () => {
  it('should protect admin routes from receptionist', () => {
    login('Reception User', '5678');
    expect(isAdmin()).toBe(false);
  });
});
describe('Session Restoration', () => {
  it('should restore session from storage on reload', () => {
    login('Admin User', '1234');
    const session1 = getSession();
    const session2 = getSession();
    expect(session2).not.toBeNull();
    expect(session2?.staffId).toBe(session1?.staffId);
  });
});
