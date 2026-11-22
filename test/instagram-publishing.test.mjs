import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { instagramAdminRoute } from '../src/instagram-publishing.js';
import { instagramPhotoResponse, instagramProduct } from '../src/instagram-photos.js';

const apiRoot = 'https://maisonmarnier.com/api/lume/instagram/';
const image = 'https://cf.cjdropshipping.com/gallery/basket.png';
const token = 'local-fixture-token';
const unified = 'local-unified-fixture';
const pageToken = 'local-pages-fixture';
const expired = 'local-expired-fixture';
const appUsername = 'maison.marnier';
const metaError = (code, error_subcode) => Response.json({ error: { code, error_subcode } }, { status: 400 });

function setup(t) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const file of ['0001_init.sql', '0004_product_images.sql', '0006_instagram_publishing.sql', '0007_instagram_login_method.sql', '0009_instagram_studio.sql']) {
    sqlite.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  }
  sqlite.prepare(`INSERT INTO products(lume_sku,supplier_product_id,name,slug,image_url,image_urls,
    retail_price_eur,supplier_cost_usd,status) VALUES ('PRIVATE-SKU','1','Basket','basket',?,?,12.95,4.11,'live')`)
    .run(image, JSON.stringify([
      image,
      'https://other.example/side.jpg',
      'https://other.example/detail.jpg',
      'https://other.example/room.jpg',
    ]));
  const env = {
    LUME_ADMIN_TOKEN: 'local-admin-fixture',
    INSTAGRAM_TOKEN_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
    LUME_DB: { prepare(query) {
      const sql = sqlite.prepare(query);
      function bind(...args) {
        return { first: async () => sql.get(...args), all: async () => ({ results: sql.all(...args) }), run: async () => ({ meta: sql.run(...args) }) };
      }
      return { ...bind(), bind };
    } },
  };
  const meta = { username: appUsername, status: 'FINISHED', creates: 0, carouselChildren: 0, carouselParents: 0, publishes: 0, loseReply: false, calls: 0, paths: [] };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const u = new URL(url);
    const isUnified = u.origin === 'https://graph.facebook.com';
    assert.equal(u.origin, isUnified ? 'https://graph.facebook.com' : 'https://graph.instagram.com');
    assert.equal(options.redirect, 'manual');
    meta.calls++;
    meta.paths.push(u.origin + u.pathname);
    const credential = options.headers.Authorization;
    const version = isUnified ? '/v27.0/' : '/v26.0/';
    assert.ok(u.pathname.startsWith(version));
    const path = u.pathname.slice(version.length);
    const id = isUnified ? '67890' : (meta.numericId || '12345');
    if (!isUnified && credential !== 'Bearer ' + token)
      return metaError(190, credential === 'Bearer ' + expired ? 463 : undefined);
    if (isUnified && credential !== 'Bearer ' + unified)
      return credential === 'Bearer ' + pageToken ? metaError(100) : metaError(190);
    if (path === 'me/assigned_instagram_accounts') {
      assert.ok(isUnified);
      assert.equal(u.searchParams.get('fields'), 'id,username');
      if (!u.searchParams.has('after')) return Response.json({
        data: [{ id: '1', username: 'another.shop' }],
        paging: { next: 'https://unused.example/next', cursors: { after: 'page/2+' } },
      });
      assert.equal(u.searchParams.get('after'), 'page/2+');
      return Response.json({ data: [{ id, username: meta.username }] });
    }
    switch (path) {
      case 'me':
        assert.ok(!isUnified);
        if (meta.numericId) return new Response('{"user_id":' + id + ',"username":"maison.marnier"}');
        return Response.json({ user_id: id, username: meta.username });
      case '67890':
        assert.ok(isUnified);
        return Response.json({ id, username: meta.username });
      case id + '/content_publishing_limit':
        return meta.deny ? metaError(10) : Response.json(meta.emptyQuota ? { data: [] } : { data: [{ quota_usage: 0 }] });
      case id + '/media':
        if (options.body.get('media_type') === 'CAROUSEL') {
          meta.carouselParents++;
          assert.equal(options.body.get('children'), '2001,2002');
          assert.match(options.body.get('caption'), /#MaisonMarnier/);
          return Response.json({ id: '2003' });
        }
        if (options.body.get('is_carousel_item') === 'true') {
          meta.carouselChildren++;
          assert.match(options.body.get('image_url'), /^(https:\/\/maisonmarnier\.com\/instagram\/product-photo\/1\/[0-9a-f]+\.jpg|https:\/\/other\.example\/side\.jpg)$/);
          return Response.json({ id: meta.carouselChildren === 1 ? '2001' : '2002' });
        }
        meta.creates++;
        assert.match(options.body.get('image_url'), /^https:\/\/maisonmarnier\.com\/instagram\/product-photo\/1\/[0-9a-f]+\.jpg$/);
        return Response.json({ id: '1001' });
      case '1001': return Response.json({ status_code: meta.status });
      case '2003': return Response.json({ status_code: meta.status });
      case id + '/media_publish':
        assert.ok(['1001', '2003'].includes(options.body.get('creation_id')));
        meta.publishes++;
        meta.status = 'PUBLISHED';
        if (meta.loseReply) throw new Error('Response lost after publication');
        return Response.json({ id: options.body.get('creation_id') === '2003' ? '2004' : '1002' });
      case '1002': return Response.json({ permalink: 'https://www.instagram.com/p/abc123/' });
      case '2004': return Response.json({ permalink: 'https://www.instagram.com/p/carousel123/' });
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
    const product = await instagramProduct(env, 1);
    // Exercise recovery of publications already started before the studio upgrade.
    sqlite.prepare(`INSERT INTO instagram_posts(fingerprint,product_id,photo_key,caption,state,lease,login_method,updated_at)
      VALUES('legacy-fixture',1,?,?,'creating','old','instagram',0)`).run(product.photos[0].key, product.caption);
    return { productId: 1, photoKey: product.photos[0].key, caption: product.caption };
  }
  return { sqlite, env, meta, call, payload };
}

test('preview is admin-only and contains only public product information', async t => {
  const { call, sqlite, meta } = setup(t);
  assert.equal((await call('product?id=1', null, false)).status, 401);
  const preview = await call('product?id=1');
  assert.equal(preview.connected, false);
  assert.equal(preview.photos.length, 0);
  assert.equal(preview.studio.configured, false);
  assert.match(preview.caption, /Basket/);
  assert.match(preview.caption, /#MaisonMarnier/);
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

test('a numeric Instagram user ID retains every digit when Meta returns a JSON integer', async t => {
  const { call, meta, sqlite } = setup(t);
  meta.numericId = '17841405822304919';
  assert.equal((await call('account', { token })).connected, true);
  assert.equal(sqlite.prepare('SELECT user_id FROM instagram_account').get().user_id, meta.numericId);
});

test('read-only Facebook credentials and confirmed expiration give distinct instructions and preserve an existing connection', async t => {
  const { call, meta, sqlite } = setup(t);
  const rejected = await call('account', { token: pageToken });
  assert.equal(rejected.status, 403);
  assert.match(rejected.error, /Facebook Page-read/);
  assert.doesNotMatch(rejected.error, /expired/i);
  assert.equal((await call('account')).connected, false);

  assert.equal((await call('account', { token })).connected, true);
  const before = sqlite.prepare('SELECT * FROM instagram_account').get();
  const attempted = meta.paths.length;
  const expiredResult = await call('account', { token: expired });
  assert.equal(expiredResult.status, 403);
  assert.match(expiredResult.error, /has expired/);
  assert.equal(meta.paths.length, attempted + 1);
  assert.deepEqual(sqlite.prepare('SELECT * FROM instagram_account').get(), before);
  assert.equal(meta.creates + meta.publishes, 0);
});

test('Unified Login checks the assigned handle and the publishing permission before saving', async t => {
  const { call, meta, sqlite } = setup(t);
  meta.username = 'a.different.account';
  assert.equal((await call('account', { token: unified })).status, 403);
  meta.username = appUsername;
  meta.deny = true;
  const permission = await call('account', { token: unified });
  assert.equal(permission.status, 403);
  assert.match(permission.error, /publishing access/);
  meta.deny = false;
  meta.emptyQuota = true;
  assert.equal((await call('account', { token: unified })).status, 502);
  assert.equal((await call('account')).connected, false);
  meta.emptyQuota = false;
  assert.equal((await call('account', { token: unified })).connected, true);
  const row = sqlite.prepare('SELECT * FROM instagram_account').get();
  assert.equal(row.login_method, 'unified');
  assert.equal(row.user_id, '67890');
  assert.ok(!row.sealed_token.includes(unified));
  assert.equal(meta.creates + meta.publishes, 0);
});

test('Unified Login publishes on its own host and retries after switching login do not duplicate a post', async t => {
  const { call, meta, sqlite, payload } = setup(t);
  const body = await payload();
  await call('account', { token: unified });
  sqlite.exec("UPDATE instagram_account SET refreshed_at=0");
  sqlite.exec("UPDATE instagram_posts SET login_method='unified'");
  const start = meta.paths.length;
  const published = await call('publish', body);
  assert.equal(published.published, true);
  assert.equal(published.permalink, 'https://www.instagram.com/p/abc123/');
  assert.deepEqual(meta.paths.slice(start), ['67890', '67890/media', '1001', '67890/media_publish', '1002']
    .map(path => 'https://graph.facebook.com/v27.0/' + path));
  await call('account', { token });
  // Rows saved before the migration used a different fingerprint format.
  sqlite.exec("UPDATE instagram_posts SET fingerprint='old-fingerprint'");
  assert.equal((await call('publish', body)).published, true);
  assert.equal(meta.creates, 1);
  assert.equal(meta.publishes, 1);
});

test('a pending container can only be resumed through its original login', async t => {
  const { call, meta, payload } = setup(t);
  const body = await payload();
  await call('account', { token });
  meta.status = 'IN_PROGRESS';
  assert.equal((await call('publish', body)).pending, true);
  await call('account', { token: unified });
  const switched = await call('publish', body);
  assert.equal(switched.status, 409);
  assert.match(switched.error, /previous Meta login/);
  assert.equal(meta.creates, 1);
  assert.equal(meta.publishes, 0);
  await call('account', { token });
  meta.status = 'FINISHED';
  assert.equal((await call('publish', body)).published, true);
  assert.equal(meta.publishes, 1);
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

test('resumes a legacy two-photo carousel without creating an extra post', async t => {
  const { call, meta, payload, sqlite } = setup(t);
  const body = await payload();
  const preview = await call('product?id=1');
  sqlite.prepare('UPDATE instagram_posts SET photo_key=?').run(JSON.stringify(preview.photos.slice(0, 2).map(photo => photo.key)));
  await call('account', { token });
  const result = await call('publish', {
    productId: 1,
    photoKeys: preview.photos.slice(0, 2).map(photo => photo.key),
    caption: body.caption,
  });
  assert.equal(result.published, true);
  assert.equal(result.permalink, 'https://www.instagram.com/p/carousel123/');
  assert.equal(meta.carouselChildren, 2);
  assert.equal(meta.carouselParents, 1);
  assert.equal(meta.publishes, 1);
  assert.equal((await call('product?id=1')).lastPost.photoKeys.length, 2);
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
  const photo = (await instagramProduct(env, 1)).photos[0];
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
