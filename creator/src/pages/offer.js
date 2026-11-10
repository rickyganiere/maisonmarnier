import { BRAND } from '../lib/brand.js';
import { esc } from '../lib/escape.js';
import { page } from '../lib/layout.js';
import { stripeConfigured } from '../lib/stripe.js';

export function offerPage(env, { status } = {}) {
  const priceCents = Number(env.OFFER_PRICE_CENTS || 1900);
  const currency = String(env.OFFER_CURRENCY || 'eur').toUpperCase();
  const priceLabel = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(priceCents / 100);

  const checkoutReady = stripeConfigured(env);
  let banner = '';
  if (status === 'success') {
    banner = `<p class="notice" role="status">Pagamento ok. Delivery email ancora stub — fulfill manuale del pack finché non colleghi webhook + file.</p>`;
  } else if (status === 'cancel') {
    banner = `<p class="notice notice-muted" role="status">Checkout annullato. Nessun addebito.</p>`;
  }

  const body = `
<section class="section narrow" data-reveal>
  <p class="eyebrow">Digital offer</p>
  <h1>${esc(env.OFFER_NAME || 'Nando Prestige Reels Pack')}</h1>
  <p class="lede">Trenta script Reels nella voce di Nando: hook → gag → CTA, mappati sui quattro pilastri. Per creator che vogliono un AI character da commedia senza partire da zero.</p>
  ${banner}
  <p class="price">${esc(priceLabel)}</p>
  <ul class="clean-list">
    <li>30 Reels: buono spesa, ballo, flex, smorfia</li>
    <li>Title / caption / disclosure line</li>
    <li>SOP upload Instagram → TikTok → Shorts</li>
  </ul>
  ${
    checkoutReady
      ? `<form method="post" action="/api/checkout">
          <label class="email-inline">Email per ricevuta
            <input name="email" type="email" required maxlength="200" autocomplete="email" />
          </label>
          <button class="btn btn-primary" type="submit">Compra con Stripe</button>
        </form>`
      : `<p class="notice notice-muted">Stripe non configurato. Imposta <code>STRIPE_SECRET_KEY</code> (e opzionale <code>STRIPE_PRICE_ID</code>). Gli script sono anche in <code>creator/content/</code> per il brand owner.</p>
         <a class="btn btn-ghost" href="/media-kit">Vedi sponsorship</a>`
  }
</section>

<section class="section narrow" data-reveal>
  <h2>Affiliate links</h2>
  <p>Sostituisci i placeholder quando i programmi sono approvati.</p>
  <ul class="affiliate-list">
    <li><span>Gym / protein</span> <code>#AFFILIATE_GYM</code></li>
    <li><span>Streetwear prestige</span> <code>#AFFILIATE_FIT</code></li>
    <li><span>Gadget flex</span> <code>#AFFILIATE_GADGET</code></li>
  </ul>
  <p class="fine">Nando dichiara sempre i rapporti a pagamento.</p>
</section>`;

  return page({
    env,
    title: 'Offer',
    description: `Compra il Reels Pack di ${BRAND.name}.`,
    path: '/offer',
    body,
  });
}
