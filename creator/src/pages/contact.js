import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';

export function contactPage(env, { sent = false } = {}) {
  const notice = sent
    ? `<p class="notice" role="status">Thanks — your note is queued. For now this form stores a local acknowledgment; wire an email provider when you deploy.</p>`
    : '';

  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Contact</p>
  <h1>Talk to the humans behind June.</h1>
  <p class="lede">Sponsorships, press, collabs. ${esc(BRAND.disclosure)}</p>
  ${notice}
  <form class="contact-form" method="post" action="/contact">
    <label>Name<input name="name" type="text" required maxlength="120" autocomplete="name" /></label>
    <label>Email<input name="email" type="email" required maxlength="200" autocomplete="email" /></label>
    <label>Topic
      <select name="topic">
        <option>Sponsorship</option>
        <option>Affiliate</option>
        <option>Press</option>
        <option>Other</option>
      </select>
    </label>
    <label>Message<textarea name="message" required maxlength="4000" rows="6"></textarea></label>
    <button class="btn btn-primary" type="submit">Send</button>
  </form>
  <p class="fine">Or email <a href="mailto:${esc(BRAND.email)}">${esc(BRAND.email)}</a></p>
</section>`;

  return page({
    env,
    title: 'Contact',
    description: `Contact the team behind ${BRAND.name}.`,
    path: '/contact',
    body,
  });
}
