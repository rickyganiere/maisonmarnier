import { json } from '../lib/json.js';
import { slugify } from '../lib/slugify.js';
import { safeUrl } from '../lib/escape.js';
import {
  galleryValidationError,
  hasMultiRealPhotos,
  isStorefrontListable,
  productImages,
  serializeImageUrls,
} from '../lib/images.js';
import {
  cleanProductName,
  mapMaisonCategory,
  suggestedCompareEur,
  suggestedRetailEur,
} from '../lib/merch.js';
import { collectCjProducts, lookupCjCostUsd, refreshProductFromCJ } from '../cj.js';
import {
  exampleExternalProducts,
  normalizeSupplierCode,
  prepareExternalDraft,
} from '../suppliers/external.js';

const PRODUCT_COLS =
  'id,lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,created_at,updated_at';

function publishValidationError(row) {
  if (!row) return 'Product not found';
  if (!row.name || !row.image_url) return 'Title and image are required before publishing';
  const galleryErr = galleryValidationError(row, { min: 2 });
  if (galleryErr) return galleryErr;
  if (!(Number(row.retail_price_eur) > 0)) return 'Set a retail price before publishing';
  if (!(Number(row.supplier_cost_usd) > 0)) {
    return 'Supplier cost is missing/zero. Review the real cost before publishing.';
  }
  if (Number(row.stock) <= 0) return 'Product is out of stock';
  return null;
}

function withGalleryMeta(row) {
  if (!row) return row;
  const images = productImages(row, { max: 12, allowStock: false });
  return {
    ...row,
    images,
    image_count: images.length,
    published_at: row.published_at || null,
  };
}

export async function listLumeProducts(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products ORDER BY id DESC LIMIT 500`,
    ).all();
    return json({ ok: true, products: (r.results || []).map(withGalleryMeta) });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Database error' }, 500);
  }
}

export async function listPublishedProducts(env, { q = '', limit = 48 } = {}) {
  try {
    const lim = Math.max(1, Math.min(200, Number(limit) || 48));
    const query = String(q || '').trim().slice(0, 80).toLowerCase();
    let r;
    if (query) {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,stock,description,published_at
         FROM products WHERE status='live'
         AND (lower(name) LIKE ? OR lower(category) LIKE ? OR lower(ifnull(description,'')) LIKE ?)
         ORDER BY published_at DESC,id DESC LIMIT ?`,
      )
        .bind(`%${query}%`, `%${query}%`, `%${query}%`, lim * 3)
        .all();
    } else {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,stock,description,published_at
         FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`,
      )
        .bind(Math.min(600, lim * 4))
        .all();
    }
    const products = (r.results || [])
      .filter((p) => isStorefrontListable(p, { minPhotos: 2 }))
      .slice(0, lim)
      .map(withGalleryMeta);
    return json({ ok: true, products, q: query || undefined });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not load products' }, 500);
  }
}

async function prepareCjDraft(env, p, { enrich = false } = {}) {
  if (!p?.id || !['string', 'number'].includes(typeof p.id)) throw new Error('Missing product id');
  let images = Array.isArray(p.images) ? p.images : Array.isArray(p.image_urls) ? p.image_urls : [];
  let cost = Number(p.costUSD || 0) || 0;
  let stock = Number(p.stock || 0) || 0;
  let deliveryDays = String(p.deliveryDays || '');
  let nameRaw = String(p.name || '').slice(0, 240);
  let skuRaw = String(p.sku || '');
  let image = safeUrl(p.image || images[0] || '', '');

  // ListV2 often omits prices or returns ranges like "1.20-3.50".
  // Full enrich when asked; otherwise only resolve missing cost via a light CJ lookup.
  if (enrich) {
    try {
      const fresh = await refreshProductFromCJ(env, p.id);
      if (fresh) {
        if (Array.isArray(fresh.images) && fresh.images.length) images = [...fresh.images, ...images];
        if (fresh.image) image = safeUrl(fresh.image, image);
        if (fresh.costUSD > 0) cost = Number(fresh.costUSD) || cost;
        if (fresh.stock > 0) stock = Number(fresh.stock) || stock;
        if (fresh.deliveryDays) deliveryDays = String(fresh.deliveryDays);
        if (fresh.name) nameRaw = String(fresh.name).slice(0, 240);
        if (fresh.sku) skuRaw = String(fresh.sku);
      }
    } catch {
      /* keep payload images if detail fetch fails */
    }
  } else if (!(cost > 0)) {
    try {
      const lookedUp = await lookupCjCostUsd(env, p.id);
      if (lookedUp > 0) cost = lookedUp;
    } catch {
      /* leave cost at 0 if CJ detail is unavailable */
    }
  }

  images = productImages({ image_url: image, image_urls: images }, { max: 12 });
  image = images[0] || '';

  let retail = Number(p.retailPriceEUR || 0) || 0;
  cost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  stock = Number.isFinite(stock) && stock > 0 ? stock : 0;
  retail = Number.isFinite(retail) && retail > 0 ? retail : 0;
  if (!(cost > 0)) {
    throw new Error('Missing supplier cost — not imported');
  }
  if (!(retail > 0)) retail = suggestedRetailEur(cost);

  const name = cleanProductName(nameRaw) || nameRaw || 'Untitled';
  const category = mapMaisonCategory(name, p.category);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name);
  const description = `A considered piece for calm interiors — curated for Maison Marnier.\n\n${name}`;
  const sku = ('LL-CJ-' + String(skuRaw || p.id).replace(/[^A-Za-z0-9]/g, '').slice(-18)).toUpperCase();
  const gallery = serializeImageUrls(images);

  const statement = env.LUME_DB.prepare(
    `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO NOTHING RETURNING id`,
  )
    .bind(
      sku,
      'CJ',
      String(p.id),
      skuRaw,
      name,
      image,
      gallery,
      cost,
      retail,
      compare,
      category,
      stock,
      deliveryDays,
      'draft',
      slug,
      description,
    );

  return {
    statement,
    draft: {
      lumeSku: sku,
      status: 'draft',
      name,
      category,
      slug,
      imageCount: images.length,
      costUSD: cost,
      retailPriceEUR: retail,
    },
  };
}

export async function importLumeProduct(request, env) {
  try {
    const p = await request.json();
    if (!p || !p.id || !p.name) return json({ ok: false, error: 'Missing product id/name' }, 400);
    const { statement, draft } = await prepareCjDraft(env, p, { enrich: !Array.isArray(p.images) && !p.skipEnrich });
    const saved = await statement.first();
    return json({ ok: true, alreadyImported: !saved, ...draft });
  } catch (e) {
    const message = e.message || 'Import failed';
    const missingCost = /missing supplier cost/i.test(message);
    return json({ ok: false, error: message }, missingCost ? 400 : 500);
  }
}

/**
 * Bulk import:
 * - { products: [...] }
 * - or { q, limit: 50|100 } to pull from CJ search
 */
export async function importLumeProductsBulk(request, env) {
  try {
    const body = await request.json();
    let candidates = Array.isArray(body?.products) ? body.products : [];

    if (Array.isArray(body?.products) && !candidates.length) {
      return json({ ok: false, error: 'Select at least one product to import.' }, 400);
    }
    if (!Array.isArray(body?.products)) {
      const limit = Math.max(1, Math.min(100, Number(body?.limit || 50) || 50));
      const q = String(body?.q || body?.query || '').trim().slice(0, 100);
      const collected = await collectCjProducts(env, {
        q,
        limit,
        categoryId: body?.categoryId || '',
        productFlag: body?.productFlag,
        orderBy: body?.orderBy,
        sort: body?.sort || '',
        freeShipping: body?.freeShipping,
        countryCode: body?.countryCode || '',
      });
      candidates = collected.products;
    }

    const imported = [];
    const skipped = [];
    const pending = [];
    let enriched = 0;
    let skippedNoPrice = 0;
    for (const p of candidates.slice(0, 100)) {
      try {
        // Space out detail lookups when list rows omit cost (CJ rate limits ~1 rps).
        const needsEnrich = !(Number(p.costUSD) > 0);
        if (needsEnrich && enriched > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
        const { statement, draft } = await prepareCjDraft(env, p);
        if (needsEnrich) enriched += 1;
        pending.push({
          statement,
          item: {
            id: p.id,
            lumeSku: draft.lumeSku,
            imageCount: draft.imageCount,
            costUSD: draft.costUSD,
          },
        });
      } catch (e) {
        if (/missing supplier cost/i.test(e.message || '')) skippedNoPrice += 1;
        skipped.push({ id: p?.id, error: e.message || 'Import failed' });
      }
    }
    const results = pending.length ? await env.LUME_DB.batch(pending.map(p => p.statement)) : [];
    let alreadyImported = 0;
    for (const [index, result] of results.entries()) {
      if (result.results.length) imported.push(pending[index].item);
      else alreadyImported += 1;
    }

    return json({
      ok: true,
      requested: candidates.length,
      imported: imported.length,
      skipped: skipped.length + alreadyImported,
      alreadyImported,
      enriched,
      skippedNoPrice,
      items: imported,
      errors: skipped.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Bulk import failed' }, 500);
  }
}

export async function updateLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return json({ ok: false, error: 'Invalid product id' }, 400);
    }
    const current = await env.LUME_DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products WHERE id=?`,
    ).bind(id).first();
    if (!current) return json({ ok: false, error: 'Product not found' }, 404);
    if (p.revision !== undefined && p.revision !== current.updated_at) {
      return json({ ok: false, conflict: true, error: 'This product changed. Reopen the editor to load the latest values.' }, 409);
    }

    const live = current.status === 'live';
    const name = p.name === undefined ? current.name : String(p.name ?? '').trim().slice(0, 240);
    if (!name) return json({ ok: false, error: 'Product title is required' }, 400);
    const slug = live ? current.slug : slugify((p.slug ?? current.slug) || name);
    const description = p.description === undefined ? current.description : String(p.description ?? '').trim().slice(0, 5000);
    const category = p.category === undefined ? current.category : String(p.category ?? '').trim().slice(0, 160);
    const image = p.image_url === undefined ? current.image_url : safeUrl(p.image_url, '');
    if (String(p.image_url ?? '').trim() && !image) {
      return json({ ok: false, error: 'Main image URL must be http(s) or a site path' }, 400);
    }
    const galleryInput = Array.isArray(p.image_urls) ? p.image_urls : String(p.image_urls ?? '').split(/[\n,]+/);
    const gallery = p.image_urls === undefined ? current.image_urls : serializeImageUrls(galleryInput);
    const retail = Number(p.retail_price_eur ?? current.retail_price_eur);
    const cost = p.supplier_cost_usd === undefined
      ? current.supplier_cost_usd
      : Number(p.supplier_cost_usd || 0);
    let compare = p.compare_at_price_eur === undefined
      ? current.compare_at_price_eur
      : Number(p.compare_at_price_eur || 0);
    if (![retail, cost, compare].every((amount) => Number.isFinite(Number(amount)) && Number(amount) >= 0)) {
      return json({ ok: false, error: 'Enter a valid, non-negative amount for each price and cost.' }, 400);
    }
    if (p.compare_at_price_eur !== undefined && !compare) {
      compare = retail > 0 ? suggestedCompareEur(retail) : null;
    }
    if (live) {
      if (retail <= 0) return json({ ok: false, error: 'Published products need a retail price above zero.' }, 400);
      const galleryError = galleryValidationError({ image_url: image, image_urls: gallery }, { min: 2 });
      if (galleryError) return json({ ok: false, error: galleryError }, 400);
    }

    const saved = await env.LUME_DB.prepare(
      `UPDATE products SET name=?,slug=?,description=?,image_url=?,image_urls=?,category=?,retail_price_eur=?,
       compare_at_price_eur=?,supplier_cost_usd=?,updated_at=STRFTIME('%Y-%m-%d %H:%M:%f','now')
       WHERE id=? AND status=? AND updated_at IS ? RETURNING ${PRODUCT_COLS}`,
    ).bind(name, slug, description, image, gallery, category, retail, compare, cost,
      id, current.status, current.updated_at).first();
    if (!saved) {
      return json({ ok: false, conflict: true, error: 'This product changed. Reopen the editor to load the latest values.' }, 409);
    }
    return json({ ok: true, id, slug, status: 'saved', product: withGalleryMeta(saved) });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Save failed' }, 500);
  }
}

export async function publishLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: 'Missing product id' }, 400);
    const row = await env.LUME_DB.prepare(
      'SELECT id,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,stock,slug FROM products WHERE id=?',
    )
      .bind(id)
      .first();
    const err = publishValidationError(row);
    if (err === 'Product not found') return json({ ok: false, error: err }, 404);
    if (err) return json({ ok: false, error: err }, 400);
    const slug = slugify(row.slug || row.name);
    const images = productImages(row, { max: 12, allowStock: false });
    const saved = await env.LUME_DB.prepare(
      "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(slug, images[0] || row.image_url, serializeImageUrls(images), id)
      .run();
    if (!saved.meta.changes) return json({ ok: false, error: 'Product not found' }, 404);
    return json({ ok: true, id, slug, status: 'live', published_at: new Date().toISOString(), image_count: images.length });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Publish failed' }, 500);
  }
}

/** Publish every draft that passes the same checks as publishLumeProduct; skip invalid. */
export async function publishAllLumeProducts(request, env) {
  try {
    const drafts = await env.LUME_DB.prepare(
      `SELECT id,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,stock,slug
       FROM products WHERE status!='live' ORDER BY id ASC`,
    ).all();
    const rows = drafts.results || [];
    let published = 0;
    let skipped = 0;
    const errors = [];
    for (const row of rows) {
      const err = publishValidationError(row);
      if (err) {
        skipped += 1;
        errors.push({ id: row.id, error: err });
        continue;
      }
      try {
        const slug = slugify(row.slug || row.name);
        const images = productImages(row, { max: 12, allowStock: false });
        const saved = await env.LUME_DB.prepare(
          "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
          .bind(slug, images[0] || row.image_url, serializeImageUrls(images), row.id)
          .run();
        if (!saved.meta.changes) throw new Error('Product no longer exists');
        published += 1;
      } catch (e) {
        skipped += 1;
        errors.push({ id: row.id, error: e.message || 'Publish failed' });
      }
    }
    return json({ ok: true, published, skipped, errors, total: rows.length });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Publish all failed' }, 500);
  }
}

/** Soft-remove from storefront (status=draft). Keeps the row for later. */
export async function unpublishLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: 'Missing product id' }, 400);
    const row = await env.LUME_DB.prepare('SELECT id,status FROM products WHERE id=?')
      .bind(id)
      .first();
    if (!row) return json({ ok: false, error: 'Product not found' }, 404);
    await env.LUME_DB.prepare(
      `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(id)
      .run();
    return json({ ok: true, id, status: 'draft' });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Unpublish failed' }, 500);
  }
}

/** Permanently delete selected rows that are still drafts. */
export async function deleteLumeDrafts(request, env) {
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 500 ||
      !body.ids.every(id => Number.isSafeInteger(id) && id > 0)) {
    return json({ ok: false, error: 'Select between 1 and 500 valid draft products.' }, 400);
  }
  const ids = [...new Set(body.ids)];
  try {
    const { results } = await env.LUME_DB.prepare(
      "DELETE FROM products WHERE status='draft' AND id IN (SELECT value FROM json_each(?)) RETURNING id",
    ).bind(JSON.stringify(ids)).all();
    return json({ ok: true, deleted: results.length, skipped: ids.length - results.length });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not delete drafts' }, 500);
  }
}

/** Permanently delete a single product row. */
export async function deleteLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: 'Missing product id' }, 400);
    const row = await env.LUME_DB.prepare('SELECT id,name FROM products WHERE id=?').bind(id).first();
    if (!row) return json({ ok: false, error: 'Product not found' }, 404);
    await env.LUME_DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
    return json({ ok: true, id, deleted: true, name: row.name || '' });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Delete failed' }, 500);
  }
}

/** Demote live SKUs that do not meet the multi-photo rule. */
export async function pruneThinLiveProducts(env) {
  const live = (
    await env.LUME_DB.prepare(
      `SELECT id,name,image_url,image_urls FROM products WHERE status='live'`,
    ).all()
  ).results || [];
  let demoted = 0;
  for (const row of live) {
    if (hasMultiRealPhotos(row, { min: 2 })) continue;
    await env.LUME_DB.prepare(
      `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(row.id)
      .run();
    demoted += 1;
  }
  return { scanned: live.length, demoted };
}

export async function refreshLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: 'Missing product id' }, 400);
    const row = await env.LUME_DB.prepare(
      `SELECT id,supplier,supplier_product_id,supplier_cost_usd,retail_price_eur,compare_at_price_eur,
              image_url,image_urls FROM products WHERE id=?`,
    )
      .bind(id)
      .first();
    if (!row) return json({ ok: false, error: 'Product not found' }, 404);
    if (row.supplier !== 'CJ' || !row.supplier_product_id) {
      return json({ ok: false, error: 'Only CJ products can be refreshed' }, 400);
    }
    const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
    const images = mergeProductGallery(row, fresh.images || []);
    const gallery = serializeImageUrls(images);
    const image = images[0] || fresh.image || row.image_url || '';
    const nextCost =
      fresh.costUSD > 0 ? Number(fresh.costUSD) : Number(row.supplier_cost_usd || 0) || 0;
    let nextRetail = Number(row.retail_price_eur || 0) || 0;
    let nextCompare = row.compare_at_price_eur == null ? null : Number(row.compare_at_price_eur);
    if (!(nextRetail > 0) && nextCost > 0) {
      nextRetail = suggestedRetailEur(nextCost);
      nextCompare = suggestedCompareEur(nextRetail);
    }
    await env.LUME_DB.prepare(
      `UPDATE products SET supplier_cost_usd=?,retail_price_eur=?,compare_at_price_eur=?,stock=?,delivery_days=?,
       image_url=CASE WHEN ?!='' THEN ? ELSE image_url END,
       image_urls=CASE WHEN ? IS NOT NULL THEN ? ELSE image_urls END,
       supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(
        nextCost,
        nextRetail,
        nextCompare,
        fresh.stock,
        fresh.deliveryDays,
        image,
        image,
        gallery,
        gallery,
        fresh.sku,
        fresh.sku,
        id,
      )
      .run();
    return json({
      ok: true,
      id,
      supplier_cost_usd: nextCost,
      retail_price_eur: nextRetail,
      compare_at_price_eur: nextCompare,
      stock: fresh.stock,
      delivery_days: fresh.deliveryDays,
      images,
      image_count: images.length,
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Refresh failed' }, 502);
  }
}

/**
 * Backfill supplier cost (+ suggested retail when retail is 0) for CJ drafts
 * that were imported from list rows without usable prices.
 */
export async function refreshMissingCjCosts(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(40, Number(body?.limit || 25) || 25));
    const rows = (
      await env.LUME_DB.prepare(
        `SELECT id,supplier_product_id,supplier_cost_usd,retail_price_eur,compare_at_price_eur
         FROM products
         WHERE status='draft' AND supplier='CJ' AND supplier_product_id IS NOT NULL
           AND IFNULL(supplier_cost_usd,0) <= 0
         ORDER BY id DESC
         LIMIT ?`,
      )
        .bind(limit)
        .all()
    ).results || [];

    let updated = 0;
    let stillMissing = 0;
    const errors = [];
    for (const [index, row] of rows.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      try {
        let cost = await lookupCjCostUsd(env, row.supplier_product_id);
        if (!(cost > 0)) {
          const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
          cost = Number(fresh?.costUSD || 0) || 0;
        }
        if (!(cost > 0)) {
          stillMissing += 1;
          continue;
        }
        let retail = Number(row.retail_price_eur || 0) || 0;
        let compare = row.compare_at_price_eur == null ? null : Number(row.compare_at_price_eur);
        if (!(retail > 0)) {
          retail = suggestedRetailEur(cost);
          compare = suggestedCompareEur(retail);
        }
        await env.LUME_DB.prepare(
          `UPDATE products SET supplier_cost_usd=?,retail_price_eur=?,compare_at_price_eur=?,
           updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        )
          .bind(cost, retail, compare, row.id)
          .run();
        updated += 1;
      } catch (e) {
        stillMissing += 1;
        errors.push({ id: row.id, error: e.message || 'Refresh failed' });
      }
    }

    const remaining = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS n FROM products
       WHERE status='draft' AND supplier='CJ' AND IFNULL(supplier_cost_usd,0) <= 0`,
    ).first();

    return json({
      ok: true,
      scanned: rows.length,
      updated,
      stillMissing,
      remaining: Number(remaining?.n || 0) || 0,
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Cost refresh failed' }, 500);
  }
}

function mergeProductGallery(row, freshImages = []) {
  const existing = productImages(row, { max: 12, allowStock: false });
  const fresh = (Array.isArray(freshImages) ? freshImages : []).filter(Boolean);
  return productImages(
    {
      image_url: fresh[0] || existing[0] || '',
      image_urls: [...fresh, ...existing],
    },
    { max: 12, allowStock: false },
  );
}

/**
 * Backfill galleries for CJ drafts with fewer than `minPhotos` real supplier photos.
 * Also fills missing cost/retail when the same CJ detail payload includes them.
 */
export async function refreshMissingCjPictures(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(40, Number(body?.limit || 25) || 25));
    const minPhotos = Math.max(2, Math.min(8, Number(body?.minPhotos || 2) || 2));
    const candidates = (
      await env.LUME_DB.prepare(
        `SELECT id,supplier_product_id,supplier_cost_usd,retail_price_eur,compare_at_price_eur,
                image_url,image_urls,stock,delivery_days,supplier_sku
         FROM products
         WHERE status='draft' AND supplier='CJ' AND supplier_product_id IS NOT NULL
         ORDER BY id DESC
         LIMIT 250`,
      ).all()
    ).results || [];

    const rows = candidates
      .filter((row) => !hasMultiRealPhotos(row, { min: minPhotos }))
      .slice(0, limit);

    let updated = 0;
    let stillMissing = 0;
    const errors = [];
    for (const [index, row] of rows.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
      try {
        const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
        const images = mergeProductGallery(row, fresh?.images || []);
        const gallery = serializeImageUrls(images);
        const image = images[0] || row.image_url || '';
        const nextCost =
          Number(fresh?.costUSD || 0) > 0
            ? Number(fresh.costUSD)
            : Number(row.supplier_cost_usd || 0) || 0;
        let nextRetail = Number(row.retail_price_eur || 0) || 0;
        let nextCompare = row.compare_at_price_eur == null ? null : Number(row.compare_at_price_eur);
        if (!(nextRetail > 0) && nextCost > 0) {
          nextRetail = suggestedRetailEur(nextCost);
          nextCompare = suggestedCompareEur(nextRetail);
        }
        const nextStock =
          Number(fresh?.stock || 0) > 0 ? Number(fresh.stock) : Number(row.stock || 0) || 0;
        const nextDelivery = String(fresh?.deliveryDays || row.delivery_days || '');
        const nextSku = String(fresh?.sku || row.supplier_sku || '');
        await env.LUME_DB.prepare(
          `UPDATE products SET image_url=?,image_urls=?,supplier_cost_usd=?,retail_price_eur=?,
           compare_at_price_eur=?,stock=?,delivery_days=?,
           supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
           updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        )
          .bind(
            image,
            gallery,
            nextCost,
            nextRetail,
            nextCompare,
            nextStock,
            nextDelivery,
            nextSku,
            nextSku,
            row.id,
          )
          .run();
        if (images.length >= minPhotos) updated += 1;
        else stillMissing += 1;
      } catch (e) {
        stillMissing += 1;
        errors.push({ id: row.id, error: e.message || 'Refresh failed' });
      }
    }

    const remainingPool = (
      await env.LUME_DB.prepare(
        `SELECT id,image_url,image_urls FROM products
         WHERE status='draft' AND supplier='CJ' AND supplier_product_id IS NOT NULL
         ORDER BY id DESC LIMIT 500`,
      ).all()
    ).results || [];
    const remaining = remainingPool.filter((row) => !hasMultiRealPhotos(row, { min: minPhotos })).length;

    return json({
      ok: true,
      scanned: rows.length,
      updated,
      stillMissing,
      remaining,
      minPhotos,
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Picture refresh failed' }, 500);
  }
}

export async function getLiveProducts(env, limit = 100) {
  const lim = Math.max(1, Math.min(200, Number(limit) || 100));
  const r = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`,
  )
    .bind(Math.min(600, lim * 4))
    .all();
  return (r.results || [])
    .filter((p) => isStorefrontListable(p, { minPhotos: 2 }))
    .slice(0, lim)
    .map(withGalleryMeta);
}

export async function getLiveProductsBySlugs(env, slugs) {
  const { results = [] } = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' AND slug IN (${slugs.map(() => '?').join(',')})`,
  ).bind(...slugs).all();
  const bySlug = new Map(results.filter((p) => isStorefrontListable(p, { minPhotos: 2 }))
    .map((p) => [p.slug, withGalleryMeta(p)]));
  return slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
}

export async function getLiveProductBySlug(env, slug) {
  const row = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' AND slug=? LIMIT 1`,
  )
    .bind(slug)
    .first();
  if (!row) return null;
  if (!isStorefrontListable(row, { minPhotos: 2 })) return null;
  return withGalleryMeta(row);
}

/**
 * Import drafts from any non-CJ supplier.
 * Body: { supplier: 'SPOCKET'|'SYNCEE'|'MANUAL'|…, products: [...] }
 * or { supplier, useExample: true } to load demo holiday payloads.
 */
export async function importExternalProducts(request, env) {
  try {
    const body = await request.json();
    const supplier = normalizeSupplierCode(body?.supplier || body?.code || 'EXT');
    let candidates = Array.isArray(body?.products) ? body.products : [];
    if (body?.useExample) candidates = exampleExternalProducts();
    if (!candidates.length) {
      return json({ ok: false, error: 'Provide products[] or set useExample: true.' }, 400);
    }

    const imported = [];
    const skipped = [];
    const pending = [];
    for (const p of candidates.slice(0, 100)) {
      try {
        const { statement, draft } = prepareExternalDraft(env, supplier, p);
        pending.push({
          statement,
          item: {
            id: draft.supplierProductId,
            lumeSku: draft.lumeSku,
            supplier: draft.supplier,
            imageCount: draft.imageCount,
            name: draft.name,
          },
        });
      } catch (e) {
        skipped.push({ id: p?.id || p?.sku, error: e.message || 'Import failed' });
      }
    }

    const results = pending.length ? await env.LUME_DB.batch(pending.map((p) => p.statement)) : [];
    let alreadyImported = 0;
    for (const [index, result] of results.entries()) {
      if (result.results?.length) imported.push(pending[index].item);
      else alreadyImported += 1;
    }

    return json({
      ok: true,
      supplier,
      requested: candidates.length,
      imported: imported.length,
      skipped: skipped.length + alreadyImported,
      alreadyImported,
      items: imported,
      errors: skipped.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'External import failed' }, 500);
  }
}
