import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';
import { stripeConfigured } from '../lib/stripe.js';

export function offerPage(env, { status } = {}) {
  const priceCents = Number(env.OFFER_PRICE_CENTS || 1900);
  const currency = String(env.OFFER_CURRENCY || 'usd').toUpperCase();
  const priceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(priceCents / 100);

  const checkoutReady = stripeConfigured(env);
  let banner = '';
  if (status === 'success') {
    banner = `<p class="notice" role="status">Payment received. Delivery email flow is stubbed — fulfill the script pack manually until webhooks ship files.</p>`;
  } else if (status === 'cancel') {
    banner = `<p class="notice notice-muted" role="status">Checkout canceled. No charge.</p>`;
  }

  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Digital offer</p>
  <h1>${esc(env.OFFER_NAME || 'June Signal Shorts Script Pack')}</h1>
  <p class="lede">Thirty production-ready Shorts scripts in June’s voice, plus upload SOP notes. Built for creators who want a disclosed-AI comedy pipeline without staring at a blank doc.</p>
  ${banner}
  <p class="price">${esc(priceLabel)}</p>
  <ul class="clean-list">
    <li>30 Shorts: hook → punch → CTA</li>
    <li>Mapped to the four content pillars</li>
    <li>Title formulas + disclosure line included</li>
  </ul>
  ${
    checkoutReady
      ? `<form method="post" action="/api/checkout">
          <label class="email-inline">Email for receipt
            <input name="email" type="email" required maxlength="200" autocomplete="email" />
          </label>
          <button class="btn btn-primary" type="submit">Buy with Stripe</button>
        </form>`
      : `<p class="notice notice-muted">Stripe is not configured yet. Set <code>STRIPE_SECRET_KEY</code> (and optionally <code>STRIPE_PRICE_ID</code>) to enable checkout. Scripts are also free in the repo under <code>creator/content/</code> for the brand owner.</p>
         <a class="btn btn-ghost" href="/media-kit">See sponsorships instead</a>`
  }
</section>

<section class="section narrow" data-reveal>
  <h2>Affiliate links</h2>
  <p>Replace placeholders with your tracked URLs once programs are approved.</p>
  <ul class="affiliate-list">
    <li><span>Creator toolkit</span> <code>#AFFILIATE_CREATOR_TOOLKIT</code></li>
    <li><span>Desk gadget of the week</span> <code>#AFFILIATE_GADGET</code></li>
    <li><span>Note-taking app</span> <code>#AFFILIATE_NOTES</code></li>
  </ul>
  <p class="fine">June discloses paid relationships on camera and in descriptions.</p>
</section>`;

  return page({
    env,
    title: 'Offer',
    description: `Buy the ${BRAND.name} Shorts Script Pack and find affiliate links.`,
    path: '/offer',
    body,
  });
}
