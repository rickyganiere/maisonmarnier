import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function contactPage(env, { sent = false } = {}) {
  const notice = sent
    ? `<p class="notice" role="status">Grazie — messaggio ricevuto. Per ora è solo ack locale; collega email/CRM in deploy.</p>`
    : '';

  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Contact</p>
  <h1>Collabs con gli umani dietro Nando.</h1>
  <p class="lede">Sponsorship, press, meme collab. ${esc(BRAND.disclosure)}</p>
  ${notice}
  <form class="contact-form" method="post" action="/contact">
    <label>Nome<input name="name" type="text" required maxlength="120" autocomplete="name" /></label>
    <label>Email<input name="email" type="email" required maxlength="200" autocomplete="email" /></label>
    <label>Topic
      <select name="topic">
        <option>Sponsorship</option>
        <option>Affiliate</option>
        <option>Press</option>
        <option>Other</option>
      </select>
    </label>
    <label>Messaggio<textarea name="message" required maxlength="4000" rows="6"></textarea></label>
    <button class="btn btn-primary" type="submit">Invia</button>
  </form>
  <p class="fine">Oppure <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a></p>
</section>`;

  return page({
    env,
    title: 'Contact',
    description: `Contatta il team di ${BRAND.name}.`,
    path: '/contact',
    body,
  });
}
