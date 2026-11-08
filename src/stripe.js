/** Minimal Stripe REST helpers for Workers (no SDK). */

export function stripeConfigured(env) {
  return !!env.STRIPE_SECRET_KEY;
}

async function stripeForm(env, path, params, method = 'POST') {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: {
      authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'content-type': 'application/x-www-form-urlencoded',
    },
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

/** Nested form encoding for Stripe Checkout line_items etc. */
export async function createCheckoutSession(env, { orderNumber, lineItems, successUrl, cancelUrl, customerEmail }) {
  const params = {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: orderNumber,
    'metadata[order_number]': orderNumber,
    'shipping_address_collection[allowed_countries][0]': 'AT',
    'shipping_address_collection[allowed_countries][1]': 'BE',
    'shipping_address_collection[allowed_countries][2]': 'BG',
    'shipping_address_collection[allowed_countries][3]': 'HR',
    'shipping_address_collection[allowed_countries][4]': 'CY',
    'shipping_address_collection[allowed_countries][5]': 'CZ',
    'shipping_address_collection[allowed_countries][6]': 'DK',
    'shipping_address_collection[allowed_countries][7]': 'EE',
    'shipping_address_collection[allowed_countries][8]': 'FI',
    'shipping_address_collection[allowed_countries][9]': 'FR',
    'shipping_address_collection[allowed_countries][10]': 'DE',
    'shipping_address_collection[allowed_countries][11]': 'GR',
    'shipping_address_collection[allowed_countries][12]': 'HU',
    'shipping_address_collection[allowed_countries][13]': 'IE',
    'shipping_address_collection[allowed_countries][14]': 'IT',
    'shipping_address_collection[allowed_countries][15]': 'LV',
    'shipping_address_collection[allowed_countries][16]': 'LT',
    'shipping_address_collection[allowed_countries][17]': 'LU',
    'shipping_address_collection[allowed_countries][18]': 'MT',
    'shipping_address_collection[allowed_countries][19]': 'NL',
    'shipping_address_collection[allowed_countries][20]': 'PL',
    'shipping_address_collection[allowed_countries][21]': 'PT',
    'shipping_address_collection[allowed_countries][22]': 'RO',
    'shipping_address_collection[allowed_countries][23]': 'SK',
    'shipping_address_collection[allowed_countries][24]': 'SI',
    'shipping_address_collection[allowed_countries][25]': 'ES',
    'shipping_address_collection[allowed_countries][26]': 'SE',
    'phone_number_collection[enabled]': 'true',
    'payment_intent_data[metadata][order_number]': orderNumber,
  };
  if (customerEmail) params.customer_email = customerEmail;

  lineItems.forEach((li, i) => {
    params[`line_items[${i}][quantity]`] = String(li.quantity);
    params[`line_items[${i}][price_data][currency]`] = 'eur';
    params[`line_items[${i}][price_data][unit_amount]`] = String(li.unitAmountCents);
    params[`line_items[${i}][price_data][product_data][name]`] = li.name;
    if (li.image) params[`line_items[${i}][price_data][product_data][images][0]`] = li.image;
  });

  return stripeForm(env, '/checkout/sessions', params);
}

export async function retrieveCheckoutSession(env, sessionId) {
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId) + '?expand[]=line_items', {
    headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY },
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data.error && data.error.message) || 'Session retrieve failed');
  return data;
}

function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verify Stripe-Signature header (v1). */
export async function verifyStripeWebhook(env, rawBody, signatureHeader) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  const parts = Object.fromEntries(
    String(signatureHeader || '')
      .split(',')
      .map((p) => p.trim().split('='))
      .filter((kv) => kv.length === 2),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error('Missing Stripe signature');
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > 300) throw new Error('Stripe webhook timestamp too old');

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const a = enc.encode(expected);
  const b = enc.encode(v1);
  if (!timingSafeEqualBytes(a, b)) throw new Error('Invalid Stripe signature');
  return JSON.parse(rawBody);
}
