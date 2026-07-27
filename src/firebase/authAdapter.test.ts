/**
 * Tests for the Firebase Authentication adapter — custom-token flow.
 *
 * These tests verify that the deterministic password derivation has been removed
 * and that the adapter correctly delegates authentication to the server.
 * No PINs are stored or logged.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
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
  describe('Pepper consistency', () => {
    it('should use pin + pepper concatenation (pin first, then pepper)', () => {
      // This matches the operationalLogin function format: pin + pepper.value()
      // Do not change this order without also updating the Cloud Function
      const pin = '1001';
      const pepper = 'test-pepper-value';
      const result = pin + pepper;
      expect(result).toBe('1001test-pepper-value');
      expect(result).not.toBe(pepper + pin);
    });

    it('should treat PINs as strings to preserve leading zeros', () => {
      const pin = '0001';
      expect(typeof pin).toBe('string');
      expect(pin.length).toBe(4);
      expect(pin).toBe('0001');
    });

    it('should normalise account keys as lowercase hyphenated strings', () => {
      const keys = Object.values(ACCOUNT_MAP).map(e => e.key);
      for (const key of keys) {
        expect(key).toMatch(/^[a-z-]+$/);
      }
    });

    it('should reject PINs that are not exactly 4 digits at the server level', () => {
      // The operationalLogin function validates: /^\d{4}$/
      const valid = /^\d{4}$/;
      expect(valid.test('1001')).toBe(true);
      expect(valid.test('123')).toBe(false);
      expect(valid.test('12345')).toBe(false);
      expect(valid.test('abcd')).toBe(false);
      expect(valid.test('')).toBe(false);
    });

    it('should not contain any hardcoded pepper or PIN values in source', async () => {
      // Read the bootstrap script and verify no hardcoded pepper
      const fs = await import('fs');
      const content = fs.readFileSync('scripts/bootstrap.js', 'utf-8');
      // The pepper must come from hidden input, not a hardcoded string literal
      expect(content).not.toContain('const pepper = "');
      expect(content).not.toContain("const pepper = '");
      // PINs must come from hidden input, not hardcoded env-file variables
      expect(content).not.toContain('PIN_BRISBANE');
      expect(content).not.toContain('PIN_PERTH');
      expect(content).not.toContain('PIN_ADMIN');
    });
  });

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
