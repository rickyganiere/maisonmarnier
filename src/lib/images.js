import { safeUrl } from './escape.js';

/** Normalize product image list from image_url + image_urls JSON. */
export function productImages(p, { max = 8 } = {}) {
  const out = [];
  const seen = new Set();
  function push(raw) {
    const u = safeUrl(raw, '');
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  }
  push(p?.image_url);
  const raw = p?.image_urls;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) parsed.forEach(push);
    } catch {
      /* ignore bad JSON */
    }
  }
  return out.slice(0, max);
}

export function serializeImageUrls(urls) {
  const list = (Array.isArray(urls) ? urls : [])
    .map((u) => safeUrl(u, ''))
    .filter(Boolean)
    .slice(0, 12);
  return list.length ? JSON.stringify(list) : null;
}
