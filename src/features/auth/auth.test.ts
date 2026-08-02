import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StaffRepository } from '../../repositories/localStorage/StaffRepository';
import { login, logout, getSession, isAuthenticated, isAdmin } from '../../services/authService.ts';
import { simpleHash } from '../../utils/hash';

const { getProvider, signInWithPin, signOutFirebase } = vi.hoisted(() => ({
  getProvider: vi.fn<() => 'local' | 'firebase'>(),
  signInWithPin: vi.fn(),
  signOutFirebase: vi.fn(),
}));

vi.mock('../../firebase/config', () => ({ getProvider }));
vi.mock('../../firebase/authAdapter', () => ({ signInWithPin, signOutFirebase }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  getProvider.mockReturnValue('local');
  const repo = new StaffRepository();
  repo.seed([
    { id: 'admin-1', name: 'Admin User', pinHash: simpleHash('1234'), role: 'admin', active: true, createdAt: '', updatedAt: '' },
    { id: 'rec-1', name: 'Reception User', pinHash: simpleHash('5678'), role: 'receptionist', active: true, createdAt: '', updatedAt: '' },
    { id: 'inactive-1', name: 'Inactive User', pinHash: simpleHash('0000'), role: 'receptionist', active: false, createdAt: '', updatedAt: '' },
  ]);
});
describe('Auth', () => {
  it('should login with correct name and PIN', async () => {
    const result = await login('Admin User', '1234');
    expect(result.success).toBe(true);
    expect(result.session?.role).toBe('admin');
  });
  it('should fail with incorrect PIN', async () => {
    const result = await login('Admin User', 'wrong');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Incorrect PIN.');
  });
  it('should fail for non-existent staff', async () => {
    const result = await login('Unknown', '1234');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Staff member not found.');
  });
  it('should fail for inactive accounts', async () => {
    const result = await login('Inactive User', '0000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('This account is not active.');
  });
  it('should persist session after login', async () => {
    await login('Admin User', '1234');
    expect(isAuthenticated()).toBe(true);
    expect(getSession()?.name).toBe('Admin User');
  });
  it('should clear session on logout', async () => {
    await login('Admin User', '1234');
    await logout();
    expect(isAuthenticated()).toBe(false);
    expect(getSession()).toBeNull();
  });
  it('should detect admin role', async () => {
    await login('Admin User', '1234');
    expect(isAdmin()).toBe(true);
  });
  it('should detect non-admin role', async () => {
    await login('Reception User', '5678');
    expect(isAdmin()).toBe(false);
  });
});
describe('Role Protection', () => {
  it('should protect admin routes from receptionist', async () => {
    await login('Reception User', '5678');
    expect(isAdmin()).toBe(false);
  });
});
describe('Session Restoration', () => {
  it('should restore session from storage on reload', async () => {
    await login('Admin User', '1234');
    const session1 = getSession();
    const session2 = getSession();
    expect(session2).not.toBeNull();
    expect(session2?.staffId).toBe(session1?.staffId);
  });
});

describe('Firebase authentication', () => {
  it('maps the administrator claim to the UI admin role', async () => {
    getProvider.mockReturnValue('firebase');
    signInWithPin.mockResolvedValue({
      uid: 'admin-user',
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { accountKey: 'administrator', role: 'administrator', office: 'all' },
      }),
    });

    const result = await login('Administrator', '1234');

    expect(result.session).toMatchObject({
      staffId: 'admin-user',
      name: 'Administrator',
      role: 'admin',
      location: 'all',
    });
  });

  it('persists a reception session mapped from verified token claims', async () => {
    getProvider.mockReturnValue('firebase');
    signInWithPin.mockResolvedValue({
      uid: 'perth-user',
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { accountKey: 'perth-reception', role: 'reception', office: 'perth' },
      }),
    });

    const result = await login('Perth Reception', '1234');

    expect(result.success).toBe(true);
    expect(result.session).toMatchObject({
      staffId: 'perth-user',
      name: 'Perth Reception',
      role: 'reception',
      location: 'perth',
    });
    expect(getSession()).toMatchObject({ staffId: 'perth-user', role: 'reception', location: 'perth' });
  });

  it('does not persist a session when verified token claims cannot be read', async () => {
    getProvider.mockReturnValue('firebase');
    signInWithPin.mockResolvedValue({
      uid: 'admin-user',
      getIdTokenResult: vi.fn().mockRejectedValue(new Error('claims unavailable')),
    });

    const result = await login('Administrator', '1234');

    expect(result).toEqual({ success: false, error: 'Login failed.' });
    expect(getSession()).toBeNull();
  });

  it('signs out of Firebase and clears the UI session', async () => {
    getProvider.mockReturnValue('firebase');
    localStorage.setItem('session', JSON.stringify({
      staffId: 'admin-user', name: 'Administrator', role: 'admin', loginAt: '2026-08-02T00:00:00.000Z',
    }));

    await logout();

    expect(getSession()).toBeNull();
    expect(signOutFirebase).toHaveBeenCalledOnce();
  });
});
