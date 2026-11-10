import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';
import { getLang } from '../lib/i18n.js';
import { getArticleBySlug, listPublishedArticles } from '../db/journal.js';

export async function journalPage(url, env, request) {
  const lang = getLang(request);
  try {
    const slug = url.pathname.split('/').filter(Boolean)[1] || '';
    if (!slug) {
      const articles = await listPublishedArticles(env);
      if (!articles.length) {
        return htmlPage(
          'Diario de la maison',
          `<div class="head"><h1>Diario de la maison</h1><p class="lead">Historias y notas desde Maison Marnier.</p></div>
           <p class="empty">Aún no hay piezas publicadas en el diario.</p>`,
          {
            description: 'Historias y notas desde Maison Marnier.',
            canonical: '/journal',
            cache: 'private, no-cache',
            request,
            path: '/journal',
            lang,
          },
        );
      }
      const list = articles
        .map(
          (a) => `<a class="journal-card" href="/journal/${encodeURIComponent(a.slug)}">
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" loading="lazy">` : '<div></div>'}
            <div>
              <h2>${esc(a.title)}</h2>
              <p class="muted">${esc(a.excerpt || '')}</p>
            </div>
          </a>`,
        )
        .join('');
      return htmlPage(
        'Diario de la maison',
        `<div class="head"><h1>Diario de la maison</h1><p class="lead">Historias y notas desde Maison Marnier.</p></div>
         <div class="journal-list">${list}</div>`,
        {
          description: 'Historias y notas desde Maison Marnier.',
          canonical: '/journal',
          cache: 'private, no-cache',
          request,
          path: '/journal',
          lang,
        },
      );
    }

    const a = await getArticleBySlug(env, slug);
    if (!a || a.status !== 'live') {
      return htmlPage(
        'Artículo no encontrado',
        `<div class="head"><h1>Artículo no encontrado</h1></div>
         <p class="empty"><a href="/journal">Volver al diario →</a></p>`,
        { status: 404, noindex: true, request, path: url.pathname, lang },
      );
    }

    const articlePath = `/journal/${encodeURIComponent(a.slug)}`;
    return htmlPage(
      a.title,
      `${a.image_url ? `<img class="article-hero" src="${esc(a.image_url)}" alt="">` : ''}
       <div class="head"><h1>${esc(a.title)}</h1></div>
       ${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ''}
       <div class="desc">${esc(a.body || '')}</div>
       <p style="margin-top:28px"><a class="btn" href="/collections/decor">Comprar la edición</a></p>`,
      {
        description: String(a.excerpt || a.title).slice(0, 160),
        canonical: articlePath,
        ogImage: a.image_url || '',
        ogType: 'article',
        cache: 'private, no-cache',
        request,
        path: articlePath,
        lang,
      },
    );
  } catch {
    return htmlPage('Diario de la maison', '<p class="empty">No se pudo cargar el diario.</p>', { status: 500, request, path: '/journal', lang });
  }
}
