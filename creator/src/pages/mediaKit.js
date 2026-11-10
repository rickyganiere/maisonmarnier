import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function mediaKitPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Media kit</p>
  <h1>Sponsor un AI character da commedia italiana.</h1>
  <p class="lede">${esc(BRAND.name)} — ${esc(BRAND.role)}. Brand che ci stanno: fashion flashy, gym, centri commerciali, food, travel, comedy apps. Sempre con disclosure AI.</p>
</section>

<section class="section" data-reveal>
  <div class="stat-grid" aria-label="Posizionamento">
    <div><strong>IG Reels-first</strong><span>Look fisso · alto replay</span></div>
    <div><strong>Niche</strong><span>Comedy · dance · lifestyle</span></div>
    <div><strong>Disclosure</strong><span>100% AI-labeled</span></div>
    <div><strong>Cadence</strong><span>1 Reel/giorno seed month</span></div>
  </div>
</section>

<section class="section narrow" data-reveal>
  <h2>Formati &amp; rate starter</h2>
  <p class="fine">Placeholder finché non ci sono metriche reali — aggiorna prima di mandare ai brand.</p>
  <table class="rates">
    <thead><tr><th>Format</th><th>Include</th><th>Da</th></tr></thead>
    <tbody>
      <tr><td>Reel dedicato</td><td>1 × 20–40s, disclosure + mention</td><td>€250</td></tr>
      <tr><td>Serie 3 Reels</td><td>Story arc in una settimana</td><td>€650</td></tr>
      <tr><td>Dance integration</td><td>Product in Ballo Prestige</td><td>€400</td></tr>
      <tr><td>Whitelisting 30gg</td><td>Uso ads del Reel</td><td>€300</td></tr>
    </tbody>
  </table>
</section>

<section class="section narrow" data-reveal>
  <h2>Affiliate-friendly</h2>
  <ul class="clean-list">
    <li>Gym / protein / streetwear pacchiano</li>
    <li>Gadget e “prestige” low-cost</li>
    <li>Travel / experience (zoo, mall, city nights — disclosed)</li>
  </ul>
  <p>Link tracciati su <a href="/offer">/offer</a>. Disclosure FTC / AGCM quando serve.</p>
</section>

<section class="section narrow cta-band" data-reveal>
  <a class="btn btn-primary" href="/contact">Collabs</a>
  <a class="btn btn-ghost" href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a>
</section>`;

  return page({
    env,
    title: 'Media Kit',
    description: `Sponsorship formats for ${BRAND.name}.`,
    path: '/media-kit',
    body,
  });
}
