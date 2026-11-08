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
  ['Textiles', '/collections/textiles'],
  ['Objects', '/collections/objects'],
  ['Candles', '/collections/candles'],
  ['Wall Decor', '/collections/wall-decor'],
  ['Seasonal', '/collections/seasonal'],
  ['Lighting', '/collections/lighting'],
  ['Furniture', '/collections/furniture'],
  ['Journal', '/journal'],
];

function navHtml() {
  return NAV.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join('');
}

const LAYOUT_CSS = `
:root{
  --bg:#F8F4EC;--ink:#2E332A;--muted:#6e665d;--olive:#3E4736;--line:#E5DED2;
  --card:#E9E0D3;--accent:#4E5842;--sand:#EBE3D6;--paper:#FBF8F2;
  --pad:4.2vw;--max:1360px;--nav-h:92px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Inter,system-ui,-apple-system,sans-serif}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.announce{background:#424B37;color:#F8F4EC;text-align:center;font:10px/1 Georgia,serif;letter-spacing:.18em;text-transform:uppercase;padding:11px 16px}
.site-nav{display:grid;grid-template-columns:220px 1fr auto;align-items:center;gap:20px;min-height:var(--nav-h);padding:14px var(--pad);border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(251,248,242,.96);backdrop-filter:blur(12px);z-index:30}
.brand{font:400 20px/1 Georgia,serif;letter-spacing:.18em;color:var(--olive)}
.site-nav .links{display:flex;flex-wrap:wrap;justify-content:center;gap:18px;font:10px/1 Georgia,serif;letter-spacing:.09em;text-transform:uppercase}
.site-nav .links a{color:#34392F;opacity:.88;transition:opacity .2s}
.site-nav .links a:hover{opacity:1;text-decoration:underline;text-underline-offset:4px}
.tools{display:flex;gap:10px;align-items:center;justify-content:flex-end}
.tools .search{width:150px;padding:10px 12px;border:1px solid var(--line);background:#fff;font:12px/1.2 inherit}
.cart-link{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border:1px solid var(--line);font:10px/1 Georgia,serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);background:transparent}
.cart-link:hover{border-color:var(--olive)}
.wrap{max-width:var(--max);margin:auto;padding:0 var(--pad) 72px}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:22px 0 0;font:10px/1 Georgia,serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.crumbs a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.crumbs .sep{opacity:.45}

/* Collection / page header */
.collection-top{margin:0 calc(-1 * var(--pad)) 0;padding:48px var(--pad) 36px;background:
  radial-gradient(1200px 420px at 12% -10%, rgba(217,194,167,.55), transparent 60%),
  linear-gradient(180deg, #F1E8DC 0%, var(--bg) 100%);
  border-bottom:1px solid var(--line)}
.collection-top .head{margin:0;align-items:end}
.head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:28px 0 24px;flex-wrap:wrap}
.head-meta{color:var(--muted);font:12px/1.3 Georgia,serif;letter-spacing:.08em;text-transform:uppercase}
h1{font:400 clamp(34px,4.2vw,52px)/1.05 Georgia,serif;margin:0;letter-spacing:-.025em;color:var(--olive)}
.lead{color:var(--muted);max-width:42ch;margin:12px 0 0;line-height:1.6;font-size:15px}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:22px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;padding:9px 13px;border:1px solid var(--line);font:10px/1 Georgia,serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:var(--paper);transition:background .2s,color .2s,border-color .2s,transform .2s}
.chip:hover{transform:translateY(-1px);color:var(--ink);border-color:#cfc5b6}
.chip.is-active{background:var(--olive);color:#F8F4EC;border-color:var(--olive)}

/* Product grid */
.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:28px 18px;padding-top:18px}
.grid > .p{animation:fadeRise .55s ease both}
.grid > .p:nth-child(1){animation-delay:.02s}
.grid > .p:nth-child(2){animation-delay:.06s}
.grid > .p:nth-child(3){animation-delay:.1s}
.grid > .p:nth-child(4){animation-delay:.14s}
.grid > .p:nth-child(5){animation-delay:.18s}
.p{display:block;color:var(--olive);font-family:Georgia,serif;position:relative}
.p .media{position:relative;overflow:hidden;background:linear-gradient(165deg,#efe7da,#d8cebf);aspect-ratio:3/4}
.p .media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 70%,rgba(46,51,42,.06));pointer-events:none;opacity:0;transition:opacity .35s}
.p:hover .media::after{opacity:1}
.p .media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .75s cubic-bezier(.2,.65,.3,1),filter .35s ease}
.p:hover .media img{transform:scale(1.045);filter:saturate(.92)}
.p .badge{position:absolute;left:12px;top:12px;z-index:1;background:rgba(251,248,242,.94);color:var(--olive);font:9px/1 Georgia,serif;letter-spacing:.14em;text-transform:uppercase;padding:7px 9px;border:1px solid rgba(62,71,54,.12)}
.p .meta{padding-top:14px}
.p h3{font:400 17px/1.28 Georgia,serif;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.56em}
.p:hover h3{text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.p .price-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:9px}
.p .price{font-size:13px;letter-spacing:.02em}
.p .compare{font-size:11px;color:#9A8F7D;text-decoration:line-through;margin-left:7px}
.p .catline{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#7A715F;margin-bottom:7px}
.p .cta-hint{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#8a8072;opacity:0;transform:translateY(4px);transition:.25s}
.p:hover .cta-hint{opacity:1;transform:none}

/* PDP */
.product{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:clamp(28px,5vw,64px);align-items:start;padding-top:18px}
.product-gallery{position:sticky;top:calc(var(--nav-h) + 28px)}
.product-gallery .frame{overflow:hidden;background:linear-gradient(165deg,#efe7da,#d8cebf);aspect-ratio:4/5;box-shadow:0 24px 60px rgba(46,51,42,.08)}
.product-gallery img{width:100%;height:100%;object-fit:cover;display:block;animation:fadeRise .55s ease both}
.product-buy{padding:8px 0 0;animation:fadeRise .65s .06s ease both}
.buy-panel{background:var(--paper);border:1px solid var(--line);padding:28px 26px 24px}
.product .eyebrow{letter-spacing:.14em;text-transform:uppercase;font-size:10px;color:var(--muted);margin-bottom:14px}
.product .eyebrow a:hover{color:var(--ink);text-decoration:underline;text-underline-offset:3px}
.product h1{margin:0 0 16px;font-size:clamp(30px,3.4vw,44px);max-width:16ch;letter-spacing:-.03em}
.product .price-block{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.product .price-now{font:400 26px/1 Georgia,serif}
.product .price-was{font-size:14px;color:#9A8F7D;text-decoration:line-through}
.product .save{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);border:1px solid rgba(78,88,66,.25);padding:5px 8px}
.stock-line{margin:10px 0 0;font-size:13px;color:var(--muted)}
.desc{line-height:1.75;color:#615950;white-space:pre-wrap;margin:20px 0 4px;max-width:46ch;font-size:14.5px}
.buy-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:22px}
.trust{display:grid;gap:10px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.trust span{display:grid;grid-template-columns:14px 1fr;gap:10px;align-items:start}
.trust i{font-style:normal;color:var(--accent)}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.specs div{font-size:12px;color:var(--muted)}
.specs strong{display:block;font:10px/1 Georgia,serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink);margin-bottom:6px;font-weight:400}

/* Cart */
.cart-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.7fr);gap:36px;align-items:start;padding-top:8px}
.cart-lines{display:grid;gap:0;background:var(--paper);border:1px solid var(--line)}
.cart-line{display:grid;grid-template-columns:88px 1fr auto;gap:16px;align-items:center;padding:16px;border-bottom:1px solid var(--line)}
.cart-line:last-child{border-bottom:0}
.cart-line img{width:88px;height:110px;object-fit:cover;background:var(--card)}
.cart-line strong{font:400 16px/1.3 Georgia,serif}
.cart-summary{position:sticky;top:calc(var(--nav-h) + 24px);background:var(--paper);border:1px solid var(--line);padding:24px}
.cart-summary h2{font:400 22px/1.2 Georgia,serif;margin:0 0 16px}
.cart-summary .row{display:flex;justify-content:space-between;gap:12px;margin:8px 0;font-size:14px}
.cart-summary .total{font:400 20px/1.2 Georgia,serif;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.qty{width:64px;padding:7px 8px;border:1px solid var(--line);background:#fff;font:inherit}
.rm{display:inline-block;margin-top:8px;background:none;border:0;padding:0;color:var(--muted);cursor:pointer;text-decoration:underline;text-underline-offset:2px;font:inherit}

.btn{display:inline-flex;align-items:center;justify-content:center;background:var(--accent);color:#F8F4EC;padding:14px 22px;margin:0;border:0;font:11px/1 Georgia,serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:filter .2s,transform .2s}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn[disabled],.btn.is-disabled{opacity:.55;pointer-events:none;transform:none}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn-ghost:hover{border-color:var(--olive)}
.btn-block{width:100%}
.muted{color:var(--muted);font-size:13px}
.empty{padding:56px 0;color:var(--muted);font:20px/1.5 Georgia,serif}
.related{margin-top:80px;padding-top:40px;border-top:1px solid var(--line)}
.related-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:8px}
.related h2{font:400 28px/1.15 Georgia,serif;margin:0;letter-spacing:.02em;color:var(--olive)}
.related .view-all{font:10px/1 Georgia,serif;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid #A58F77;padding-bottom:3px}
.site-footer{margin-top:80px;border-top:1px solid var(--line);padding:42px var(--pad) 28px;background:#efe7da}
.footer-grid{max-width:var(--max);margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:28px}
.site-footer h4{font:400 12px Georgia,serif;letter-spacing:.1em;text-transform:uppercase;margin:0 0 14px}
.site-footer a{display:block;color:var(--muted);margin:7px 0;font-size:14px}
.site-footer a:hover{color:var(--ink)}
.bottom{max-width:var(--max);margin:28px auto 0;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:16px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:#32382C;color:#fff;padding:12px 18px;opacity:0;transition:.25s;pointer-events:none;z-index:50;font:12px/1.3 Georgia,serif;letter-spacing:.04em}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@keyframes fadeRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media(max-width:1200px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .site-nav{grid-template-columns:1fr auto;min-height:72px}
  .site-nav .links{display:none}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 14px}
  .product{grid-template-columns:1fr;gap:24px}
  .product-gallery{position:static}
  .cart-layout{grid-template-columns:1fr}
  .cart-summary{position:static}
  .footer-grid{grid-template-columns:1fr 1fr}
  .collection-top{padding-top:36px}
}
@media(max-width:520px){
  .grid{grid-template-columns:1fr 1fr;gap:18px 12px}
  .p h3{font-size:15px;min-height:0}
  .tools .search{display:none}
  .footer-grid{grid-template-columns:1fr}
  .buy-panel{padding:20px 16px}
  .cart-line{grid-template-columns:72px 1fr;grid-template-rows:auto auto}
  .cart-line > :last-child{grid-column:2}
}
`;

function footerHtml() {
  return `<footer class="site-footer">
  <div class="footer-grid">
    <div><div class="brand">MAISON MARNIER</div><p class="muted">Curated home decor for considered everyday living.</p></div>
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

/** Shared storefront chrome matching homepage brand language. */
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>${LAYOUT_CSS}</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Free shipping on orders over €100 · Europe</div>
<header class="site-nav">
  <a class="brand" href="/">MAISON MARNIER</a>
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
  const badge = onSale ? `<span class="badge">Edited price</span>` : '';
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
