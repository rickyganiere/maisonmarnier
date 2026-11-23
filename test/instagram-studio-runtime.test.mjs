import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

// Use Wrangler's installed runtime and bundler, including nested installs.
const require = createRequire(import.meta.url);
const workerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, convertV4MiniflareOptions, Response: RuntimeResponse } = workerRequire('miniflare');
const { build } = workerRequire('esbuild');

test('Cloudflare runtime verifies OpenAI fallback and renders with the bundled homepage reference without following redirects', async t => {
  // Miniflare cannot host a custom Workers AI binding object, so this runtime
  // path covers the OpenAI fallback. Unit tests cover the Workers AI provider.
  const bundle = await build({
    entryPoints: [new URL('../src/worker.js', import.meta.url).pathname],
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    loader: { '.html': 'text', '.webp': 'binary', '.jpg': 'binary' },
  });
  const apiKey = 'sk-proj-' + 'runtime-fixture-'.repeat(5);
  const adminKey = 'runtime-admin-fixture';
  const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 255, 217]);
  const calls = [];
  let redirect = false;
  const options = {
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-10-29',
    d1Databases: ['LUME_DB'], r2Buckets: ['INSTAGRAM_MEDIA'],
    bindings: { LUME_ADMIN_TOKEN: adminKey, INSTAGRAM_TOKEN_KEY: Buffer.alloc(32, 1).toString('base64') },
    outboundService: async request => {
      const url = new URL(request.url);
      calls.push(url.origin + url.pathname);
      if (url.origin === 'https://api.openai.com') {
        assert.equal(request.headers.get('authorization'), 'Bearer ' + apiKey);
        if (url.pathname === '/v1/models') {
          if (redirect) return new RuntimeResponse(null, { status: 302, headers: { location: 'https://unexpected.example/', 'cache-control': 'no-store' } });
          return RuntimeResponse.json({ id: 'gpt-image-2' });
        }
        assert.equal(url.pathname, '/v1/images/edits');
        const form = await request.formData();
        const images = form.getAll('image[]');
        assert.equal(images.length, 3);
        assert.equal(images[2].type, 'image/webp');
        assert.deepEqual(Buffer.from(await images[2].arrayBuffer()), readFileSync(new URL('../src/assets/christmas-living.webp', import.meta.url)));
        return RuntimeResponse.json({ data: [{ b64_json: Buffer.from(jpeg).toString('base64') }] });
      }
      assert.equal(url.hostname, 'cf.cjdropshipping.com', 'homepage asset must not fetch back into the Worker');
      return new RuntimeResponse(jpeg, { headers: { 'content-type': 'image/png' } });
    },
  };
  const mf = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('LUME_DB');
  for (const file of ['0001_init.sql', '0004_product_images.sql', '0006_instagram_publishing.sql', '0007_instagram_login_method.sql', '0009_instagram_studio.sql']) {
    const sql = readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8').replace(/^\s*--.*$/gm, '');
    await db.batch(sql.split(';').map(s => s.trim()).filter(Boolean).map(s => db.prepare(s)));
  }
  const images = [0, 1, 2, 3].map(n => 'https://cf.cjdropshipping.com/reference-' + n + '.png');
  await db.prepare(`INSERT INTO products(lume_sku,supplier_product_id,name,slug,image_url,image_urls,retail_price_eur,status)
    VALUES('runtime-fixture','fixture','Cushion','cushion',?,?,25,'live')`).bind(images[0], JSON.stringify(images)).run();
  const call = async (path, body) => {
    const response = await mf.dispatchFetch('https://maisonmarnier.com/api/lume/instagram/' + path, {
      method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + adminKey },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, ...await response.json() };
  };
  redirect = true;
  assert.equal((await call('studio-connection', { key: apiKey })).status, 422);
  assert.equal((await call('studio-connection')).configured, false);
  assert.equal(calls.length, 1, 'credentials must not follow a redirect');
  redirect = false;
  const connection = await call('studio-connection', { key: apiKey });
  assert.equal(connection.configured, true, JSON.stringify(connection));
  assert.equal(connection.provider, 'openai');
  const product = await call('product?id=1');
  assert.ok(product.references?.length >= 1, JSON.stringify(product));
  assert.equal(product.studio.provider, 'openai');
  const result = await call('mockups', {
    productId: 1, slot: 0, revision: product.studio.revision,
    photoKeys: product.references.slice(0, 2).map(photo => photo.key),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.photos.length, 1);
  const saved = await mf.dispatchFetch(result.photos[0].url);
  assert.equal(saved.status, 200);
  assert.deepEqual(new Uint8Array(await saved.arrayBuffer()), jpeg);
  assert.ok(calls.includes('https://api.openai.com/v1/images/edits'));
});
