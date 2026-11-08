import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';
import { getArticleBySlug, listPublishedArticles } from '../db/journal.js';

export async function journalPage(url, env) {
  try {
    const slug = url.pathname.split('/').filter(Boolean)[1] || '';
    if (!slug) {
      const articles = await listPublishedArticles(env);
      if (!articles.length) {
        return htmlPage(
          'Maison Journal',
          `<div class="head"><h1>Maison Journal</h1><p class="lead">Stories and notes from the maison.</p></div>
           <p class="empty">No journal pieces published yet.</p>`,
        );
      }
      const list = articles
        .map(
          (a) => `<article style="margin:0 0 28px;padding-bottom:28px;border-bottom:1px solid #d4cec4">
            <a href="/journal/${encodeURIComponent(a.slug)}">
              ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:100%;max-height:320px;object-fit:cover;margin-bottom:14px;background:#E9E0D3">` : ''}
              <h2 style="font:400 28px Georgia,serif;margin:0 0 8px">${esc(a.title)}</h2>
              <p class="muted">${esc(a.excerpt || '')}</p>
            </a>
          </article>`,
        )
        .join('');
      return htmlPage(
        'Maison Journal',
        `<div class="head"><h1>Maison Journal</h1><p class="lead">Stories and notes from the maison.</p></div>${list}`,
      );
    }

    const a = await getArticleBySlug(env, slug);
    if (!a || a.status !== 'live') {
      return htmlPage(
        'Article not found',
        `<div class="head"><h1>Article not found</h1></div>
         <p class="empty"><a href="/journal">Back to journal →</a></p>`,
        { status: 404 },
      );
    }

    return htmlPage(
      a.title,
      `${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:100%;max-height:420px;object-fit:cover;margin-bottom:28px;background:#E9E0D3">` : ''}
       <div class="head"><h1>${esc(a.title)}</h1></div>
       ${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ''}
       <div class="desc">${esc(a.body || '')}</div>
       <p style="margin-top:28px"><a class="btn" href="/collections/decor">Shop the edit</a></p>`,
      { description: String(a.excerpt || a.title).slice(0, 160) },
    );
  } catch {
    return htmlPage('Maison Journal', '<p class="empty">Could not load the journal.</p>', { status: 500 });
  }
}
