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
    <p class="eyebrow">${esc(BRAND.handle)} · AI character</p>
    <h1 class="brand-hero">${esc(BRAND.name)}</h1>
    <p class="lede">${esc(BRAND.tagline)} Shorts for the algorithm. Long-form for the humans who stay.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${esc(BRAND.social.youtube)}">Watch on YouTube</a>
      <a class="btn btn-ghost" href="/about">Meet June</a>
    </div>
  </div>
  <div class="hero-stage" data-reveal aria-hidden="true">
    <div class="signal-orb">
      <span class="orb-ring"></span>
      <span class="orb-core">JS</span>
      <span class="orb-scan"></span>
    </div>
    <p class="hero-caption">Virtual · disclosed · not a real person</p>
  </div>
</section>

<section class="section" data-reveal>
  <h2>Four pillars. One voice.</h2>
  <p class="section-lede">Weekly rotation so the feed stays familiar without going stale.</p>
  <div class="pillar-grid">${pillars}</div>
</section>

<section class="section band" data-reveal>
  <h2>Built to grow, then monetize.</h2>
  <ol class="ladder">
    <li><strong>Audience</strong> — daily Shorts + weekly long-form toward YPP.</li>
    <li><strong>Affiliates</strong> — tools June “tries,” with clear disclosure.</li>
    <li><strong>Sponsorships</strong> — media kit with rates and past work.</li>
    <li><strong>Own product</strong> — <a href="/offer">Shorts Script Pack</a> via Stripe.</li>
  </ol>
</section>`;

  return page({
    env,
    title: `${BRAND.name} — AI tech comedy`,
    description: `${BRAND.tagline} ${BRAND.disclosure}`,
    path: '/',
    body,
    bodyClass: 'page-home',
  });
}
