import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionPageJsonLd } from '../src/lib/seo.js';
import { COLLECTION_RULES } from '../src/pages/collection.js';

test('seasonal hub has bilingual intro, seo description, and internal link seeds', () => {
  const seasonal = COLLECTION_RULES.seasonal;
  assert.ok(seasonal.intro.es.length > 200);
  assert.ok(seasonal.intro.en.length > 200);
  assert.ok(seasonal.seoDescription.es.length <= 160);
  assert.ok(seasonal.seoDescription.en.length <= 160);
  assert.ok(seasonal.heroSlugs.length >= 3);
  assert.ok(seasonal.journalLinks.length >= 1);
  assert.ok(seasonal.relatedCollections.length >= 1);
});

test('collectionPageJsonLd emits CollectionPage + ItemList graph', () => {
  const ld = collectionPageJsonLd({
    name: 'Decoración de Navidad',
    description: 'Decoración de Navidad para el hogar.',
    url: '/collections/seasonal',
    products: [
      { slug: 'creative-lighted-robin-christmas-wreath', name: 'Corona de robin iluminada para puerta' },
      { slug: 'pvc-mini-christmas-tree-led-lights-decoration-desktop-ornaments', name: 'Mini árbol LED para escritorio' },
    ],
  });
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(ld['@graph'][0]['@type'], 'CollectionPage');
  assert.equal(ld['@graph'][1]['@type'], 'ItemList');
  assert.equal(ld['@graph'][1].numberOfItems, 2);
  assert.match(ld['@graph'][1].itemListElement[0].url, /\/products\/creative-lighted-robin/);
});
