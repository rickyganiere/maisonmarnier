/** Site-wide SEO helpers for Maison Marnier (apex host). */

import { BRAND_ICON_PATH } from './brandAsset.js';

export const SITE_ORIGIN = 'https://maisonmarnier.com';

export const DEFAULT_OG_IMAGE =
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80';

/** Resolve a path or absolute URL to a canonical absolute HTTPS URL. */
export function absoluteUrl(pathOrUrl = '/') {
  if (!pathOrUrl) return `${SITE_ORIGIN}/`;
  const s = String(pathOrUrl);
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${SITE_ORIGIN}${path}`;
}

/** Escape text for XML (sitemap). */
export function escXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Normalize D1 timestamps to YYYY-MM-DD for lastmod. */
export function formatLastmod(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

export function jsonLdScript(data) {
  if (!data) return '';
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function organizationWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Maison Marnier',
        url: SITE_ORIGIN,
        logo: absoluteUrl(BRAND_ICON_PATH),
        email: 'hello@maisonmarnier.com',
        areaServed: 'EU',
        sameAs: [
          'https://www.instagram.com/maison.marnier/',
          'https://www.facebook.com/profile.php?id=61596578393485',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        name: 'Maison Marnier',
        url: SITE_ORIGIN,
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_ORIGIN}/collections/new?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: (items || []).map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path || it.url || '/'),
    })),
  };
}

export function productJsonLd(p, { url, collectionPath } = {}) {
  const retail = Number(p.retail_price_eur || 0);
  const stock = Number(p.stock || 0);
  const productUrl = absoluteUrl(url || `/products/${encodeURIComponent(p.slug || '')}`);
  const availability =
    stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: p.category || 'Shop', path: collectionPath || '/collections/new' },
    { name: p.name || 'Product', path: productUrl },
  ];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name || '',
      description: String(p.description || p.name || '').slice(0, 5000),
      image: (() => {
        const list = [];
        if (Array.isArray(p.image_urls)) list.push(...p.image_urls);
        else if (typeof p.image_urls === 'string' && p.image_urls.startsWith('[')) {
          try {
            list.push(...JSON.parse(p.image_urls));
          } catch {
            /* ignore */
          }
        }
        if (p.image_url) list.unshift(p.image_url);
        const uniq = [...new Set(list.filter(Boolean))];
        return uniq.length ? uniq : undefined;
      })(),
      sku: p.slug || undefined,
      brand: { '@type': 'Brand', name: 'Maison Marnier' },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'EUR',
        price: retail.toFixed(2),
        availability,
        itemCondition: 'https://schema.org/NewCondition',
      },
    },
    breadcrumbJsonLd(crumbs),
  ];
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Build head meta tags (canonical, robots, Open Graph, Twitter). */
export function seoHeadHtml({
  title,
  description = '',
  canonical = '/',
  ogImage = '',
  ogType = 'website',
  noindex = false,
} = {}) {
  const pageTitle = title || 'Maison Marnier';
  const canon = absoluteUrl(canonical);
  const image = absoluteUrl(ogImage || DEFAULT_OG_IMAGE);
  const desc = description || '';
  const robots = noindex ? '<meta name="robots" content="noindex,nofollow">\n' : '';
  return `${robots}<link rel="canonical" href="${escapeAttr(canon)}">
<meta property="og:title" content="${escapeAttr(pageTitle)}">
<meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:url" content="${escapeAttr(canon)}">
<meta property="og:type" content="${escapeAttr(ogType)}">
<meta property="og:image" content="${escapeAttr(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(pageTitle)}">
<meta name="twitter:description" content="${escapeAttr(desc)}">
<meta name="twitter:image" content="${escapeAttr(image)}">`;
}
