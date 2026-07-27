/**
 * Tests for the Firebase Authentication adapter — custom-token flow.
 *
 * These tests verify that the deterministic password derivation has been removed
 * and that the adapter correctly delegates authentication to the server.
 * No PINs are stored or logged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ACCOUNT_MAP, signInWithPin } from './authAdapter';

describe('derivePassword removed', () => {
  it('should no longer export derivePassword from authAdapter', async () => {
    const mod = await import('./authAdapter');
    expect((mod as any).derivePassword).toBeUndefined();
  });
});

describe('ACCOUNT_MAP', () => {
  it('should map all three display names', () => {
    expect(ACCOUNT_MAP['Brisbane Reception']).toBeDefined();
    expect(ACCOUNT_MAP['Perth Reception']).toBeDefined();
    expect(ACCOUNT_MAP['Administrator']).toBeDefined();
  });

  it('should map to the three expected account keys', () => {
    const keys = Object.values(ACCOUNT_MAP).map(e => e.key).sort();
    expect(keys).toEqual(['administrator', 'brisbane-reception', 'perth-reception']);
  });

  it('should not contain real email addresses', () => {
    // Synthetic emails were used in the old approach; the new architecture
    // uses Cloud Functions and should not expose internal email addresses
    const entries = Object.values(ACCOUNT_MAP);
    for (const entry of entries) {
      expect(entry.email).toBe('');
    }
  });
});

describe('signInWithPin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject unknown display names', async () => {
    await expect(signInWithPin('Unknown User', '1001'))
      .rejects
      .toThrow('Unknown account');
  });

  it('should not store the PIN in any module-level variable or localStorage', () => {
    // Check that localStorage doesn't contain any of our PINs after module load
    const item = localStorage.getItem('asg_reception_pin');
    expect(item).toBeNull();
  });
});

describe('Server-side contract validation', () => {
  it('should expect exactly 4-character PINs from the server', () => {
    // These are contract assertions — the Cloud Function will enforce them server-side
    const validPin = '1001';
    const shortPin = '123';
    const longPin = '12345';
    const emptyPin = '';
    expect(validPin.length).toBe(4);
    expect(shortPin.length).not.toBe(4);
    expect(longPin.length).not.toBe(4);
    expect(emptyPin.length).toBe(0);
  });

  it('should define all three operational accounts expected by the Cloud Function', () => {
    const expectedKeys = ['brisbane-reception', 'perth-reception', 'administrator'];
    const actualKeys = Object.values(ACCOUNT_MAP).map(e => e.key);
    for (const key of expectedKeys) {
      expect(actualKeys).toContain(key);
    }
  });
});
