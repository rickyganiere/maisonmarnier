import { BRAND } from './brand.js';
import { esc } from './escape.js';
import { seoHead } from './seo.js';

const NAV = [
  ['Home', '/'],
  ['About', '/about'],
  ['Watch', '/watch'],
  ['Media Kit', '/media-kit'],
  ['Offer', '/offer'],
  ['Contact', '/contact'],
];

function navHtml(activePath) {
  return NAV.map(([label, href]) => {
    const active = activePath === href ? ' aria-current="page"' : '';
    return `<a href="${esc(href)}"${active}>${esc(label)}</a>`;
  }).join('');
}

export function page({ env, title, description, path, body, bodyClass = '' }) {
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${seoHead({ env, title, description, path })}
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/styles.css" />
</head>
<body class="${esc(bodyClass)}">
<a class="skip" href="#main">Vai al contenuto</a>
<div class="noise" aria-hidden="true"></div>
<header class="site-header">
  <a class="logo" href="/">
    <span class="logo-mark" aria-hidden="true"></span>
    <span class="logo-text">${esc(BRAND.name)}</span>
  </a>
  <nav class="site-nav" aria-label="Primary">${navHtml(path)}</nav>
</header>
<p class="disclosure-bar" role="note">${esc(BRAND.disclosure)}</p>
<main id="main">${body}</main>
<footer class="site-footer">
  <div>
    <strong>${esc(BRAND.name)}</strong>
    <p>${esc(BRAND.role)}</p>
    <p>${esc(BRAND.tagline)}</p>
    <p class="fine">${esc(BRAND.disclosure)}</p>
  </div>
  <div class="footer-links">
    <a href="${esc(BRAND.social.instagram)}">Instagram</a>
    <a href="${esc(BRAND.social.tiktok)}">TikTok</a>
    <a href="${esc(BRAND.social.youtube)}">YouTube</a>
    <a href="/media-kit">Media kit</a>
    <a href="/contact">Contact</a>
  </div>
</footer>
<script src="/motion.js" defer></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function text(body, status = 200, type = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: { 'content-type': type },
  });
}
