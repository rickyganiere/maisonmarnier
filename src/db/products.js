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
import { collectCjProducts, refreshProductFromCJ } from '../cj.js';

const PRODUCT_COLS =
  'id,lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,created_at';

function publishValidationError(row) {
  if (!row) return 'Product not found';
  if (!row.name || !row.image_url) return 'Title and image are required before publishing';
  const galleryErr = galleryValidationError(row, { min: 2 });
  if (galleryErr) return galleryErr;
  if (!(Number(row.retail_price_eur) > 0)) return 'Set a retail price before publishing';
  if (!(Number(row.supplier_cost_usd) > 0)) {
    return 'CJ cost is missing/zero. Review the real variant cost before publishing.';
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

async function upsertImportedCjProduct(env, p, { minImages = 4 } = {}) {
  if (!p || !p.id) throw new Error('Missing product id');
  const min = Math.max(3, Math.min(8, Number(minImages) || 4));
  let images = Array.isArray(p.images) ? p.images : Array.isArray(p.image_urls) ? p.image_urls : [];
  let cost = Number(p.costUSD || 0) || 0;
  let stock = Number(p.stock || 0) || 0;
  let deliveryDays = String(p.deliveryDays || '');
  let nameRaw = String(p.name || '').slice(0, 240);
  let skuRaw = String(p.sku || '');
  let image = safeUrl(p.image || images[0] || '', '');

  // Enrich from CJ detail unless bulk path already has enough photos.
  if (!p.skipEnrich) {
    try {
      const fresh = await refreshProductFromCJ(env, p.id);
      if (fresh) {
        if (Array.isArray(fresh.images) && fresh.images.length) images = fresh.images;
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
  }

  images = (images || []).map((u) => safeUrl(u, '')).filter(Boolean);
  if (!image && images[0]) image = images[0];
  if (images.length < min) {
    throw new Error(`Need at least ${min} supplier photos (found ${images.length})`);
  }

  let retail = Number(p.retailPriceEUR || 0) || 0;
  if (!(retail > 0) && cost > 0) retail = suggestedRetailEur(cost);
  if (!(retail > 0)) throw new Error('Missing retail price');

  const name = cleanProductName(nameRaw) || nameRaw || 'Untitled';
  const category = mapMaisonCategory(name, p.category);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name);
  const description = `A considered piece for calm interiors — curated for Maison Marnier.\n\n${name}`;
  const sku = ('LL-CJ-' + String(skuRaw || p.id).replace(/[^A-Za-z0-9]/g, '').slice(-18)).toUpperCase();
  const gallery = serializeImageUrls(images);

  await env.LUME_DB.prepare(
    `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier_sku=excluded.supplier_sku,name=excluded.name,image_url=excluded.image_url,image_urls=excluded.image_urls,
       supplier_cost_usd=excluded.supplier_cost_usd,retail_price_eur=excluded.retail_price_eur,
       compare_at_price_eur=excluded.compare_at_price_eur,category=excluded.category,
       stock=excluded.stock,delivery_days=excluded.delivery_days,slug=excluded.slug,
       description=CASE WHEN products.description IS NULL OR products.description='' THEN excluded.description ELSE products.description END,
       updated_at=CURRENT_TIMESTAMP`,
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
    )
    .run();

  return {
    ok: true,
    lumeSku: sku,
    status: 'draft',
    name,
    category,
    slug,
    imageCount: images.length,
  };
}

export async function importLumeProduct(request, env) {
  try {
    const p = await request.json();
    if (!p || !p.id || !p.name) return json({ ok: false, error: 'Missing product id/name' }, 400);
    const minImages = Math.max(3, Math.min(8, Number(p.minImages || 4) || 4));
    const result = await upsertImportedCjProduct(env, p, { minImages });
    return json(result);
  } catch (e) {
    return json({ ok: false, error: e.message || 'Import failed' }, 500);
  }
}

/**
 * Bulk import:
 * - { products: [...], minImages }
 * - or { q, limit: 50|100, minImages } to pull from CJ search
 */
export async function importLumeProductsBulk(request, env) {
  try {
    const body = await request.json();
    const minImages = Math.max(3, Math.min(8, Number(body?.minImages || 4) || 4));
    let candidates = Array.isArray(body?.products) ? body.products : [];

    if (!candidates.length) {
      const limit = Math.max(1, Math.min(100, Number(body?.limit || 50) || 50));
      const q = String(body?.q || body?.query || 'home decor').trim().slice(0, 100);
      const collected = await collectCjProducts(env, {
        q,
        limit,
        minImages,
        maxPages: Math.max(8, Math.ceil(limit / 3) + 4),
      });
      candidates = collected.products;
    }

    const imported = [];
    const skipped = [];
    const enrichSelected = Array.isArray(body?.products) && body.products.length <= 20;
    for (const p of candidates.slice(0, 100)) {
      try {
        const r = await upsertImportedCjProduct(
          env,
          { ...p, skipEnrich: !enrichSelected },
          { minImages },
        );
        imported.push({ id: p.id, lumeSku: r.lumeSku, imageCount: r.imageCount });
      } catch (e) {
        skipped.push({ id: p?.id, error: e.message || 'Import failed' });
      }
    }

    return json({
      ok: true,
      minImages,
      requested: candidates.length,
      imported: imported.length,
      skipped: skipped.length,
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
    if (!id) return json({ ok: false, error: 'Missing product id' }, 400);
    const name = String(p.name || '').trim().slice(0, 240);
    if (!name) return json({ ok: false, error: 'Product title is required' }, 400);
    const slug = slugify(p.slug || name);
    const description = String(p.description || '').trim().slice(0, 5000);
    const image = safeUrl(p.image_url, '');
    if (p.image_url && !image) return json({ ok: false, error: 'Image URL must be http(s) or a site path' }, 400);
    let gallery = null;
    if (Array.isArray(p.image_urls)) {
      gallery = serializeImageUrls(p.image_urls);
    } else if (typeof p.image_urls === 'string' && p.image_urls.trim()) {
      const parts = p.image_urls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      gallery = serializeImageUrls(parts);
    }
    const category = String(p.category || '').trim().slice(0, 160);
    let retail = Number(p.retail_price_eur || 0) || 0;
    let compare = Number(p.compare_at_price_eur || 0) || null;
    if (!(compare > 0) && retail > 0) compare = suggestedCompareEur(retail);
    await env.LUME_DB.prepare(
      `UPDATE products SET name=?,slug=?,description=?,image_url=?,image_urls=?,category=?,retail_price_eur=?,compare_at_price_eur=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(name, slug, description, image, gallery, category, retail, compare, id)
      .run();
    return json({ ok: true, id, slug, status: 'saved' });
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
    await env.LUME_DB.prepare(
      "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(slug, images[0] || row.image_url, serializeImageUrls(images), id)
      .run();
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
        await env.LUME_DB.prepare(
          "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
          .bind(slug, images[0] || row.image_url, serializeImageUrls(images), row.id)
          .run();
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

/** Permanently delete a product row. */
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
      'SELECT id,supplier,supplier_product_id FROM products WHERE id=?',
    )
      .bind(id)
      .first();
    if (!row) return json({ ok: false, error: 'Product not found' }, 404);
    if (row.supplier !== 'CJ' || !row.supplier_product_id) {
      return json({ ok: false, error: 'Only CJ products can be refreshed' }, 400);
    }
    const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
    const gallery = serializeImageUrls(fresh.images || []);
    await env.LUME_DB.prepare(
      `UPDATE products SET supplier_cost_usd=?,stock=?,delivery_days=?,
       image_url=CASE WHEN ?!='' THEN ? ELSE image_url END,
       image_urls=CASE WHEN ? IS NOT NULL THEN ? ELSE image_urls END,
       supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(
        fresh.costUSD,
        fresh.stock,
        fresh.deliveryDays,
        fresh.image,
        fresh.image,
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
      supplier_cost_usd: fresh.costUSD,
      stock: fresh.stock,
      delivery_days: fresh.deliveryDays,
      images: fresh.images || [],
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Refresh failed' }, 502);
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
