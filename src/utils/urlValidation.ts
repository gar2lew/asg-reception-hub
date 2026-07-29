const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:', 'tel:'];
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
    if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) return false;
    if (/javascript:/i.test(url) || /data:/i.test(url) || /file:/i.test(url)) return false;
    return true;
  } catch {
    return false;
  }
}
export function safeUrl(url: string): string {
  return isValidUrl(url) ? url : '#';
}
