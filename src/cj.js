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
    const normalized = normalizeCjProductShape(part);
    Object.assign(base, normalized);
    imageBag.push(...extractCjImages(normalized, { max: 24 }));
    if (Array.isArray(normalized.variants)) variants.push(...normalized.variants);
    if (Array.isArray(normalized.stanProducts)) variants.push(...normalized.stanProducts);
  }
  if (variants.length) base.variants = variants.map(normalizeCjProductShape);
  if (imageBag.length) base.productImageSet = [...new Set(imageBag)];
  // Prefer any positive cost found across parts; Object.assign can keep null list prices.
  const costs = parts.map((p) => extractCjCostUsd(normalizeCjProductShape(p))).filter((n) => n > 0);
  if (costs.length) {
    const best = Math.min(...costs);
    base.sellPrice = best;
    base.nowPrice = best;
  }
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

/**
 * CJ list/detail payloads mix number prices, string prices, and ranges like "1.20-3.50".
 * Prefer the lowest positive value so drafts never store NaN / blank cost.
 */
export function parseCjPrice(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : 0;
  const text = String(raw).trim();
  if (!text) return 0;
  const direct = Number(text);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const parts = text
    .split(/[~–—\-to]+/i)
    .map((p) => Number(String(p).replace(/[^0-9.]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!parts.length) return 0;
  return Math.min(...parts);
}

function cjPriceCandidatesFromObject(x) {
  if (!x || typeof x !== 'object') return [];
  return [
    x.nowPrice,
    x.discountPrice,
    x.sellPrice,
    x.sellprice, // productDetail/query uses this exact lowercase key
    x.price,
    x.productSellPrice,
    x.unsoldPrice,
    x.selfPickupPrice,
    x.variantSellPrice,
    x.variantSugSellPrice,
    x.wholesalePrice?.cjWholesalePrice,
    x.wholesalePrice?.directWholesalePrice,
  ];
}

/** Best-effort supplier cost from a CJ list/detail/variant payload. */
export function extractCjCostUsd(x) {
  if (!x || typeof x !== 'object') return 0;
  for (const c of cjPriceCandidatesFromObject(x)) {
    const n = parseCjPrice(c);
    if (n > 0) return n;
  }
  const variants = [
    ...(Array.isArray(x.variants) ? x.variants : []),
    ...(Array.isArray(x.stanProducts) ? x.stanProducts : []),
    ...(Array.isArray(x.variantList) ? x.variantList : []),
  ];
  let best = 0;
  for (const v of variants) {
    for (const c of cjPriceCandidatesFromObject(v)) {
      const n = parseCjPrice(c);
      if (n > 0 && (!best || n < best)) best = n;
    }
  }
  return best;
}

/** Normalize CJ detail quirks (sellprice/bigimg/…) onto listV2-style keys. */
function normalizeCjProductShape(x) {
  if (!x || typeof x !== 'object') return x;
  const out = { ...x };
  if (out.sellPrice == null && out.sellprice != null) out.sellPrice = out.sellprice;
  if (out.nowPrice == null && out.discountPrice != null) out.nowPrice = out.discountPrice;
  if (!out.nameEn && out.nameen) out.nameEn = out.nameen;
  if (!out.productNameEn && out.nameEn) out.productNameEn = out.nameEn;
  if (!out.bigImage && out.bigimg) out.bigImage = out.bigimg;
  if (!out.sku && out.productSku) out.sku = out.productSku;
  if (Array.isArray(out.stanProducts)) {
    out.stanProducts = out.stanProducts.map((v) => {
      if (!v || typeof v !== 'object') return v;
      const nv = { ...v };
      if (nv.sellPrice == null && nv.sellprice != null) nv.sellPrice = nv.sellprice;
      if (nv.variantSellPrice == null && nv.sellPrice != null) nv.variantSellPrice = nv.sellPrice;
      if (!nv.variantImage && nv.img) nv.variantImage = nv.img;
      return nv;
    });
  }
  return out;
}

function mapCjListItem(x) {
  const images = extractCjImages(x, { max: 16 });
  const costUSD = extractCjCostUsd(x);
  return {
    id: x.id || x.pid,
    name: x.nameEn || x.productNameEn || '',
    sku: x.sku || x.productSku || '',
    image: images[0] || x.bigImage || x.productImage || '',
    images,
    imageCount: images.length,
    costUSD,
    stock: x.warehouseInventoryNum ?? x.totalVerifiedInventory,
    verifiedStock: x.totalVerifiedInventory,
    deliveryDays: x.deliveryCycle,
    category: x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || null,
    categoryId: x.categoryId || null,
    listedNum: x.listedNum != null ? Number(x.listedNum) || 0 : null,
    freeShipping: x.addMarkStatus === 1,
    supplier: x.supplierName || 'CJ',
    suggestedRetailEUR: suggestedRetailEur(costUSD),
  };
}

function parseOptionalInt(value, { min = null, max = null } = {}) {
  if (value == null || value === '') return null;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return null;
  if (max != null && n > max) return null;
  return n;
}

function normalizeCjSearchFilters({
  q = '',
  page = 1,
  size = 24,
  categoryId = '',
  productFlag = null,
  orderBy = null,
  sort = '',
  freeShipping = null,
  countryCode = '',
  startSellPrice = '',
  endSellPrice = '',
} = {}) {
  const category = String(categoryId || '').trim().slice(0, 80);
  const flag = parseOptionalInt(productFlag, { min: 0, max: 3 });
  const rawQ = String(q || '').trim().slice(0, 100);
  // Allow empty keyword when browsing a category / trending shelf.
  const query = rawQ || (category || flag != null ? '' : 'home decor');
  const pageNum = Math.max(1, Math.min(1000, Number(page) || 1));
  const pageSize = Math.max(1, Math.min(100, Number(size) || 24));
  const order = parseOptionalInt(orderBy, { min: 0, max: 4 });
  const sortDir = String(sort || '').toLowerCase() === 'asc' ? 'asc' : String(sort || '').toLowerCase() === 'desc' ? 'desc' : '';
  const ship = parseOptionalInt(freeShipping, { min: 0, max: 1 });
  const country = String(countryCode || '').trim().toUpperCase().slice(0, 8);
  const minPrice = String(startSellPrice || '').trim();
  const maxPrice = String(endSellPrice || '').trim();
  return {
    query,
    page: pageNum,
    size: pageSize,
    categoryId: category,
    productFlag: flag,
    orderBy: order,
    sort: sortDir,
    freeShipping: ship,
    countryCode: country,
    startSellPrice: minPrice,
    endSellPrice: maxPrice,
  };
}

async function fetchCjListV2(env, filters) {
  const f = normalizeCjSearchFilters(filters);
  const token = await getCJToken(env);
  const p = new URLSearchParams({
    page: String(f.page),
    size: String(f.size),
  });
  if (f.query) p.set('keyWord', f.query);
  if (f.categoryId) p.set('categoryId', f.categoryId);
  if (f.productFlag != null) p.set('productFlag', String(f.productFlag));
  if (f.orderBy != null) p.set('orderBy', String(f.orderBy));
  if (f.sort) p.set('sort', f.sort);
  if (f.freeShipping != null) p.set('addMarkStatus', String(f.freeShipping));
  if (f.countryCode) p.set('countryCode', f.countryCode);
  if (f.startSellPrice) p.set('startSellPrice', f.startSellPrice);
  if (f.endSellPrice) p.set('endSellPrice', f.endSellPrice);
  p.append('features', 'enable_category');

  const endpoint = 'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString();
  const options = { headers: { 'CJ-Access-Token': token, accept: 'application/json' } };
  let r = await fetch(endpoint, options);
  let d = await r.json().catch(() => ({}));
  if (r.status === 429 || d.code === 1600200) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    r = await fetch(endpoint, options);
    d = await r.json().catch(() => ({}));
  }
  if (!r.ok || d.code !== 200) {
    const err = new Error(d.message || `CJ product search failed (HTTP ${r.status})`);
    err.code = d.code || r.status;
    throw err;
  }

  const groups = Array.isArray(d.data?.content) ? d.data.content : [];
  const batch = groups.flatMap((g) => (Array.isArray(g.productList) ? g.productList : []));
  const related = [];
  const seenCat = new Set();
  for (const g of groups) {
    const list = Array.isArray(g?.relatedCategoryList) ? g.relatedCategoryList : [];
    for (const c of list) {
      const id = String(c?.categoryId || '').trim();
      const name = String(c?.categoryName || '').trim();
      if (!id || !name || seenCat.has(id)) continue;
      seenCat.add(id);
      related.push({ id, name });
    }
  }

  const totalRecords = Number(d.data?.totalRecords || 0) || 0;
  const totalPages = Math.max(
    1,
    Number(d.data?.totalPages) || Math.ceil(totalRecords / f.size) || 1,
  );

  return {
    ...f,
    products: batch,
    relatedCategories: related,
    totalRecords,
    totalPages,
    pageNumber: Number(d.data?.pageNumber) || f.page,
    pageSize: Number(d.data?.pageSize) || f.size,
  };
}

/**
 * Collect CJ products for the draft inbox, including products with thin galleries.
 */
export async function collectCjProducts(env, {
  q = 'home decor',
  limit = 24,
  startPage = 1,
  categoryId = '',
  productFlag = null,
  orderBy = null,
  sort = '',
  freeShipping = null,
  countryCode = '',
} = {}) {
  const want = Math.max(1, Math.min(100, Number(limit) || 24));
  const products = [];
  const seen = new Set();
  let page = Math.max(1, Number(startPage) || 1);
  let scanned = 0;
  let totalRecords = 0;
  let totalPages = 1;
  let query = '';
  let relatedCategories = [];

  for (let i = 0; i < 5 && products.length < want; i += 1) {
    const pageResult = await fetchCjListV2(env, {
      q,
      page,
      size: Math.min(100, Math.max(want - products.length, 20)),
      categoryId,
      productFlag,
      orderBy,
      sort,
      freeShipping,
      countryCode,
    });
    query = pageResult.query;
    totalRecords = pageResult.totalRecords || totalRecords;
    totalPages = pageResult.totalPages || totalPages;
    if (pageResult.relatedCategories?.length && !relatedCategories.length) {
      relatedCategories = pageResult.relatedCategories;
    }
    const batch = pageResult.products || [];
    if (!batch.length) break;
    scanned += batch.length;
    for (const raw of batch) {
      if (products.length >= want) break;
      const mapped = mapCjListItem(raw);
      const id = String(mapped.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (!mapped.name) continue;
      products.push(mapped);
    }
    if (page >= totalPages) break;
    page += 1;
    if (products.length < want && i < 4) await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return {
    query,
    limit: want,
    page: Math.max(1, Number(startPage) || 1),
    scanned,
    totalRecords,
    totalPages,
    relatedCategories,
    categoryId: String(categoryId || '').trim(),
    productFlag: parseOptionalInt(productFlag, { min: 0, max: 3 }),
    products,
  };
}

function flattenCjCategories(tree) {
  const out = [];
  const roots = Array.isArray(tree) ? tree : [];
  for (const first of roots) {
    const firstName = String(first?.categoryFirstName || '').trim();
    const seconds = Array.isArray(first?.categoryFirstList) ? first.categoryFirstList : [];
    for (const second of seconds) {
      const secondName = String(second?.categorySecondName || '').trim();
      const thirds = Array.isArray(second?.categorySecondList) ? second.categorySecondList : [];
      for (const third of thirds) {
        const id = String(third?.categoryId || '').trim();
        const name = String(third?.categoryName || '').trim();
        if (!id || !name) continue;
        out.push({
          id,
          name,
          path: [firstName, secondName, name].filter(Boolean).join(' / '),
          first: firstName,
          second: secondName,
        });
      }
    }
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

/** Prefer home/lifestyle trees in the admin picker, keep the rest searchable. */
const PRIORITY_CATEGORY_FIRST = [
  'home',
  'garden',
  'furniture',
  'household',
  'kitchen',
  'lighting',
  'decor',
  'candle',
  'festive',
  'holiday',
  'christmas',
  'wedding',
  'party',
];

export async function cjCategories(env) {
  try {
    const token = await getCJToken(env);
    const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1/product/getCategory', {
      headers: { 'CJ-Access-Token': token, accept: 'application/json' },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.code !== 200) {
      return json(
        { ok: false, error: d.message || `CJ categories failed (HTTP ${r.status})`, code: d.code || r.status },
        502,
      );
    }
    const categories = flattenCjCategories(d.data);
    const featured = categories.filter((c) => {
      const blob = `${c.first} ${c.second} ${c.name}`.toLowerCase();
      return PRIORITY_CATEGORY_FIRST.some((k) => blob.includes(k));
    });
    return json({
      ok: true,
      total: categories.length,
      featured: featured.slice(0, 120),
      categories,
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e && e.message ? e.message : 'CJ categories error',
        code: e?.code,
      },
      502,
    );
  }
}

export async function cjSearch(url, env) {
  try {
    const filters = {
      q: url.searchParams.get('q') || '',
      size: url.searchParams.get('size') || '24',
      page: url.searchParams.get('page') || '1',
      categoryId: url.searchParams.get('categoryId') || '',
      productFlag: url.searchParams.get('productFlag'),
      orderBy: url.searchParams.get('orderBy'),
      sort: url.searchParams.get('sort') || '',
      freeShipping: url.searchParams.get('freeShipping'),
      countryCode: url.searchParams.get('countryCode') || '',
      startSellPrice: url.searchParams.get('startSellPrice') || '',
      endSellPrice: url.searchParams.get('endSellPrice') || '',
    };
    const pageResult = await fetchCjListV2(env, filters);
    const products = [];
    const seen = new Set();
    for (const raw of pageResult.products || []) {
      const mapped = mapCjListItem(raw);
      const id = String(mapped.id || '');
      if (!id || seen.has(id) || !mapped.name) continue;
      seen.add(id);
      products.push(mapped);
    }
    return json({
      ok: true,
      query: pageResult.query,
      page: pageResult.page,
      size: pageResult.size,
      total: pageResult.totalRecords || products.length,
      totalPages: pageResult.totalPages,
      categoryId: pageResult.categoryId || null,
      productFlag: pageResult.productFlag,
      orderBy: pageResult.orderBy,
      sort: pageResult.sort || null,
      freeShipping: pageResult.freeShipping,
      countryCode: pageResult.countryCode || null,
      relatedCategories: pageResult.relatedCategories || [],
      scanned: products.length,
      products,
      shippingCountryChecked: false,
      note: 'Products can be imported as drafts with any number of supplier photos.',
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

/** Lightweight cost/stock lookup when listV2 rows omit a usable price. */
export async function lookupCjCostUsd(env, supplierProductId) {
  const token = await getCJToken(env);
  const pid = String(supplierProductId || '');
  if (!pid) return 0;
  const headers = { 'CJ-Access-Token': token, accept: 'application/json' };
  const parts = [];

  try {
    const rDetail = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/productDetail/query',
      {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ id: pid }),
      },
    );
    const dDetail = await rDetail.json().catch(() => ({}));
    if (rDetail.ok && dDetail.code === 200 && dDetail.data) parts.push(dDetail.data);
  } catch {
    /* optional */
  }

  let cost = extractCjCostUsd(mergeCjPayloads(...parts));
  if (cost > 0) return cost;

  try {
    const qv = new URLSearchParams({ pid });
    const rv = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?' + qv.toString(),
      { headers },
    );
    const dv = await rv.json().catch(() => ({}));
    if (rv.ok && dv.code === 200 && dv.data) {
      const list = Array.isArray(dv.data)
        ? dv.data
        : Array.isArray(dv.data.variants)
          ? dv.data.variants
          : [dv.data];
      cost = extractCjCostUsd({ variants: list });
    }
  } catch {
    /* optional */
  }
  return cost;
}

/** Refresh stock/cost/images for a draft from CJ by supplier product id. */
export async function refreshProductFromCJ(env, supplierProductId) {
  const match = await fetchCjProduct(env, supplierProductId);
  const images = extractCjImages(match);
  return {
    costUSD: extractCjCostUsd(match),
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
