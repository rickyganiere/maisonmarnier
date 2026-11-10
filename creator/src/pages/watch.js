import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function watchPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Watch</p>
  <h1>Instagram Reels first. Poi tutto il resto.</h1>
  <p class="lede">Sostituisci i placeholder con gli embed appena escono i primi 10 seed Reels.</p>
</section>

<section class="section" data-reveal>
  <div class="watch-grid">
    <article class="watch-card">
      <div class="embed-shell">
        <p class="embed-placeholder">Instagram Reels<br/><span>Grid virale · look fisso</span></p>
      </div>
      <h3>Reels</h3>
      <p>Ballo in location, buono spesa, flex assurdo, smorfia + catchphrase.</p>
      <a class="text-link" href="${esc(BRAND.social.instagram)}">Apri Instagram →</a>
    </article>
    <article class="watch-card">
      <div class="embed-shell">
        <p class="embed-placeholder">TikTok / Shorts<br/><span>Stesso master, upload nativo</span></p>
      </div>
      <h3>Cross-post</h3>
      <p>Stesso giorno: IG → TikTok → YouTube Shorts, senza watermark.</p>
      <a class="text-link" href="${esc(BRAND.social.tiktok)}">Apri TikTok →</a>
    </article>
  </div>
</section>

<section class="section band" data-reveal>
  <h2>Serie</h2>
  <ul class="clean-list">
    <li><strong>Buono Spesa</strong> — shopping fails da culturista</li>
    <li><strong>Ballo Prestige</strong> — dance in posti iconici</li>
    <li><strong>Flex Assurdo</strong> — moto, pose, stunt</li>
    <li><strong>Smorfia</strong> — una battuta, un frame</li>
  </ul>
</section>`;

  return page({
    env,
    title: 'Watch',
    description: `Guarda ${BRAND.name} su Instagram, TikTok e YouTube.`,
    path: '/watch',
    body,
  });
}
