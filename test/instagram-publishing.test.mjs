import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { instagramAdminRoute } from '../src/instagram-publishing.js';
import { instagramPhotoResponse } from '../src/instagram-photos.js';

const apiRoot = 'https://maisonmarnier.com/api/lume/instagram/';
const image = 'https://cf.cjdropshipping.com/gallery/basket.png';
const token = 'local-fixture-token';

function setup(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of ['0001_init.sql', '0004_product_images.sql', '0006_instagram_publishing.sql']) {
    sqlite.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  }
  sqlite.prepare(`INSERT INTO products(lume_sku,supplier_product_id,name,slug,image_url,image_urls,
    retail_price_eur,supplier_cost_usd,status) VALUES ('PRIVATE-SKU','1','Basket','basket',?,?,12.95,4.11,'live')`)
    .run(image, JSON.stringify([image, 'https://other.example/side.jpg']));
  const env = {
    LUME_ADMIN_TOKEN: 'local-admin-fixture',
    INSTAGRAM_TOKEN_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
    LUME_DB: { prepare(query) {
      const sql = sqlite.prepare(query);
      function bind(...args) {
        return { first: async () => sql.get(...args), run: async () => ({ meta: sql.run(...args) }) };
      }
      return { ...bind(), bind };
    } },
  };
  const meta = { username: 'maison.marnier', status: 'FINISHED', creates: 0, publishes: 0, loseReply: false, calls: 0 };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const u = new URL(url);
    assert.equal(u.origin, 'https://graph.instagram.com');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    meta.calls++;
    switch (u.pathname.replace('/v26.0/', '')) {
      case 'me': return Response.json({ user_id: '12345', username: meta.username });
      case '12345/content_publishing_limit':
        return meta.deny ? Response.json({ error: { code: 10 } }, { status: 403 }) : Response.json({ data: [{ quota_usage: 0 }] });
      case '12345/media':
        meta.creates++;
        assert.match(options.body.get('image_url'), /^https:\/\/maisonmarnier\.com\/instagram\/product-photo\/1\/[0-9a-f]+\.jpg$/);
        return Response.json({ id: '1001' });
      case '1001': return Response.json({ status_code: meta.status });
      case '12345/media_publish':
        assert.equal(options.body.get('creation_id'), '1001');
        meta.publishes++;
        meta.status = 'PUBLISHED';
        if (meta.loseReply) throw new Error('Response lost after publication');
        return Response.json({ id: '1002' });
      case '1002': return Response.json({ permalink: 'https://www.instagram.com/p/abc123/' });
      default: throw new Error('Unexpected Graph request ' + u.pathname);
    }
  });
  async function call(path, body, authorized = true, method = body ? 'POST' : 'GET') {
    const url = new URL(path, apiRoot);
    const request = new Request(url, { method, headers: authorized ? { authorization: 'Bearer ' + env.LUME_ADMIN_TOKEN } : {},
      body: body ? JSON.stringify(body) : undefined });
    const res = await instagramAdminRoute(request, env, url);
    return { status: res.status, ...await res.json() };
  }
  async function payload() {
    const product = await call('product?id=1');
    return { productId: 1, photoKey: product.photos[0].key, caption: product.caption };
  }
  return { sqlite, env, meta, call, payload };
}

test('preview is admin-only and contains only public product information', async t => {
  const { call, sqlite, meta } = setup(t);
  assert.equal((await call('product?id=1', null, false)).status, 401);
  const preview = await call('product?id=1');
  assert.equal(preview.connected, false);
  assert.equal(preview.photos.length, 2);
  assert.match(preview.caption, /Basket · €12.95/);
  assert.doesNotMatch(JSON.stringify(preview), /4\.11|PRIVATE-SKU|supplier_cost/);
  assert.equal(meta.calls, 0);
  sqlite.exec("UPDATE products SET status='draft'");
  assert.equal((await call('product?id=1')).status, 404);
});

test('connection verifies the handle and publishing scope and stores only a sealed token', async t => {
  const { call, meta, sqlite } = setup(t);
  meta.username = 'another.account';
  assert.equal((await call('account', { token })).status, 403);
  meta.username = 'maison.marnier';
  meta.deny = true;
  assert.equal((await call('account', { token })).status, 403);
  assert.equal((await call('account')).connected, false);
  meta.deny = false;
  assert.equal((await call('account', { token })).connected, true);
  assert.ok(!sqlite.prepare('SELECT sealed_token FROM instagram_account').get().sealed_token.includes(token));
  assert.equal((await call('account', null, true, 'DELETE')).connected, false);
  assert.equal(meta.publishes, 0);
});

test('preparing, concurrent confirmation and retry create one feed post', async t => {
  const { call, meta, payload } = setup(t);
  const body = await payload();
  assert.equal((await call('publish', body)).status, 409);
  await call('account', { token });
  assert.equal((await call('publish', { ...body, photoKey: 'stale' })).status, 409);
  assert.equal((await call('publish', { ...body, caption: 'x'.repeat(2201) })).status, 400);
  meta.status = 'IN_PROGRESS';
  const [a, b] = await Promise.all([call('publish', body), call('publish', body)]);
  assert.equal(a.pending, true);
  assert.equal(b.pending, true);
  assert.equal(meta.creates, 1);
  assert.equal(meta.publishes, 0);
  meta.status = 'FINISHED';
  await Promise.all([call('publish', body), call('publish', body)]);
  const repeat = await call('publish', body);
  assert.equal(repeat.published, true);
  assert.equal(repeat.permalink, 'https://www.instagram.com/p/abc123/');
  assert.equal((await call('product?id=1')).lastPost.state, 'published');
  assert.equal(meta.publishes, 1);
});

test('a lost publish reply is reconciled with the saved container', async t => {
  const { call, meta, payload } = setup(t);
  const body = await payload();
  await call('account', { token });
  meta.loseReply = true;
  assert.equal((await call('publish', body)).status, 503);
  assert.equal((await call('product?id=1')).lastPost.state, 'publishing');
  assert.equal((await call('publish', body)).published, true);
  assert.equal(meta.creates, 1);
  assert.equal(meta.publishes, 1);
});

test('a CJ PNG is served to Meta as a JPEG and a removed photo cannot be fetched', async t => {
  const { call, env, sqlite } = setup(t);
  const photo = (await call('product?id=1')).photos[0];
  const request = new Request(photo.url);
  const match = new URL(photo.url).pathname.match(/product-photo\/(\d+)\/([0-9a-f]+)\.jpg$/);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.hostname, 'cf.cjdropshipping.com');
    assert.match(url.searchParams.get('x-oss-process'), /format,jpg/);
    assert.equal(options.redirect, 'manual');
    return new Response(new Uint8Array([255,216,255,217]), { headers: { 'content-type': 'image/png' } });
  });
  const response = await instagramPhotoResponse(request, env, match);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  sqlite.exec("UPDATE products SET status='draft'");
  assert.equal((await instagramPhotoResponse(request, env, match)).status, 404);
});
