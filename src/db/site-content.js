import { json } from '../lib/json.js';
import { safeUrl } from '../lib/escape.js';

export const HOME_KEYS = [
  'hero_image',
  'hero_link',
  'cat_textiles_image',
  'cat_textiles_link',
  'cat_objects_image',
  'cat_objects_link',
  'cat_candles_image',
  'cat_candles_link',
  'cat_wall_image',
  'cat_wall_link',
  'cat_seasonal_image',
  'cat_seasonal_link',
  'season_image',
  'season_link',
  'story_quiet_image',
  'story_quiet_link',
  'story_objects_image',
  'story_objects_link',
];

export async function getHomeContent(env) {
  try {
    const r = await env.LUME_DB.prepare('SELECT key,value FROM site_content').all();
    const content = {};
    for (const row of r.results || []) content[row.key] = row.value;
    return json({ ok: true, content });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not load homepage content' }, 500);
  }
}

export async function saveHomeContent(request, env) {
  try {
    const body = await request.json();
    const batch = [];
    for (const k of HOME_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      let v = String(body[k] || '').slice(0, 1600);
      if (k.endsWith('_image') || k.endsWith('_link')) {
        const cleaned = safeUrl(v, '');
        if (v && !cleaned) {
          return json({ ok: false, error: `Invalid URL for ${k}` }, 400);
        }
        v = cleaned;
      }
      batch.push(
        env.LUME_DB.prepare(
          `INSERT INTO site_content(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`,
        ).bind(k, v),
      );
    }
    if (batch.length) await env.LUME_DB.batch(batch);
    return json({ ok: true, saved: batch.length });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not save homepage content' }, 500);
  }
}
