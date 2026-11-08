/** Escape text for safe HTML interpolation. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allow only http(s) absolute URLs or site-relative paths. */
export function safeUrl(value, fallback = '') {
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 1200);
  try {
    const u = new URL(s);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString().slice(0, 1200);
  } catch {
    /* ignore */
  }
  return fallback;
}
