import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItem, setItem, removeItem, clearAll } from './storage';

describe('storage resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage failed'); });
    const result = getItem<string>('test');
    expect(result).toBeNull();
  });

  it('should not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage failed'); });
    expect(() => setItem('test', 'value')).not.toThrow();
  });

  it('should not throw when localStorage.removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage failed'); });
    expect(() => removeItem('test')).not.toThrow();
  });

  it('should not throw when localStorage.clear is mocked as broken', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage failed'); });
    expect(() => clearAll()).not.toThrow();
  });

  it('should handle JSON.parse failure gracefully', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{invalid json}');
    const result = getItem<string>('test');
    expect(result).toBeNull();
  });

  it('should survive all storage operations sequentially', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('fail'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('fail'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('fail'); });
    expect(() => setItem('a', 1)).not.toThrow();
    expect(() => removeItem('a')).not.toThrow();
    expect(getItem('a')).toBeNull();
    expect(() => clearAll()).not.toThrow();
  });
});
