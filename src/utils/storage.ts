const PREFIX = 'asg_reception_';

// Global memory fallback — survives Vite HMR and module re-evaluation
const STORE_KEY = '__asg_reception_store__';
function getStore(): Record<string, string> {
  if (typeof globalThis !== 'undefined' && !(globalThis as any)[STORE_KEY]) {
    (globalThis as any)[STORE_KEY] = {};
  }
  return (globalThis as any)[STORE_KEY] || {};
}

let storageDisabled = false;

function isStorageAvailable(): boolean {
  if (storageDisabled) return false;
  try {
    const key = '__asg_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    storageDisabled = true;
    return false;
  }
}

export function getItem<T>(key: string): T | null {
  const fullKey = PREFIX + key;
  if (isStorageAvailable()) {
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
  }
  const store = getStore();
  const raw = store[fullKey];
  if (raw === undefined) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function setItem<T>(key: string, value: T): void {
  const fullKey = PREFIX + key;
  const serialized = JSON.stringify(value);
  getStore()[fullKey] = serialized;
  if (isStorageAvailable()) {
    try {
      localStorage.setItem(fullKey, serialized);
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }
  }
}

export function removeItem(key: string): void {
  const fullKey = PREFIX + key;
  delete getStore()[fullKey];
  if (isStorageAvailable()) {
    try {
      localStorage.removeItem(fullKey);
    } catch (e) {
      console.warn('Failed to remove from localStorage:', e);
    }
  }
}

export function clearAll(): void {
  const store = getStore();
  Object.keys(store).forEach(k => { if (k.startsWith(PREFIX)) delete store[k]; });
  if (isStorageAvailable()) {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }
}

export function getKeys(): string[] {
  const store = getStore();
  const memKeys = Object.keys(store).filter(k => k.startsWith(PREFIX));
  if (isStorageAvailable()) {
    try {
      const lsKeys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
      return [...new Set([...lsKeys, ...memKeys])];
    } catch {
      return memKeys.map(k => k.slice(PREFIX.length));
    }
  }
  return memKeys.map(k => k.slice(PREFIX.length));
}
