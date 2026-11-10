/** Minimal Stripe helpers for digital offer Checkout (no SDK). */

export function stripeConfigured(env) {
  return !!env.STRIPE_SECRET_KEY;
}

async function stripeForm(env, path, params, { method = 'POST', idempotencyKey } = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }
  const headers = {
    authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
    'content-type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const r = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers,
    body: method === 'GET' ? undefined : body,
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || 'Stripe error ' + r.status;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Hosted Checkout Session for the Nando Prestige Reels Pack.
 * Prefer STRIPE_PRICE_ID when set; otherwise uses price_data from env vars.
 */
export async function createDigitalOfferCheckout(env, { successUrl, cancelUrl, customerEmail }) {
  const params = {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'auto',
    'metadata[product]': 'reels-pack',
    allow_promotion_codes: 'true',
  };

  if (customerEmail) params.customer_email = customerEmail;

  if (env.STRIPE_PRICE_ID) {
    params['line_items[0][price]'] = env.STRIPE_PRICE_ID;
    params['line_items[0][quantity]'] = '1';
  } else {
    const cents = String(env.OFFER_PRICE_CENTS || '1900');
    const currency = String(env.OFFER_CURRENCY || 'eur').toLowerCase();
    const name = env.OFFER_NAME || 'Nando Prestige Reels Pack';
    params['line_items[0][quantity]'] = '1';
    params['line_items[0][price_data][currency]'] = currency;
    params['line_items[0][price_data][unit_amount]'] = cents;
    params['line_items[0][price_data][product_data][name]'] = name;
    params['line_items[0][price_data][product_data][description]'] =
      '30 disclosed-AI Reels scripts in Nando Prestige voice + upload SOP. Digital download after purchase.';
    params['line_items[0][price_data][product_data][metadata][product]'] = 'reels-pack';
  }

  return stripeForm(env, '/checkout/sessions', params, {
    idempotencyKey: `nando-offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

/** Verify Stripe webhook signature (v1). Returns event object or throws. */
export async function verifyStripeWebhook(env, rawBody, signatureHeader) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header');

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), v];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error('Invalid Stripe-Signature header');

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (Number.isNaN(age) || age > 300) throw new Error('Stripe signature timestamp outside tolerance');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const digest = [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, '0')).join('');

  if (digest !== v1) throw new Error('Stripe signature mismatch');
  return JSON.parse(rawBody);
}
