import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCjUsShipping } from '../src/cj.js';
import { createCheckoutSession } from '../src/stripe.js';

test('US supplier quote must support the fulfillment method and has its own EUR shipping charge', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('getAccessToken')) return Response.json({ code: 200, data: { accessToken: 'test', accessTokenExpiryDate: '2099-01-01' } });
    if (url.includes('freightCalculate')) return Response.json({ code: 200, data: [
      { logisticName: 'USPS+', logisticPrice: 3 },
      { logisticName: 'CJPacket Ordinary', logisticPrice: 9.4, logisticAging: '8-15' },
    ] });
    return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/test' });
  };
  try {
    const quote = await quoteCjUsShipping({ CJ_API_KEY: 'test', US_SHIPPING_EUR_PER_USD: '1.25' }, [{ vid: 'variant-id', quantity: 1 }], '10001');
    assert.deepEqual(quote, { shippingEur: 11.75, deliveryDays: '8-15' });
    assert.deepEqual(JSON.parse(calls[1].options.body), { startCountryCode: 'CN', endCountryCode: 'US', zip: '10001', products: [{ vid: 'variant-id', quantity: 1 }] });
    await createCheckoutSession({ STRIPE_SECRET_KEY: 'test' }, {
      orderNumber: 'TEST-1', lineItems: [{ name: 'Lamp', quantity: 1, unitAmountCents: 5000 }],
      shippingCents: 1175, successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cart', shippingCountry: 'US',
    });
    const stripe = new URLSearchParams(calls[2].options.body);
    assert.equal(stripe.get('shipping_address_collection[allowed_countries][0]'), 'US');
    assert.equal(stripe.get('shipping_address_collection[allowed_countries][1]'), null);
    assert.equal(stripe.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '1175');
  } finally { globalThis.fetch = original; }
});
