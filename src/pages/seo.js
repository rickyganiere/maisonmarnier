import { COLLECTION_RULES } from './collection.js';
import { hasMultiRealPhotos } from '../lib/images.js';
import { SITE_ORIGIN, escXml, formatLastmod } from '../lib/seo.js';

const INFO_PATHS = ['/about', '/shipping', '/returns', '/contact', '/sourcing', '/journal'];
const PRODUCT_CAP = 4500;
const JOURNAL_CAP = 200;

function xmlResponse(body) {
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=UTF-8',
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
    },
  });
}

function urlEntry(loc, lastmod) {
  const last = lastmod ? `<lastmod>${escXml(lastmod)}</lastmod>` : '';
  return `<url><loc>${escXml(loc)}</loc>${last}</url>`;
}

function urlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;
}

export function robotsTxt() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /cart

Sitemap: ${SITE_ORIGIN}/sitemap.xml
Sitemap: ${SITE_ORIGIN}/sitemap_index.xml
`;
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=UTF-8',
      'cache-control': 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Sitemap index — GSC-friendly split by content type. */
export function sitemapIndexXml() {
  const now = new Date().toISOString().slice(0, 10);
  const maps = [
    `${SITE_ORIGIN}/sitemap-pages.xml`,
    `${SITE_ORIGIN}/sitemap-products.xml`,
    `${SITE_ORIGIN}/sitemap-journal.xml`,
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps
  .map(
    (loc) => `<sitemap><loc>${escXml(loc)}</loc><lastmod>${escXml(now)}</lastmod></sitemap>`,
  )
  .join('\n')}
</sitemapindex>
`;
  return xmlResponse(body);
}

/** Keep /sitemap.xml as the index so existing GSC submissions keep working. */
export function sitemapXml() {
  return sitemapIndexXml();
}

export function sitemapPagesXml() {
  const entries = [];
  entries.push(urlEntry(`${SITE_ORIGIN}/`));
  for (const slug of Object.keys(COLLECTION_RULES)) {
    entries.push(urlEntry(`${SITE_ORIGIN}/collections/${encodeURIComponent(slug)}`));
  }
  for (const path of INFO_PATHS) {
    entries.push(urlEntry(`${SITE_ORIGIN}${path}`));
  }
  return xmlResponse(urlset(entries));
}

export async function sitemapProductsXml(env) {
  const entries = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at, image_url, image_urls FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT ?`,
    )
      .bind(PRODUCT_CAP * 3)
      .all();
    for (const p of r.results || []) {
      if (!hasMultiRealPhotos(p, { min: 2 })) continue;
      entries.push(
        urlEntry(`${SITE_ORIGIN}/products/${encodeURIComponent(p.slug)}`, formatLastmod(p.published_at)),
      );
      if (entries.length >= PRODUCT_CAP) break;
    }
  } catch {
    /* D1 unavailable — empty products sitemap still valid */
  }
  return xmlResponse(urlset(entries));
}

export async function sitemapJournalXml(env) {
  const entries = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at FROM journal_articles
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT ?`,
    )
      .bind(JOURNAL_CAP)
      .all();
    for (const a of r.results || []) {
      entries.push(
        urlEntry(`${SITE_ORIGIN}/journal/${encodeURIComponent(a.slug)}`, formatLastmod(a.published_at)),
      );
    }
  } catch {
    /* optional journal table */
  }
  return xmlResponse(urlset(entries));
}
