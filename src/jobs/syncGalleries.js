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
    const demoteThin = body.demoteThin === true;
    const minImages = Math.max(1, Math.min(8, Number(body.minImages || 2) || 2));
    const onlyThin = body.onlyThin === true;

    let rows =
      (
        await env.LUME_DB.prepare(
          `SELECT id,supplier_product_id,name,image_url,image_urls FROM products
         WHERE status='live' AND supplier='CJ' AND supplier_product_id IS NOT NULL
         ORDER BY id ASC LIMIT ?`,
        )
          .bind(limit)
          .all()
      ).results || [];
    if (onlyThin) {
      rows = rows.filter((row) => {
        try {
          const arr = JSON.parse(row.image_urls || '[]');
          return !Array.isArray(arr) || arr.length < minImages;
        } catch {
          return true;
        }
      });
    }

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
        if (samples.length < 8) {
          samples.push({ id: row.id, name: row.name, count: images.length, images: images.slice(0, 4) });
        }
        // Soft throttle to stay under CJ QPS limits
        await new Promise((resolve) => setTimeout(resolve, 180));
      } catch (e) {
        errors.push({ id: row.id, error: e.message || String(e) });
        await new Promise((resolve) => setTimeout(resolve, 400));
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

    let thinDemoted = 0;
    if (demoteThin) {
      const live = (
        await env.LUME_DB.prepare(
          `SELECT id,image_urls FROM products WHERE status='live' AND supplier='CJ'`,
        ).all()
      ).results || [];
      for (const row of live) {
        let count = 0;
        try {
          const arr = JSON.parse(row.image_urls || '[]');
          count = Array.isArray(arr) ? arr.length : 0;
        } catch {
          count = 0;
        }
        if (count < minImages) {
          await env.LUME_DB.prepare(
            `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          )
            .bind(row.id)
            .run();
          thinDemoted += 1;
        }
      }
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
      thinDemoted,
      samples,
      errors: errors.slice(0, 12),
    });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Gallery sync failed' }, 502);
  }
}
