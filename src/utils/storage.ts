const PREFIX = 'asg_reception_';
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}
export function removeItem(key: string): void {
  localStorage.removeItem(PREFIX + key);
}
export function clearAll(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  keys.forEach(k => localStorage.removeItem(k));
}
export function getKeys(): string[] {
  return Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
}
