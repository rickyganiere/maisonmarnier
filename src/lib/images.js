import { safeUrl } from './escape.js';

const STOCK_HOST =
  /unsplash\.com|images\.unsplash\.com|pexels\.com|picsum\.photos|placeholder\.com|loremflickr\.com/i;

export function isStockImageUrl(url) {
  return STOCK_HOST.test(String(url || ''));
}

/** Normalize product image list from image_url + image_urls JSON. */
export function productImages(p, { max = 8, allowStock = false } = {}) {
  const out = [];
  const seen = new Set();
  function push(raw) {
    const u = safeUrl(raw, '');
    if (!u || seen.has(u)) return;
    if (!allowStock && isStockImageUrl(u)) return;
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

/** Live catalog rule: at least 2 real (non-stock) photos. */
export function hasMultiRealPhotos(p, { min = 2 } = {}) {
  return productImages(p, { max: 12, allowStock: false }).length >= min;
}

export function galleryValidationError(p, { min = 2 } = {}) {
  const imgs = productImages(p, { max: 12, allowStock: false });
  if (imgs.length < min) {
    return `Need at least ${min} real product photos (CJ/supplier). Unsplash/stock images do not count.`;
  }
  return null;
}

export function serializeImageUrls(urls) {
  const list = (Array.isArray(urls) ? urls : [])
    .map((u) => safeUrl(u, ''))
    .filter((u) => u && !isStockImageUrl(u))
    .slice(0, 12);
  return list.length ? JSON.stringify(list) : null;
}
