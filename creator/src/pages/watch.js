import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function watchPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Watch</p>
  <h1>Shorts for reach. Long-form for trust.</h1>
  <p class="lede">Replace the placeholders below with your first published embeds once the channel is live.</p>
</section>

<section class="section" data-reveal>
  <div class="watch-grid">
    <article class="watch-card">
      <div class="embed-shell">
        <p class="embed-placeholder">YouTube Shorts embed<br/><span>Paste channel Shorts playlist here</span></p>
      </div>
      <h3>Shorts</h3>
      <p>Daily: tech fails, AI-in-public bits, lifestyle hacks, crooked explainers.</p>
      <a class="text-link" href="${esc(BRAND.social.youtube)}">Open YouTube →</a>
    </article>
    <article class="watch-card">
      <div class="embed-shell">
        <p class="embed-placeholder">Long-form embed<br/><span>8–12 minute episodes</span></p>
      </div>
      <h3>Long-form</h3>
      <p>Weekly listicles, reaction essays, and “day in the life of an AI.”</p>
      <a class="text-link" href="${esc(BRAND.social.youtube)}">Open YouTube →</a>
    </article>
  </div>
</section>

<section class="section band" data-reveal>
  <h2>Also posting</h2>
  <div class="social-row">
    <a class="btn btn-ghost" href="${esc(BRAND.social.tiktok)}">TikTok</a>
    <a class="btn btn-ghost" href="${esc(BRAND.social.instagram)}">Instagram Reels</a>
  </div>
  <p class="fine">Same-day native cross-post. No watermarked re-uploads.</p>
</section>`;

  return page({
    env,
    title: 'Watch',
    description: `Watch ${BRAND.name} on YouTube, TikTok, and Instagram.`,
    path: '/watch',
    body,
  });
}
