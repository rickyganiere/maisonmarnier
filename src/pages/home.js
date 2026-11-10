/** Maison Marnier — compact holiday home: products above the fold. */
import { esc } from '../lib/escape.js';
import {
  fontLinksHtml,
  gtmHeadHtml,
  gtmNoscriptHtml,
  homeProductCard,
  LAYOUT_CSS,
  storefrontFooterHtml,
  storefrontHeaderHtml,
  storefrontProductImage,
} from '../lib/html.js';
import { getLiveProducts, getLiveProductsBySlugs } from '../db/products.js';
import { CHRISTMAS_SCENES } from '../lib/seasonalAssets.js';
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
.home-main{overflow:hidden;background:
  radial-gradient(850px 460px at 95% 70%,#35271a44,transparent 82%),
  radial-gradient(900px 520px at 0 44%,#3c1b254f,transparent 80%),
  #1b1512}
.mm-band,.mm-stories,.mm-news{width:min(var(--max),calc(100% - 2 * var(--pad)));margin-inline:auto}
.mm-hero{position:relative;isolation:isolate;padding:14px var(--pad);border-bottom:1px solid #573534;background:
  radial-gradient(580px 290px at 15% 0%,#6b3431,transparent 82%),
  radial-gradient(660px 320px at 92% 85%,#644426,transparent 75%),
  linear-gradient(110deg,#492227,#2d1916 65%,#442e20)}
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
.mm-carousel-empty{display:grid;align-content:end;height:100%;padding:18px;background:linear-gradient(0deg,#251411dc,transparent 70%),url("${CHRISTMAS_SCENES.living}") center 42%/cover,#36241e}
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
  .mm-card,.mm-card .mm-card-media img,.mm-story img,.mm-cat,.mm-cat-media,.mm-cat-glow,.mm-cat-hint::after{animation:none;transition:none}
  .mm-card:hover{transform:none}
  .mm-cat:hover,.mm-cat:focus-visible{transform:none}
  .mm-cat:hover .mm-cat-media,.mm-cat:hover .mm-cat-glow,.mm-cat:focus-visible .mm-cat-media,.mm-cat:focus-visible .mm-cat-glow{transform:none}
}
.mm-section{padding:14px var(--pad) 28px;scroll-margin-top:var(--nav-h)}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:12px;margin-bottom:9px}
.mm-section-head h2{margin:0;font:700 clamp(1.35rem,2.4vw,1.85rem)/1.05 Georgia,serif;letter-spacing:-.025em;color:#fff3e0}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-products{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding-top:0}
.mm-card{position:relative;display:block;min-height:0;overflow:hidden;border:1px solid #574033;border-radius:8px;background:#1a1411;box-shadow:0 14px 34px rgba(0,0,0,.28);text-decoration:none;color:inherit;transition:border-color .3s ease,transform .3s ease,box-shadow .3s ease}
.mm-card::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,#c9a46a,transparent);opacity:0;transition:opacity .3s ease;pointer-events:none}
.mm-card:hover,.mm-card:focus-visible{border-color:rgba(201,164,106,.7);transform:translateY(-3px);box-shadow:0 22px 50px rgba(0,0,0,.55),0 0 36px rgba(201,164,106,.1)}
.mm-card:hover::after,.mm-card:focus-visible::after{opacity:1}
.mm-card:focus-visible{outline:2px solid #ffe4a9;outline-offset:2px}
.mm-card-media{position:relative;display:block;height:210px;overflow:hidden;background:linear-gradient(135deg,#483229,#211a16)}
.mm-card-media::after{content:"";position:absolute;left:0;right:0;bottom:0;height:34%;background:linear-gradient(180deg,rgba(26,20,17,0),rgba(26,20,17,.55));pointer-events:none}
.mm-card-media img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .5s ease}
.mm-card:hover .mm-card-media img{transform:scale(1.04)}
.mm-card-drop{position:absolute;top:9px;left:9px;z-index:2;padding:4px 7px;border-radius:2px;background:#7a1f28;color:#fff4e4;font:800 10px/1.1 var(--font);letter-spacing:.06em;text-transform:uppercase;pointer-events:none}
.mm-card-body{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;column-gap:12px;row-gap:2px;padding:12px 14px 14px;background:linear-gradient(180deg,#241c17,#171210)}
.mm-card-name,.mm-card-meta{grid-column:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mm-card-name{font:900 .98rem/1.25 var(--font);color:#fff8ec;letter-spacing:-.01em}
.mm-card-meta{margin-top:2px;color:#b3a89a;font:600 .72rem/1.3 var(--font)}
.mm-card-price{grid-column:2;grid-row:1 / span 3;align-self:end;margin:0;color:#fff8ec;font:900 1.12rem/1.3 var(--font);white-space:nowrap;text-align:right}
.mm-card-was{display:block;margin-top:1px;color:#8a7d70;font:600 .72rem/1 var(--font);text-decoration:line-through;text-align:right}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:8px}
.mm-cat{position:relative;isolation:isolate;overflow:hidden;min-height:132px;border-radius:14px;border:1px solid #8a6848;display:flex;align-items:flex-end;padding:18px 16px 16px;background:#241812;box-shadow:inset 0 1px 0 rgba(255,232,196,.12);transition:border-color .3s ease,transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s ease}
.mm-cat-media,.mm-cat-glow{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;object-position:center 42%;transform:scale(1.02);transition:transform .55s cubic-bezier(.2,.7,.2,1),filter .35s ease;pointer-events:none}
.mm-cat::after{content:"";position:absolute;inset:0;z-index:-1;background:
  linear-gradient(180deg,rgba(22,12,10,.12) 0%,rgba(18,10,8,.36) 34%,rgba(12,7,5,.94) 100%),
  radial-gradient(120% 80% at 85% 0%,rgba(255,210,140,.16),transparent 55%);
  pointer-events:none}
.mm-cat-glow{background:
  radial-gradient(ellipse 58% 48% at 70% 26%,rgba(255,220,150,.62),transparent 64%),
  radial-gradient(ellipse 42% 38% at 24% 72%,rgba(255,150,80,.32),transparent 72%),
  radial-gradient(circle at 48% 58%,rgba(255,190,110,.18),transparent 45%),
  linear-gradient(145deg,#5c2c2a 0%,#3b201c 42%,#1f1410 100%)}
.mm-cat-glow::before,.mm-cat-glow::after{content:"";position:absolute;border-radius:50%;filter:blur(1px)}
.mm-cat-glow::before{width:14px;height:14px;top:22%;left:58%;background:#ffe7b0;box-shadow:0 0 18px 8px rgba(255,210,130,.55),0 0 42px 16px rgba(255,170,80,.22)}
.mm-cat-glow::after{width:8px;height:8px;top:48%;left:30%;background:#ffd89a;box-shadow:0 0 12px 6px rgba(255,200,120,.4),0 0 28px 12px rgba(255,150,70,.16);opacity:.85}
.mm-cat--holiday .mm-cat-media{object-position:center 38%;filter:saturate(1.05) brightness(.92)}
.mm-cat--candles .mm-cat-media{object-position:center 55%;filter:saturate(1.08) brightness(.9)}
.mm-cat--objects .mm-cat-media{object-position:center 48%;filter:saturate(1.02) brightness(.88)}
.mm-cat-copy{position:relative;z-index:1;display:flex;flex-direction:column;gap:5px;min-width:0}
.mm-cat-name{font:700 clamp(1.05rem,1.6vw,1.28rem)/1.05 Georgia,serif;letter-spacing:-.03em;color:#fff7ea;text-shadow:0 1px 10px rgba(0,0,0,.45)}
.mm-cat-hint{display:inline-flex;align-items:center;gap:6px;font:800 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:#f0c987}
.mm-cat-hint::after{content:"→";font-size:11px;transition:transform .28s ease}
.mm-cat:hover,.mm-cat:focus-visible{border-color:#e6c48a;transform:translateY(-3px);box-shadow:0 16px 28px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,232,196,.2);outline:none}
.mm-cat:hover .mm-cat-media,.mm-cat:hover .mm-cat-glow,.mm-cat:focus-visible .mm-cat-media,.mm-cat:focus-visible .mm-cat-glow{transform:scale(1.08);filter:saturate(1.12) brightness(1)}
.mm-cat:hover .mm-cat-hint::after,.mm-cat:focus-visible .mm-cat-hint::after{transform:translateX(3px)}
.mm-band{margin-block:8px 0;border-radius:12px;overflow:hidden;border:1px solid #70513d;display:grid;grid-template-columns:.85fr 1.15fr;min-height:282px;background:linear-gradient(135deg,#592b31,#35211e 74%)}
.mm-band-copy{padding:27px clamp(20px,3.2vw,46px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:6px 0 10px;font:700 clamp(1.65rem,3vw,2.65rem)/1.03 Georgia,serif;letter-spacing:-.035em;color:#fff4e4;max-width:15ch}
.mm-band-copy p{margin:0;color:#e9d4bf;max-width:36ch;font-weight:500;line-height:1.5}
.mm-band-img{position:relative;min-height:218px;background:#4b3528}
.mm-band-img img,.mm-story img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.mm-band-img img{object-position:center 44%}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:22px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#261d17;margin-top:28px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:28px 0}
.mm-story{min-height:clamp(210px,24vw,305px);border-radius:12px;overflow:hidden;position:relative;isolation:isolate;border:1px solid #70513d;display:flex;align-items:flex-end;padding:clamp(17px,2vw,28px);color:#fff;background:#483227}
.mm-story img{z-index:-2;object-position:center 45%;transition:transform .45s ease}
.mm-story:hover img{transform:scale(1.04)}
.mm-story::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,#20100df5,transparent 80%)}
.mm-story h3{margin:4px 0 8px;font:700 clamp(1.4rem,2.2vw,1.9rem)/1.05 Georgia,serif;letter-spacing:-.025em;color:#fff4e4}
.mm-story p{margin:0;max-width:34ch;color:#f1ddc9;font:500 14px/1.4 var(--font)}
.mm-news{margin-block:0 38px;padding:28px clamp(18px,3vw,36px);border-radius:12px;border:1px solid #70513d;background:linear-gradient(125deg,#4c2629,#29261e 65%,#25332a);display:grid;grid-template-columns:1.2fr .8fr;gap:18px;align-items:center}
.mm-news h2{margin:0 0 8px;font:700 clamp(1.4rem,2.6vw,1.9rem)/1.05 Georgia,serif;letter-spacing:-.025em;color:#fff4e4}
.mm-news p{margin:0;color:var(--muted);font-weight:500}
.mm-form{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.mm-form input{flex:1;border:0;padding:14px 16px;background:var(--bg);color:var(--ink);font:600 14px var(--font)}
.mm-form button{border:0;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:0 20px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
@media(min-width:981px) and (max-height:800px){
  .mm-hero h1{font-size:clamp(2.2rem,4vw,3.25rem)}
  .mm-carousel{height:clamp(200px,23vw,230px)}
}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-products{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-card-media{height:180px}
  .mm-cats{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .mm-cat{min-height:118px}
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
  .mm-card-media{height:150px}
  .mm-card-body{padding:10px 11px 12px}
  .mm-card-name{font-size:.86rem}
  .mm-card-price{font-size:1rem}
  .mm-cat{min-height:108px;padding:14px 13px 13px;border-radius:12px}
  .mm-cat-name{font-size:1.05rem}
}
@media(max-width:359px){
  .mm-hero .lead{display:none}
  .mm-carousel{height:156px}
  .mm-section-head h2{font-size:1.2rem}
  .mm-section-head a{font-size:10px;white-space:nowrap}
  .mm-products{grid-template-columns:1fr}
  .mm-card-media{height:190px}
}
`;

function heroCarouselHtml(products) {
  const slides = products.filter((p) => p.slug && (p.image_url || p.images?.[0])).slice(0, 5);
  if (!slides.length) {
    return `<div class="mm-carousel"><div class="mm-carousel-empty"><strong>Novedades navideñas</strong></div></div>`;
  }
  const track = slides.map((p, i) => {
    const name = esc(p.name || 'Pieza de temporada');
    const price = Number(p.retail_price_eur || 0);
    return `<a class="mm-carousel-slide" href="/products/${encodeURIComponent(p.slug)}">
      ${storefrontProductImage(p, { featured: i === 0, decorative: true })}
      <div class="mm-carousel-meta">
        <span>${price > 0 ? `€${price.toFixed(2)}` : 'Comprar'}</span>
        <strong>${name}</strong>
      </div>
    </a>`;
  }).join('');
  const controls = slides.length > 1 ? `<div class="mm-carousel-controls">
    <button type="button" data-step="-1" aria-label="Producto destacado anterior" aria-controls="heroTrack">‹</button>
    <button type="button" data-step="1" aria-label="Siguiente producto destacado" aria-controls="heroTrack">›</button>
  </div>` : '';
  return `<section class="mm-carousel" id="heroCarousel" aria-roledescription="carousel" aria-label="Productos navideños destacados">
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
    ? products.slice(0, 8).map((p, i) => homeProductCard(p, { featured: i === 0 })).join('')
    : `<p class="empty">Las piezas navideñas van llegando.</p>`;
  const carouselHtml = heroCarouselHtml(curated.length ? curated : products);

  const homeTitle = 'Maison Marnier — Edición hogar de Navidad';
  const homeDescription =
    'Decoración festiva para interiores europeos — ornamentos, luces, velas y objetos de temporada seleccionados por Maison Marnier.';

  const html = `<!doctype html>
<html lang="es">
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
        <span class="mm-kicker">La edición de Navidad</span>
        <h1>Trae la <em>Navidad</em> a casa</h1>
        <p class="lead">Luces cálidas, decoración festiva y detalles pensados para la Navidad en casa.</p>
        <div class="mm-actions">
          <a class="btn" href="/collections/seasonal">Comprar Navidad</a>
          <a class="btn btn-ghost" href="/cuenta/registro">Crear cuenta</a>
        </div>
      </div>
      ${carouselHtml}
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Novedades de temporada</h2>
        <a href="/collections/new">Ver todas →</a>
      </div>
      <div class="mm-products" data-home-listings>${featuredHtml}</div>
      <nav class="mm-cats" style="margin-top:22px" aria-label="Comprar por categoría">
        <a class="mm-cat mm-cat--holiday" href="/collections/seasonal">
          <img class="mm-cat-media" src="${CHRISTMAS_SCENES.living}" alt="" width="640" height="400" loading="lazy" decoding="async">
          <span class="mm-cat-copy"><span class="mm-cat-name">Navidad</span><span class="mm-cat-hint">Edición de temporada</span></span>
        </a>
        <a class="mm-cat mm-cat--glow" href="/collections/lighting">
          <span class="mm-cat-glow" aria-hidden="true"></span>
          <span class="mm-cat-copy"><span class="mm-cat-name">Luz y brillo</span><span class="mm-cat-hint">Iluminación cálida</span></span>
        </a>
        <a class="mm-cat mm-cat--candles" href="/collections/candles">
          <img class="mm-cat-media" src="${CHRISTMAS_SCENES.candlelight}" alt="" width="640" height="400" loading="lazy" decoding="async">
          <span class="mm-cat-copy"><span class="mm-cat-name">Velas</span><span class="mm-cat-hint">Noches suaves</span></span>
        </a>
        <a class="mm-cat mm-cat--objects" href="/collections/objects">
          <img class="mm-cat-media" src="${CHRISTMAS_SCENES.table}" alt="" width="640" height="400" loading="lazy" decoding="async">
          <span class="mm-cat-copy"><span class="mm-cat-name">Objetos</span><span class="mm-cat-hint">Mesa y decoración</span></span>
        </a>
      </nav>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Edición de temporada</span>
      <h2>Hogares cálidos para las fiestas</h2>
      <p>Guirnaldas, calcetines, luz de mesa y pequeños objetos festivos — reunidos, sin ruido visual.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Comprar temporada</a></div>
    </div>
    <div class="mm-band-img">
      <img src="${CHRISTMAS_SCENES.living}" alt="Salón navideño con árbol iluminado, velas y chimenea" width="900" height="606" loading="lazy" decoding="async">
    </div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>Envíos UE</strong><span>Cumplimiento con socios en Europa.</span></div>
    <div class="mm-benefit"><strong>Devoluciones 30 días</strong><span>Claras, sencillas y justas.</span></div>
    <div class="mm-benefit"><strong>Fotos reales</strong><span>Galerías del proveedor, no relleno genérico.</span></div>
    <div class="mm-benefit"><strong>Pago seguro</strong><span>Stripe · IVA calculado en el pago.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal">
      <img src="${CHRISTMAS_SCENES.table}" alt="" width="900" height="606" loading="lazy" decoding="async">
      <div><span class="mm-kicker">Diario</span><h3>Una mesa de Navidad más serena</h3><p>Luz, lino y unos pocos objetos festivos.</p></div>
    </a>
    <a class="mm-story" href="/collections/candles">
      <img src="${CHRISTMAS_SCENES.candlelight}" alt="" width="900" height="606" loading="lazy" decoding="async">
      <div><span class="mm-kicker">Edición</span><h3>Brillo para noches largas</h3><p>Velas y lámparas cálidas después de cenar.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Quédate cerca de Maison Marnier</h2>
      <p>Novedades de temporada y notas ocasionales — sin ruido constante.</p>
    </div>
    <form class="mm-form" id="form">
      <input required type="email" placeholder="Tu correo" aria-label="Correo electrónico">
      <button type="submit">Suscribirme</button>
    </form>
  </section>
</main>

${storefrontFooterHtml()}
<script>
document.getElementById('form').onsubmit=e=>{e.preventDefault();toast('Gracias — bienvenida a Maison Marnier.');e.target.reset()};
(function(){
  const carousel = document.getElementById('heroCarousel');
  const track = document.getElementById('heroTrack');
  if (!carousel || track.children.length < 2) return;
  const slides = [...track.children];
  carousel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]');
    if (!button) return;
    const current = Math.round(track.scrollLeft / track.getBoundingClientRect().width);
    const next = (current + Number(button.dataset.step) + slides.length) % slides.length;
    const left = slides[next].offsetLeft - slides[0].offsetLeft;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left, behavior: reduceMotion ? 'instant' : 'smooth' });
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
