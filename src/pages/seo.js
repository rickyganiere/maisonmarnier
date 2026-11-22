import { COLLECTION_RULES } from './collection.js';
import { isStorefrontListable, productImages } from '../lib/images.js';
import { productDisplayDescription, SITE_ORIGIN, escXml, formatLastmod } from '../lib/seo.js';

const INFO_PATHS = [
  '/about',
  '/shipping',
  '/returns',
  '/contact',
  '/sourcing',
  '/privacidad',
  '/cookies',
  '/terminos',
  '/journal',
  '/instagram',
];
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
Disallow: /cuenta
Disallow: /cuenta/entrar

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

/** Sitemap index — GSC-friendly split by content type. */
export function sitemapIndexXml() {
  const maps = [
    `${SITE_ORIGIN}/sitemap-pages.xml`,
    `${SITE_ORIGIN}/sitemap-products.xml`,
    `${SITE_ORIGIN}/sitemap-journal.xml`,
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps
  .map(
    (loc) => `<sitemap><loc>${escXml(loc)}</loc></sitemap>`,
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
      `SELECT slug, published_at, retail_price_eur, image_url, image_urls FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
         AND retail_price_eur > 0
       ORDER BY published_at DESC, id DESC LIMIT ?`,
    )
      .bind(PRODUCT_CAP * 3)
      .all();
    for (const p of r.results || []) {
      if (!isStorefrontListable(p, { minPhotos: 4 })) continue;
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

/** Google Merchant Center RSS 2.0 feed for live, sellable catalog items. */
export async function googleProductsXml(env) {
  const items = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT id, slug, name, description, category, retail_price_eur, stock, image_url, image_urls
       FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
         AND retail_price_eur > 0
       ORDER BY published_at DESC, id DESC LIMIT ?`,
    )
      .bind(PRODUCT_CAP)
      .all();
    for (const p of r.results || []) {
      if (!isStorefrontListable(p, { minPhotos: 4 })) continue;
      const images = productImages(p, { max: 10 });
      const link = `${SITE_ORIGIN}/products/${encodeURIComponent(p.slug)}`;
      const title = String(p.name || 'Maison Marnier home decor').replace(/\s+/g, ' ').trim().slice(0, 150);
      const description = productDisplayDescription({ ...p, image_url: images[0], image_urls: images }, 'es').slice(0, 5000);
      const availability = Number(p.stock || 0) > 0 ? 'in_stock' : 'out_of_stock';
      items.push(`<item>
<g:id>${escXml(p.id || p.slug)}</g:id>
<g:title>${escXml(title)}</g:title>
<g:description>${escXml(description)}</g:description>
<g:link>${escXml(link)}</g:link>
<g:image_link>${escXml(images[0])}</g:image_link>
${images.slice(1).map((src) => `<g:additional_image_link>${escXml(src)}</g:additional_image_link>`).join('\n')}
<g:condition>new</g:condition>
<g:availability>${availability}</g:availability>
<g:price>${Number(p.retail_price_eur).toFixed(2)} EUR</g:price>
<g:product_type>${escXml(p.category || 'Home Decor')}</g:product_type>
<g:identifier_exists>false</g:identifier_exists>
</item>`);
    }
  } catch {
    /* D1 unavailable — valid empty feed keeps the endpoint reliable. */
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>Maison Marnier product catalog</title>
<link>${SITE_ORIGIN}</link>
<description>Curated home decoration from Maison Marnier</description>
${items.join('\n')}
</channel>
</rss>
`;
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=UTF-8',
      'cache-control': 'public, max-age=900',
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
    },
  });
}
