import { collectCjProducts, refreshProductFromCJ } from '../cj.js';
import { cleanProductName, mapMaisonCategory, suggestedCompareEur, suggestedRetailEur } from '../lib/merch.js';
import { productImages, serializeImageUrls } from '../lib/images.js';
import { slugify } from '../lib/slugify.js';
import { json } from '../lib/json.js';

const DAILY_TARGET = 50;
const SEARCHES = [
  'ceramic vase home decor',
  'decorative candle holder home',
  'decorative tray home decor',
  'wall decor sculpture',
  'tabletop ornament home decor',
  'cushion cover decorative',
  'decorative lamp home',
  'artificial flower home decor',
  'planter pot home decor',
  'storage basket home decor',
  'decorative mirror home',
  'christmas home decoration',
];

const HOME_DECOR = /\b(vase|candle|candlestick|holder|lantern|lamp|light|mirror|wall decor|wall art|sculpture|statue|figurine|ornament|decorative|decoration|home decor|tray|coaster|cushion|pillow|throw|blanket|rug|doormat|basket|planter|flower|wreath|garland|clock|frame|tapestry|centerpiece|christmas|xmas|holiday|santa|tree decor)\b/i;
const REJECT = /\b(car|auto|automotive|vehicle|motorcycle|truck|trunk|phone|tablet|computer|camera|headphone|charger|cable|gaming|drone|baby|infant|stroller|diaper|pet|dog|cat|aquarium|jewelry|necklace|earring|bracelet|makeup|wig|shoe|clothing|shirt|dress|underwear|tool|drill|saw|replacement|spare part|engine|filter|rack|bracket|mount|cabinet hardware|faucet|pipe|toilet|sex|adult)\b/i;

export function isHomeDecorCandidate(product) {
  const text = `${product?.name || ''} ${product?.category || ''}`.replace(/\s+/g, ' ').trim();
  return Boolean(text && HOME_DECOR.test(text) && !REJECT.test(text));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function existingSupplierIds(env, ids) {
  const found = new Set();
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80);
    if (!chunk.length) continue;
    const { results = [] } = await env.LUME_DB.prepare(
      `SELECT supplier_product_id FROM products WHERE supplier_product_id IN (${chunk.map(() => '?').join(',')})`,
    ).bind(...chunk).all();
    for (const row of results) found.add(String(row.supplier_product_id));
  }
  return found;
}

async function prepareCandidate(env, product) {
  if (!isHomeDecorCandidate(product)) return { skip: 'not_home_decor' };
  let images = productImages(
    { image_url: product.image, image_urls: product.images },
    { max: 12, allowStock: false },
  );
  let cost = Number(product.costUSD || 0) || 0;
  let stock = Number(product.stock || product.verifiedStock || 0) || 0;
  let deliveryDays = String(product.deliveryDays || '7-15');
  let rawName = String(product.name || '').trim();
  let supplierSku = String(product.sku || '');

  if (images.length < 4 || !(cost > 0) || !(stock > 0)) {
    const fresh = await refreshProductFromCJ(env, product.id);
    images = productImages(
      { image_url: fresh?.image || images[0] || '', image_urls: [...(fresh?.images || []), ...images] },
      { max: 12, allowStock: false },
    );
    if (Number(fresh?.costUSD || 0) > 0) cost = Number(fresh.costUSD);
    if (Number(fresh?.stock || 0) > 0) stock = Number(fresh.stock);
    if (fresh?.deliveryDays) deliveryDays = String(fresh.deliveryDays);
    if (fresh?.name) rawName = String(fresh.name);
    if (fresh?.sku) supplierSku = String(fresh.sku);
  }

  if (images.length < 4) return { skip: 'fewer_than_4_photos' };
  if (!(cost > 0)) return { skip: 'missing_cost' };
  if (!(stock > 0)) return { skip: 'out_of_stock' };
  if (!isHomeDecorCandidate({ name: rawName, category: product.category })) return { skip: 'not_home_decor' };

  const name = cleanProductName(rawName) || rawName;
  const retail = suggestedRetailEur(cost);
  if (!(retail > 0)) return { skip: 'missing_price' };
  const supplierId = String(product.id);
  return {
    product: {
      supplierId,
      supplierSku,
      sku: ('MM-CJ-' + String(supplierSku || supplierId).replace(/[^A-Za-z0-9]/g, '').slice(-18)).toUpperCase(),
      name,
      slug: slugify(`${name}-${supplierId.slice(-6)}`),
      category: mapMaisonCategory(name, product.category),
      cost,
      retail,
      compare: suggestedCompareEur(retail),
      stock,
      deliveryDays,
      images,
      description: `A considered home decoration piece, selected for Maison Marnier.\n\n${name}`,
    },
  };
}

async function insertLiveProduct(env, p) {
  return env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'live',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO NOTHING RETURNING id`,
  ).bind(
    p.sku,
    'CJ',
    p.supplierId,
    p.supplierSku,
    p.name,
    p.images[0],
    serializeImageUrls(p.images),
    p.cost,
    p.retail,
    p.compare,
    p.category,
    p.stock,
    p.deliveryDays,
    p.slug,
    p.description,
  ).first();
}

export async function runDailyHomeDecorImport(env, { target = DAILY_TARGET, source = 'cron', force = false } = {}) {
  const safeTarget = Math.max(1, Math.min(DAILY_TARGET, Number(target) || DAILY_TARGET));
  const now = new Date();
  const runDate = now.toISOString().slice(0, 10);
  const runKey = force ? `${runDate}-${source}-${now.getTime()}` : runDate;
  const lock = await env.LUME_DB.prepare(
    `INSERT INTO catalog_import_runs (run_key,run_date,source,status,target,started_at)
     VALUES (?,?,?,'running',?,CURRENT_TIMESTAMP)
     ON CONFLICT(run_key) DO NOTHING RETURNING id`,
  ).bind(runKey, runDate, source, safeTarget).first();
  if (!lock) {
    const previous = await env.LUME_DB.prepare(
      `SELECT run_key,run_date,source,status,target,imported,scanned,skipped,started_at,finished_at
       FROM catalog_import_runs WHERE run_key=?`,
    ).bind(runKey).first();
    return { ok: previous?.status === 'completed', alreadyRan: true, ...previous };
  }

  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  const reasons = {};
  const errors = [];
  try {
    const pool = new Map();
    const dayNumber = Math.floor(now.getTime() / 86400000);
    for (const [index, q] of SEARCHES.entries()) {
      if (pool.size >= safeTarget * 5) break;
      try {
        const result = await collectCjProducts(env, {
          q,
          limit: 45,
          startPage: 1 + ((dayNumber + index) % 5),
          orderBy: 1,
          sort: 'desc',
        });
        scanned += Number(result.scanned || 0);
        for (const product of result.products || []) {
          const id = String(product?.id || '');
          if (id && isHomeDecorCandidate(product) && !pool.has(id)) pool.set(id, product);
        }
      } catch (error) {
        errors.push({ query: q, error: error?.message || String(error) });
      }
    }

    const ids = [...pool.keys()];
    const existing = await existingSupplierIds(env, ids);
    for (const id of existing) pool.delete(id);

    for (const product of pool.values()) {
      if (imported >= safeTarget) break;
      try {
        const prepared = await prepareCandidate(env, product);
        if (!prepared.product) {
          skipped += 1;
          reasons[prepared.skip] = (reasons[prepared.skip] || 0) + 1;
          continue;
        }
        const row = await insertLiveProduct(env, prepared.product);
        if (row?.id) imported += 1;
        else skipped += 1;
      } catch (error) {
        skipped += 1;
        errors.push({ id: String(product?.id || ''), error: error?.message || String(error) });
      }
      await sleep(120);
    }

    await env.LUME_DB.prepare(
      `UPDATE catalog_import_runs SET status='completed',imported=?,scanned=?,skipped=?,details=?,finished_at=CURRENT_TIMESTAMP
       WHERE run_key=?`,
    ).bind(imported, scanned, skipped, JSON.stringify({ reasons, errors: errors.slice(0, 20) }), runKey).run();
    return { ok: true, runKey, runDate, target: safeTarget, imported, scanned, skipped, reasons, errors: errors.slice(0, 12) };
  } catch (error) {
    await env.LUME_DB.prepare(
      `UPDATE catalog_import_runs SET status='failed',imported=?,scanned=?,skipped=?,details=?,finished_at=CURRENT_TIMESTAMP
       WHERE run_key=?`,
    ).bind(imported, scanned, skipped, JSON.stringify({ error: error?.message || String(error), reasons }), runKey).run();
    throw error;
  }
}

export async function importDailyHomeDecor(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runDailyHomeDecorImport(env, {
      target: body?.target || DAILY_TARGET,
      source: 'admin',
      force: body?.force === true,
    });
    return json(result, result.ok ? 200 : 409);
  } catch (error) {
    return json({ ok: false, error: error?.message || 'Daily home-decor import failed' }, 502);
  }
}
