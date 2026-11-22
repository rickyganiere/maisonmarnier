import assert from 'node:assert/strict';
import test from 'node:test';
import { googleProductsXml } from '../src/pages/seo.js';

function product(id, photoCount) {
  return {
    id,
    slug: `product-${id}`,
    name: `Decorative product ${id}`,
    description: 'A considered home decoration piece, selected for Maison Marnier.',
    category: 'Decor',
    retail_price_eur: 24.95,
    stock: 8,
    image_url: `https://supplier.example/${id}-1.jpg`,
    image_urls: JSON.stringify(
      Array.from({ length: photoCount }, (_, index) => `https://supplier.example/${id}-${index + 1}.jpg`),
    ),
  };
}

test('Merchant Center feed includes only products with price and four real photos', async () => {
  const env = {
    LUME_DB: {
      prepare() {
        return {
          bind() {
            return { all: async () => ({ results: [product(1, 4), product(2, 3)] }) };
          },
        };
      },
    },
  };
  const response = await googleProductsXml(env);
  const xml = await response.text();
  assert.match(response.headers.get('content-type'), /application\/xml/);
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /<g:id>1<\/g:id>/);
  assert.match(xml, /<g:price>24\.95 EUR<\/g:price>/);
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.match(xml, /<g:additional_image_link>/);
  assert.doesNotMatch(xml, /<g:id>2<\/g:id>/);
});
