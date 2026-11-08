/** Maison Marnier — premium cozy homepage (CarLux-inspired structure). */
import { esc } from '../lib/escape.js';
import {
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
  linear-gradient(105deg,rgba(12,10,8,.94) 0%,rgba(12,10,8,.78) 36%,rgba(12,10,8,.35) 66%,rgba(12,10,8,.6) 100%),
  url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80') center/cover no-repeat}
.mm-hero::after{content:"";position:absolute;inset:auto 0 0;height:100px;z-index:-1;background:linear-gradient(180deg,transparent,var(--bg))}
.mm-hero-inner{width:min(1420px,calc(100% - 2 * var(--pad)));margin:0 auto;padding:56px 0 64px}
.mm-kicker{display:block;margin-bottom:18px;color:var(--accent);font:900 12px/1 var(--font);letter-spacing:.16em;text-transform:uppercase}
.mm-hero h1{margin:0;max-width:11ch;font:900 clamp(3.2rem,7vw,5.6rem)/.92 var(--font);letter-spacing:-.055em;color:#fff}
.mm-hero h1 em{font-style:normal;color:var(--accent2)}
.mm-hero .lead{margin:18px 0 0;max-width:38ch;color:#d2cbc1;font:500 1.05rem/1.55 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.mm-section{padding:40px var(--pad)}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:18px}
.mm-section-head h2{margin:0;font:900 clamp(1.6rem,3vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.mm-cat{position:relative;min-height:210px;overflow:hidden;border-radius:10px;border:1px solid var(--line);display:block}
.mm-cat img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .7s ease}
.mm-cat:hover img{transform:scale(1.05)}
.mm-cat::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(8,7,6,.78))}
.mm-cat span{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;font:900 1.05rem/1.1 var(--font);letter-spacing:-.02em;color:#fff}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.mm-band{margin:4px var(--pad) 0;border-radius:12px;overflow:hidden;border:1px solid var(--line);display:grid;grid-template-columns:1fr 1.15fr;min-height:300px;background:var(--panel)}
.mm-band-copy{padding:36px clamp(20px,3.5vw,44px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:10px 0 12px;font:900 clamp(1.8rem,3.2vw,2.6rem)/1.05 var(--font);letter-spacing:-.04em;color:#fff;max-width:12ch}
.mm-band-copy p{margin:0;color:var(--muted);max-width:36ch;font-weight:500;line-height:1.55}
.mm-band-img{background:url('https://images.unsplash.com/photo-1602874801006-e26c4c4c0c8a?auto=format&fit=crop&w=1400&q=80') center/cover no-repeat;min-height:240px}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:28px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0b0a;margin-top:36px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:40px var(--pad)}
.mm-story{min-height:280px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);display:flex;align-items:flex-end;padding:28px;color:#fff;background-size:cover;background-position:center}
.mm-story::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 25%,rgba(8,7,6,.78))}
.mm-story > div{position:relative;z-index:1}
.mm-story h3{margin:8px 0;font:900 1.8rem/1.05 var(--font);letter-spacing:-.03em}
.mm-story p{margin:0;max-width:34ch;color:#ddd5cb;font:500 14px/1.5 var(--font)}
.mm-news{margin:0 var(--pad) 48px;padding:32px clamp(20px,3.5vw,40px);border-radius:12px;border:1px solid var(--line);background:linear-gradient(135deg,#1f1a15,#151210 55%,#1a1612);display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}
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
    featuredHtml = `<p class="empty">New pieces are on the way.</p>`;
  }

  const homeTitle = 'Maison Marnier — Curated Home Decor';
  const homeDescription =
    'Premium curated home decor for calm European interiors. Shop lighting, objects, textiles and seasonal edits.';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#12100e">
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
<div class="announce">Free shipping on orders over €100 · Europe</div>
<header class="site-nav">
  <a class="brand" href="/">MAISON <span>MARNIER</span></a>
  <nav class="links">
    <a href="/collections/new">New</a>
    <a href="/collections/decor">Decor</a>
    <a href="/collections/lighting">Lighting</a>
    <a href="/collections/seasonal">Seasonal</a>
    <a href="/collections/objects">Objects</a>
    <a href="/journal">Journal</a>
  </nav>
  <div class="tools">
    <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
  </div>
</header>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-hero-inner">
      <span class="mm-kicker">Curated for quieter rooms</span>
      <h1>Live with <em>fewer</em>, better pieces</h1>
      <p class="lead">Bold edits for cozy European homes — lighting, objects and seasonal texture without the noise.</p>
      <div class="mm-actions">
        <a class="btn" href="/collections/new">Shop new arrivals</a>
        <a class="btn btn-ghost" href="/collections/decor">Browse decor</a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="categories">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Shop the house</h2>
        <a href="/collections/decor">View all →</a>
      </div>
      <div class="mm-cats">
        <a class="mm-cat" href="/collections/lighting"><img src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80" alt="Lighting" loading="lazy"><span>Lighting</span></a>
        <a class="mm-cat" href="/collections/objects"><img src="https://images.unsplash.com/photo-1578508907020-040944bfea4a?auto=format&fit=crop&w=900&q=80" alt="Objects" loading="lazy"><span>Objects</span></a>
        <a class="mm-cat" href="/collections/textiles"><img src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80" alt="Textiles" loading="lazy"><span>Textiles</span></a>
        <a class="mm-cat" href="/collections/candles"><img src="https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80" alt="Candles" loading="lazy"><span>Candles</span></a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>New arrivals</h2>
        <a href="/collections/new">View all →</a>
      </div>
      <div class="mm-products grid">${featuredHtml}</div>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Seasonal edit</span>
      <h2>Warm layers for slower nights</h2>
      <p>Soft light, tactile detail and pieces that make a room feel finished — not decorated.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Shop seasonal</a></div>
    </div>
    <div class="mm-band-img" role="img" aria-label="Cozy seasonal interior"></div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>EU shipping</strong><span>Partner fulfilment across Europe.</span></div>
    <div class="mm-benefit"><strong>30-day returns</strong><span>Clear, simple and fair.</span></div>
    <div class="mm-benefit"><strong>Edited catalog</strong><span>Fewer SKUs, chosen with care.</span></div>
    <div class="mm-benefit"><strong>Secure checkout</strong><span>Stripe · VAT calculated at payment.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal/quiet-living-room" style="background-image:url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80')">
      <div><span class="mm-kicker">Journal</span><h3>The quiet living room</h3><p>Layer light and natural materials without over-styling the space.</p></div>
    </a>
    <a class="mm-story" href="/journal/objects-worth-keeping" style="background-image:url('https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80')">
      <div><span class="mm-kicker">Journal</span><h3>Objects worth keeping</h3><p>How we choose pieces that stay relevant past a single season.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Stay close to the maison</h2>
      <p>New edits and seasonal notes — occasionally, not constantly.</p>
    </div>
    <form class="mm-form" id="form">
      <input required type="email" placeholder="Your email" aria-label="Email">
      <button type="submit">Subscribe</button>
    </form>
  </section>
</main>

<footer class="site-footer">
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
      'cache-control': 'public, max-age=300',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}
