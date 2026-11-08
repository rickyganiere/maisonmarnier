import { json } from '../lib/json.js';
import { getCJToken } from '../cj.js';
import { cleanProductName, mapMaisonCategory, suggestedCompareEur, suggestedRetailEur } from '../lib/merch.js';
import { slugify } from '../lib/slugify.js';
import { safeUrl } from '../lib/escape.js';

const SEARCHES = [
  'ceramic vase',
  'table lamp',
  'floor lamp',
  'linen cushion',
  'throw blanket',
  'soy candle',
  'candle holder',
  'wall mirror',
  'wall art decor',
  'wooden tray',
  'rattan basket',
  'desk lamp',
  'night light home',
  'home fragrance diffuser',
  'decorative bowl',
];

const JUNK =
  /slipper|sock|earring|ring|necklace|hat|shoe|dress|pant|shirt|bra|underwear|wig|phone case|cable|charger/i;

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

function normalizeCj(x) {
  const rawName = String(x.nameEn || x.name || '').slice(0, 240);
  if (!rawName || JUNK.test(rawName)) return null;
  const cost = Number(x.nowPrice || x.sellPrice || 0) || 0;
  if (!(cost > 0)) return null;
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || 0) || 0;
  if (stock <= 0) return null;
  const image = safeUrl(x.bigImage || x.productImage || '', '');
  if (!image) return null;
  const name = cleanProductName(rawName) || rawName;
  const category = mapMaisonCategory(name, x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || '');
  // Skip apparel-ish categories after mapping if still junk
  if (!['Lighting', 'Objects', 'Textiles', 'Candles', 'Wall Decor', 'Seasonal', 'Furniture', 'Decor'].includes(category)) {
    return null;
  }
  const retail = suggestedRetailEur(cost);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name + '-' + String(x.id).slice(-6));
  const sku = ('LL-CJ-' + String(x.sku || x.id).replace(/[^A-Za-z0-9]/g, '').slice(-18)).toUpperCase();
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
    stock,
    deliveryDays: String(x.deliveryCycle || '7-15'),
    description: `A considered piece for calm interiors — curated for Maison Marnier.\n\n${name}`,
  };
}

async function upsertLive(env, p) {
  await env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier='CJ',
       supplier_sku=excluded.supplier_sku,
       name=excluded.name,
       image_url=excluded.image_url,
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

/** Replace SEED catalog with ~100 live CJ home-decor products. Gated by LUME_JOB_TOKEN. */
export async function replaceSeedWithCj(request, env) {
  try {
    const expected = env.LUME_JOB_TOKEN;
    if (!expected) return json({ ok: false, error: 'LUME_JOB_TOKEN not configured' }, 503);
    const h = request.headers.get('authorization') || '';
    const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
    if (!token || token !== expected) return json({ ok: false, error: 'Unauthorized' }, 401);

    const body = await request.json().catch(() => ({}));
    const target = Math.max(40, Math.min(120, Number(body.target || 100) || 100));
    const demoteSeed = body.demoteSeed !== false;

    const cjToken = await getCJToken(env);
    const byId = new Map();
    const errors = [];

    for (const q of SEARCHES) {
      if (byId.size >= target * 1.4) break;
      try {
        const items = await searchCj(cjToken, q, 1, 24);
        for (const raw of items) {
          const n = normalizeCj(raw);
          if (!n) continue;
          if (!byId.has(n.id)) byId.set(n.id, n);
        }
      } catch (e) {
        errors.push({ q, error: e.message || String(e) });
      }
    }

    const selected = [...byId.values()].slice(0, target);
    let upserted = 0;
    for (const p of selected) {
      try {
        await upsertLive(env, p);
        upserted += 1;
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }

    let seedDemoted = 0;
    if (demoteSeed) {
      const r = await env.LUME_DB.prepare(
        `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP
         WHERE supplier='SEED' AND status='live'`,
      ).run();
      seedDemoted = r?.meta?.changes || 0;
    }

    const counts = await env.LUME_DB.prepare(
      `SELECT status, COUNT(*) AS c FROM products GROUP BY status`,
    ).all();
    const cjLive = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products WHERE supplier='CJ' AND status='live'`,
    ).first();

    return json({
      ok: true,
      target,
      found: byId.size,
      upserted,
      seedDemoted,
      cjLive: Number(cjLive?.c || 0),
      counts: counts.results || [],
      errors: errors.slice(0, 8),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Replace job failed' }, 502);
  }
}
