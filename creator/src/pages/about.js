import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function aboutPage(env) {
  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">About</p>
  <h1>Nando Prestige is an AI character.</h1>
  <p class="lede">Not a real person. Ispirato all’energia del culturista da grande magazzino: sicuro, pacchiano, sempre “per la trama”. Look fisso. Commedia italiana. Reels che si riconoscono in un frame.</p>
</section>

<section class="section narrow" data-reveal>
  <h2>Backstory</h2>
  <p>Nando ha “vinto il buono” della vita e ha deciso di spenderlo tutto in contenuto. Balli nei centri commerciali, flex in location iconiche, smorfie da cinepanettone. Non è Christian De Sica: è un personaggio originale con quella stessa voglia di entrare in scena e rubarla.</p>
</section>

<section class="section narrow" data-reveal>
  <h2>Voice &amp; look</h2>
  <ul class="clean-list">
    <li>Hook visivo in 1 secondo: baffi, maglia stretta, catenina, smorfia.</li>
    <li>Italiano comico, un filo dialettale, mai cattivo verso gruppi protetti.</li>
    <li>Catchphrase: “Nato iconico.” / “Qui per la trama.” / “Il buono basta.” / “Prestige.”</li>
    <li>Outfit signature quasi sempre uguale — riconoscibilità > varietà.</li>
    <li>Fine Reel: follow CTA o serie (“Buono Spesa”, “Ballo Prestige”).</li>
  </ul>
</section>

<section class="section narrow" data-reveal>
  <h2>Disclosure</h2>
  <p>${esc(BRAND.disclosure)} Bio, caption e sito lo dicono sempre. Label AI delle piattaforme quando disponibili.</p>
  <p class="fine">Do: look coerente, Reels nativi, engagement vero. Don’t: fingersi umano, comprare follower, clonare volti di attori reali.</p>
</section>

<section class="section narrow cta-band" data-reveal>
  <a class="btn btn-primary" href="/watch">Formati</a>
  <a class="btn btn-ghost" href="/media-kit">Media kit</a>
</section>`;

  return page({
    env,
    title: 'About',
    description: `Chi è ${BRAND.name}. ${BRAND.disclosure}`,
    path: '/about',
    body,
  });
}
