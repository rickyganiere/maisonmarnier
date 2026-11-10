import { esc } from './escape.js';
import { BRAND, siteUrl } from './brand.js';

export function seoHead({ env, title, description, path = '/', type = 'website' }) {
  const base = siteUrl(env).replace(/\/$/, '');
  const url = `${base}${path === '/' ? '' : path}`;
  const fullTitle = title.includes(BRAND.name) ? title : `${title} · ${BRAND.name}`;
  const desc = description || BRAND.tagline;
  const ogImage = `${base}/og.svg`;

  return `
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="${esc(type)}" />
<meta property="og:site_name" content="${esc(BRAND.name)}" />
<meta property="og:title" content="${esc(fullTitle)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(fullTitle)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: BRAND.name,
    alternateName: BRAND.handle,
    description: `${BRAND.tagline} ${BRAND.disclosure}`,
    url: base,
    email: BRAND.email,
    sameAs: Object.values(BRAND.social),
    additionalType: 'https://schema.org/VirtualLocation',
  })}</script>`;
}
