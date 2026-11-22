import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalOriginRedirect,
  localeQueryRedirect,
  setLangResponse,
  withLangQuery,
} from '../src/lib/i18n.js';

test('storefront links keep useful query parameters but remove locale variants', () => {
  assert.equal(withLangQuery('/collections/new?q=lamp&hl=en#results', 'es'), '/collections/new?q=lamp#results');
  assert.equal(withLangQuery('/products/vase?lang=en', 'en'), '/products/vase');
});

test('language switch persists the cookie and returns to a clean URL', () => {
  const request = new Request(
    'https://maisonmarnier.com/lang?set=en&next=%2Fcollections%2Fnew%3Fq%3Dlamp%26hl%3Des',
  );
  const response = setLangResponse(request, new URL(request.url));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/collections/new?q=lamp');
  assert.match(response.headers.get('set-cookie'), /mm_lang=en/);
});

test('legacy locale URLs permanently consolidate without losing language choice', () => {
  const request = new Request('https://maisonmarnier.com/collections/new?hl=en&q=lamp');
  const response = localeQueryRedirect(request, new URL(request.url));
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://maisonmarnier.com/collections/new?q=lamp');
  assert.match(response.headers.get('set-cookie'), /mm_lang=en/);
});

test('HTTP and www requests redirect to the canonical HTTPS apex', () => {
  const httpRequest = new Request('http://maisonmarnier.com/about');
  const http = canonicalOriginRedirect(httpRequest, new URL(httpRequest.url));
  assert.equal(http.status, 301);
  assert.equal(http.headers.get('location'), 'https://maisonmarnier.com/about');

  const wwwRequest = new Request('https://www.maisonmarnier.com/about');
  const www = canonicalOriginRedirect(wwwRequest, new URL(wwwRequest.url));
  assert.equal(www.status, 301);
  assert.equal(www.headers.get('location'), 'https://maisonmarnier.com/about');
});
