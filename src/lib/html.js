import { esc } from './escape.js';
import { DEFAULT_OG_IMAGE, jsonLdScript, seoHeadHtml } from './seo.js';

/** Google Tag Manager — public storefront only (not admin). */
export const GTM_ID = 'GTM-WL3RFMH4';

export function gtmHeadHtml() {
  return `<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>`;
}

export function gtmNoscriptHtml() {
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

const NAV = [
  ['New', '/collections/new'],
  ['Decor', '/collections/decor'],
  ['Lighting', '/collections/lighting'],
  ['Seasonal', '/collections/seasonal'],
  ['Objects', '/collections/objects'],
  ['Journal', '/journal'],
];

function navHtml() {
  return NAV.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join('');
}

/** Shared premium cozy design system (CarLux-inspired, warmer for home). */
export const LAYOUT_CSS = `
:root{
  --bg:#12100e;--panel:#1a1714;--panel2:#221e1a;--ink:#f3eee6;--muted:#a89f94;
  --line:#2e2924;--accent:#c4a574;--accent2:#e0c08a;--soft:#d8cfc3;
  --pad:clamp(18px,4vw,56px);--max:1420px;--nav-h:78px;
  --font:"Hanken Grotesk",system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.55 var(--font);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.announce{background:#0c0b0a;color:var(--soft);text-align:center;font:700 11px/1 var(--font);letter-spacing:.16em;text-transform:uppercase;padding:12px 16px;border-bottom:1px solid var(--line)}
.site-nav{display:grid;grid-template-columns:240px 1fr auto;align-items:center;gap:24px;min-height:var(--nav-h);padding:0 var(--pad);border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(18,16,14,.94);backdrop-filter:blur(14px);z-index:40}
.brand{display:flex;align-items:center;gap:0;font:900 15px/1 var(--font);letter-spacing:.2em;text-transform:uppercase;color:#fff}
.brand span{color:var(--accent)}
.site-nav .links{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}
.site-nav .links a{color:var(--soft);font:700 13px/1 var(--font);letter-spacing:.02em;opacity:.9;transition:color .2s}
.site-nav .links a:hover{color:var(--accent2)}
.tools{display:flex;gap:10px;align-items:center;justify-content:flex-end}
.tools .search{width:150px;padding:11px 12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 12px/1.2 var(--font);border-radius:6px}
.cart-link{display:inline-flex;align-items:center;gap:6px;padding:11px 14px;border:1px solid var(--accent);border-radius:6px;font:800 11px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:transparent}
.cart-link:hover{background:rgba(196,165,116,.12)}
.wrap{max-width:var(--max);margin:auto;padding:0 var(--pad) 56px}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:22px 0 0;font:700 11px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.crumbs a:hover{color:var(--accent2)}
.crumbs .sep{opacity:.4}

.collection-top{margin:0 calc(-1 * var(--pad));padding:36px var(--pad) 28px;background:
  radial-gradient(900px 380px at 10% -20%, rgba(196,165,116,.18), transparent 55%),
  linear-gradient(180deg, #1a1714 0%, var(--bg) 100%);
  border-bottom:1px solid var(--line)}
.collection-top .head{margin:0}
.head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:28px 0 24px;flex-wrap:wrap}
.head-meta{color:var(--muted);font:700 12px/1.3 var(--font);letter-spacing:.1em;text-transform:uppercase}
h1{font:900 clamp(34px,4.6vw,56px)/.98 var(--font);margin:0;letter-spacing:-.045em;color:#fff}
.lead{color:var(--muted);max-width:44ch;margin:14px 0 0;line-height:1.55;font-size:15px;font-weight:500}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:22px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:6px;font:700 11px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--panel);transition:.2s}
.chip:hover{color:#fff;border-color:#4a433c}
.chip.is-active{background:var(--accent);color:#12100e;border-color:var(--accent)}

.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:22px 16px;padding-top:12px}
.grid > .p{animation:fadeRise .5s ease both}
.p{display:block;color:var(--ink);position:relative}
.p .media{position:relative;overflow:hidden;background:var(--panel2);aspect-ratio:4/5;border-radius:8px;border:1px solid var(--line)}
.p .media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s cubic-bezier(.2,.65,.3,1)}
.p:hover .media img{transform:scale(1.04)}
.p .badge{position:absolute;left:12px;top:12px;z-index:1;background:rgba(18,16,14,.88);color:var(--accent2);font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;padding:8px 10px;border-radius:5px}
.p .meta{padding-top:14px}
.p h3{font:800 16px/1.25 var(--font);margin:0;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.5em}
.p:hover h3{color:var(--accent2)}
.p .price-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:10px}
.p .price{font:800 14px/1 var(--font)}
.p .compare{font:600 12px/1 var(--font);color:var(--muted);text-decoration:line-through;margin-left:8px}
.p .catline{font:700 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.p .cta-hint{font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);opacity:0;transform:translateY(4px);transition:.25s}
.p:hover .cta-hint{opacity:1;transform:none}

.product{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:clamp(24px,4vw,56px);align-items:start;padding-top:22px}
.product-gallery{position:sticky;top:calc(var(--nav-h) + 24px);display:grid;gap:12px}
.product-gallery .frame{overflow:hidden;background:var(--panel2);aspect-ratio:4/5;border-radius:10px;border:1px solid var(--line)}
.product-gallery .frame img{width:100%;height:100%;object-fit:cover;display:block;animation:fadeRise .4s ease both}
.product-thumbs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.product-thumbs button{appearance:none;border:1px solid var(--line);background:var(--panel2);padding:0;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1;opacity:.72;transition:opacity .2s,border-color .2s}
.product-thumbs button.is-active,.product-thumbs button:hover{opacity:1;border-color:var(--accent)}
.product-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
.product-buy{padding:4px 0 0;animation:fadeRise .65s .05s ease both}
.buy-panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px 26px 24px}
.product .eyebrow{letter-spacing:.12em;text-transform:uppercase;font:800 11px/1 var(--font);color:var(--accent);margin-bottom:14px}
.product .eyebrow a:hover{color:var(--accent2)}
.product h1{margin:0 0 16px;font-size:clamp(28px,3.2vw,42px);max-width:14ch}
.product .price-block{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.product .price-now{font:900 26px/1 var(--font)}
.product .price-was{font:600 14px/1 var(--font);color:var(--muted);text-decoration:line-through}
.product .save{font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:#12100e;background:var(--accent);padding:6px 8px;border-radius:4px}
.stock-line{margin:10px 0 0;font-size:13px;color:var(--muted);font-weight:500}
.desc{line-height:1.7;color:var(--soft);white-space:pre-wrap;margin:20px 0 4px;max-width:46ch;font-size:14.5px;font-weight:500}
.buy-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:22px}
.trust{display:grid;gap:10px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:500}
.trust span{display:grid;grid-template-columns:14px 1fr;gap:10px}
.trust i{font-style:normal;color:var(--accent)}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.specs div{font-size:12px;color:var(--muted);font-weight:500}
.specs strong{display:block;font:800 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--ink);margin-bottom:6px}

.cart-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.7fr);gap:28px;align-items:start;padding-top:8px}
.cart-lines{display:grid;gap:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.cart-line{display:grid;grid-template-columns:88px 1fr auto;gap:16px;align-items:center;padding:16px;border-bottom:1px solid var(--line)}
.cart-line:last-child{border-bottom:0}
.cart-line img{width:88px;height:110px;object-fit:cover;background:var(--panel2);border-radius:6px}
.cart-line strong{font:800 15px/1.3 var(--font)}
.cart-summary{position:sticky;top:calc(var(--nav-h) + 24px);background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:24px}
.cart-summary h2{font:900 22px/1.2 var(--font);margin:0 0 16px;letter-spacing:-.03em}
.cart-summary .row{display:flex;justify-content:space-between;gap:12px;margin:8px 0;font-size:14px;font-weight:600}
.cart-summary .total{font:900 20px/1.2 var(--font);margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.qty{width:64px;padding:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;font:inherit}
.rm{display:inline-block;margin-top:8px;background:none;border:0;padding:0;color:var(--muted);cursor:pointer;text-decoration:underline;font:700 12px var(--font)}

.btn{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:15px 22px;margin:0;border:0;border-radius:6px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:filter .2s,transform .2s;box-shadow:0 10px 28px rgba(196,165,116,.18)}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn[disabled],.btn.is-disabled{opacity:.5;pointer-events:none;transform:none;box-shadow:none}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
.btn-ghost:hover{border-color:var(--accent)}
.btn-block{width:100%}
.muted{color:var(--muted);font-size:13px;font-weight:500}
.empty{padding:56px 0;color:var(--muted);font:800 22px/1.4 var(--font);letter-spacing:-.02em}
.related{margin-top:80px;padding-top:40px;border-top:1px solid var(--line)}
.related-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:8px}
.related h2{font:900 28px/1.1 var(--font);margin:0;letter-spacing:-.03em;color:#fff}
.related .view-all{font:800 11px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.journal-list{display:grid;gap:0}
.journal-card{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:22px;align-items:center;padding:22px 0;border-bottom:1px solid var(--line)}
.journal-card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--panel2)}
.journal-card h2{font:900 1.45rem/1.15 var(--font);margin:0 0 8px;letter-spacing:-.03em;color:#fff}
.journal-card:hover h2{color:var(--accent2)}
.article-hero{width:100%;max-height:420px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin:12px 0 24px;background:var(--panel2)}
.site-footer{margin-top:56px;border-top:1px solid var(--line);padding:40px var(--pad) 24px;background:#0c0b0a}
.footer-grid{max-width:var(--max);margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:28px}
.site-footer h4{font:800 12px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px;color:#fff}
.site-footer a{display:block;color:var(--muted);margin:8px 0;font-size:14px;font-weight:600}
.site-footer a:hover{color:var(--accent2)}
.bottom{max-width:var(--max);margin:28px auto 0;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;font-weight:600;border-top:1px solid var(--line);padding-top:16px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:var(--panel2);color:#fff;border:1px solid var(--line);padding:12px 18px;border-radius:8px;opacity:0;transition:.25s;pointer-events:none;z-index:50;font:700 12px/1.3 var(--font)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@keyframes fadeRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media(max-width:1200px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .site-nav{grid-template-columns:1fr auto;min-height:68px}
  .site-nav .links{display:none}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .product{grid-template-columns:1fr}
  .product-gallery{position:static}
  .cart-layout{grid-template-columns:1fr}
  .cart-summary{position:static}
  .footer-grid{grid-template-columns:1fr 1fr}
  .journal-card{grid-template-columns:1fr}
}
@media(max-width:520px){
  .tools .search{display:none}
  .footer-grid{grid-template-columns:1fr}
  .p h3{min-height:0}
}
`;

function footerHtml() {
  return `<footer class="site-footer">
  <div class="footer-grid">
    <div><div class="brand">MAISON <span>MARNIER</span></div><p class="muted" style="margin-top:12px;max-width:34ch">Curated home objects for quieter rooms and slower evenings.</p></div>
    <div><h4>Shop</h4><a href="/collections/new">New Arrivals</a><a href="/collections/decor">Decor</a><a href="/collections/seasonal">Seasonal</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a></div>
  </div>
  <div class="bottom"><span>© 2026 Maison Marnier.</span><span>Europe · EUR €</span></div>
</footer>
<div class="toast" id="toast"></div>
<script>
const t=document.getElementById('toast');
function toast(m){if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
const WISH_KEY='mm_wishlist';
function loadWish(){try{return JSON.parse(localStorage.getItem(WISH_KEY)||'[]')}catch(e){return []}}
function saveWish(ids){localStorage.setItem(WISH_KEY,JSON.stringify(ids))}
</script>`;
}

export function fontLinksHtml() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;
}

/** Shared storefront chrome. */
export function htmlPage(
  title,
  body,
  {
    description = '',
    status = 200,
    cache = 'private, no-store',
    canonical = '',
    ogImage = '',
    noindex = false,
    ogType = 'website',
    jsonLd = null,
  } = {},
) {
  const pageTitle = `${title} — Maison Marnier`;
  const canonPath = canonical || '/';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#12100e">
${gtmHeadHtml()}
<title>${esc(pageTitle)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
${seoHeadHtml({
  title: pageTitle,
  description,
  canonical: canonPath,
  ogImage: ogImage || DEFAULT_OG_IMAGE,
  ogType,
  noindex,
})}
${jsonLdScript(jsonLd)}
${fontLinksHtml()}
<style>${LAYOUT_CSS}</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Free shipping on orders over €100 · Europe</div>
<header class="site-nav">
  <a class="brand" href="/">MAISON <span>MARNIER</span></a>
  <nav class="links">${navHtml()}</nav>
  <div class="tools">
    <form action="/collections/new" method="get" role="search">
      <input class="search" type="search" name="q" placeholder="Search…" aria-label="Search products">
    </form>
    <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
  </div>
</header>
<main class="wrap">${body}</main>
${footerHtml()}
<script>
(function(){
  function count(){try{return (JSON.parse(localStorage.getItem('mm_cart')||'[]')||[]).reduce((s,i)=>s+Number(i.qty||1),0)}catch(e){return 0}}
  function paint(){const el=document.getElementById('cartCount'); if(!el)return; const n=count(); el.textContent=n?('('+n+')'):'';}
  paint(); window.addEventListener('mm-cart',paint); window.addEventListener('storage',paint);
})();
</script>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': cache,
      'x-content-type-options': 'nosniff',
    },
  });
}

export function productCard(p) {
  const href = '/products/' + encodeURIComponent(p.slug || '');
  const retail = Number(p.retail_price_eur || 0);
  const compareAt = Number(p.compare_at_price_eur || 0);
  const onSale = compareAt > retail && retail > 0;
  const compare = onSale ? `<span class="compare">€${compareAt.toFixed(2)}</span>` : '';
  const badge = onSale ? `<span class="badge">Edit</span>` : '';
  const img = esc(p.image_url || '');
  return `<a class="p" href="${href}">
    <div class="media">${badge}<img src="${img}" alt="${esc(p.name || '')}" loading="lazy" decoding="async"></div>
    <div class="meta">
      <div class="catline">${esc(p.category || 'Maison Marnier')}</div>
      <h3>${esc(p.name || '')}</h3>
      <div class="price-row">
        <span class="price">€${retail.toFixed(2)}${compare}</span>
        <span class="cta-hint">View →</span>
      </div>
    </div>
  </a>`;
}
