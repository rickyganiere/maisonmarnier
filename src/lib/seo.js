/** Site-wide SEO helpers for Maison Marnier (apex host). */

import { BRAND_ICON_PATH, BRAND_OG_PATH } from './brandAsset.js';
import { productImages } from './images.js';
import { isTemplateProductDescription } from './merch.js';
import { FACEBOOK_URL, INSTAGRAM_URL } from './social.js';

export const SITE_ORIGIN = 'https://maisonmarnier.com';

/** Self-hosted 1200×630 Christmas edit card (replaces Unsplash default). */
export const DEFAULT_OG_IMAGE = BRAND_OG_PATH;

export const OG_SITE_NAME = 'Maison Marnier';
export const OG_LOCALE_DEFAULT = 'es_ES';
export const OG_LOCALE_ALTERNATE = 'en_GB';

const PRODUCT_CATEGORY_LABELS = {
  candles: { es: 'Velas decorativas', en: 'Decorative candles' },
  textiles: { es: 'Cojines y textiles', en: 'Cushions and textiles' },
  lighting: { es: 'Lámparas decorativas', en: 'Decorative lighting' },
  objects: { es: 'Objetos decorativos', en: 'Decorative objects' },
  'wall decor': { es: 'Decoración de pared', en: 'Wall decor' },
  seasonal: { es: 'Decoración navideña', en: 'Christmas decor' },
  furniture: { es: 'Muebles para el hogar', en: 'Home furniture' },
  decor: { es: 'Decoración para el hogar', en: 'Home decor' },
};

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateAtWord(value, max) {
  const text = compactText(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(1, max - 1)).replace(/\s+\S*$/, '').trim();
  return `${cut || text.slice(0, max - 1).trim()}…`;
}

export function productCategoryLabel(category, lang = 'es') {
  const key = compactText(category).toLowerCase();
  const labels = PRODUCT_CATEGORY_LABELS[key] || PRODUCT_CATEGORY_LABELS.decor;
  return String(lang).toLowerCase().startsWith('en') ? labels.en : labels.es;
}

/** Useful, readable product copy when an import still has a generic template. */
export function productDisplayDescription(product, lang = 'es') {
  const raw = compactText(product?.description);
  if (raw && !isTemplateProductDescription(raw)) return raw;
  const english = String(lang).toLowerCase().startsWith('en');
  const name = compactText(product?.name) || (english ? 'This piece' : 'Esta pieza');
  const label = productCategoryLabel(product?.category, lang).toLowerCase();
  const photos = productImages(product, { max: 12 }).length;
  const price = Number(product?.retail_price_eur || 0);
  const priceText = price > 0
    ? english
      ? ` It is currently offered at €${price.toFixed(2)}.`
      : ` Actualmente se ofrece por ${price.toFixed(2).replace('.', ',')} €.`
    : '';
  if (english) {
    return `${name} is part of Maison Marnier's ${label} edit. Review the complete gallery${photos ? ` with ${photos} real product photos` : ''} to see the piece from several angles.${priceText} EU shipping and 30-day returns apply.`;
  }
  return `${name} forma parte de la selección de ${label} de Maison Marnier. Consulta la galería completa${photos ? ` con ${photos} fotografías reales del producto` : ''} para verla desde varios ángulos.${priceText} Disponible con envío en la UE y devolución en 30 días.`;
}

/** Product title/description sized for search snippets and unique per PDP. */
export function productSeoMeta(product, lang = 'es') {
  const english = String(lang).toLowerCase().startsWith('en');
  const name = compactText(product?.name) || (english ? 'Home decor piece' : 'Pieza de decoración');
  const label = productCategoryLabel(product?.category, lang);
  const title = truncateAtWord(`${label}: ${name}`, 41);
  const photos = productImages(product, { max: 12 }).length;
  const price = Number(product?.retail_price_eur || 0);
  const priceText = price > 0
    ? english
      ? ` for €${price.toFixed(2)}`
      : ` por ${price.toFixed(2).replace('.', ',')} €`
    : '';
  const description = english
    ? `Shop ${name}${priceText} at Maison Marnier. ${label}, ${photos || 'multiple'} real product photos, EU shipping and 30-day returns.`
    : `Compra ${name}${priceText} en Maison Marnier. ${label}, ${photos || 'varias'} fotos reales, envío en la UE y devoluciones de 30 días.`;
  return { title, description: truncateAtWord(description, 155) };
}

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
        sameAs: [INSTAGRAM_URL, FACEBOOK_URL],
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

/**
 * CollectionPage + ItemList for collection hubs (seasonal, etc.).
 * Cap list length to keep JSON-LD compact for crawlers.
 */
export function collectionPageJsonLd({
  name,
  description = '',
  url = '/',
  products = [],
  itemListCap = 48,
} = {}) {
  const pageUrl = absoluteUrl(url);
  const list = (products || []).slice(0, itemListCap);
  const itemListId = `${pageUrl}#itemlist`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#collection`,
        name: name || '',
        description: String(description || '').slice(0, 5000),
        url: pageUrl,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntity: { '@id': itemListId },
      },
      {
        '@type': 'ItemList',
        '@id': itemListId,
        name: name || '',
        numberOfItems: list.length,
        itemListElement: list.map((p, i) => {
          const path = `/products/${encodeURIComponent(p.slug || '')}`;
          return {
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(path),
            name: p.name || '',
          };
        }),
      },
    ],
  };
}

/** Normalize D1 timestamps to ISO-8601 for JSON-LD. */
function toIsoDate(value) {
  const s = String(value || '').trim();
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00Z`;
  if (s.includes('T')) return s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  return `${s.replace(' ', 'T')}Z`;
}

/**
 * BlogPosting (+ BreadcrumbList) for `/journal/{slug}` articles.
 */
export function blogPostingJsonLd({
  title,
  description = '',
  url = '/',
  image = '',
  datePublished = '',
  dateModified = '',
} = {}) {
  const pageUrl = absoluteUrl(url);
  const img = image ? absoluteUrl(image) : undefined;
  const published = String(datePublished || '').trim() || undefined;
  const modified = String(dateModified || datePublished || '').trim() || published;
  const posting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${pageUrl}#article`,
    headline: title || '',
    description: String(description || '').slice(0, 5000),
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    author: { '@id': `${SITE_ORIGIN}/#organization` },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    inLanguage: 'es',
  };
  if (img) posting.image = [img];
  if (published) posting.datePublished = toIsoDate(published);
  if (modified) posting.dateModified = toIsoDate(modified);

  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Diario', path: '/journal' },
    { name: title || 'Artículo', path: url },
  ]);
  return [posting, crumbs];
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

/** Map storefront lang (es|en) to Open Graph locale tags. */
export function ogLocalesForLang(lang = 'es') {
  const primary = String(lang || 'es').toLowerCase().startsWith('en') ? OG_LOCALE_ALTERNATE : OG_LOCALE_DEFAULT;
  const alternate = primary === OG_LOCALE_DEFAULT ? OG_LOCALE_ALTERNATE : OG_LOCALE_DEFAULT;
  return { locale: primary, alternate };
}

/** Build head meta tags (canonical, robots, Open Graph, Twitter). */
export function seoHeadHtml({
  title,
  description = '',
  canonical = '/',
  ogImage = '',
  ogType = 'website',
  noindex = false,
  lang = 'es',
} = {}) {
  const pageTitle = title || 'Maison Marnier';
  const canon = absoluteUrl(canonical);
  const image = absoluteUrl(ogImage || DEFAULT_OG_IMAGE);
  const desc = description || '';
  const robots = noindex ? '<meta name="robots" content="noindex,follow">\n' : '';
  const { locale, alternate } = ogLocalesForLang(lang);
  const isBrandOg = !ogImage || ogImage === DEFAULT_OG_IMAGE || ogImage === BRAND_OG_PATH;
  const imageDims = isBrandOg
    ? `<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
`
    : '';
  return `${robots}<link rel="canonical" href="${escapeAttr(canon)}">
<meta property="og:site_name" content="${escapeAttr(OG_SITE_NAME)}">
<meta property="og:locale" content="${escapeAttr(locale)}">
<meta property="og:locale:alternate" content="${escapeAttr(alternate)}">
<meta property="og:title" content="${escapeAttr(pageTitle)}">
<meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:url" content="${escapeAttr(canon)}">
<meta property="og:type" content="${escapeAttr(ogType)}">
<meta property="og:image" content="${escapeAttr(image)}">
${imageDims}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(pageTitle)}">
<meta name="twitter:description" content="${escapeAttr(desc)}">
<meta name="twitter:image" content="${escapeAttr(image)}">`;
}
