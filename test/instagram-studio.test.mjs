import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { instagramAdminRoute } from '../src/instagram-publishing.js';
import { instagramProduct } from '../src/instagram-photos.js';
import { defaultSceneCount, requestStudioImageEdit, requestWorkersAiImage, resolveReferencePhotos, studioGallery, studioPhotoResponse, workersAiModel } from '../src/instagram-studio.js';

const root = 'https://maisonmarnier.com/api/lume/instagram/';
const key = 'sk-proj-' + 'local-key-fixture-'.repeat(5);
const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 255, 217]);

function setup(t, { workersAi = false } = {}) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  for (const file of ['0001_init.sql', '0004_product_images.sql', '0006_instagram_publishing.sql', '0007_instagram_login_method.sql', '0009_instagram_studio.sql'])
    db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
  const images = [0, 1, 2, 3].map(n => 'https://cf.cjdropshipping.com/reference-' + n + '.png');
  db.prepare(`INSERT INTO products(lume_sku,supplier_product_id,name,slug,image_url,image_urls,retail_price_eur,status)
    VALUES('fixture','fixture-id','Burgundy cushion','cushion',?,?,25,'live')`).run(images[0], JSON.stringify(images));
  const objects = new Map();
  const provider = { edits: 0, children: [], publishes: 0, fail: false, wait: null, badKey: false, restrictedKey: false, unreachable: false, rateLimitsLeft: 0, lastAiForm: null };
  const env = {
    LUME_ADMIN_TOKEN: 'studio-admin-fixture',
    INSTAGRAM_TOKEN_KEY: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'),
    LUME_DB: { prepare(query) {
      const stmt = db.prepare(query);
      const bind = (...args) => ({ first: async () => stmt.get(...args), all: async () => ({ results: stmt.all(...args) }), run: async () => ({ meta: stmt.run(...args) }) });
      return { ...bind(), bind };
    } },
    INSTAGRAM_MEDIA: {
      put: async (path, bytes) => objects.set(path, bytes),
      get: async path => objects.has(path) ? { body: objects.get(path), size: objects.get(path).length } : null,
    },
  };
  if (workersAi) {
    env.AI = {
      async run(model, input) {
        assert.equal(model, workersAiModel);
        assert.ok(input?.multipart?.body);
        assert.match(input.multipart.contentType, /^multipart\/form-data/i);
        const form = await new Response(input.multipart.body, { headers: { 'content-type': input.multipart.contentType } }).formData();
        provider.lastAiForm = form;
        provider.edits++;
        assert.equal(form.get('width'), '1024');
        assert.equal(form.get('height'), '1280');
        assert.ok(form.get('input_image_0'));
        assert.ok(form.get('prompt'));
        assert.match(form.get('prompt'), /Image 0 is the EXACT product identity reference/);
        if (provider.wait) await provider.wait;
        if (provider.fail) throw new Error('insufficient quota for Workers AI');
        if (provider.rateLimitsLeft > 0) {
          provider.rateLimitsLeft--;
          throw new Error('429 rate limit exceeded');
        }
        return { image: Buffer.from(jpeg).toString('base64') };
      },
    };
  }
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const u = new URL(url);
    assert.equal(options.redirect, 'manual', 'Workers must reject redirects without using unsupported redirect:error');
    if (u.origin === 'https://api.openai.com') {
      assert.equal(options.headers.Authorization, 'Bearer ' + key);
      if (provider.redirectApi) return new Response('', { status: 302, headers: { location: 'https://example.com/' } });
      if (u.pathname === '/v1/models') {
        if (provider.unreachable) throw new TypeError('Network connection lost.');
        return new Response('{}', { status: provider.badKey ? 401 : provider.restrictedKey ? 403 : 200 });
      }
      assert.equal(u.pathname, '/v1/images/edits');
      provider.edits++;
      assert.equal(options.body.get('size'), '1024x1280');
      assert.equal(options.body.get('output_format'), 'jpeg');
      assert.equal(options.body.get('quality'), 'medium');
      assert.ok(options.body.getAll('image[]').length >= 2);
      assert.ok(options.body.getAll('image[]').length <= 3);
      assert.match(options.body.get('prompt'), /EXACT product identity reference/);
      assert.match(options.body.get('prompt'), /No text, logo/);
      if (provider.wait) await provider.wait;
      if (provider.fail) return Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 });
      if (provider.rateLimitsLeft > 0) {
        provider.rateLimitsLeft--;
        return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429, headers: { 'retry-after': '1' } });
      }
      return Response.json({ data: [{ b64_json: Buffer.from(jpeg).toString('base64') }] });
    }
    if (u.hostname === 'cf.cjdropshipping.com' || u.origin === 'https://maisonmarnier.com') {
      if (provider.redirectReference) return new Response('', { status: 302, headers: { location: 'https://example.com/' } });
      return new Response(provider.invalidReference ? '<html>Not a photo</html>' : jpeg, { headers: { 'content-type': provider.referenceType || 'image/png' } });
    }
    assert.equal(u.origin, 'https://graph.instagram.com');
    if (u.pathname.endsWith('/me')) return Response.json({ user_id: '12345', username: 'maison.marnier' });
    if (u.pathname.includes('/content_publishing_limit')) return Response.json({ data: [{ quota_usage: 0 }] });
    if (u.pathname.endsWith('/media')) {
      if (options.body.get('is_carousel_item')) {
        assert.match(options.body.get('image_url'), /^https:\/\/maisonmarnier.com\/instagram\/mockup\/1\/[a-f0-9]{32}\.jpg$/);
        const id = String(2000 + provider.children.length);
        provider.children.push(id);
        return Response.json({ id });
      }
      assert.equal(options.body.get('media_type'), 'CAROUSEL');
      assert.equal(options.body.get('children'), provider.children.join(','));
      return Response.json({ id: '3000' });
    }
    if (u.pathname.endsWith('/3000')) return Response.json({ status_code: 'FINISHED' });
    if (u.pathname.endsWith('/media_publish')) { provider.publishes++; return Response.json({ id: '4000' }); }
    if (u.pathname.endsWith('/4000')) return Response.json({ permalink: 'https://www.instagram.com/p/studio123/' });
    throw new Error('Unexpected URL');
  });
  async function call(path, body, authorized = true) {
    const url = new URL(path, root);
    const response = await instagramAdminRoute(new Request(url, {
      method: body ? 'POST' : 'GET', headers: authorized ? { authorization: 'Bearer ' + env.LUME_ADMIN_TOKEN } : {},
      body: body ? JSON.stringify(body) : undefined,
    }), env, url, () => new Response(jpeg, { headers: { 'content-type': 'image/webp' } }));
    return { httpStatus: response.status, ...await response.json() };
  }
  async function generate(slot, photoKeys) {
    const product = await call('product?id=1');
    const keys = photoKeys || (product.references || []).slice(0, 2).map(photo => photo.key);
    return call('mockups', { productId: 1, slot, revision: product.studio.revision, photoKeys: keys });
  }
  return { db, env, objects, provider, call, generate };
}

test('default scene count follows how many product photos were chosen', () => {
  assert.equal(defaultSceneCount(0), 0);
  assert.equal(defaultSceneCount(1), 2);
  assert.equal(defaultSceneCount(2), 4);
  assert.equal(defaultSceneCount(3), 5);
});

test('studio connection is admin-only, validates the key and returns no credential', async t => {
  const { db, call, provider } = setup(t);
  assert.equal((await call('studio-connection', { key }, false)).httpStatus, 401);
  const unset = await call('studio-connection');
  assert.equal(unset.configured, false);
  assert.equal(unset.provider, null);
  const connected = await call('studio-connection', { key });
  assert.equal(connected.configured, true);
  assert.equal(connected.provider, 'openai');
  assert.ok(!JSON.stringify(connected).includes(key));
  const saved = db.prepare('SELECT sealed_key FROM instagram_studio_connection').get().sealed_key;
  assert.ok(!saved.includes(key));
  provider.badKey = true;
  assert.equal((await call('studio-connection', { key })).httpStatus, 422);
  assert.equal(db.prepare('SELECT sealed_key FROM instagram_studio_connection').get().sealed_key, saved);
  provider.badKey = false;
  provider.restrictedKey = true;
  const restricted = await call('studio-connection', { key });
  assert.equal(restricted.configured, true, 'restricted model-list access must not block saving a valid image key');
  assert.equal(restricted.validation, 'restricted');
  assert.ok(!JSON.stringify(restricted).includes(key));
  provider.restrictedKey = false;
  provider.unreachable = true;
  const offline = await call('studio-connection', { key });
  assert.equal(offline.configured, true, 'outbound OpenAI probe failures must not block encrypting the pasted key');
  assert.equal(offline.validation, 'unverified');
  assert.ok(db.prepare('SELECT sealed_key FROM instagram_studio_connection').get().sealed_key);
});

test('Workers AI is ready without an OpenAI key and generates mockups from product photos', async t => {
  const { call, generate, provider } = setup(t, { workersAi: true });
  const connection = await call('studio-connection');
  assert.equal(connection.configured, true);
  assert.equal(connection.provider, 'workers-ai');
  assert.equal(connection.openaiOptional, true);
  const product = await call('product?id=1');
  assert.equal(product.studio.configured, true);
  assert.equal(product.studio.provider, 'workers-ai');
  const one = await generate(0, [product.references[0].key]);
  assert.equal(one.ok, true);
  assert.equal(one.photos.length, 1);
  assert.equal(provider.edits, 1);
  assert.ok(provider.lastAiForm.get('input_image_0'));
  assert.ok(provider.lastAiForm.get('input_image_1'), 'homepage style is the last reference');
  assert.equal(provider.lastAiForm.get('input_image_2'), null);
});

test('Workers AI retries transient rate limits and treats billing as non-retryable', async () => {
  const waits = [];
  let runs = 0;
  const ai = {
    async run() {
      runs++;
      if (runs < 3) throw new Error('429 Too Many Requests');
      return { image: Buffer.from(jpeg).toString('base64') };
    },
  };
  const encoded = await requestWorkersAiImage(ai, () => {
    const form = new FormData();
    form.set('prompt', 'test');
    return form;
  }, { wait: async ms => { waits.push(ms); } });
  assert.equal(runs, 3);
  assert.equal(waits.length, 2);
  assert.equal(encoded, Buffer.from(jpeg).toString('base64'));
  await assert.rejects(
    () => requestWorkersAiImage({ async run() { throw new Error('insufficient quota'); } }, new FormData(), { attempts: 2, wait: async () => {} }),
    error => error.status === 422 && /credit/i.test(error.message),
  );
});

test('composer exposes reference photos and mockups require an explicit photo choice', async t => {
  const { call, generate } = setup(t);
  await call('studio-connection', { key });
  const product = await call('product?id=1');
  assert.equal(product.references.length, 4);
  assert.equal(product.studio.defaultSceneCount, 5);
  assert.equal(product.studio.scenes.length, 5);
  assert.equal((await call('mockups', { productId: 1, slot: 0, revision: product.studio.revision })).httpStatus, 422);
  assert.equal((await call('mockups', { productId: 1, slot: 0, revision: product.studio.revision, photoKeys: [] })).httpStatus, 422);
  const one = await generate(0, [product.references[0].key]);
  assert.equal(one.ok, true);
  assert.equal(one.photos.length, 1);
  const photos = [0, 1, 2].map(n => ({
    key: 'ref-' + n, url: 'https://example/' + n, source: 'https://cf.cjdropshipping.com/ref-' + n + '.png',
  }));
  assert.equal(resolveReferencePhotos({ photos }, ['ref-0']).length, 1);
  assert.equal(resolveReferencePhotos({ photos }, ['ref-0', 'ref-1']).length, 2);
  assert.throws(() => resolveReferencePhotos({ photos }, ['ref-0', 'ref-1', 'ref-2']), /up to two/);
  assert.throws(() => resolveReferencePhotos({ photos }, []), /at least one/);
});

test('new posts require four or five generated mockups; partial packs cannot publish', async t => {
  const { env, call, generate, provider } = setup(t);
  const base = await instagramProduct(env, 1);
  assert.equal((await call('publish', { productId: 1, photoKey: base.photos[0].key, caption: 'Original' })).httpStatus, 409);
  assert.equal((await generate(0)).httpStatus, 409);
  await call('studio-connection', { key });
  for (let slot = 0; slot < 5; slot++) assert.equal((await generate(slot)).ok, true);
  const product = await call('product?id=1');
  assert.equal(product.photos.length, 5);
  assert.equal(new Set(product.photos.map(p => p.label)).size, 5);
  assert.ok(product.photos.every(p => p.kind === 'mockup'));
  assert.equal(provider.edits, 5);
  await generate(2);
  assert.equal(provider.edits, 5, 'reopening/retrying a finished scene must not bill again');
  const body = { productId: 1, photoKeys: product.photos.slice(0, 3).map(p => p.key), caption: product.caption };
  assert.equal((await call('publish', body)).httpStatus, 409);
  await call('account', { token: 'meta-fixture' });
  body.photoKeys = product.photos.slice(0, 4).map(p => p.key);
  assert.equal((await call('publish', body)).published, true);
  assert.equal(provider.children.length, 4);
  assert.equal((await call('publish', body)).published, true);
  assert.equal(provider.publishes, 1);
});

test('concurrent image requests claim one paid edit and failures preserve completed scenes', async t => {
  const { db, call, generate, provider } = setup(t);
  await call('studio-connection', { key });
  let release;
  provider.wait = new Promise(resolve => { release = resolve; });
  const active = generate(0);
  for (let i = 0; i < 100 && provider.edits === 0; i++) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal(provider.edits, 1);
  assert.equal((await generate(0)).pending, true);
  assert.equal(provider.edits, 1);
  release();
  assert.equal((await active).ok, true);
  provider.wait = null;
  provider.fail = true;
  const failed = await generate(1);
  assert.equal(failed.status, 422);
  assert.match(failed.error, /credit/);
  assert.equal((await call('product?id=1')).photos.length, 1);
  assert.equal(db.prepare('SELECT state FROM instagram_mockups WHERE slot=1').get().state, 'failed');
  provider.fail = false;
  assert.equal((await generate(1)).photos.length, 2);
});

test('transient OpenAI rate limits retry with backoff and then save the scene', async t => {
  const waits = [];
  const forms = [];
  let edits = 0;
  const fetchImpl = async (_url, options = {}) => {
    edits++;
    forms.push(options.body);
    if (edits < 3) return Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429, headers: { 'retry-after': '2' } });
    return Response.json({ data: [{ b64_json: 'ok' }] });
  };
  const result = await requestStudioImageEdit('sk-test', () => {
    const form = new FormData();
    form.set('n', String(forms.length + 1));
    return form;
  }, { fetchImpl, wait: async ms => { waits.push(ms); } });
  assert.equal(edits, 3);
  assert.deepEqual(waits, [2000, 2000]);
  assert.equal(forms.length, 3, 'each retry must rebuild a fresh FormData body');
  assert.equal((await result.json()).data[0].b64_json, 'ok');
});

test('exhausted rate limits surface a resume error without treating billing as retryable', async t => {
  const fetchImpl = async () => Response.json({ error: { code: 'rate_limit_exceeded' } }, { status: 429 });
  await assert.rejects(
    () => requestStudioImageEdit('sk-test', new FormData(), { attempts: 2, fetchImpl, wait: async () => {} }),
    error => error.status === 429 && /rate limiting/i.test(error.message),
  );
  const billing = async () => Response.json({ error: { code: 'insufficient_quota' } }, { status: 429 });
  await assert.rejects(
    () => requestStudioImageEdit('sk-test', new FormData(), { attempts: 4, fetchImpl: billing, wait: async () => {} }),
    error => error.status === 422 && /credit/i.test(error.message),
  );
});

test('mockup generation resumes after transient rate limits and keeps earlier ready scenes', async t => {
  const { db, call, generate, provider } = setup(t);
  await call('studio-connection', { key });
  assert.equal((await generate(0)).photos.length, 1);
  provider.rateLimitsLeft = 2;
  const resumed = await generate(1);
  assert.equal(resumed.ok, true);
  assert.equal(resumed.photos.length, 2);
  assert.equal(provider.edits, 4, 'one ready scene plus two rate-limit probes and one successful edit');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM instagram_mockups WHERE state='ready'").get().n, 2);
});

test('saved JPEG is public for Meta only while its product is live; changing references invalidates the pack', async t => {
  const { db, env, call, generate, provider } = setup(t);
  await call('studio-connection', { key });
  const created = await generate(0);
  const photo = created.photos[0];
  const match = new URL(photo.url).pathname.match(/mockup\/(\d+)\/([a-f0-9]{32})\.jpg$/);
  const response = await studioPhotoResponse(new Request(photo.url), env, match);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), jpeg);
  assert.equal((await studioPhotoResponse(new Request(photo.url, { method: 'HEAD' }), env, match)).status, 200);
  assert.equal((await studioPhotoResponse(new Request(photo.url, { method: 'POST' }), env, match)).status, 405);
  db.exec("UPDATE products SET name='Changed product'");
  assert.equal((await call('product?id=1')).photos.length, 0);
  assert.equal((await call('mockups', { productId: 1, slot: 1, revision: created.revision })).httpStatus, 409);
  assert.equal(provider.edits, 1);
  db.exec("UPDATE products SET status='draft'");
  assert.equal((await studioPhotoResponse(new Request(photo.url), env, match)).status, 404);
});


test('redirected API and reference responses are rejected before saving a key or image', async t => {
  const { db, call, generate, provider, objects } = setup(t);
  provider.redirectApi = true;
  assert.equal((await call('studio-connection', { key })).httpStatus, 422);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM instagram_studio_connection').get().n, 0);
  provider.redirectApi = false;
  await call('studio-connection', { key });
  provider.redirectReference = true;
  assert.equal((await generate(0)).status, 422);
  assert.equal(provider.edits, 0, 'a redirected reference must not reach a paid edit');
  provider.redirectReference = false;
  provider.redirectApi = true;
  assert.equal((await generate(0)).status, 422);
  assert.equal(objects.size, 0);
});


test('supplier MIME labels are corrected from file signatures and fake images are rejected', async t => {
  const { call, generate, provider } = setup(t);
  await call('studio-connection', { key });
  provider.referenceType = 'image/jpg';
  assert.equal((await generate(0)).ok, true);
  provider.referenceType = 'application/octet-stream';
  assert.equal((await generate(1)).ok, true);
  provider.referenceType = 'image/png';
  provider.invalidReference = true;
  assert.equal((await generate(2)).status, 422);
  assert.equal(provider.edits, 2, 'HTML with an image MIME label must not reach a paid edit');
});
