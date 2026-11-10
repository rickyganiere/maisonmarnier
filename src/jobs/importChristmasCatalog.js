import { json } from '../lib/json.js';
import { extractCjImages, getCJToken } from '../cj.js';
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

const JUNK =
  /slipper|sock|earring|ring|necklace|bracelet|wig|phone case|cable|charger|underwear|bra|tattoo|sex|adult/i;

const FESTIVE =
  /christmas|xmas|santa|noel|holiday|festive|snow|snowflake|reindeer|wreath|stocking|ornament|garland|advent|nativity|gingerbread|mistletoe|pine cone|tree topper|bauble|elf|nutcracker|hanukkah|new year/i;

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
    throw new Error(d.message || `CJ search failed for ${q}`);
  }
  const groups = Array.isArray(d.data?.content) ? d.data.content : [];
  return groups.flatMap((g) => (Array.isArray(g.productList) ? g.productList : []));
}

function normalizeCj(x, { minImages = 1 } = {}) {
  const rawName = String(x.nameEn || x.name || '').slice(0, 240);
  if (!rawName || JUNK.test(rawName)) return null;
  const blob = `${rawName} ${x.threeCategoryName || ''} ${x.twoCategoryName || ''} ${x.oneCategoryName || ''}`;
  if (!FESTIVE.test(blob)) return null;
  const cost = Number(x.nowPrice || x.sellPrice || 0) || 0;
  if (!(cost > 0)) return null;
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || 0) || 0;
  if (stock <= 0) return null;
  const images = extractCjImages(x);
  const image = safeUrl(images[0] || x.bigImage || x.productImage || '', '');
  if (!image) return null;
  if (images.length < minImages) return null;
  // Reject Unsplash / stock filler hosts if somehow present
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

    // Prefer multi-image first, then fill with single-image festive SKUs if needed
    for (const minImages of [2, 1]) {
      if (byId.size >= target) break;
      for (const q of SEARCHES) {
        if (byId.size >= target * 1.5) break;
        for (const page of [1, 2]) {
          if (byId.size >= target * 1.5) break;
          try {
            const items = await searchCj(cjToken, q, page, 20);
            for (const raw of items) {
              const n = normalizeCj(raw, { minImages });
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
    }

    // Prefer richer galleries when selecting
    const selected = [...byId.values()]
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
      upserted,
      cjLive: Number(cjLive?.c || 0),
      multiApprox: Number(multi?.c || 0),
      counts: counts.results || [],
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Christmas import failed' }, 502);
  }
}
