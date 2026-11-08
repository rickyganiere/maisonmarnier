import { json } from './lib/json.js';

let cjAccessToken = null;
let cjAccessExpiry = 0;

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

export async function cjSearch(url, env) {
  try {
    const q = (url.searchParams.get('q') || 'home decor').trim().slice(0, 100);
    const size = Math.max(1, Math.min(24, parseInt(url.searchParams.get('size') || '24', 10) || 24));
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const token = await getCJToken(env);
    const p = new URLSearchParams({ page: String(page), size: String(size), keyWord: q });
    p.append('features', 'enable_category');
    const r = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString(),
      { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
    );
    const d = await r.json();
    if (!r.ok || d.code !== 200) {
      return json(
        { ok: false, error: d.message || 'CJ product search failed', code: d.code || r.status },
        r.status || 502,
      );
    }
    const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
    const products = groups
      .flatMap((g) => (Array.isArray(g.productList) ? g.productList : []))
      .slice(0, size)
      .map((x) => ({
        id: x.id,
        name: x.nameEn,
        sku: x.sku,
        image: x.bigImage,
        costUSD: x.nowPrice || x.sellPrice,
        stock: x.warehouseInventoryNum,
        verifiedStock: x.totalVerifiedInventory,
        deliveryDays: x.deliveryCycle,
        category: x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || null,
        categoryId: x.categoryId || null,
        freeShipping: x.addMarkStatus === 1,
        supplier: x.supplierName || 'CJ',
        suggestedRetailEUR: Math.max(19.95, Math.ceil(Number(x.nowPrice || x.sellPrice || 0) * 2.5) - 0.05),
      }));
    return json({
      ok: true,
      query: q,
      page,
      size,
      total: (d.data && d.data.totalRecords) || products.length,
      products,
      shippingCountryChecked: false,
      note: 'Search is global. Shipping availability and freight to Spain are checked separately before publishing.',
    });
  } catch (e) {
    return json({ ok: false, error: e && e.message ? e.message : 'CJ connector error' }, 502);
  }
}

/** Refresh stock/cost for a draft from CJ list search by supplier product id. */
export async function refreshProductFromCJ(env, supplierProductId) {
  const token = await getCJToken(env);
  const p = new URLSearchParams({
    page: '1',
    size: '20',
    productIds: String(supplierProductId),
  });
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString(),
    { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || 'CJ refresh failed');
  }
  const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
  const items = groups.flatMap((g) => (Array.isArray(g.productList) ? g.productList : []));
  const match =
    items.find((x) => String(x.id) === String(supplierProductId)) ||
    items[0];
  if (!match) throw new Error('CJ product not found for refresh');
  return {
    costUSD: Number(match.nowPrice || match.sellPrice || 0) || 0,
    stock: Number(match.warehouseInventoryNum || match.totalVerifiedInventory || 0) || 0,
    deliveryDays: String(match.deliveryCycle || ''),
    image: match.bigImage || '',
    name: match.nameEn || '',
    sku: match.sku || '',
  };
}
