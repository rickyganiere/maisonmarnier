import assert from 'node:assert/strict';
import test from 'node:test';
import { productDisplayDescription, productSeoMeta, seoHeadHtml } from '../src/lib/seo.js';

const sample = {
  name: 'European Style Round Black and Golden Aromatherapy Candle Holder for Living Room',
  category: 'Candles',
  description: 'A considered home decoration piece, selected for Maison Marnier.',
  retail_price_eur: 34.95,
  image_url: 'https://supplier.example/1.jpg',
  image_urls: JSON.stringify([
    'https://supplier.example/1.jpg',
    'https://supplier.example/2.jpg',
    'https://supplier.example/3.jpg',
    'https://supplier.example/4.jpg',
  ]),
};

test('product search snippets are concise, category-led, and unique', () => {
  const meta = productSeoMeta(sample, 'es');
  assert.ok(meta.title.startsWith('Velas decorativas:'));
  assert.ok(`${meta.title} — Maison Marnier`.length <= 60);
  assert.ok(meta.description.length <= 155);
  assert.match(meta.description, /34,95 €/);
  assert.match(meta.description, /4 fotos reales/);
});

test('generic import copy becomes a useful visible product description', () => {
  const description = productDisplayDescription(sample, 'es');
  assert.match(description, /selección de velas decorativas/);
  assert.match(description, /4 fotografías reales/);
  assert.match(description, /devolución en 30 días/);
});

test('noindex pages remain followable for product discovery', () => {
  assert.match(seoHeadHtml({ title: 'Search', noindex: true }), /noindex,follow/);
});
