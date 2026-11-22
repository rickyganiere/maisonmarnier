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
  assert.equal(isHomeDecorCandidate({ name: 'Decorative Candle Holder', category: 'Home Decoration' }), true);
  assert.equal(isHomeDecorCandidate({ name: 'Rear Trunk Cargo Rack', category: 'Automotive' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Baby Storage Basket', category: 'Baby' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Portable Mini Flashlight LED ZOOM Torch Hunting', category: 'Lighting' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Onion Holder Slicer', category: 'Kitchen' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'OSMO Pocket 2 Handheld Tripod Holder Accessories', category: 'Home' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Back Stretcher Pillow Massager', category: 'Home' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Bluetooth Speaker White Noise Sleep Night Light', category: 'Lighting' }), false);
  assert.equal(isHomeDecorCandidate({ name: 'Halloween Cloak Costumes', category: 'Holiday Decoration' }), false);
});
