import { json } from './lib/json.js';

export const instagramHandle = 'maison.marnier';
const graph = 'https://graph.instagram.com/v26.0/';
const month = 30 * 86400;

export class InstagramError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function instagramRequest(path, token, form) {
  let response;
  try {
    response = await fetch(new URL(path, graph), {
      method: form ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token },
      body: form ? new URLSearchParams(form) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new InstagramError('Instagram did not respond. Try again in a minute.', 503);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const code = Number(data.error?.code);
    if (code === 190 || response.status === 401)
      throw new InstagramError('Instagram access expired or was declined. Reconnect @maison.marnier in Settings.', 403);
    if (code === 10 || code === 200 || response.status === 403)
      throw new InstagramError('Enable content publishing for @maison.marnier in Meta, then reconnect in Settings.', 403);
    if ([4, 17, 32, 613].includes(code) || response.status === 429)
      throw new InstagramError('Instagram has reached a rate limit. Try again later.', 429);
    throw new InstagramError('Instagram could not complete this step. Check the photo, caption and account permissions.', 502);
  }
  return data;
}

function asBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), c => c.charCodeAt(0));
}

async function accountKey(env) {
  if (!env.INSTAGRAM_TOKEN_KEY)
    throw new InstagramError('The Instagram connection key is missing from the store configuration.', 503);
  return crypto.subtle.importKey('raw', fromBase64(env.INSTAGRAM_TOKEN_KEY), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function sealToken(env, token) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await accountKey(env), new TextEncoder().encode(token));
  return asBase64(iv) + '.' + asBase64(new Uint8Array(sealed));
}

export async function getInstagramAccount(env) {
  const row = await env.LUME_DB.prepare('SELECT * FROM instagram_account WHERE singleton=1').first();
  if (!row) throw new InstagramError('Connect @maison.marnier in Settings to publish.', 409);
  const [iv, ciphertext] = row.sealed_token.split('.');
  const key = await accountKey(env);
  let token;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
    token = new TextDecoder().decode(plain);
  } catch {
    throw new InstagramError('Reconnect @maison.marnier in Settings to renew its saved connection.', 409);
  }
  if (Date.now() / 1000 - row.refreshed_at > month) {
    // A failed renewal must not replace a still-valid token or a newer connection.
    try {
      const url = new URL('https://graph.instagram.com/refresh_access_token');
      url.searchParams.set('grant_type', 'ig_refresh_token');
      url.searchParams.set('access_token', token);
      const fresh = await instagramRequest(url, token);
      if (typeof fresh.access_token === 'string' && fresh.access_token) {
        const replacement = await sealToken(env, fresh.access_token);
        const saved = await env.LUME_DB.prepare(
          'UPDATE instagram_account SET sealed_token=?, refreshed_at=unixepoch() WHERE singleton=1 AND sealed_token=?'
        ).bind(replacement, row.sealed_token).run();
        if (saved.meta.changes) token = fresh.access_token;
      }
    } catch { /* Verify the existing token with Meta before publishing. */ }
  }
  return { id: row.user_id, token };
}

export async function verifyInstagramIdentity(token) {
  const profile = await instagramRequest('me?fields=user_id,username', token);
  if (String(profile.username || '').toLowerCase() !== instagramHandle)
    throw new InstagramError('This store can publish only to @maison.marnier. Select that account in Meta.', 403);
  const id = profile.user_id ?? profile.id;
  if (!id || !/^\d+$/.test(String(id)) || (typeof id === 'number' && !Number.isSafeInteger(id)))
    throw new InstagramError('Instagram could not identify the professional account.', 502);
  return String(id);
}

export async function connectionStatus(env) {
  const row = await env.LUME_DB.prepare('SELECT user_id FROM instagram_account WHERE singleton=1').first();
  return { connected: !!row, username: instagramHandle };
}

export async function instagramAccountRoute(request, env) {
  if (request.method === 'GET') return json({ ok: true, ...await connectionStatus(env) });
  if (request.method === 'DELETE') {
    await env.LUME_DB.prepare('DELETE FROM instagram_account WHERE singleton=1').run();
    return json({ ok: true, connected: false, username: instagramHandle });
  }
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token || token.length > 8192 || /\s/.test(token))
    throw new InstagramError('Enter the Instagram user access token generated by Meta.');
  const id = await verifyInstagramIdentity(token);
  await instagramRequest(id + '/content_publishing_limit?fields=quota_usage', token);
  const sealed = await sealToken(env, token);
  await env.LUME_DB.prepare(`INSERT INTO instagram_account(singleton, user_id, sealed_token) VALUES (1, ?, ?)
    ON CONFLICT(singleton) DO UPDATE SET user_id=excluded.user_id, sealed_token=excluded.sealed_token, refreshed_at=unixepoch()`)
    .bind(id, sealed).run();
  return json({ ok: true, connected: true, username: instagramHandle });
}
