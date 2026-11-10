/** Maison Marnier — compact holiday home: products above the fold. */
import { esc } from '../lib/escape.js';
import {
  fontLinksHtml,
  gtmHeadHtml,
  gtmNoscriptHtml,
  LAYOUT_CSS,
  productCard,
  storefrontFooterHtml,
  storefrontHeaderHtml,
} from '../lib/html.js';
import { getLiveProducts, getLiveProductsBySlugs } from '../db/products.js';
import {
  DEFAULT_OG_IMAGE,
  jsonLdScript,
  organizationWebsiteJsonLd,
  seoHeadHtml,
} from '../lib/seo.js';

const CHRISTMAS_HOME_EDIT = [
  'christmas-candle-lights-led-small-lanterns-wind-lights-793600',
  'christmas-tree-898881',
  '3-x-3-x-4-3-egg-christmas-ball-ornament-012800',
  'wooden-christmas-tree-folding-coaster-black-walnut-thick-seat-620400',
  'christmas-tree-cups-heat-resistant-double-layer-flowing-sequins-617800',
];

const HOME_CSS = `
${LAYOUT_CSS}
.home-main{overflow:hidden}
.mm-hero{position:relative;isolation:isolate;padding:14px var(--pad);border-bottom:1px solid #573534;background:
  radial-gradient(580px 290px at 15% 0%,#6b3431,transparent 82%),
  radial-gradient(660px 320px at 92% 85%,#644426,transparent 75%),
  linear-gradient(110deg,#412021,#261614 65%,#3b2820)}
.mm-hero-inner{width:min(1420px,100%);margin:0 auto;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(14px,4vw,64px);align-items:center}
.mm-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:9px;color:#f0c987;font:800 11px/1.2 var(--font);letter-spacing:.13em;text-transform:uppercase}
.mm-kicker::before{content:"✦";color:#ffe4a9;text-shadow:0 0 10px #ffad52}
.mm-hero h1{margin:0;max-width:17ch;font:700 clamp(2.3rem,4.5vw,4.2rem)/.99 Georgia,serif;letter-spacing:-.04em;color:#fff8ec}
.mm-hero h1 em{font-style:normal;color:#f4cb8f}
.mm-hero .lead{margin:9px 0 0;max-width:43ch;color:#f1dfcf;font:500 15px/1.4 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
.mm-carousel{position:relative;isolation:isolate;min-width:0;height:clamp(200px,25vw,304px);overflow:hidden;border-radius:12px;background:#523228}
.mm-carousel-track{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.mm-carousel-slide{position:relative;min-width:0;height:100%;flex:0 0 100%;scroll-snap-align:start;background:#523228}
.mm-carousel-slide img{width:100%;height:100%;object-fit:cover;object-position:center 45%;display:block}
.mm-carousel-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 36%,rgba(36,17,13,.94));pointer-events:none}
.mm-carousel-slide:focus-visible{outline:2px solid #ffe4a9;outline-offset:-4px}
.mm-carousel-meta{position:absolute;left:0;right:0;bottom:0;z-index:1;padding:14px 92px 14px 16px}
.mm-carousel-meta strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:800 1rem/1.15 var(--font);color:#fff;max-width:31ch}
.mm-carousel-meta span{display:block;margin-bottom:4px;font:800 11px/1.2 var(--font);letter-spacing:.07em;text-transform:uppercase;color:#ffe0a7}
.mm-carousel-controls{position:absolute;bottom:12px;right:12px;z-index:2;display:flex;gap:5px}
.mm-carousel-controls button{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid #f0ce9d;border-radius:50%;background:#2d1816;color:#fff4dd;font:700 18px/1 var(--font);cursor:pointer}
.mm-carousel-controls button:hover,.mm-carousel-controls button:focus-visible{background:#724339}
.mm-carousel-empty{display:grid;align-content:end;height:100%;padding:18px;background:radial-gradient(circle at 40% 30%,#845733,transparent 60%),#36241e}
.mm-carousel-empty strong{font:700 1.4rem/1.1 Georgia,serif;color:#fff8ec}
.mm-snow{position:fixed;inset:0;pointer-events:none;z-index:35;overflow:hidden}
.mm-snow i{position:absolute;top:-10%;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.55);animation:snowFall linear infinite;opacity:.55}
.mm-snow i:nth-child(3n){background:rgba(246,240,230,.95)}
.mm-snow i:nth-child(4n){width:3px;height:3px}
.mm-snow i:nth-child(5n){width:6px;height:6px;opacity:.7}
@keyframes snowFall{
  0%{transform:translate3d(0,-6vh,0) rotate(0deg);opacity:0}
  6%{opacity:.65}
  100%{transform:translate3d(var(--drift),112vh,0) rotate(220deg);opacity:.12}
}
@media (prefers-reduced-motion:reduce){
  .mm-snow{display:none}
}
.mm-section{padding:14px var(--pad) 28px;scroll-margin-top:var(--nav-h)}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:9px}
.mm-section-head h2{margin:0;font:900 clamp(1.35rem,2.4vw,1.85rem)/1.05 var(--font);letter-spacing:-.03em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;padding-top:0}
.mm-products .media{aspect-ratio:4/3}
.mm-products .p .meta{padding-top:9px}
.mm-products .p .price-row{margin-top:6px}
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
@media(min-width:981px) and (max-height:800px){.mm-carousel{height:clamp(200px,23vw,250px)}}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-products{grid-template-columns:repeat(3,minmax(0,1fr))}
  .mm-cats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-band,.mm-stories,.mm-news{grid-template-columns:1fr}
  .mm-benefits{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .mm-hero,.mm-section{padding-inline:14px}
  .mm-hero-inner{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:11px}
  .mm-hero h1{font-size:clamp(1.65rem,6.6vw,2.25rem)}
  .mm-hero .lead{font-size:12px}
  .mm-hero .mm-kicker{font-size:9px;letter-spacing:.07em}
  .mm-hero .mm-actions{margin-top:10px}
  .mm-hero .btn{padding:10px 8px;font-size:10px;letter-spacing:.035em}
  .mm-carousel{height:184px;border-radius:9px}
  .mm-carousel-meta{bottom:36px;padding:5px 8px}
  .mm-carousel-meta strong{font-size:.83rem}
  .mm-carousel-controls{bottom:5px;right:6px}
  .mm-carousel-controls button{width:32px;height:32px}
  .mm-benefits{grid-template-columns:1fr}
  .mm-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
}
`;

function heroCarouselHtml(products) {
  const slides = products.filter((p) => p.slug && (p.image_url || p.images?.[0])).slice(0, 5);
  if (!slides.length) {
    return `<div class="mm-carousel"><div class="mm-carousel-empty"><strong>Holiday arrivals</strong></div></div>`;
  }
  const track = slides.map((p, i) => {
    const image = esc(p.image_url || p.images[0]);
    const name = esc(p.name || 'Holiday piece');
    const price = Number(p.retail_price_eur || 0);
    return `<a class="mm-carousel-slide" href="/products/${encodeURIComponent(p.slug)}">
      <img src="${image}" alt="" decoding="async" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
      <div class="mm-carousel-meta">
        <span>${price > 0 ? `€${price.toFixed(2)}` : 'Shop now'}</span>
        <strong>${name}</strong>
      </div>
    </a>`;
  }).join('');
  const controls = slides.length > 1 ? `<div class="mm-carousel-controls">
    <button type="button" data-step="-1" aria-label="Previous featured product" aria-controls="heroTrack">‹</button>
    <button type="button" data-step="1" aria-label="Next featured product" aria-controls="heroTrack">›</button>
  </div>` : '';
  return `<section class="mm-carousel" id="heroCarousel" aria-roledescription="carousel" aria-label="Featured Christmas products">
    <div class="mm-carousel-track" id="heroTrack">${track}</div>
    ${controls}
  </section>`;
}

function snowFlakesHtml(count = 26) {
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
  const [curated, latest] = await Promise.all([
    getLiveProductsBySlugs(env, CHRISTMAS_HOME_EDIT).catch(() => []),
    getLiveProducts(env, 12).catch(() => []),
  ]);
  const products = [...new Map([...curated, ...latest].map((p) => [p.slug, p])).values()];
  const featuredHtml = products.length
    ? products.slice(0, 10).map(productCard).join('')
    : `<p class="empty">Holiday pieces are arriving.</p>`;
  const carouselHtml = heroCarouselHtml(curated.length ? curated : products);

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
${storefrontHeaderHtml({ search: false })}
<div class="mm-snow" aria-hidden="true">${snowFlakesHtml()}</div>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-hero-inner">
      <div>
        <span class="mm-kicker">The Christmas Edit</span>
        <h1>Bring <em>Christmas</em> home</h1>
        <p class="lead">Warm lights, festive décor and thoughtful details for Christmas at home.</p>
        <div class="mm-actions">
          <a class="btn" href="/collections/seasonal">Shop Christmas</a>
        </div>
      </div>
      ${carouselHtml}
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Holiday arrivals</h2>
        <a href="/collections/new">View all arrivals →</a>
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

${storefrontFooterHtml()}
<script>
document.getElementById('form').onsubmit=e=>{e.preventDefault();toast('Thanks — welcome to Maison Marnier.');e.target.reset()};
(function(){
  const carousel = document.getElementById('heroCarousel');
  const track = document.getElementById('heroTrack');
  if (!carousel || track.children.length < 2) return;
  let current = 0;
  track.addEventListener('scroll', () => {
    current = Math.round(track.scrollLeft / track.clientWidth);
  }, { passive: true });
  carousel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]');
    if (!button) return;
    const count = track.children.length;
    const next = (current + Number(button.dataset.step) + count) % count;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? 'instant' : 'smooth' });
  });
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
