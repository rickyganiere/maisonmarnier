import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function mediaKitPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Media kit</p>
  <h1>Sponsor an AI that discloses itself.</h1>
  <p class="lede">June Signal is a YouTube-first tech-comedy lifestyle character. Brands that fit: developer tools, gadgets, productivity apps, creator software — anything June can “try” on camera without lying about being AI.</p>
</section>

<section class="section" data-reveal>
  <div class="stat-grid" aria-label="Audience targets">
    <div><strong>YouTube-first</strong><span>Shorts + long-form</span></div>
    <div><strong>Niche</strong><span>Tech · comedy · lifestyle</span></div>
    <div><strong>Disclosure</strong><span>100% AI-labeled</span></div>
    <div><strong>Cadence</strong><span>1 Short/day · 1 long/week</span></div>
  </div>
</section>

<section class="section narrow" data-reveal>
  <h2>Formats &amp; starter rates</h2>
  <p class="fine">Rates are placeholders until audience metrics are live — update before sending to brands.</p>
  <table class="rates">
    <thead><tr><th>Format</th><th>Includes</th><th>From</th></tr></thead>
    <tbody>
      <tr><td>Dedicated Short</td><td>1 × 30–45s, disclosure + verbal mention</td><td>$250</td></tr>
      <tr><td>Short series (3)</td><td>3 Shorts over 1 week, same product story</td><td>$650</td></tr>
      <tr><td>Long-form integration</td><td>60–90s mid-roll in 8–12 min video</td><td>$800</td></tr>
      <tr><td>Dedicated long-form</td><td>Full episode framed around the product</td><td>$1,500</td></tr>
    </tbody>
  </table>
</section>

<section class="section narrow" data-reveal>
  <h2>Affiliate-friendly categories</h2>
  <ul class="clean-list">
    <li>Note-taking, AI writing, and creator tools</li>
    <li>Budget gadgets and desk setup</li>
    <li>VPN / password / privacy apps (honest demos only)</li>
    <li>Online learning and course platforms</li>
  </ul>
  <p>Tracked links live on <a href="/offer">/offer</a> and in video descriptions. Affiliate relationships are disclosed per FTC / platform rules.</p>
</section>

<section class="section narrow cta-band" data-reveal>
  <a class="btn btn-primary" href="/contact">Book a briefing</a>
  <a class="btn btn-ghost" href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a>
</section>`;

  return page({
    env,
    title: 'Media Kit',
    description: `Sponsorship formats and rates for ${BRAND.name}.`,
    path: '/media-kit',
    body,
  });
}
