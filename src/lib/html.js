import { esc } from './escape.js';

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
:root{--bg:#F8F4EC;--ink:#2E332A;--muted:#6e665d;--olive:#3E4736;--line:#E5DED2;--card:#E9E0D3;--accent:#4E5842}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,sans-serif}
a{color:inherit;text-decoration:none}
.announce{background:#424B37;color:#F8F4EC;text-align:center;font:10px/1 Georgia,serif;letter-spacing:.18em;text-transform:uppercase;padding:12px 16px}
.site-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 4.2vw;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(251,248,242,.94);backdrop-filter:blur(10px);z-index:20}
.brand{font:400 18px/1 Georgia,serif;letter-spacing:.15em}
.site-nav .links{display:flex;flex-wrap:wrap;gap:16px;font:10px/1 Georgia,serif;letter-spacing:.08em;text-transform:uppercase}
.site-nav .links a:hover{text-decoration:underline;text-underline-offset:4px}
.tools{display:flex;gap:10px;align-items:center}
.tools .search{width:160px;padding:9px 12px;border:1px solid var(--line);background:#fff;font:inherit;border-radius:0}
.wrap{max-width:1280px;margin:auto;padding:42px 4.2vw 64px}
.head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:4px 0 32px;flex-wrap:wrap}
.head-meta{color:var(--muted);font-size:13px;letter-spacing:.04em}
h1{font:400 42px/1.08 Georgia,serif;margin:0;letter-spacing:-.02em}
.lead{color:var(--muted);max-width:46ch;margin:10px 0 0;line-height:1.55}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 28px}
.chip{display:inline-flex;align-items:center;padding:8px 12px;border:1px solid var(--line);font:10px/1 Georgia,serif;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);background:transparent;transition:background .2s,color .2s,border-color .2s}
.chip:hover,.chip.is-active{background:var(--olive);color:#F8F4EC;border-color:var(--olive)}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 18px}
.p{display:block;color:var(--olive);font-family:Georgia,serif;position:relative}
.p .media{position:relative;overflow:hidden;background:linear-gradient(160deg,#ebe3d6,#d9d0c2);aspect-ratio:3/4}
.p .media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s cubic-bezier(.2,.65,.3,1),filter .35s ease}
.p:hover .media img{transform:scale(1.04);filter:saturate(.93)}
.p .badge{position:absolute;left:12px;top:12px;z-index:1;background:rgba(248,244,236,.94);color:var(--olive);font:9px/1 Georgia,serif;letter-spacing:.14em;text-transform:uppercase;padding:7px 9px;border:1px solid rgba(62,71,54,.12)}
.p .meta{padding-top:14px}
.p h3{font:400 17px/1.25 Georgia,serif;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.p:hover h3{text-decoration:underline;text-underline-offset:3px}
.p .price-row{display:flex;align-items:baseline;gap:8px;margin-top:8px;flex-wrap:wrap}
.p .price{font-size:13px;letter-spacing:.02em}
.p .compare{font-size:11px;color:#9A8F7D;text-decoration:line-through}
.p .catline{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#7A715F;margin-bottom:7px}
.product{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:48px;align-items:start}
.product-gallery{position:sticky;top:110px}
.product-gallery .frame{overflow:hidden;background:linear-gradient(160deg,#ebe3d6,#d9d0c2);aspect-ratio:4/5}
.product-gallery img{width:100%;height:100%;object-fit:cover;display:block;animation:fadeRise .55s ease both}
.product-buy{padding-top:8px;animation:fadeRise .65s .08s ease both}
.product .eyebrow{letter-spacing:.14em;text-transform:uppercase;font-size:10px;color:var(--muted);margin-bottom:12px}
.product h1{margin:0 0 14px;font-size:40px;max-width:18ch}
.product .price-block{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
.product .price-now{font:400 24px/1 Georgia,serif}
.product .price-was{font-size:14px;color:#9A8F7D;text-decoration:line-through}
.product .save{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
.desc{line-height:1.75;color:#615950;white-space:pre-wrap;margin:22px 0 8px;max-width:48ch}
.buy-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:20px}
.trust{display:grid;gap:8px;margin-top:28px;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
.trust span{display:flex;gap:8px;align-items:flex-start}
.btn{display:inline-block;background:var(--accent);color:#F8F4EC;padding:14px 22px;margin-top:0;border:0;font:11px/1 Georgia,serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
.btn:hover{filter:brightness(1.05)}
.btn[disabled],.btn.is-disabled{opacity:.55;pointer-events:none}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.muted{color:var(--muted);font-size:13px}
.empty{padding:48px 0;color:var(--muted);font:18px/1.5 Georgia,serif}
.related{margin-top:72px;padding-top:36px;border-top:1px solid var(--line)}
.related h2{font:400 28px Georgia,serif;margin:0 0 22px;letter-spacing:.04em}
.site-footer{margin-top:64px;border-top:1px solid var(--line);padding:36px 28px 28px;background:#efe7da}
.footer-grid{max-width:1280px;margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:24px}
.site-footer h4{font:400 13px Georgia,serif;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
.site-footer a{display:block;color:var(--muted);margin:6px 0;font-size:14px}
.site-footer a:hover{color:var(--ink)}
.bottom{max-width:1280px;margin:28px auto 0;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:16px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:#32382C;color:#fff;padding:12px 18px;opacity:0;transition:.25s;pointer-events:none;z-index:50}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@keyframes fadeRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:980px){
  .site-nav{flex-wrap:wrap}
  .site-nav .links{width:100%;order:3}
  .grid{grid-template-columns:repeat(2,1fr)}
  .product{grid-template-columns:1fr;gap:28px}
  .product-gallery{position:static}
  .product h1{font-size:34px}
  .footer-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:480px){.grid{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr}h1{font-size:34px}}
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
export function htmlPage(title, body, { description = '', status = 200, cache = 'private, no-store' } = {}) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${gtmHeadHtml()}
<title>${esc(title)} — Maison Marnier</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
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
    <a href="/cart" id="cartBtn" class="btn" style="padding:8px 12px;margin:0;background:transparent;color:inherit;border:1px solid var(--line);text-decoration:none">Cart <span id="cartCount"></span></a>
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
      <div class="price-row"><span class="price">€${retail.toFixed(2)}</span>${compare}</div>
    </div>
  </a>`;
}
