import assert from 'node:assert/strict';
import test from 'node:test';
import { galleryValidationError, isStorefrontListable } from '../src/lib/images.js';
import { isHomeDecorCandidate } from '../src/jobs/importDailyHomeDecor.js';

const product = (count, price = 24.95) => ({
  image_url: 'https://supplier.example/1.jpg',
  image_urls: JSON.stringify(Array.from({ length: count }, (_, i) => `https://supplier.example/${i + 1}.jpg`)),
  retail_price_eur: price,
});

test('storefront requires a price and four distinct supplier photos', () => {
  assert.equal(isStorefrontListable(product(4)), true);
  assert.equal(isStorefrontListable(product(3)), false);
  assert.equal(isStorefrontListable(product(4, 0)), false);
  assert.match(galleryValidationError(product(3)), /at least 4/i);
});

test('daily catalog filter accepts decor and rejects unrelated products', () => {
  assert.equal(isHomeDecorCandidate({ name: 'Ceramic Vase', category: 'Home Decoration' }), true);
  assert.equal(isHomeDecorCandidate({ name: 'Decorative Cushion Cover', category: 'Textiles' }), true);
  assert.equal(isHomeDecorCandidate({ name: 'Rear Trunk Cargo Rack', category: 'Automotive' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Baby Storage Basket', category: 'Baby' }), false);
});
