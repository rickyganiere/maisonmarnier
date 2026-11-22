import { esc } from '../lib/escape.js';
import { htmlPage } from '../lib/html.js';
import { getLang, tr } from '../lib/i18n.js';
import { formatJournalBody } from '../lib/journalBody.js';
import { blogPostingJsonLd } from '../lib/seo.js';
import { getArticleBySlug, listPublishedArticles } from '../db/journal.js';

export async function journalPage(url, env, request) {
  const lang = getLang(request);
  try {
    const slug = url.pathname.split('/').filter(Boolean)[1] || '';
    if (!slug) {
      const articles = await listPublishedArticles(env);
      const title = tr(lang, { es: 'Diario de la maison', en: 'Maison journal' });
      const lead = tr(lang, {
        es: 'Historias de hogar y temporada desde Maison Marnier.',
        en: 'Home and seasonal notes from Maison Marnier.',
      });
      if (!articles.length) {
        return htmlPage(
          title,
          `<div class="head"><h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p></div>
           <p class="empty">${esc(tr(lang, { es: 'Aún no hay piezas publicadas en el diario.', en: 'No journal pieces are live yet.' }))}</p>`,
          {
            description: lead,
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
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="${esc(a.title)}" loading="lazy">` : '<div></div>'}
            <div>
              <h2>${esc(a.title)}</h2>
              <p class="muted">${esc(a.excerpt || '')}</p>
            </div>
          </a>`,
        )
        .join('');
      return htmlPage(
        title,
        `<div class="head"><h1>${esc(title)}</h1><p class="lead">${esc(lead)}</p></div>
         <div class="journal-list">${list}</div>`,
        {
          description: lead,
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
        tr(lang, { es: 'Artículo no encontrado', en: 'Article not found' }),
        `<div class="head"><h1>${esc(tr(lang, { es: 'Artículo no encontrado', en: 'Article not found' }))}</h1></div>
         <p class="empty"><a href="/journal">${esc(tr(lang, { es: 'Volver al diario →', en: 'Back to the journal →' }))}</a></p>`,
        { status: 404, noindex: true, request, path: url.pathname, lang },
      );
    }

    const articlePath = `/journal/${encodeURIComponent(a.slug)}`;
    const description = String(a.excerpt || a.title).slice(0, 160);
    const bodyHtml = formatJournalBody(a.body || '');
    const ctaLabel = tr(lang, {
      es: 'Ver la edición Navidad',
      en: 'Shop the Christmas edit',
    });
    return htmlPage(
      a.title,
      `${a.image_url ? `<img class="article-hero" src="${esc(a.image_url)}" alt="${esc(a.title)}">` : ''}
       <div class="head"><h1>${esc(a.title)}</h1></div>
       ${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ''}
       <div class="journal-body">${bodyHtml}</div>
       <p class="journal-cta"><a class="btn" href="/collections/seasonal">${esc(ctaLabel)}</a></p>`,
      {
        description,
        canonical: articlePath,
        ogImage: a.image_url || '',
        ogType: 'article',
        jsonLd: blogPostingJsonLd({
          title: a.title,
          description,
          url: articlePath,
          image: a.image_url || '',
          datePublished: a.published_at || '',
          dateModified: a.updated_at || a.published_at || '',
        }),
        cache: 'private, no-cache',
        request,
        path: articlePath,
        lang,
      },
    );
  } catch {
    return htmlPage(
      tr(lang, { es: 'Diario de la maison', en: 'Maison journal' }),
      `<p class="empty">${esc(tr(lang, { es: 'No se pudo cargar el diario.', en: 'Could not load the journal.' }))}</p>`,
      { status: 500, request, path: '/journal', lang },
    );
  }
}
