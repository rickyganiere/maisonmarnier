import { json } from './lib/json.js';

export const instagramHandle = 'maison.marnier';
const graph = {
  instagram: 'https://graph.instagram.com/v26.0/',
  unified: 'https://graph.facebook.com/v27.0/',
};
const tokenHelp = 'Open the MaisonMarnier app’s Instagram use case and select Generate token beside @maison.marnier.';
const pageTokenHelp = 'Meta could not verify Instagram access. Facebook Page-read permissions cover Pages only. ' + tokenHelp;
const month = 30 * 86400;

export class InstagramError extends Error {
  constructor(message, status = 400, reason = '') {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

export async function instagramRequest(path, account, form) {
  let response;
  try {
    response = await fetch(new URL(path, graph[account.loginMethod]), {
      method: form ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + account.token },
      body: form ? new URLSearchParams(form) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new InstagramError('Instagram did not respond. Try again in a minute.', 503);
  }
  let data;
  try {
    data = JSON.parse(await response.text(), (key, value, context) => {
      // Graph IDs can be JSON integers larger than JavaScript can represent.
      if ((key === 'id' || key === 'user_id') && typeof value === 'number' && !Number.isSafeInteger(value))
        return context?.source ?? value;
      return value;
    });
  } catch { /* Handle unsuccessful responses even when Meta omits the body. */ }
  if (!data || typeof data !== 'object') {
    if (response.ok) throw new InstagramError('Instagram returned an incomplete response. Try again.', 502);
    data = {};
  }
  if (!response.ok || data.error) {
    const code = Number(data.error?.code);
    if (code === 190 && Number(data.error?.error_subcode) === 463)
      throw new InstagramError('Meta reports that this token has expired. ' + tokenHelp, 403, 'expired');
    if ([4, 17, 32, 613].includes(code) || response.status === 429)
      throw new InstagramError('Instagram has reached a rate limit. Try again later.', 429);
    if (code === 190 || code === 102 || response.status === 401)
      throw new InstagramError('Meta could not verify this token. ' + tokenHelp, 403, 'token');
    if (code === 10 || code === 200 || response.status === 403)
      throw new InstagramError('Grant Instagram publishing access to @maison.marnier and generate a new token in the app’s Instagram use case.', 403, 'permission');
    throw new InstagramError('Instagram could not complete this request. Check the account permissions and try again.', 502,
      [100, 803].includes(code) ? 'unsupported' : '');
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
  const account = { id: row.user_id, loginMethod: row.login_method, token };
  if (account.loginMethod === 'instagram' && Date.now() / 1000 - row.refreshed_at > month) {
    // A failed renewal must not replace a still-valid token or a newer connection.
    try {
      const url = new URL('https://graph.instagram.com/refresh_access_token');
      url.searchParams.set('grant_type', 'ig_refresh_token');
      url.searchParams.set('access_token', token);
      const fresh = await instagramRequest(url, account);
      if (typeof fresh.access_token === 'string' && fresh.access_token) {
        const replacement = await sealToken(env, fresh.access_token);
        const saved = await env.LUME_DB.prepare(
          'UPDATE instagram_account SET sealed_token=?, refreshed_at=unixepoch() WHERE singleton=1 AND sealed_token=?'
        ).bind(replacement, row.sealed_token).run();
        if (saved.meta.changes) account.token = fresh.access_token;
      }
    } catch { /* Verify the existing token with Meta before publishing. */ }
  }
  return account;
}

function instagramId(profile) {
  if (!profile.username)
    throw new InstagramError('Meta did not return an Instagram username for this token.', 403, 'unsupported');
  if (String(profile.username).toLowerCase() !== instagramHandle)
    throw new InstagramError('This store can publish only to @maison.marnier. Select that account in Meta.', 403);
  const id = profile.user_id ?? profile.id;
  if (!id || !/^\d+$/.test(String(id)) || (typeof id === 'number' && !Number.isSafeInteger(id)))
    throw new InstagramError('Instagram could not identify the professional account.', 502);
  return String(id);
}

export async function verifyInstagramIdentity(account) {
  // With Unified Login, /me is the business system user, not the Instagram account.
  const path = account.loginMethod === 'unified' ? account.id + '?fields=id,username' : 'me?fields=user_id,username';
  return instagramId(await instagramRequest(path, account));
}

async function assignedInstagramId(account) {
  const path = 'me/assigned_instagram_accounts?fields=id,username&limit=100';
  const seen = new Set();
  let after = '';
  do {
    let page;
    try {
      page = await instagramRequest(path + (after ? '&after=' + encodeURIComponent(after) : ''), account);
    } catch (error) {
      if (['token', 'permission', 'unsupported'].includes(error.reason))
        throw new InstagramError(pageTokenHelp, 403);
      throw error;
    }
    if (!Array.isArray(page.data)) throw new InstagramError('Meta did not return its assigned Instagram accounts. Try again.', 502);
    const profile = page.data.find(p => String(p?.username || '').toLowerCase() === instagramHandle);
    if (profile) return instagramId(profile);
    if (!page.paging?.next) break;
    after = page.paging.cursors?.after;
    if (!after || seen.has(after)) throw new InstagramError('Meta could not finish listing the assigned Instagram accounts.', 502);
    seen.add(after);
  } while (after);
  throw new InstagramError('Share @maison.marnier with the app in the Instagram use case, then generate its publishing token.', 403);
}

async function identifyConnection(token) {
  const account = { loginMethod: 'instagram', token };
  try {
    return { ...account, id: await verifyInstagramIdentity(account) };
  } catch (error) {
    // Discover the login type using Meta’s read-only endpoints. A verified
    // different handle, a timeout or a rate limit must keep its own error.
    if (!['token', 'permission', 'unsupported'].includes(error.reason)) throw error;
  }
  account.loginMethod = 'unified';
  return { ...account, id: await assignedInstagramId(account) };
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
    throw new InstagramError('Enter the publishing token generated for @maison.marnier.');
  const account = await identifyConnection(token);
  const quota = await instagramRequest(account.id + '/content_publishing_limit?fields=quota_usage', account);
  if (!Array.isArray(quota.data) || !quota.data.some(entry => Number.isInteger(entry?.quota_usage)))
    throw new InstagramError('Meta did not confirm publishing access. Check the Instagram configuration and try again.', 502);
  const sealed = await sealToken(env, token);
  await env.LUME_DB.prepare(`INSERT INTO instagram_account(singleton, user_id, sealed_token, login_method) VALUES (1, ?, ?, ?)
    ON CONFLICT(singleton) DO UPDATE SET user_id=excluded.user_id, sealed_token=excluded.sealed_token, login_method=excluded.login_method, refreshed_at=unixepoch()`)
    .bind(account.id, sealed, account.loginMethod).run();
  return json({ ok: true, connected: true, username: instagramHandle });
}
