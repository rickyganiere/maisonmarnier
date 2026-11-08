/** Minimal Stripe REST helpers for Workers (no SDK). */

const EU_SHIPPING = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
];

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
 * Hosted Checkout Session for Maison Marnier physical goods.
 * Enables Stripe Tax (automatic_tax) — requires Tax registrations in Dashboard.
 */
export async function createCheckoutSession(
  env,
  { orderNumber, lineItems, shippingCents, successUrl, cancelUrl, customerEmail },
) {
  const params = {
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: orderNumber,
    'metadata[order_number]': orderNumber,
    'automatic_tax[enabled]': 'true',
    customer_creation: 'always',
    billing_address_collection: 'auto',
    'phone_number_collection[enabled]': 'true',
    'payment_intent_data[metadata][order_number]': orderNumber,
    // Physical goods PTC — General Tangible Goods
    // tax_behavior exclusive: VAT added on top of listed EUR retail prices
  };

  EU_SHIPPING.forEach((cc, i) => {
    params[`shipping_address_collection[allowed_countries][${i}]`] = cc;
  });

  // Prefer shipping_options so Stripe Tax can tax shipping correctly
  if (shippingCents > 0) {
    params['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    params['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = String(shippingCents);
    params['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = 'eur';
    params['shipping_options[0][shipping_rate_data][display_name]'] = 'Standard shipping';
    params['shipping_options[0][shipping_rate_data][tax_behavior]'] = 'exclusive';
    params['shipping_options[0][shipping_rate_data][tax_code]'] = 'txcd_92010001'; // Shipping
  } else {
    params['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    params['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = '0';
    params['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = 'eur';
    params['shipping_options[0][shipping_rate_data][display_name]'] = 'Free shipping (orders over €100)';
    params['shipping_options[0][shipping_rate_data][tax_behavior]'] = 'exclusive';
    params['shipping_options[0][shipping_rate_data][tax_code]'] = 'txcd_92010001';
  }

  if (customerEmail) params.customer_email = customerEmail;

  lineItems.forEach((li, i) => {
    params[`line_items[${i}][quantity]`] = String(li.quantity);
    params[`line_items[${i}][price_data][currency]`] = 'eur';
    params[`line_items[${i}][price_data][unit_amount]`] = String(li.unitAmountCents);
    params[`line_items[${i}][price_data][tax_behavior]`] = 'exclusive';
    params[`line_items[${i}][price_data][product_data][name]`] = li.name;
    params[`line_items[${i}][price_data][product_data][tax_code]`] = 'txcd_99999999'; // General - Tangible Goods
    if (li.image) params[`line_items[${i}][price_data][product_data][images][0]`] = li.image;
  });

  return stripeForm(env, '/checkout/sessions', params, {
    idempotencyKey: `checkout-${orderNumber}`,
  });
}

export async function retrieveCheckoutSession(env, sessionId) {
  const r = await fetch(
    'https://api.stripe.com/v1/checkout/sessions/' +
      encodeURIComponent(sessionId) +
      '?expand[]=line_items&expand[]=total_details',
    { headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY } },
  );
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
