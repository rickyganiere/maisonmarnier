import { COLLECTION_RULES } from './collection.js';
import { SITE_ORIGIN, escXml, formatLastmod } from '../lib/seo.js';

const INFO_PATHS = ['/about', '/shipping', '/returns', '/contact', '/sourcing', '/journal'];
const SITEMAP_CAP = 5000;

export function robotsTxt() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /cart

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=UTF-8',
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}

export async function sitemapXml(env) {
  const urls = [];

  function push(loc, lastmod) {
    if (urls.length >= SITEMAP_CAP) return;
    urls.push({ loc, lastmod: formatLastmod(lastmod) });
  }

  push(`${SITE_ORIGIN}/`);
  for (const slug of Object.keys(COLLECTION_RULES)) {
    push(`${SITE_ORIGIN}/collections/${encodeURIComponent(slug)}`);
  }
  for (const path of INFO_PATHS) {
    push(`${SITE_ORIGIN}${path}`);
  }

  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT 4500`,
    ).all();
    for (const p of r.results || []) {
      push(`${SITE_ORIGIN}/products/${encodeURIComponent(p.slug)}`, p.published_at);
    }
  } catch {
    /* D1 unavailable — still return static URLs */
  }

  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at FROM journal_articles
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT 200`,
    ).all();
    for (const a of r.results || []) {
      push(`${SITE_ORIGIN}/journal/${encodeURIComponent(a.slug)}`, a.published_at);
    }
  } catch {
    /* optional journal table */
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => {
    const last = u.lastmod ? `<lastmod>${escXml(u.lastmod)}</lastmod>` : '';
    return `<url><loc>${escXml(u.loc)}</loc>${last}</url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=UTF-8',
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}
