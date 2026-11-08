import { esc } from './escape.js';

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
:root{--bg:#F6F0E6;--ink:#211f1b;--muted:#6e665d;--olive:#30362A;--line:#d4cec4;--card:#E9E0D3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,-apple-system,sans-serif}
a{color:inherit;text-decoration:none}
.announce{background:#30362A;color:#F6F0E6;text-align:center;font:12px/1 Georgia,serif;letter-spacing:.06em;padding:10px 16px}
.site-nav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 28px;border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(246,240,230,.94);backdrop-filter:blur(8px);z-index:20}
.brand{font:400 18px/1 Georgia,serif;letter-spacing:.12em}
.site-nav .links{display:flex;flex-wrap:wrap;gap:14px;font:12px/1 Georgia,serif;letter-spacing:.04em}
.site-nav .links a:hover{text-decoration:underline;text-underline-offset:3px}
.tools{display:flex;gap:10px;align-items:center}
.tools .search{width:160px;padding:8px 10px;border:1px solid var(--line);background:#fff;font:inherit}
.wrap{max-width:1180px;margin:auto;padding:38px 24px}
.head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin:8px 0 28px}
h1{font:400 42px/1.1 Georgia,serif;margin:0}
.lead{color:var(--muted);max-width:42ch}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}
.p{display:block;color:var(--olive);font-family:Georgia,serif}
.p img{width:100%;aspect-ratio:3/4;object-fit:cover;background:var(--card);transition:transform .65s cubic-bezier(.2,.65,.3,1)}
.p:hover img{transform:scale(1.025)}
.p h3{font:400 18px/1.22 Georgia,serif;margin:11px 0 7px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.p:hover h3{text-decoration:underline;text-underline-offset:3px}
.p .price{font-size:13px}
.p .compare{font-size:11px;color:#9A8F7D;text-decoration:line-through;margin-left:6px}
.p .catline{font-size:9px;letter-spacing:.10em;text-transform:uppercase;color:#7A715F;margin-top:10px}
.product{display:grid;grid-template-columns:1fr 1fr;gap:45px}
.product img{width:100%;max-height:700px;object-fit:cover;background:var(--card)}
.product h1{margin-top:0}
.desc{line-height:1.7;color:#615950;white-space:pre-wrap}
.btn{display:inline-block;background:#24211d;color:white;padding:13px 18px;margin-top:16px;border:0;font:inherit}
.btn[disabled],.btn.is-disabled{opacity:.55;pointer-events:none}
.muted{color:var(--muted);font-size:13px}
.empty{padding:48px 0;color:var(--muted);font:18px/1.5 Georgia,serif}
.related{margin-top:56px}
.related h2{font:400 28px Georgia,serif}
.site-footer{margin-top:64px;border-top:1px solid var(--line);padding:36px 28px 28px;background:#efe7da}
.footer-grid{max-width:1180px;margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:24px}
.site-footer h4{font:400 13px Georgia,serif;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
.site-footer a{display:block;color:var(--muted);margin:6px 0;font-size:14px}
.site-footer a:hover{color:var(--ink)}
.bottom{max-width:1180px;margin:28px auto 0;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:16px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:#24211d;color:#fff;padding:12px 18px;opacity:0;transition:.25s;pointer-events:none;z-index:50}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(max-width:900px){
  .site-nav{flex-wrap:wrap}
  .site-nav .links{width:100%;order:3}
  .grid{grid-template-columns:repeat(2,1fr)}
  .product{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
}
@media(max-width:480px){.grid{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr}}
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
<title>${esc(title)} — Maison Marnier</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>${LAYOUT_CSS}</style>
</head>
<body>
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
  const compare =
    Number(p.compare_at_price_eur) > Number(p.retail_price_eur)
      ? `<span class="compare">€${Number(p.compare_at_price_eur).toFixed(2)}</span>`
      : '';
  return `<a class="p" href="${href}">
    <img src="${esc(p.image_url || '')}" alt="">
    <div class="catline">${esc(p.category || 'Maison Marnier')}</div>
    <h3>${esc(p.name || '')}</h3>
    <div class="price">€${Number(p.retail_price_eur || 0).toFixed(2)}${compare}</div>
  </a>`;
}
