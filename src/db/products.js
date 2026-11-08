import { json } from '../lib/json.js';
import { slugify } from '../lib/slugify.js';
import { safeUrl } from '../lib/escape.js';
import { refreshProductFromCJ } from '../cj.js';

const PRODUCT_COLS =
  'id,lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,created_at';

export async function listLumeProducts(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products ORDER BY id DESC LIMIT 100`,
    ).all();
    return json({ ok: true, products: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Database error' }, 500);
  }
}

export async function listPublishedProducts(env, { q = '', limit = 24 } = {}) {
  try {
    const lim = Math.max(1, Math.min(100, Number(limit) || 24));
    const query = String(q || '').trim().slice(0, 80).toLowerCase();
    let r;
    if (query) {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,stock,description
         FROM products WHERE status='live'
         AND (lower(name) LIKE ? OR lower(category) LIKE ? OR lower(ifnull(description,'')) LIKE ?)
         ORDER BY published_at DESC,id DESC LIMIT ?`,
      )
        .bind(`%${query}%`, `%${query}%`, `%${query}%`, lim)
        .all();
    } else {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,stock,description
         FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`,
      )
        .bind(lim)
        .all();
    }
    return json({ ok: true, products: r.results || [], q: query || undefined });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not load products' }, 500);
  }
}

export async function importLumeProduct(request, env) {
  try {
    const p = await request.json();
    if (!p || !p.id || !p.name) return json({ ok: false, error: 'Missing product id/name' }, 400);
    const cost = Number(p.costUSD || 0) || 0;
    const retail = Number(p.retailPriceEUR || 0) || 0;
    const sku = ('LL-CJ-' + String(p.sku || p.id).replace(/[^A-Za-z0-9]/g, '').slice(-18)).toUpperCase();
    const image = safeUrl(p.image, '');
    await env.LUME_DB.prepare(
      `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,supplier_cost_usd,retail_price_eur,category,stock,delivery_days,status,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(supplier_product_id) DO UPDATE SET
         supplier_sku=excluded.supplier_sku,name=excluded.name,image_url=excluded.image_url,
         supplier_cost_usd=excluded.supplier_cost_usd,retail_price_eur=excluded.retail_price_eur,
         category=excluded.category,stock=excluded.stock,delivery_days=excluded.delivery_days,
         updated_at=CURRENT_TIMESTAMP`,
    )
      .bind(
        sku,
        'CJ',
        String(p.id),
        String(p.sku || ''),
        String(p.name).slice(0, 240),
        image,
        cost,
        retail,
        String(p.category || ''),
        Number(p.stock || 0) || 0,
        String(p.deliveryDays || ''),
        'draft',
      )
      .run();
    return json({ ok: true, lumeSku: sku, status: 'draft' });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Import failed' }, 500);
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
    const category = String(p.category || '').trim().slice(0, 160);
    const retail = Number(p.retail_price_eur || 0) || 0;
    const compare = Number(p.compare_at_price_eur || 0) || null;
    await env.LUME_DB.prepare(
      `UPDATE products SET name=?,slug=?,description=?,image_url=?,category=?,retail_price_eur=?,compare_at_price_eur=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(name, slug, description, image, category, retail, compare, id)
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
      'SELECT id,name,image_url,supplier_cost_usd,retail_price_eur,stock,slug FROM products WHERE id=?',
    )
      .bind(id)
      .first();
    if (!row) return json({ ok: false, error: 'Product not found' }, 404);
    if (!row.name || !row.image_url) {
      return json({ ok: false, error: 'Title and image are required before publishing' }, 400);
    }
    if (!(Number(row.retail_price_eur) > 0)) {
      return json({ ok: false, error: 'Set a retail price before publishing' }, 400);
    }
    if (!(Number(row.supplier_cost_usd) > 0)) {
      return json(
        { ok: false, error: 'CJ cost is missing/zero. Review the real variant cost before publishing.' },
        400,
      );
    }
    if (Number(row.stock) <= 0) return json({ ok: false, error: 'Product is out of stock' }, 400);
    const slug = slugify(row.slug || row.name);
    await env.LUME_DB.prepare(
      "UPDATE products SET status='live',slug=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    )
      .bind(slug, id)
      .run();
    return json({ ok: true, id, slug, status: 'live' });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Publish failed' }, 500);
  }
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
    await env.LUME_DB.prepare(
      `UPDATE products SET supplier_cost_usd=?,stock=?,delivery_days=?,
       image_url=CASE WHEN ?!='' THEN ? ELSE image_url END,
       supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    )
      .bind(
        fresh.costUSD,
        fresh.stock,
        fresh.deliveryDays,
        fresh.image,
        fresh.image,
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
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Refresh failed' }, 502);
  }
}

export async function getLiveProducts(env, limit = 100) {
  const r = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`,
  )
    .bind(limit)
    .all();
  return r.results || [];
}

export async function getLiveProductBySlug(env, slug) {
  return env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,description,stock
     FROM products WHERE status='live' AND slug=? LIMIT 1`,
  )
    .bind(slug)
    .first();
}
