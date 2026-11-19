import { requireAdmin } from './auth.js';
import { json } from './lib/json.js';
import {
  connectionStatus, getInstagramAccount, instagramAccountRoute, InstagramError,
  instagramRequest, verifyInstagramIdentity,
} from './instagram-account.js';
import { digest, instagramProduct } from './instagram-photos.js';

const pendingStates = "('creating','ready','publishing')";
const pending = () => json({ ok: true, pending: true, retryAfter: 60 }, 202);

function postForAdmin(row) {
  if (!row) return null;
  return {
    photoKey: row.photo_key, caption: row.caption, state: row.state,
    permalink: row.permalink || null, updatedAt: row.updated_at,
  };
}

async function composer(env, id) {
  const product = await instagramProduct(env, id);
  if (!product) throw new InstagramError('This product is no longer available on the storefront.', 404);
  const [account, lastPost] = await Promise.all([
    connectionStatus(env),
    env.LUME_DB.prepare(`SELECT * FROM instagram_posts WHERE product_id=?
      ORDER BY (state IN ${pendingStates}) DESC, updated_at DESC, rowid DESC LIMIT 1`).bind(id).first(),
  ]);
  return json({
    ok: true, ...account, name: product.name, caption: product.caption,
    photos: product.photos.map(({ key, url }) => ({ key, url })), lastPost: postForAdmin(lastPost),
  });
}

async function markPublished(db, fingerprint, account, mediaId) {
  // Persist Meta's acknowledgement before making the optional permalink request.
  await db.prepare("UPDATE instagram_posts SET state='published', media_id=COALESCE(?, media_id), updated_at=unixepoch() WHERE fingerprint=?")
    .bind(mediaId || null, fingerprint).run();
  let permalink = null;
  if (mediaId) {
    try {
      const media = await instagramRequest(mediaId + '?fields=permalink', account.token);
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
  const photo = product.photos.find(p => p.key === input.photoKey);
  if (!photo) throw new InstagramError('The gallery changed. Reopen the product and choose a current photo.', 409);

  const db = env.LUME_DB;
  const account = await getInstagramAccount(env);
  const fingerprint = await digest(JSON.stringify([account.id, product.id, photo.key, caption]));
  const read = () => db.prepare('SELECT * FROM instagram_posts WHERE fingerprint=?').bind(fingerprint).first();
  let row = await read();
  if (row?.state === 'published') return json({ ok: true, published: true, permalink: row.permalink });
  if (await verifyInstagramIdentity(account.token) !== account.id)
    throw new InstagramError('Reconnect the store’s Instagram account in Settings.', 409);

  // A lease may recreate an orphaned, unpublished container. Once its ID has
  // been saved, all retries operate on that same one-use Meta container.
  const lease = crypto.randomUUID();
  const claim = await db.prepare(`INSERT INTO instagram_posts
    (fingerprint,product_id,photo_key,caption,state,lease) VALUES (?,?,?,?,'creating',?)
    ON CONFLICT(fingerprint) DO UPDATE SET state='creating',lease=excluded.lease,container_id=NULL,updated_at=unixepoch()
    WHERE instagram_posts.state='failed' OR (instagram_posts.state='creating' AND instagram_posts.updated_at<unixepoch()-90)`)
    .bind(fingerprint, product.id, photo.key, caption, lease).run();
  if (claim.meta.changes) {
    try {
      const container = await instagramRequest(account.id + '/media', account.token,
        { image_url: photo.url, caption, alt_text: product.name.slice(0, 1000) });
      if (!container.id) throw new InstagramError('Instagram did not return a photo container. Try again.', 502);
      await db.prepare("UPDATE instagram_posts SET state='ready', container_id=?, updated_at=unixepoch() WHERE fingerprint=? AND lease=?")
        .bind(String(container.id), fingerprint, lease).run();
    } catch (error) {
      await db.prepare("UPDATE instagram_posts SET state='failed', updated_at=unixepoch() WHERE fingerprint=? AND lease=? AND state='creating'")
        .bind(fingerprint, lease).run();
      throw error;
    }
  }
  row = await read();
  if (!row) throw new InstagramError('Reopen the product to check its Instagram post.', 503);
  if (row.state === 'published') return json({ ok: true, published: true, permalink: row.permalink });
  if (row.state === 'failed') throw new InstagramError('Instagram could not prepare this post. Review the photo and try again.', 422);
  if (!row.container_id) return pending();

  const status = await instagramRequest(row.container_id + '?fields=status_code', account.token);
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
  const published = await instagramRequest(account.id + '/media_publish', account.token, { creation_id: row.container_id });
  if (!published.id) return pending();
  return markPublished(db, fingerprint, account, String(published.id));
}

export async function instagramAdminRoute(request, env, url) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  try {
    const path = url.pathname.slice('/api/lume/instagram/'.length);
    if (path === 'account') return await instagramAccountRoute(request, env);
    if (path === 'product' && request.method === 'GET') return await composer(env, Number(url.searchParams.get('id')));
    if (path === 'publish' && request.method === 'POST') return await publish(request, env);
    return json({ ok: false, error: 'Method not allowed' }, 405);
  } catch (error) {
    if (error instanceof InstagramError) return json({ ok: false, error: error.message, status: error.status }, error.status);
    return json({ ok: false, error: 'Could not complete the Instagram request. Reopen the composer to check its status.' }, 500);
  }
}
