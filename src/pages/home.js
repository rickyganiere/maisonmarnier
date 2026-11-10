/** Maison Marnier — premium cozy homepage (Christmas seasonal overlay). */
import { esc } from '../lib/escape.js';
import {
  brandLogoHtml,
  fontLinksHtml,
  gtmHeadHtml,
  gtmNoscriptHtml,
  LAYOUT_CSS,
  productCard,
} from '../lib/html.js';
import { getLiveProducts } from '../db/products.js';
import {
  DEFAULT_OG_IMAGE,
  jsonLdScript,
  organizationWebsiteJsonLd,
  seoHeadHtml,
} from '../lib/seo.js';

const HOME_CSS = `
${LAYOUT_CSS}
.home-main{overflow:hidden}
.mm-hero{position:relative;min-height:min(78vh,640px);isolation:isolate;display:flex;align-items:center}
.mm-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:
  radial-gradient(ellipse 70% 80% at 78% 30%, rgba(122,31,40,.35), transparent 58%),
  radial-gradient(ellipse 55% 70% at 18% 70%, rgba(31,61,50,.4), transparent 60%),
  linear-gradient(115deg, rgba(10,9,8,.96) 0%, rgba(10,9,8,.72) 42%, rgba(10,9,8,.45) 100%),
  repeating-linear-gradient(-18deg, transparent 0 14px, rgba(230,196,138,.035) 14px 15px),
  linear-gradient(160deg,#1a1210,#0f1412 48%,#15100e)}
.mm-hero::after{content:"";position:absolute;inset:auto 0 0;height:110px;z-index:-1;background:linear-gradient(180deg,transparent,var(--bg))}
.mm-flake{position:absolute;inset:0;pointer-events:none;z-index:-1;overflow:hidden}
.mm-flake i{position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(246,240,230,.55);animation:flakeFall linear infinite;opacity:.55}
.mm-flake i:nth-child(1){left:8%;animation-duration:11s;animation-delay:-2s}
.mm-flake i:nth-child(2){left:22%;width:2px;height:2px;animation-duration:14s;animation-delay:-6s}
.mm-flake i:nth-child(3){left:41%;animation-duration:12s;animation-delay:-1s}
.mm-flake i:nth-child(4){left:63%;width:2px;height:2px;animation-duration:16s;animation-delay:-8s}
.mm-flake i:nth-child(5){left:78%;animation-duration:13s;animation-delay:-4s}
.mm-flake i:nth-child(6){left:91%;width:2px;height:2px;animation-duration:15s;animation-delay:-9s}
@keyframes flakeFall{0%{transform:translateY(-8vh);opacity:0}12%{opacity:.6}100%{transform:translateY(88vh);opacity:0}}
.mm-hero-inner{width:min(1420px,calc(100% - 2 * var(--pad)));margin:0 auto;padding:56px 0 64px}
.mm-kicker{display:block;margin-bottom:18px;color:var(--accent);font:900 12px/1 var(--font);letter-spacing:.16em;text-transform:uppercase}
.mm-hero h1{margin:0;max-width:12ch;font:900 clamp(3.2rem,7vw,5.6rem)/.92 var(--font);letter-spacing:-.055em;color:#fff}
.mm-hero h1 em{font-style:normal;color:var(--accent2)}
.mm-hero .lead{margin:18px 0 0;max-width:38ch;color:#d2cbc1;font:500 1.05rem/1.55 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.mm-section{padding:40px var(--pad)}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:18px}
.mm-section-head h2{margin:0;font:900 clamp(1.6rem,3vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.mm-cat{position:relative;min-height:180px;overflow:hidden;border-radius:10px;border:1px solid var(--line);display:flex;align-items:flex-end;padding:22px;background:
  linear-gradient(160deg, rgba(31,61,50,.55), rgba(16,14,12,.92));
  transition:border-color .25s, transform .25s}
.mm-cat:nth-child(2){background:linear-gradient(160deg, rgba(122,31,40,.45), rgba(16,14,12,.92))}
.mm-cat:nth-child(3){background:linear-gradient(160deg, rgba(201,164,106,.28), rgba(16,14,12,.92))}
.mm-cat:nth-child(4){background:linear-gradient(160deg, rgba(47,90,72,.5), rgba(16,14,12,.92))}
.mm-cat:hover{border-color:var(--accent);transform:translateY(-2px)}
.mm-cat span{font:900 1.05rem/1.1 var(--font);letter-spacing:-.02em;color:#fff}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.mm-band{margin:4px var(--pad) 0;border-radius:12px;overflow:hidden;border:1px solid var(--line);display:grid;grid-template-columns:1fr 1.15fr;min-height:300px;background:var(--panel)}
.mm-band-copy{padding:36px clamp(20px,3.5vw,44px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:10px 0 12px;font:900 clamp(1.8rem,3.2vw,2.6rem)/1.05 var(--font);letter-spacing:-.04em;color:#fff;max-width:13ch}
.mm-band-copy p{margin:0;color:var(--muted);max-width:36ch;font-weight:500;line-height:1.55}
.mm-band-img{position:relative;min-height:240px;background:
  radial-gradient(circle at 30% 40%, rgba(230,196,138,.22), transparent 42%),
  radial-gradient(circle at 70% 60%, rgba(122,31,40,.35), transparent 45%),
  linear-gradient(145deg,#1a221c,#140f0e 55%,#1f1412)}
.mm-band-img::after{content:"Fêtes";position:absolute;inset:auto 28px 28px auto;font:900 2.4rem/1 var(--font);letter-spacing:-.04em;color:rgba(246,240,230,.18)}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:28px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0b0a;margin-top:36px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:40px var(--pad)}
.mm-story{min-height:260px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);display:flex;align-items:flex-end;padding:28px;color:#fff;background:
  linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),
  linear-gradient(135deg,#1c1713,#14201a)}
.mm-story:nth-child(2){background:
  linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),
  linear-gradient(135deg,#221412,#1a100f)}
.mm-story > div{position:relative;z-index:1}
.mm-story h3{margin:8px 0;font:900 1.8rem/1.05 var(--font);letter-spacing:-.03em}
.mm-story p{margin:0;max-width:34ch;color:#ddd5cb;font:500 14px/1.5 var(--font)}
.mm-news{margin:0 var(--pad) 48px;padding:32px clamp(20px,3.5vw,40px);border-radius:12px;border:1px solid var(--line);background:linear-gradient(135deg,#221812,#12100e 55%,#152018);display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}
.mm-news h2{margin:0 0 10px;font:900 clamp(1.6rem,3vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.mm-news p{margin:0;color:var(--muted);font-weight:500}
.mm-form{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.mm-form input{flex:1;border:0;padding:16px 18px;background:var(--bg);color:var(--ink);font:600 14px var(--font)}
.mm-form button{border:0;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:0 22px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-cats,.mm-products{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-band,.mm-stories,.mm-news{grid-template-columns:1fr}
  .mm-benefits{grid-template-columns:1fr 1fr}
  .mm-hero{min-height:520px}
}
@media(max-width:560px){
  .mm-benefits{grid-template-columns:1fr}
}
`;

export async function homePage(env) {
  let featuredHtml = '';
  try {
    const products = await getLiveProducts(env, 10);
    featuredHtml = products.map(productCard).join('');
  } catch {
    featuredHtml = '';
  }
  if (!featuredHtml) {
    featuredHtml = `<p class="empty">Holiday pieces are arriving.</p>`;
  }

  const homeTitle = 'Maison Marnier — Holiday Home Edit';
  const homeDescription =
    'Festive home decor for European interiors — ornaments, lights, candles and holiday objects curated by Maison Marnier.';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#100e0c">
${gtmHeadHtml()}
<title>${esc(homeTitle)}</title>
<meta name="description" content="${esc(homeDescription)}">
${seoHeadHtml({
  title: homeTitle,
  description: homeDescription,
  canonical: '/',
  ogImage: DEFAULT_OG_IMAGE,
  ogType: 'website',
})}
${jsonLdScript(organizationWebsiteJsonLd())}
${fontLinksHtml()}
<style>${HOME_CSS}</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Holiday edit · Free shipping over €100 · Europe</div>
<header class="site-nav">
  <a class="brand" href="/" aria-label="Maison Marnier home">${brandLogoHtml()}</a>
  <nav class="links">
    <a href="/collections/seasonal">Fêtes</a>
    <a href="/collections/new">New</a>
    <a href="/collections/lighting">Lighting</a>
    <a href="/collections/objects">Objects</a>
    <a href="/collections/candles">Candles</a>
    <a href="/journal">Journal</a>
  </nav>
  <div class="tools">
    <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
  </div>
</header>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-flake" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="mm-hero-inner">
      <span class="mm-kicker">Maison Marnier · Holiday 2026</span>
      <h1>Light the <em>maison</em> for the fêtes</h1>
      <p class="lead">Ornaments, warm lights and festive objects with real product photos — curated for quieter holiday rooms.</p>
      <div class="mm-actions">
        <a class="btn" href="/collections/seasonal">Shop the holiday edit</a>
        <a class="btn btn-ghost" href="/collections/new">New arrivals</a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="categories">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Shop the season</h2>
        <a href="/collections/seasonal">View all →</a>
      </div>
      <div class="mm-cats">
        <a class="mm-cat" href="/collections/seasonal"><span>Fêtes</span></a>
        <a class="mm-cat" href="/collections/lighting"><span>Glow &amp; lights</span></a>
        <a class="mm-cat" href="/collections/candles"><span>Candles</span></a>
        <a class="mm-cat" href="/collections/objects"><span>Objects</span></a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Holiday arrivals</h2>
        <a href="/collections/new">View all →</a>
      </div>
      <div class="mm-products grid">${featuredHtml}</div>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Seasonal edit</span>
      <h2>Warm rooms for the holidays</h2>
      <p>Garlands, stockings, table light and small festive objects — chosen to feel collected, not cluttered.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Shop Fêtes</a></div>
    </div>
    <div class="mm-band-img" role="img" aria-label="Holiday maison atmosphere"></div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>EU shipping</strong><span>Partner fulfilment across Europe.</span></div>
    <div class="mm-benefit"><strong>30-day returns</strong><span>Clear, simple and fair.</span></div>
    <div class="mm-benefit"><strong>Real product photos</strong><span>Supplier galleries — not stock fillers.</span></div>
    <div class="mm-benefit"><strong>Secure checkout</strong><span>Stripe · VAT calculated at payment.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal">
      <div><span class="mm-kicker">Journal</span><h3>A quieter Christmas table</h3><p>How to dress the table with light, linen and a few festive objects.</p></div>
    </a>
    <a class="mm-story" href="/collections/candles">
      <div><span class="mm-kicker">Edit</span><h3>Glow for long evenings</h3><p>Candles and warm lamps that keep the room soft after dinner.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Stay close to the maison</h2>
      <p>Holiday drops and seasonal notes — occasionally, not constantly.</p>
    </div>
    <form class="mm-form" id="form">
      <input required type="email" placeholder="Your email" aria-label="Email">
      <button type="submit">Subscribe</button>
    </form>
  </section>
</main>

<footer class="site-footer">
  <div class="footer-grid">
    <div><a class="brand" href="/" aria-label="Maison Marnier">${brandLogoHtml()}</a><p class="muted" style="margin-top:12px;max-width:34ch">Holiday edits for warm rooms — festive objects chosen with quiet care.</p></div>
    <div><h4>Shop</h4><a href="/collections/seasonal">Fêtes</a><a href="/collections/new">New Arrivals</a><a href="/collections/lighting">Lighting</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a></div>
  </div>
  <div class="bottom"><span>© 2026 Maison Marnier.</span><span>Europe · EUR €</span></div>
</footer>
<div class="toast" id="toast"></div>
<script>
const t=document.getElementById('toast');
function toast(m){if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
document.getElementById('form').onsubmit=e=>{e.preventDefault();toast('Thanks — welcome to Maison Marnier.');e.target.reset()};
(function(){
  function count(){try{return (JSON.parse(localStorage.getItem('mm_cart')||'[]')||[]).reduce((s,i)=>s+Number(i.qty||1),0)}catch(e){return 0}}
  function paint(){const el=document.getElementById('cartCount'); if(!el)return; const n=count(); el.textContent=n?('('+n+')'):'';}
  paint(); window.addEventListener('mm-cart',paint);
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=120',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}
