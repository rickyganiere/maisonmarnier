import { json } from '../lib/json.js';
import { refreshProductFromCJ } from '../cj.js';
import { serializeImageUrls } from '../lib/images.js';

/**
 * Pull real CJ productImageSet galleries for live CJ SKUs.
 * Auth: Bearer LUME_ADMIN_TOKEN, or one-time D1 token in header x-mm-sync-token
 * (row in sync_tokens where used=0).
 */
export async function syncProductGalleries(request, env) {
  try {
    const admin = env.LUME_ADMIN_TOKEN || '';
    const auth = request.headers.get('authorization') || '';
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    const syncHeader = (request.headers.get('x-mm-sync-token') || '').trim();
    let authorized = !!(admin && bearer && bearer === admin);
    let syncToken = null;

    if (!authorized && syncHeader) {
      await env.LUME_DB.prepare(
        `CREATE TABLE IF NOT EXISTS sync_tokens (
           token TEXT PRIMARY KEY,
           purpose TEXT,
           used INTEGER DEFAULT 0,
           created_at TEXT DEFAULT CURRENT_TIMESTAMP
         )`,
      ).run();
      syncToken = await env.LUME_DB.prepare(
        `SELECT token, purpose FROM sync_tokens WHERE token=? AND used=0 LIMIT 1`,
      )
        .bind(syncHeader)
        .first();
      authorized = !!syncToken;
    }
    if (!authorized) return json({ ok: false, error: 'Unauthorized' }, 401);

    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(200, Number(body.limit || 200) || 200));
    const demoteSeed = body.demoteSeed === true;
    const minImages = Math.max(1, Math.min(8, Number(body.minImages || 2) || 2));

    const rows = (
      await env.LUME_DB.prepare(
        `SELECT id,supplier_product_id,name,image_url FROM products
         WHERE status='live' AND supplier='CJ' AND supplier_product_id IS NOT NULL
         ORDER BY id ASC LIMIT ?`,
      )
        .bind(limit)
        .all()
    ).results || [];

    let updated = 0;
    let withMulti = 0;
    const errors = [];
    const samples = [];

    for (const row of rows) {
      try {
        const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
        const images = Array.isArray(fresh.images) ? fresh.images : [];
        const gallery = serializeImageUrls(images);
        const main = images[0] || fresh.image || row.image_url || '';
        await env.LUME_DB.prepare(
          `UPDATE products SET image_url=?, image_urls=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        )
          .bind(main, gallery, row.id)
          .run();
        updated += 1;
        if (images.length >= minImages) withMulti += 1;
        if (samples.length < 5) {
          samples.push({ id: row.id, name: row.name, count: images.length, images: images.slice(0, 4) });
        }
      } catch (e) {
        errors.push({ id: row.id, error: e.message || String(e) });
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

    if (syncToken) {
      await env.LUME_DB.prepare(`UPDATE sync_tokens SET used=1 WHERE token=?`).bind(syncHeader).run();
    }

    return json({
      ok: true,
      scanned: rows.length,
      updated,
      withMulti,
      minImages,
      seedDemoted,
      samples,
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Gallery sync failed' }, 502);
  }
}
