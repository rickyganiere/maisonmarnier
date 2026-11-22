import assert from 'node:assert/strict';
import test from 'node:test';
import { BRAND_OG_PATH } from '../src/lib/brandAsset.js';
import {
  DEFAULT_OG_IMAGE,
  OG_LOCALE_ALTERNATE,
  OG_LOCALE_DEFAULT,
  OG_SITE_NAME,
  absoluteUrl,
  ogLocalesForLang,
  seoHeadHtml,
} from '../src/lib/seo.js';

test('default OG image is the self-hosted brand card', () => {
  assert.equal(DEFAULT_OG_IMAGE, BRAND_OG_PATH);
  assert.equal(BRAND_OG_PATH, '/brand/maison-marnier-og.jpg');
  assert.match(absoluteUrl(DEFAULT_OG_IMAGE), /^https:\/\/maisonmarnier\.com\/brand\/maison-marnier-og\.jpg$/);
});

test('seoHeadHtml emits site_name, locales, and brand OG dimensions', () => {
  const es = seoHeadHtml({
    title: 'Maison Marnier — Edición hogar de Navidad',
    description: 'Decoración festiva',
    canonical: '/',
    lang: 'es',
  });
  assert.match(es, /og:site_name" content="Maison Marnier"/);
  assert.equal(OG_SITE_NAME, 'Maison Marnier');
  assert.match(es, new RegExp(`og:locale" content="${OG_LOCALE_DEFAULT}"`));
  assert.match(es, new RegExp(`og:locale:alternate" content="${OG_LOCALE_ALTERNATE}"`));
  assert.match(es, /og:image" content="https:\/\/maisonmarnier\.com\/brand\/maison-marnier-og\.jpg"/);
  assert.match(es, /og:image:width" content="1200"/);
  assert.match(es, /og:image:height" content="630"/);

  const en = seoHeadHtml({ title: 'Holiday', description: 'x', canonical: '/', lang: 'en' });
  assert.match(en, new RegExp(`og:locale" content="${OG_LOCALE_ALTERNATE}"`));
  assert.match(en, new RegExp(`og:locale:alternate" content="${OG_LOCALE_DEFAULT}"`));
});

test('ogLocalesForLang flips primary/alternate', () => {
  assert.deepEqual(ogLocalesForLang('es'), { locale: 'es_ES', alternate: 'en_GB' });
  assert.deepEqual(ogLocalesForLang('en'), { locale: 'en_GB', alternate: 'es_ES' });
});
