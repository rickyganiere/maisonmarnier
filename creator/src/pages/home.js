import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function homePage(env) {
  const pillars = BRAND.pillars
    .map(
      (p, i) => `
    <article class="pillar" data-reveal style="--i:${i}">
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.blurb)}</p>
    </article>`,
    )
    .join('');

  const body = `
<section class="hero">
  <div class="hero-copy" data-reveal>
    <p class="eyebrow">${esc(BRAND.handle)} · ${esc(BRAND.role)}</p>
    <h1 class="brand-hero">${esc(BRAND.name)}</h1>
    <p class="lede">${esc(BRAND.tagline)} Personaggio AI di commedia italiana: baffi, flex, balli in location. Instagram Reels first.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${esc(BRAND.social.instagram)}">Segui su Instagram</a>
      <a class="btn btn-ghost" href="/about">Chi è Nando</a>
    </div>
  </div>
  <div class="hero-stage" data-reveal aria-hidden="true">
    <div class="signal-orb prestige-orb">
      <span class="orb-ring"></span>
      <span class="orb-core">NP</span>
      <span class="orb-scan"></span>
    </div>
    <p class="hero-caption">Virtual · disclosed · not a real person</p>
  </div>
</section>

<section class="section" data-reveal>
  <h2>Quattro pilastri. Una faccia.</h2>
  <p class="section-lede">Look fisso, energia cinepanettone, formato virale da Reels.</p>
  <div class="pillar-grid">${pillars}</div>
</section>

<section class="section band" data-reveal>
  <h2>Crescita, poi soldi.</h2>
  <ol class="ladder">
    <li><strong>Audience</strong> — Reels quotidiani, pochi post ma memorabili.</li>
    <li><strong>Affiliates</strong> — gym, moda pacchiana, gadget (con disclosure).</li>
    <li><strong>Sponsorships</strong> — media kit per brand che vogliono comedy italiana.</li>
    <li><strong>Own product</strong> — <a href="/offer">Reels Pack</a> via Stripe.</li>
  </ol>
</section>`;

  return page({
    env,
    title: `${BRAND.name} — AI comedy character`,
    description: `${BRAND.tagline} ${BRAND.disclosure}`,
    path: '/',
    body,
    bodyClass: 'page-home',
  });
}
