import { json } from '../lib/json.js';
import { extractCjCostUsd, extractCjImages, getCJToken, refreshProductFromCJ } from '../cj.js';
import {
  cleanProductName,
  mapMaisonCategory,
  suggestedCompareEur,
  suggestedRetailEur,
} from '../lib/merch.js';
import { serializeImageUrls } from '../lib/images.js';
import { slugify } from '../lib/slugify.js';
import { safeUrl } from '../lib/escape.js';

const SEARCHES = [
  'christmas ornament',
  'christmas tree decoration',
  'christmas lights string',
  'christmas wreath',
  'christmas stocking',
  'christmas candle',
  'santa decoration',
  'christmas gift box',
  'holiday table decor',
  'christmas garland',
  'snowflake ornament',
  'christmas bell decor',
  'nativity decoration',
  'christmas pillow cover',
  'christmas night light',
  'christmas wall hanging',
  'christmas tree topper',
  'advent calendar decor',
  'christmas lantern',
  'holiday candle holder',
  'christmas table runner',
  'reindeer decoration',
  'christmas bauble set',
  'festive home decor',
];

// Word-boundary junk so "sock" does not kill "stocking", "ring" does not kill "string lights".
const JUNK =
  /\b(slippers?|socks?|earrings?|rings?|necklaces?|bracelets?|wigs?|phone cases?|cables?|chargers?|underwear|bras?|tattoos?|sex|adult)\b/i;

const FESTIVE =
  /christmas|xmas|santa|noel|holiday|festive|snow|snowflake|reindeer|wreath|stocking|ornament|garland|advent|nativity|gingerbread|mistletoe|pine cone|tree topper|bauble|elf|nutcracker|hanukkah|new year/i;

function flattenCjListPayload(d) {
  const data = d?.data;
  if (!data || typeof data !== 'object') return { items: [], shape: 'no-data' };
  if (Array.isArray(data.content)) {
    const items = data.content.flatMap((g) =>
      Array.isArray(g?.productList) ? g.productList : Array.isArray(g) ? g : [],
    );
    if (items.length) return { items, shape: 'content.productList' };
    const direct = data.content.filter((x) => x && (x.id || x.pid || x.nameEn));
    if (direct.length) return { items: direct, shape: 'content[]' };
    return { items: [], shape: 'content-empty', total: data.totalRecords };
  }
  if (Array.isArray(data.list)) return { items: data.list, shape: 'list' };
  if (Array.isArray(data.productList)) return { items: data.productList, shape: 'productList' };
  if (Array.isArray(data)) return { items: data, shape: 'data[]' };
  return {
    items: [],
    shape: `keys:${Object.keys(data).slice(0, 8).join(',')}`,
    total: data.totalRecords,
  };
}

async function searchCj(token, q, page = 1, size = 20) {
  const p = new URLSearchParams({
    page: String(page),
    size: String(size),
    keyWord: q,
  });
  p.append('features', 'enable_category');
  const r = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/product/listV2?' + p.toString(),
    { headers: { 'CJ-Access-Token': token, accept: 'application/json' } },
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || `CJ search failed for ${q} (http ${r.status} code ${d.code})`);
  }
  const flat = flattenCjListPayload(d);
  flat.meta = { q, page, code: d.code, result: !!d.result, message: d.message || null };
  return flat;
}

function normalizeCj(x, { minImages = 1, requireFestive = true } = {}) {
  const rawName = String(x.nameEn || x.name || x.productNameEn || '').slice(0, 240);
  if (!rawName || JUNK.test(rawName)) return null;
  const blob = `${rawName} ${x.threeCategoryName || ''} ${x.twoCategoryName || ''} ${x.oneCategoryName || ''}`;
  if (requireFestive && !FESTIVE.test(blob)) return null;
  const cost = extractCjCostUsd(x);
  if (!(cost > 0)) return null;
  // List rows sometimes omit inventory — keep candidates; enrichment refreshes stock.
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || x.stockNum || 0) || 0;
  const images = extractCjImages(x);
  const image = safeUrl(images[0] || x.bigImage || x.productImage || '', '');
  if (!image) return null;
  if (images.length < minImages) return null;
  if (/unsplash\.com|pexels\.com|picsum\.photos/i.test(image)) return null;
  const name = cleanProductName(rawName) || rawName;
  let category = mapMaisonCategory(name, x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || '');
  if (FESTIVE.test(blob)) category = 'Seasonal';
  const retail = suggestedRetailEur(cost);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name + '-' + String(x.id).slice(-6));
  const sku = ('LL-XMAS-' + String(x.sku || x.id).replace(/[^A-Za-z0-9]/g, '').slice(-16)).toUpperCase();
  return {
    id: String(x.id),
    sku,
    supplierSku: String(x.sku || ''),
    name,
    slug,
    category,
    cost,
    retail,
    compare,
    image,
    images,
    stock,
    deliveryDays: String(x.deliveryCycle || '7-15'),
    description: `A festive piece for the holidays — curated for Maison Marnier.\n\n${name}`,
  };
}

async function upsertLive(env, p) {
  const gallery = serializeImageUrls(p.images || [p.image].filter(Boolean));
  await env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier='CJ',
       supplier_sku=excluded.supplier_sku,
       name=excluded.name,
       image_url=excluded.image_url,
       image_urls=excluded.image_urls,
       supplier_cost_usd=excluded.supplier_cost_usd,
       retail_price_eur=excluded.retail_price_eur,
       compare_at_price_eur=excluded.compare_at_price_eur,
       category=excluded.category,
       stock=excluded.stock,
       delivery_days=excluded.delivery_days,
       status='live',
       slug=excluded.slug,
       description=excluded.description,
       published_at=COALESCE(products.published_at, CURRENT_TIMESTAMP),
       updated_at=CURRENT_TIMESTAMP`,
  )
    .bind(
      p.sku,
      'CJ',
      p.id,
      p.supplierSku,
      p.name,
      p.image,
      gallery,
      p.cost,
      p.retail,
      p.compare,
      p.category,
      p.stock,
      p.deliveryDays,
      'live',
      p.slug,
      p.description,
    )
    .run();
}

async function authorizeJob(request, env) {
  const expected = env.LUME_JOB_TOKEN || '';
  const admin = env.LUME_ADMIN_TOKEN || '';
  const h = request.headers.get('authorization') || '';
  const bearer = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  if (expected && bearer && bearer === expected) return { ok: true };
  if (admin && bearer && bearer === admin) return { ok: true };
  const syncHeader = (request.headers.get('x-mm-sync-token') || '').trim();
  if (!syncHeader) return { ok: false };
  await env.LUME_DB.prepare(
    `CREATE TABLE IF NOT EXISTS sync_tokens (
       token TEXT PRIMARY KEY,
       purpose TEXT,
       used INTEGER DEFAULT 0,
       created_at TEXT DEFAULT CURRENT_TIMESTAMP
     )`,
  ).run();
  const row = await env.LUME_DB.prepare(
    `SELECT token FROM sync_tokens WHERE token=? AND used=0 LIMIT 1`,
  )
    .bind(syncHeader)
    .first();
  if (!row) return { ok: false };
  return { ok: true, syncToken: syncHeader };
}

/**
 * Wipe live catalog and import ~200 festive CJ products with real supplier photos.
 * Auth: LUME_JOB_TOKEN / LUME_ADMIN_TOKEN / unused x-mm-sync-token.
 */
export async function importChristmasCatalog(request, env) {
  try {
    const authz = await authorizeJob(request, env);
    if (!authz.ok) return json({ ok: false, error: 'Unauthorized' }, 401);

    const body = await request.json().catch(() => ({}));
    const target = Math.max(80, Math.min(220, Number(body.target || 200) || 200));
    const clearLive = body.clearLive !== false;

    let demoted = 0;
    if (clearLive) {
      const r = await env.LUME_DB.prepare(
        `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE status='live'`,
      ).run();
      demoted = r?.meta?.changes || 0;
    }

    const cjToken = await getCJToken(env);
    const byId = new Map();
    const errors = [];
    let scanned = 0;
    let listShape = null;

    // List payloads often expose only bigImage — accept 1 photo here, enrich below.
    for (const q of SEARCHES) {
      if (byId.size >= target * 1.5) break;
      for (const page of [1, 2, 3]) {
        if (byId.size >= target * 1.5) break;
        try {
          const flat = await searchCj(cjToken, q, page, 20);
          if (!listShape) {
            listShape = { ...flat.meta, shape: flat.shape, total: flat.total, n: flat.items.length };
          }
          const items = flat.items || [];
          scanned += items.length;
          for (const raw of items) {
            const n = normalizeCj(raw, { minImages: 1 });
            if (!n) continue;
            if (!byId.has(n.id)) byId.set(n.id, n);
          }
          await new Promise((r) => setTimeout(r, 160));
        } catch (e) {
          errors.push({ q, page, error: e.message || String(e) });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    // Enrich from CJ detail/variants so every live SKU has ≥2 real supplier photos.
    const enriched = [];
    for (const p of byId.values()) {
      if (enriched.length >= target) break;
      try {
        let images = Array.isArray(p.images) ? p.images.slice() : [];
        if (images.length < 2) {
          const fresh = await refreshProductFromCJ(env, p.id);
          if (fresh?.images?.length) images = fresh.images;
          if (fresh?.image) p.image = fresh.image;
          if (fresh?.costUSD > 0) p.cost = fresh.costUSD;
          if (fresh?.stock > 0) p.stock = fresh.stock;
          if (fresh?.deliveryDays) p.deliveryDays = fresh.deliveryDays;
          await new Promise((r) => setTimeout(r, 120));
        }
        images = images.filter((u) => u && !/unsplash\.com|pexels\.com|picsum\.photos/i.test(u));
        if (images.length < 2) continue;
        if (!(p.stock > 0)) continue;
        p.images = images.slice(0, 12);
        p.image = images[0];
        enriched.push(p);
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }

    const selected = enriched
      .sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0))
      .slice(0, target);

    let upserted = 0;
    for (const p of selected) {
      try {
        await upsertLive(env, p);
        upserted += 1;
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }

    if (authz.syncToken) {
      await env.LUME_DB.prepare(`UPDATE sync_tokens SET used=1 WHERE token=?`)
        .bind(authz.syncToken)
        .run();
    }

    const counts = await env.LUME_DB.prepare(
      `SELECT status, COUNT(*) AS c FROM products GROUP BY status`,
    ).all();
    const cjLive = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products WHERE supplier='CJ' AND status='live'`,
    ).first();
    const multi = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products
       WHERE status='live' AND image_urls IS NOT NULL AND length(image_urls) > 80`,
    ).first();

    return json({
      ok: true,
      target,
      demoted,
      found: byId.size,
      enriched: enriched.length,
      upserted,
      scanned,
      listShape,
      cjLive: Number(cjLive?.c || 0),
      multiApprox: Number(multi?.c || 0),
      counts: counts.results || [],
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Christmas import failed' }, 502);
  }
}
