import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StaffRepository } from '../localStorage/StaffRepository';
import { runSeed } from './index';

const mocks = vi.hoisted(() => ({
  getProvider: vi.fn<() => 'local' | 'firebase'>(),
  getFirebaseAuth: vi.fn(),
  getAll: vi.fn(),
  seed: vi.fn(),
}));

vi.mock('../../firebase/config', () => ({
  getProvider: mocks.getProvider,
  getFirebaseAuth: mocks.getFirebaseAuth,
}));

vi.mock('../firebase/FirebaseTaskDefinitionRepository', () => ({
  FirebaseTaskDefinitionRepository: class {
    getAll = mocks.getAll;
    seed = mocks.seed;
  },
}));

function authWithRole(role: string | null) {
  return {
    currentUser: role === null
      ? null
      : { getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role } }) },
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('runSeed Firebase role gating', () => {
  it('skips the Firebase seed when no user is signed in at startup', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockReturnValue(authWithRole(null));

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.seed).not.toHaveBeenCalled();
    expect(mocks.getAll).not.toHaveBeenCalled();
  });

  it('skips the Firebase seed for a signed-in reception user', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockReturnValue(authWithRole('reception'));

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.seed).not.toHaveBeenCalled();
    expect(mocks.getAll).not.toHaveBeenCalled();
  });

  it('does not write when an administrator signs in but data already exists', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockReturnValue(authWithRole('administrator'));
    mocks.getAll.mockResolvedValue([{ id: 'task-1' }]);

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.getAll).toHaveBeenCalledOnce();
    expect(mocks.seed).not.toHaveBeenCalled();
  });

  it('seeds task definitions for a signed-in administrator with no existing data', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockReturnValue(authWithRole('administrator'));
    mocks.getAll.mockResolvedValue([]);

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.getAll).toHaveBeenCalledOnce();
    expect(mocks.seed).toHaveBeenCalledOnce();
  });

  it('swallows permission-denied read failures without crashing startup', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockReturnValue(authWithRole('administrator'));
    mocks.getAll.mockRejectedValue({ code: 'permission-denied', message: 'denied' });

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.seed).not.toHaveBeenCalled();
  });

  it('handles an unavailable Firebase auth without crashing startup', async () => {
    mocks.getProvider.mockReturnValue('firebase');
    mocks.getFirebaseAuth.mockImplementation(() => {
      throw new Error('Firebase configuration is missing.');
    });

    await expect(runSeed()).resolves.toBeUndefined();

    expect(mocks.seed).not.toHaveBeenCalled();
  });
});

describe('runSeed local mode', () => {
  it('seeds staff locally and never touches Firebase auth', async () => {
    mocks.getProvider.mockReturnValue('local');

    await runSeed();

    expect(mocks.getFirebaseAuth).not.toHaveBeenCalled();
    expect(mocks.seed).not.toHaveBeenCalled();
    expect(new StaffRepository().getAll().length).toBeGreaterThan(0);
  });
});
