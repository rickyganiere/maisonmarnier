import { json } from './lib/json.js';
import { suggestedRetailEur } from './lib/merch.js';
import { safeUrl } from './lib/escape.js';

let cjAccessToken = null;
let cjAccessExpiry = 0;

/** Collect unique product photos from a CJ list/detail payload. */
export function extractCjImages(x, { max = 8 } = {}) {
  const out = [];
  const seen = new Set();
  const push = (raw) => {
    const u = safeUrl(raw, '');
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  if (!x || typeof x !== 'object') return out;
  push(x.bigImage || x.productImage || x.bigimg || x.image);
  const sets = [x.productImageSet, x.productImages, x.imageSet, x.images, x.productImageList];
  for (const set of sets) {
    if (Array.isArray(set)) set.forEach(push);
    else if (typeof set === 'string' && set.trim()) {
      try {
        const parsed = JSON.parse(set);
        if (Array.isArray(parsed)) parsed.forEach(push);
      } catch {
        set.split(/[\n,]+/).forEach(push);
      }
    }
  }
  // Variant / stanProducts thumbnails = alternate angles & colorways
  const variants = [
    ...(Array.isArray(x.variants) ? x.variants : []),
    ...(Array.isArray(x.stanProducts) ? x.stanProducts : []),
    ...(Array.isArray(x.variantList) ? x.variantList : []),
  ];
  for (const v of variants) {
    push(v?.variantImage || v?.image || v?.img || v?.bigImage || v?.bigimg);
  }
  return out.slice(0, max);
}

function mergeCjPayloads(...parts) {
  const base = {};
  const imageBag = [];
  const variants = [];
  for (const part of parts) {
    if (!part || typeof part !== 'object') continue;
    Object.assign(base, part);
    imageBag.push(...extractCjImages(part, { max: 24 }));
    if (Array.isArray(part.variants)) variants.push(...part.variants);
    if (Array.isArray(part.stanProducts)) variants.push(...part.stanProducts);
  }
  if (variants.length) base.variants = variants;
  if (imageBag.length) base.productImageSet = [...new Set(imageBag)];
  return base;
}

export async function getCJToken(env) {
  if (cjAccessToken && Date.now() < cjAccessExpiry - 300000) return cjAccessToken;
  if (!env.CJ_API_KEY) throw new Error('CJ_API_KEY is not configured');
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: env.CJ_API_KEY }),
    },
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200 || !d.data || !d.data.accessToken) {
    throw new Error('CJ authentication failed: ' + (d.message || r.status));
  }
  cjAccessToken = d.data.accessToken;
  cjAccessExpiry = Date.parse(d.data.accessTokenExpiryDate) || Date.now() + 12 * 60 * 60 * 1000;
  return cjAccessToken;
}

export async function cjStatus(env) {
  const configured = !!env.CJ_API_KEY;
  if (!configured) return json({ ok: true, configured: false, authenticated: false });
  try {
    await getCJToken(env);
    return json({ ok: true, configured: true, authenticated: true });
  } catch (e) {
    return json({
      ok: true,
      configured: true,
      authenticated: false,
      error: e && e.message ? e.message : 'CJ auth failed',
    });
  }
}

function mapCjListItem(x) {
  const images = extractCjImages(x, { max: 16 });
  return {
    id: x.id,
    name: x.nameEn || x.productNameEn || '',
    sku: x.sku || x.productSku || '',
    image: images[0] || x.bigImage || x.productImage || '',
    images,
    imageCount: images.length,
    costUSD: x.nowPrice || x.sellPrice,
    stock: x.warehouseInventoryNum,
    verifiedStock: x.totalVerifiedInventory,
    deliveryDays: x.deliveryCycle,
    category: x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || null,
    categoryId: x.categoryId || null,
    freeShipping: x.addMarkStatus === 1,
    supplier: x.supplierName || 'CJ',
    suggestedRetailEUR: suggestedRetailEur(x.nowPrice || x.sellPrice),
  };
}

/**
 * Collect CJ products that already expose enough gallery photos.
 * Pages through listV2 until `limit` matches or `maxPages` is exhausted.
 */
export async function collectCjProducts(env, {
  q = 'home decor',
  limit = 24,
  minImages = 4,
  startPage = 1,
  maxPages = 12,
  pageSize = 20,
} = {}) {
  const query = String(q || 'home decor').trim().slice(0, 100) || 'home decor';
  const want = Math.max(1, Math.min(100, Number(limit) || 24));
  const min = Math.max(3, Math.min(8, Number(minImages) || 4));
  const token = await getCJToken(env);
  const products = [];
  const seen = new Set();
  let page = Math.max(1, Number(startPage) || 1);
  let scanned = 0;
  let totalRecords = 0;
  const pagesCap = Math.max(1, Math.min(20, Number(maxPages) || 12));

  for (let i = 0; i < pagesCap && products.length < want; i += 1) {
    const p = new URLSearchParams({
      page: String(page),
      size: String(Math.max(1, Math.min(50, Number(pageSize) || 20))),
      keyWord: query,
    });
    p.append('features', 'enable_category');
    const r = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString(),
      { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
    );
    const d = await r.json();
    if (!r.ok || d.code !== 200) {
      const err = new Error(d.message || 'CJ product search failed');
      err.code = d.code || r.status;
      throw err;
    }
    totalRecords = Number(d.data?.totalRecords || totalRecords) || totalRecords;
    const groups = Array.isArray(d.data?.content) ? d.data.content : [];
    const batch = groups.flatMap((g) => (Array.isArray(g.productList) ? g.productList : []));
    if (!batch.length) break;
    scanned += batch.length;
    for (const raw of batch) {
      if (products.length >= want) break;
      const mapped = mapCjListItem(raw);
      const id = String(mapped.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (mapped.imageCount < min) continue;
      products.push(mapped);
    }
    page += 1;
  }

  return {
    query,
    minImages: min,
    limit: want,
    page,
    scanned,
    totalRecords,
    products,
  };
}

export async function cjSearch(url, env) {
  try {
    const q = (url.searchParams.get('q') || 'home decor').trim().slice(0, 100);
    const size = Math.max(1, Math.min(100, parseInt(url.searchParams.get('size') || '24', 10) || 24));
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const minImages = Math.max(
      3,
      Math.min(8, parseInt(url.searchParams.get('minImages') || '4', 10) || 4),
    );
    const collected = await collectCjProducts(env, {
      q,
      limit: size,
      minImages,
      startPage: page,
      maxPages: Math.max(6, Math.ceil(size / 4) + 4),
      pageSize: 20,
    });
    return json({
      ok: true,
      query: collected.query,
      page,
      size,
      minImages: collected.minImages,
      scanned: collected.scanned,
      total: collected.totalRecords || collected.products.length,
      products: collected.products,
      shippingCountryChecked: false,
      note: `Only products with ${collected.minImages}+ supplier photos are listed. Tick boxes to import selected, or import 50/100 by query.`,
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e && e.message ? e.message : 'CJ connector error',
        code: e?.code,
      },
      502,
    );
  }
}

/** Fetch full CJ product payload (list + detail + variants) for rich galleries. */
export async function fetchCjProduct(env, supplierProductId) {
  const token = await getCJToken(env);
  const pid = String(supplierProductId);
  const headers = { 'CJ-Access-Token': token, accept: 'application/json' };
  const parts = [];

  const p = new URLSearchParams({ page: '1', size: '20', productIds: pid });
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString(),
    { headers },
  );
  const d = await r.json();
  if (r.ok && d.code === 200) {
    const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
    const items = groups.flatMap((g) => (Array.isArray(g.productList) ? g.productList : []));
    const match = items.find((x) => String(x.id) === pid || String(x.pid) === pid) || items[0];
    if (match) parts.push(match);
  }

  try {
    const rDetail = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/productDetail/query',
      {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ id: pid }),
      },
    );
    const dDetail = await rDetail.json();
    if (rDetail.ok && dDetail.code === 200 && dDetail.data) parts.push(dDetail.data);
  } catch {
    /* optional enrichment */
  }

  try {
    const q = new URLSearchParams({ pid });
    const r2 = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/query?' + q.toString(),
      { headers },
    );
    const d2 = await r2.json();
    if (r2.ok && d2.code === 200 && d2.data) parts.push(d2.data);
  } catch {
    /* optional enrichment */
  }

  try {
    const qv = new URLSearchParams({ pid });
    const rv = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?' + qv.toString(),
      { headers },
    );
    const dv = await rv.json();
    if (rv.ok && dv.code === 200 && dv.data) {
      const list = Array.isArray(dv.data)
        ? dv.data
        : Array.isArray(dv.data.variants)
          ? dv.data.variants
          : [dv.data];
      parts.push({ variants: list });
    }
  } catch {
    /* optional enrichment */
  }

  if (!parts.length) throw new Error(d.message || 'CJ product fetch failed');
  return mergeCjPayloads(...parts);
}

/** Refresh stock/cost/images for a draft from CJ by supplier product id. */
export async function refreshProductFromCJ(env, supplierProductId) {
  const match = await fetchCjProduct(env, supplierProductId);
  const images = extractCjImages(match);
  return {
    costUSD: Number(match.nowPrice || match.sellPrice || 0) || 0,
    stock: Number(match.warehouseInventoryNum || match.totalVerifiedInventory || 0) || 0,
    deliveryDays: String(match.deliveryCycle || ''),
    image: images[0] || match.bigImage || match.productImage || '',
    images,
    name: match.nameEn || match.productNameEn || '',
    sku: match.sku || match.productSku || '',
  };
}

export async function resolveCJVariantId(env, supplierProductId, supplierSku) {
  const token = await getCJToken(env);
  const pid = String(supplierProductId || '');
  if (!pid) throw new Error('Missing supplier product id');

  // Try variant query by PID
  const q = new URLSearchParams({ pid });
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?' + q.toString(),
    { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
  );
  const d = await r.json();
  if (r.ok && d.code === 200) {
    const list = Array.isArray(d.data) ? d.data : Array.isArray(d.data?.variants) ? d.data.variants : d.data ? [d.data] : [];
    if (list.length) {
      const bySku = supplierSku
        ? list.find((v) => String(v.variantSku || v.sku || '') === String(supplierSku))
        : null;
      const pick = bySku || list[0];
      const vid = pick.vid || pick.variantId || pick.id;
      if (vid) return String(vid);
    }
  }

  // Fallback: treat stored id as vid (common when listV2 returns variant-level rows)
  return pid;
}

/**
 * Create a CJ logistics order after Stripe payment.
 * payType=2 uses CJ balance; set env.CJ_ORDER_SANDBOX=1 for sandbox orders.
 */
export async function createCJOrder(env, payload) {
  const token = await getCJToken(env);
  const sandbox = env.CJ_ORDER_SANDBOX === '1' || env.CJ_ORDER_SANDBOX === 'true';
  // IOSS: 1=none, 2=merchant IOSS (needs CJ_IOSS_NUMBER), 3=CJ IOSS (default for EU)
  const eu = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
    'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ]);
  const dest = String(payload.shippingCountryCode || '').toUpperCase();
  let iossType = Number(env.CJ_IOSS_TYPE || 0) || 0;
  let iossNumber = String(env.CJ_IOSS_NUMBER || '').trim();
  if (!iossType && eu.has(dest)) {
    iossType = 3; // CJ IOSS for EU destinations by default
    iossNumber = 'CJ-IOSS';
  } else if (iossType === 3) {
    iossNumber = iossNumber || 'CJ-IOSS';
  }

  const body = {
    orderNumber: payload.orderNumber,
    shippingZip: payload.shippingZip || '',
    shippingCountry: payload.shippingCountry || payload.shippingCountryCode || '',
    shippingCountryCode: payload.shippingCountryCode || '',
    shippingProvince: payload.shippingProvince || payload.shippingCity || '',
    shippingCity: payload.shippingCity || '',
    shippingCounty: '',
    shippingPhone: payload.shippingPhone || '0000000000',
    shippingCustomerName: payload.shippingCustomerName || 'Customer',
    shippingAddress: payload.shippingAddress || '',
    shippingAddress2: payload.shippingAddress2 || '',
    email: payload.email || '',
    remark: payload.remark || 'Maison Marnier',
    logisticName: payload.logisticName || env.CJ_LOGISTIC_NAME || 'CJPacket Ordinary',
    fromCountryCode: payload.fromCountryCode || 'CN',
    shopLogisticsType: 2,
    payType: 2,
    isSandbox: sandbox ? 1 : 0,
    shopAmount: payload.shopAmount != null ? String(payload.shopAmount) : undefined,
    products: payload.products,
  };
  if (iossType) {
    body.iossType = iossType;
    if (iossNumber) body.iossNumber = iossNumber;
  }

  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3',
    {
      method: 'POST',
      headers: {
        'CJ-Access-Token': token,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || d.errorCode || 'CJ createOrder failed');
  }
  const cjOrderId =
    typeof d.data === 'string' || typeof d.data === 'number'
      ? String(d.data)
      : d.data?.orderId || d.data?.id || JSON.stringify(d.data);
  return { cjOrderId, raw: d };
}

export async function getCJOrderDetail(env, cjOrderId) {
  const token = await getCJToken(env);
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId=' +
      encodeURIComponent(cjOrderId),
    { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || 'CJ getOrderDetail failed');
  }
  return d.data;
}
