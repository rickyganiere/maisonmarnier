/** Maison Marnier — compact holiday home: products above the fold. */
import { esc } from '../lib/escape.js';
import {
  brandLogoHtml,
  cartControlHtml,
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
.mm-hero{position:relative;isolation:isolate;padding:22px var(--pad) 12px;border-bottom:1px solid var(--line);background:
  radial-gradient(780px 220px at 88% 0%, rgba(154,36,48,.3), transparent 60%),
  radial-gradient(620px 180px at 8% 100%, rgba(31,61,50,.32), transparent 55%),
  linear-gradient(180deg,#161210,var(--bg))}
.mm-hero-inner{width:min(1420px,100%);margin:0 auto;display:grid;grid-template-columns:1fr 1.05fr;gap:28px;align-items:center;padding:8px 0 16px}
.mm-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;color:var(--accent);font:900 12px/1 var(--font);letter-spacing:.14em;text-transform:uppercase}
.mm-kicker::before{content:"";width:8px;height:8px;border-radius:50%;background:#9a2430;box-shadow:0 0 0 3px rgba(154,36,48,.25)}
.mm-hero h1{margin:0;max-width:13ch;font:900 clamp(2.35rem,5vw,3.55rem)/.94 var(--font);letter-spacing:-.045em;color:#fff}
.mm-hero h1 em{font-style:normal;color:var(--accent2)}
.mm-hero .lead{margin:14px 0 0;max-width:42ch;color:#d2cbc1;font:500 16px/1.5 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.mm-carousel{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#14110f;aspect-ratio:5/4;min-height:280px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.mm-carousel-track{display:flex;height:100%;width:100%;transition:transform .85s cubic-bezier(.22,.61,.36,1)}
.mm-carousel-slide{position:relative;min-width:100%;height:100%;flex:0 0 100%}
.mm-carousel-slide img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.05) contrast(1.04)}
.mm-carousel-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(8,7,6,.78))}
.mm-carousel-meta{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:22px 24px;display:flex;justify-content:space-between;align-items:end;gap:12px}
.mm-carousel-meta strong{display:block;font:800 1.05rem/1.15 var(--font);letter-spacing:-.02em;color:#fff;max-width:28ch}
.mm-carousel-meta span{display:block;margin-top:4px;font:700 12px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--accent2)}
.mm-carousel-dots{position:absolute;top:16px;right:16px;z-index:3;display:flex;gap:6px}
.mm-carousel-dots button{width:8px;height:8px;border-radius:99px;border:0;padding:0;background:rgba(255,255,255,.35);cursor:pointer}
.mm-carousel-dots button.is-on{background:var(--accent2);width:22px}
.mm-carousel-empty{display:grid;place-items:end start;height:100%;padding:24px;background:
  radial-gradient(circle at 30% 40%, rgba(230,196,138,.2), transparent 42%),
  radial-gradient(circle at 78% 30%, rgba(154,36,48,.32), transparent 46%),
  linear-gradient(145deg,#1a221c,#140f0e 55%,#1f1412)}
.mm-carousel-empty strong{font:900 1.5rem/1.05 var(--font);color:#fff}
.mm-lights{display:flex;justify-content:space-between;gap:6px;padding:8px var(--pad) 0;max-width:1420px;margin:0 auto}
.mm-lights i{flex:1;height:3px;border-radius:99px;background:linear-gradient(90deg,transparent,#9a2430,var(--accent2),#2f5a48,transparent);opacity:.55;animation:twinkle 2.8s ease-in-out infinite}
.mm-lights i:nth-child(2){animation-delay:.4s;opacity:.7}
.mm-lights i:nth-child(3){animation-delay:.9s}
.mm-lights i:nth-child(4){animation-delay:1.3s;opacity:.65}
@keyframes twinkle{0%,100%{filter:brightness(.7)}50%{filter:brightness(1.35)}}
.mm-snow{position:fixed;inset:0;pointer-events:none;z-index:35;overflow:hidden}
.mm-snow i{position:absolute;top:-10%;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.55);animation:snowFall linear infinite;opacity:.85}
.mm-snow i:nth-child(3n){background:rgba(246,240,230,.95)}
.mm-snow i:nth-child(4n){width:3px;height:3px}
.mm-snow i:nth-child(5n){width:6px;height:6px;opacity:.7}
@keyframes snowFall{
  0%{transform:translate3d(0,-6vh,0) rotate(0deg);opacity:0}
  6%{opacity:.9}
  100%{transform:translate3d(42px,112vh,0) rotate(220deg);opacity:.12}
}
@media (prefers-reduced-motion:reduce){
  .mm-snow i,.nav-snowman,.mm-carousel-track{animation:none!important;transition:none!important}
}
.mm-section{padding:18px var(--pad) 28px}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}
.mm-section-head h2{margin:0;font:900 clamp(1.35rem,2.4vw,1.85rem)/1.05 var(--font);letter-spacing:-.03em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:8px}
.mm-cat{min-height:84px;border-radius:10px;border:1px solid var(--line);display:flex;align-items:flex-end;padding:16px;background:linear-gradient(160deg, rgba(31,61,50,.55), rgba(16,14,12,.92));transition:border-color .25s,transform .25s}
.mm-cat:nth-child(2){background:linear-gradient(160deg, rgba(154,36,48,.42), rgba(16,14,12,.92))}
.mm-cat:nth-child(3){background:linear-gradient(160deg, rgba(201,164,106,.28), rgba(16,14,12,.92))}
.mm-cat:nth-child(4){background:linear-gradient(160deg, rgba(47,90,72,.5), rgba(16,14,12,.92))}
.mm-cat:hover{border-color:var(--accent);transform:translateY(-2px)}
.mm-cat span{font:900 .95rem/1.1 var(--font);letter-spacing:-.02em;color:#fff}
.mm-band{margin:8px var(--pad) 0;border-radius:12px;overflow:hidden;border:1px solid var(--line);display:grid;grid-template-columns:1fr 1.1fr;min-height:240px;background:var(--panel)}
.mm-band-copy{padding:28px clamp(18px,3vw,36px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:8px 0 10px;font:900 clamp(1.5rem,2.8vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff;max-width:13ch}
.mm-band-copy p{margin:0;color:var(--muted);max-width:36ch;font-weight:500;line-height:1.5}
.mm-band-img{position:relative;min-height:200px;background:
  radial-gradient(circle at 30% 40%, rgba(230,196,138,.22), transparent 42%),
  radial-gradient(circle at 70% 60%, rgba(154,36,48,.35), transparent 45%),
  linear-gradient(145deg,#1a221c,#140f0e 55%,#1f1412)}
.mm-band-img::before{content:"";position:absolute;inset:18px auto auto 18px;width:54px;height:54px;border-radius:50%;border:2px solid rgba(230,196,138,.35);box-shadow:inset 0 0 0 8px rgba(31,61,50,.35)}
.mm-band-img::after{content:"✦  Holiday";position:absolute;inset:auto 22px 22px auto;font:900 1.5rem/1 var(--font);letter-spacing:-.03em;color:rgba(246,240,230,.22)}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:22px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0b0a;margin-top:28px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:28px var(--pad)}
.mm-story{min-height:200px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);display:flex;align-items:flex-end;padding:24px;color:#fff;background:linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),linear-gradient(135deg,#1c1713,#14201a)}
.mm-story:nth-child(2){background:linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),linear-gradient(135deg,#221412,#1a100f)}
.mm-story h3{margin:8px 0;font:900 1.45rem/1.05 var(--font);letter-spacing:-.03em}
.mm-story p{margin:0;max-width:34ch;color:#ddd5cb;font:500 13px/1.45 var(--font)}
.mm-news{margin:0 var(--pad) 40px;padding:28px clamp(18px,3vw,36px);border-radius:12px;border:1px solid var(--line);background:linear-gradient(135deg,#221812,#12100e 55%,#152018);display:grid;grid-template-columns:1.2fr .8fr;gap:18px;align-items:center}
.mm-news h2{margin:0 0 8px;font:900 clamp(1.4rem,2.6vw,1.9rem)/1.05 var(--font);letter-spacing:-.03em;color:#fff}
.mm-news p{margin:0;color:var(--muted);font-weight:500}
.mm-form{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.mm-form input{flex:1;border:0;padding:14px 16px;background:var(--bg);color:var(--ink);font:600 14px var(--font)}
.mm-form button{border:0;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:0 20px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-hero-inner{grid-template-columns:1fr}
  .mm-carousel{min-height:240px}
  .mm-cats,.mm-products{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-band,.mm-stories,.mm-news{grid-template-columns:1fr}
  .mm-benefits{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .mm-benefits{grid-template-columns:1fr}
  .mm-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
}
`;

function heroCarouselHtml(products) {
  const slides = (products || [])
    .filter((p) => p?.image_url || (Array.isArray(p?.images) && p.images[0]))
    .slice(0, 8);
  if (!slides.length) {
    return `<div class="mm-carousel" aria-label="Holiday edit">
      <div class="mm-carousel-empty"><div><strong>Holiday arrivals</strong><span class="muted" style="display:block;margin-top:6px">Garlands · glow · table objects</span></div></div>
    </div>`;
  }
  const track = slides
    .map((p, i) => {
      const img = esc(p.image_url || p.images?.[0] || '');
      const href = `/products/${encodeURIComponent(p.slug || '')}`;
      const price = Number(p.retail_price_eur || 0);
      return `<a class="mm-carousel-slide" href="${href}" data-slide="${i}" aria-label="${esc(p.name || 'Product')}">
        <img src="${img}" alt="${esc(p.name || '')}" loading="${i === 0 ? 'eager' : 'lazy'}">
        <div class="mm-carousel-meta">
          <div>
            <strong>${esc(p.name || 'Holiday piece')}</strong>
            <span>${price > 0 ? `€${price.toFixed(2)}` : 'Shop now'}</span>
          </div>
        </div>
      </a>`;
    })
    .join('');
  const dots = slides
    .map((_, i) => `<button type="button" data-dot="${i}" aria-label="Slide ${i + 1}"${i === 0 ? ' class="is-on"' : ''}></button>`)
    .join('');
  return `<div class="mm-carousel" id="heroCarousel" aria-roledescription="carousel" aria-label="Featured holiday products">
    <div class="mm-carousel-track" id="heroTrack">${track}</div>
    <div class="mm-carousel-dots" id="heroDots">${dots}</div>
  </div>`;
}

function snowFlakesHtml(count = 56) {
  return Array.from({ length: count }, (_, i) => {
    const left = ((i * 17) % 100) + (i % 7) * 0.3;
    const size = 2 + (i % 5);
    const dur = 7 + (i % 11);
    const delay = -((i * 0.73) % 14);
    const drift = 18 + (i % 40);
    return `<i style="left:${left.toFixed(1)}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay.toFixed(1)}s;--drift:${drift}px"></i>`;
  }).join('');
}

export async function homePage(env) {
  let products = [];
  try {
    products = await getLiveProducts(env, 12);
  } catch {
    products = [];
  }
  const featuredHtml = products.length
    ? products.slice(0, 10).map(productCard).join('')
    : `<p class="empty">Holiday pieces are arriving.</p>`;
  const carouselHtml = heroCarouselHtml(products);

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
<style>${HOME_CSS}
.mm-snow i{--drift:28px}
@keyframes snowFall{
  0%{transform:translate3d(0,-6vh,0) rotate(0deg);opacity:0}
  6%{opacity:.92}
  100%{transform:translate3d(var(--drift),112vh,0) rotate(220deg);opacity:.1}
}
</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Holiday edit · Free shipping over €100 · Europe</div>
<div class="xmas-garland" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
<header class="site-nav">
  <a class="brand" href="/" aria-label="Maison Marnier home">${brandLogoHtml()}</a>
  <nav class="links">
    <a href="/collections/seasonal">Holiday</a>
    <a href="/collections/new">New</a>
    <a href="/collections/lighting">Lighting</a>
    <a href="/collections/objects">Objects</a>
    <a href="/collections/candles">Candles</a>
    <a href="/journal">Journal</a>
  </nav>
  <div class="tools">
    ${cartControlHtml()}
  </div>
</header>
<div class="mm-lights" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="mm-snow" aria-hidden="true">${snowFlakesHtml(56)}</div>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-hero-inner">
      <div>
        <span class="mm-kicker">Maison Marnier · Holiday 2026</span>
        <h1>Light the <em>home</em> for the holidays</h1>
        <p class="lead">Ornaments, warm lights and festive objects — real supplier photos, ready for quieter holiday rooms.</p>
        <div class="mm-actions">
          <a class="btn" href="/collections/seasonal">Shop the holiday edit</a>
          <a class="btn btn-ghost" href="#featured">See arrivals</a>
        </div>
      </div>
      ${carouselHtml}
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Holiday arrivals</h2>
        <a href="/collections/new">View all →</a>
      </div>
      <div class="mm-products grid">${featuredHtml}</div>
      <div class="mm-cats" style="margin-top:22px">
        <a class="mm-cat" href="/collections/seasonal"><span>Holiday</span></a>
        <a class="mm-cat" href="/collections/lighting"><span>Glow &amp; lights</span></a>
        <a class="mm-cat" href="/collections/candles"><span>Candles</span></a>
        <a class="mm-cat" href="/collections/objects"><span>Objects</span></a>
      </div>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Seasonal edit</span>
      <h2>Warm rooms for the holidays</h2>
      <p>Garlands, stockings, table light and small festive objects — collected, not cluttered.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Shop holiday</a></div>
    </div>
    <div class="mm-band-img" role="img" aria-label="Holiday home atmosphere"></div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>EU shipping</strong><span>Partner fulfilment across Europe.</span></div>
    <div class="mm-benefit"><strong>30-day returns</strong><span>Clear, simple and fair.</span></div>
    <div class="mm-benefit"><strong>Real product photos</strong><span>Supplier galleries — not stock fillers.</span></div>
    <div class="mm-benefit"><strong>Secure checkout</strong><span>Stripe · VAT calculated at payment.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal">
      <div><span class="mm-kicker">Journal</span><h3>A quieter Christmas table</h3><p>Light, linen and a few festive objects.</p></div>
    </a>
    <a class="mm-story" href="/collections/candles">
      <div><span class="mm-kicker">Edit</span><h3>Glow for long evenings</h3><p>Candles and warm lamps after dinner.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Stay close to Maison Marnier</h2>
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
    <div><h4>Shop</h4><a href="/collections/seasonal">Holiday</a><a href="/collections/new">New Arrivals</a><a href="/collections/lighting">Lighting</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a><a href="https://www.instagram.com/maison.marnier/" target="_blank" rel="noopener noreferrer">Instagram</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a><a href="/instagram">Link hub</a></div>
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
(function(){
  const track=document.getElementById('heroTrack');
  const dots=document.getElementById('heroDots');
  if(!track||!dots) return;
  const slides=[...track.children];
  if(slides.length<2) return;
  let i=0;
  const paint=()=>{
    track.style.transform='translateX('+(-i*100)+'%)';
    [...dots.children].forEach((d,idx)=>d.classList.toggle('is-on', idx===i));
  };
  dots.addEventListener('click',e=>{
    const b=e.target.closest('[data-dot]'); if(!b) return;
    i=Number(b.dataset.dot)||0; paint();
  });
  setInterval(()=>{ i=(i+1)%slides.length; paint(); }, 4200);
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=60',
      'x-frame-options': 'SAMEORIGIN',
      'referrer-policy': 'strict-origin-when-cross-origin',
    },
  });
}
