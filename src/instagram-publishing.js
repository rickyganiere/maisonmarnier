import { requireAdmin } from './auth.js';
import { json } from './lib/json.js';
import {
  connectionStatus, getInstagramAccount, instagramAccountRoute, InstagramError,
  instagramHandle, instagramRequest, verifyInstagramIdentity,
} from './instagram-account.js';
import { digest, instagramProduct } from './instagram-photos.js';
import { defaultSceneCount, generateStudioPhoto, studioConfigured, studioConnection, studioGallery, studioProvider, studioScenes, supplierReferencePhotos } from './instagram-studio.js';

const pendingStates = "('creating','ready','publishing')";
const pending = () => json({ ok: true, pending: true, retryAfter: 60 }, 202);

function postForAdmin(row) {
  if (!row) return null;
  let photoKeys = [row.photo_key];
  try {
    const parsed = JSON.parse(row.photo_key);
    if (Array.isArray(parsed) && parsed.length) photoKeys = parsed;
  } catch { /* Legacy single-photo rows store one key directly. */ }
  return {
    photoKey: photoKeys[0], photoKeys, caption: row.caption, state: row.state,
    permalink: row.permalink || null, updatedAt: row.updated_at,
  };
}

function containerState(value) {
  if (!value) return { parent: null, children: [] };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.children))
      return { parent: parsed.parent ? String(parsed.parent) : null, children: parsed.children.map(String) };
  } catch { /* Legacy single-photo rows store the parent ID directly. */ }
  return { parent: String(value), children: [] };
}

function savedContainer(state) {
  return JSON.stringify({ parent: state.parent, children: state.children });
}

async function composer(env, id) {
  const product = await instagramProduct(env, id);
  if (!product) throw new InstagramError('This product is no longer available on the storefront.', 404);
  const [account, lastPost, studio, configured, provider] = await Promise.all([
    connectionStatus(env),
    env.LUME_DB.prepare(`SELECT * FROM instagram_posts WHERE product_id=?
      ORDER BY (state IN ${pendingStates}) DESC, updated_at DESC, rowid DESC LIMIT 1`).bind(id).first(),
    studioGallery(env, product), studioConfigured(env), studioProvider(env),
  ]);
  const last = postForAdmin(lastPost);
  // Keep old in-flight publications recoverable after the studio upgrade.
  const legacy = ['creating', 'ready', 'publishing'].includes(last?.state) && last.photoKeys.every(key => product.photos.some(p => p.key === key));
  const references = supplierReferencePhotos(product).map(({ key, url }) => ({ key, url }));
  return json({
    ok: true, ...account, name: product.name, caption: product.caption,
    photos: legacy ? product.photos.map(({ key, url }) => ({ key, url })) : studio.photos,
    references,
    studio: {
      ...studio, configured, provider, storageReady: !!env.INSTAGRAM_MEDIA, legacy,
      openaiOptional: provider === 'workers-ai',
      scenes: studioScenes.map(([label], slot) => ({ slot, label })),
      defaultSceneCount: defaultSceneCount(references.length),
    }, lastPost: last,
  });
}

async function markPublished(db, fingerprint, account, mediaId) {
  // Persist Meta's acknowledgement before making the optional permalink request.
  await db.prepare("UPDATE instagram_posts SET state='published', media_id=COALESCE(?, media_id), updated_at=unixepoch() WHERE fingerprint=?")
    .bind(mediaId || null, fingerprint).run();
  let permalink = null;
  if (mediaId) {
    try {
      const media = await instagramRequest(mediaId + '?fields=permalink', account);
      if (/^https:\/\/(?:www\.)?instagram\.com\/p\/[\w-]+\/?$/.test(media.permalink || '')) {
        permalink = media.permalink;
        await db.prepare('UPDATE instagram_posts SET permalink=? WHERE fingerprint=?').bind(permalink, fingerprint).run();
      }
    } catch { /* A permalink may be unavailable even after a successful publish. */ }
  }
  return json({ ok: true, published: true, permalink });
}

async function publish(request, env) {
  const input = await request.json().catch(() => null);
  const product = await instagramProduct(env, Number(input?.productId));
  if (!product) throw new InstagramError('Choose a published storefront product.', 404);
  const caption = typeof input?.caption === 'string' ? input.caption.trim() : null;
  if (caption === null || [...caption].length > 2200) throw new InstagramError('Use a caption of up to 2,200 characters.');
  const requestedKeys = Array.isArray(input?.photoKeys) ? input.photoKeys : [input?.photoKey];
  const photoKeys = [...new Set(requestedKeys.filter(key => typeof key === 'string'))];
  const storedPhotoKey = photoKeys.length === 1 ? photoKeys[0] : JSON.stringify(photoKeys);

  const db = env.LUME_DB;
  // Older posts use the login-specific account ID in their fingerprint.
  const previous = await db.prepare(`SELECT fingerprint, state, permalink FROM instagram_posts
    WHERE product_id=? AND photo_key=? AND caption=? ORDER BY (state='published') DESC, updated_at DESC LIMIT 1`)
    .bind(product.id, storedPhotoKey, caption).first();
  const studio = await studioGallery(env, product);
  const legacy = previous && ['creating', 'ready', 'publishing', 'published'].includes(previous.state);
  const allowed = legacy ? [...studio.photos, ...product.photos] : studio.photos;
  const photos = photoKeys.map(key => allowed.find(photo => photo.key === key));
  if ((!legacy && (photoKeys.length < 4 || photoKeys.length > 5)) || !photoKeys.length || photoKeys.length > 20 || photos.some(photo => !photo))
    throw new InstagramError('Choose 4 or 5 finished Maison Marnier mockups. Supplier photos cannot be used for a new post.', 409);
  const fingerprint = previous?.fingerprint || await digest(JSON.stringify([instagramHandle, product.id, photoKeys, caption]));
  const read = () => db.prepare('SELECT * FROM instagram_posts WHERE fingerprint=?').bind(fingerprint).first();
  if (previous?.state === 'published') return json({ ok: true, published: true, permalink: previous.permalink });
  const account = await getInstagramAccount(env);
  if (await verifyInstagramIdentity(account) !== account.id)
    throw new InstagramError('Reconnect the store’s Instagram account in Settings.', 409);

  // A lease may recreate an orphaned, unpublished container. Once its ID has
  // been saved, all retries operate on that same one-use Meta container.
  const lease = crypto.randomUUID();
  const claim = await db.prepare(`INSERT INTO instagram_posts
    (fingerprint,product_id,photo_key,caption,state,lease,login_method) VALUES (?,?,?,?,'creating',?,?)
    ON CONFLICT(fingerprint) DO UPDATE SET state='creating',lease=excluded.lease,login_method=excluded.login_method,
      container_id=NULL,updated_at=unixepoch()
    WHERE instagram_posts.state='failed' OR (instagram_posts.state='creating'
      AND instagram_posts.login_method=excluded.login_method AND instagram_posts.updated_at<unixepoch()-90)`)
    .bind(fingerprint, product.id, storedPhotoKey, caption, lease, account.loginMethod).run();
  if (claim.meta.changes) {
    try {
      let state = containerState((await read())?.container_id);
      if (photoKeys.length === 1) {
        if (!state.parent) {
          const container = await instagramRequest(account.id + '/media', account,
            { image_url: photos[0].url, caption, alt_text: product.name.slice(0, 1000) });
          if (!container.id) throw new InstagramError('Instagram did not return a photo container. Try again.', 502);
          state.parent = String(container.id);
        }
      } else {
        for (let index = state.children.length; index < photos.length; index += 1) {
          const child = await instagramRequest(account.id + '/media', account,
            { image_url: photos[index].url, is_carousel_item: 'true' });
          if (!child.id) throw new InstagramError('Instagram did not return a carousel item. Try again.', 502);
          state.children.push(String(child.id));
          await db.prepare('UPDATE instagram_posts SET container_id=?, updated_at=unixepoch() WHERE fingerprint=? AND lease=?')
            .bind(savedContainer(state), fingerprint, lease).run();
        }
        if (!state.parent) {
          const carousel = await instagramRequest(account.id + '/media', account,
            { media_type: 'CAROUSEL', children: state.children.join(','), caption });
          if (!carousel.id) throw new InstagramError('Instagram did not return a carousel container. Try again.', 502);
          state.parent = String(carousel.id);
        }
      }
      await db.prepare("UPDATE instagram_posts SET state='ready', container_id=?, updated_at=unixepoch() WHERE fingerprint=? AND lease=?")
        .bind(savedContainer(state), fingerprint, lease).run();
    } catch (error) {
      await db.prepare("UPDATE instagram_posts SET state='failed', updated_at=unixepoch() WHERE fingerprint=? AND lease=? AND state='creating'")
        .bind(fingerprint, lease).run();
      throw error;
    }
  }
  const row = await read();
  if (!row) throw new InstagramError('Reopen the product to check its Instagram post.', 503);
  if (row.state === 'published') return json({ ok: true, published: true, permalink: row.permalink });
  if (row.state === 'failed') throw new InstagramError('Instagram could not prepare this post. Review the photo and try again.', 422);
  if (row.login_method !== account.loginMethod)
    throw new InstagramError('This post is pending with the previous Meta login. Reconnect with that login to check its status.', 409);
  const container = containerState(row.container_id);
  if (!container.parent) return pending();

  const status = await instagramRequest(container.parent + '?fields=status_code', account);
  if (status.status_code === 'PUBLISHED') return markPublished(db, fingerprint, account, row.media_id);
  if (['ERROR', 'EXPIRED'].includes(status.status_code)) {
    await db.prepare("UPDATE instagram_posts SET state='failed', updated_at=unixepoch() WHERE fingerprint=? AND container_id=? AND state!='published'")
      .bind(fingerprint, row.container_id).run();
    throw new InstagramError('Instagram could not process this photo. Check the preview or choose another photo.', 422);
  }
  if (status.status_code !== 'FINISHED') return pending();

  const send = await db.prepare(`UPDATE instagram_posts SET state='publishing',updated_at=unixepoch()
    WHERE fingerprint=? AND container_id=? AND (state='ready' OR (state='publishing' AND updated_at<unixepoch()-90))`)
    .bind(fingerprint, row.container_id).run();
  if (!send.meta.changes) return pending();
  const published = await instagramRequest(account.id + '/media_publish', account, { creation_id: container.parent });
  if (!published.id) return pending();
  return markPublished(db, fingerprint, account, String(published.id));
}

export async function instagramAdminRoute(request, env, url, styleImage) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  try {
    const path = url.pathname.slice('/api/lume/instagram/'.length);
    if (path === 'account') return await instagramAccountRoute(request, env);
    if (path === 'studio-connection') return await studioConnection(request, env);
    if (path === 'mockups' && request.method === 'POST') return await generateStudioPhoto(request, env, styleImage);
    if (path === 'product' && request.method === 'GET') return await composer(env, Number(url.searchParams.get('id')));
    if (path === 'publish' && request.method === 'POST') return await publish(request, env);
    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    if (error instanceof InstagramError) return json({ ok: false, error: error.message, status: error.status }, error.status);
    return json({ ok: false, error: 'Could not complete the Instagram request. Reopen the composer to check its status.' }, 500);
  }
}
