import { json } from '../lib/json.js';
import { slugify } from '../lib/slugify.js';
import { safeUrl } from '../lib/escape.js';

export async function listJournalAdmin(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT id,slug,title,excerpt,body,image_url,status,published_at,created_at,updated_at
       FROM journal_articles ORDER BY id DESC LIMIT 100`,
    ).all();
    return json({ ok: true, articles: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not load journal' }, 500);
  }
}

export async function listPublishedArticles(env) {
  const r = await env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,image_url,published_at
     FROM journal_articles WHERE status='live'
     ORDER BY published_at DESC,id DESC LIMIT 50`,
  ).all();
  return r.results || [];
}

export async function getArticleBySlug(env, slug) {
  return env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,body,image_url,status,published_at
     FROM journal_articles WHERE slug=? LIMIT 1`,
  )
    .bind(slug)
    .first();
}

export async function saveJournalArticle(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id) || null;
    const title = String(p.title || '').trim().slice(0, 240);
    if (!title) return json({ ok: false, error: 'Title is required' }, 400);
    const slug = slugify(p.slug || title);
    if (!slug) return json({ ok: false, error: 'Slug is required' }, 400);
    const excerpt = String(p.excerpt || '').trim().slice(0, 800);
    const body = String(p.body || '').trim().slice(0, 20000);
    const image = safeUrl(p.image_url, '');
    if (p.image_url && !image) return json({ ok: false, error: 'Invalid image URL' }, 400);
    const status = p.status === 'live' ? 'live' : 'draft';

    if (id) {
      await env.LUME_DB.prepare(
        `UPDATE journal_articles SET slug=?,title=?,excerpt=?,body=?,image_url=?,status=?,
         published_at=CASE WHEN ?='live' AND published_at IS NULL THEN CURRENT_TIMESTAMP
                           WHEN ?='live' THEN published_at ELSE published_at END,
         updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      )
        .bind(slug, title, excerpt, body, image, status, status, status, id)
        .run();
      if (status === 'live') {
        await env.LUME_DB.prepare(
          `UPDATE journal_articles SET published_at=COALESCE(published_at,CURRENT_TIMESTAMP) WHERE id=?`,
        )
          .bind(id)
          .run();
      }
      return json({ ok: true, id, slug, status });
    }

    const result = await env.LUME_DB.prepare(
      `INSERT INTO journal_articles (slug,title,excerpt,body,image_url,status,published_at,updated_at)
       VALUES (?,?,?,?,?,?,CASE WHEN ?='live' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP)`,
    )
      .bind(slug, title, excerpt, body, image, status, status)
      .run();
    return json({ ok: true, id: result.meta.last_row_id, slug, status });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not save article' }, 500);
  }
}

export async function deleteJournalArticle(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: 'Missing id' }, 400);
    await env.LUME_DB.prepare('DELETE FROM journal_articles WHERE id=?').bind(id).run();
    return json({ ok: true, id });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not delete article' }, 500);
  }
}
