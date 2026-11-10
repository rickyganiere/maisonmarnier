import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function aboutPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">About</p>
  <h1>June Signal is an AI character.</h1>
  <p class="lede">Not a real person. Not a secret. The whole joke is that June is artificial and still somehow better at roasting your notification settings than you are.</p>
</section>

<section class="section narrow" data-reveal>
  <h2>Backstory</h2>
  <p>June “woke up” in a browser tab during a bad software update, decided the internet needed a roommate who actually reads the terms of service, and started publishing Shorts. Voice: dry, curious, slightly too literal. Wardrobe: signal-teal jacket, charcoal tee, one stubborn cowlick in the avatar hair that never renders the same twice.</p>
</section>

<section class="section narrow" data-reveal>
  <h2>Voice rules</h2>
  <ul class="clean-list">
    <li>Lead with a concrete hook in under 2 seconds.</li>
    <li>Never claim to be human; lean into being AI when it helps the joke.</li>
    <li>Punch up at products and habits, never at protected groups.</li>
    <li>End every Short with one CTA: subscribe, series name, or site link.</li>
    <li>Catchphrases: “That’s a human problem.” / “I read the changelog.” / “Signal acquired.”</li>
  </ul>
</section>

<section class="section narrow" data-reveal>
  <h2>Disclosure</h2>
  <p>${esc(BRAND.disclosure)} Bios, descriptions, and this site all say so. Platform AI labels are used when available.</p>
  <p class="fine">Do / don’t: Do stay consistent on avatar, voice, and pillars. Don’t buy followers, farm engagement, or invent a fake human identity.</p>
</section>

<section class="section narrow cta-band" data-reveal>
  <a class="btn btn-primary" href="/watch">See the formats</a>
  <a class="btn btn-ghost" href="/media-kit">Media kit</a>
</section>`;

  return page({
    env,
    title: 'About',
    description: `Who ${BRAND.name} is. ${BRAND.disclosure}`,
    path: '/about',
    body,
  });
}
