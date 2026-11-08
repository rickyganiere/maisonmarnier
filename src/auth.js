import { json } from './lib/json.js';

async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a ?? ''));
  const bb = enc.encode(String(b ?? ''));
  if (aa.byteLength !== bb.byteLength) {
    // Still compare to keep timing flatter when lengths differ.
    const pad = new Uint8Array(aa.byteLength);
    crypto.getRandomValues(pad);
    await crypto.subtle.digest('SHA-256', pad);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aa.byteLength; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

/** Admin gate: Authorization: Bearer <LUME_ADMIN_TOKEN> */
export async function isAdmin(request, env) {
  if (!env.LUME_ADMIN_TOKEN) return false;
  const h = request.headers.get('authorization') || '';
  if (!h.toLowerCase().startsWith('bearer ')) return false;
  const token = h.slice(7).trim();
  return timingSafeEqual(token, env.LUME_ADMIN_TOKEN);
}

/** Import automation gate: x-lume-import-code header */
export async function isImportCode(request, env) {
  if (!env.LUME_IMPORT_CODE) return false;
  const c = request.headers.get('x-lume-import-code') || '';
  return timingSafeEqual(c, env.LUME_IMPORT_CODE);
}

export async function requireAdmin(request, env) {
  if (await isAdmin(request, env)) return null;
  return json({ ok: false, error: 'Unauthorized' }, 401);
}

/** Import allowed with admin token OR import code. */
export async function requireImportAuth(request, env) {
  if ((await isAdmin(request, env)) || (await isImportCode(request, env))) return null;
  return json({ ok: false, error: 'Unauthorized' }, 401);
}
