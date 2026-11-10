import { json } from '../lib/json.js';

const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;

function b64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hashPassword(password, saltBytes) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return b64(bits);
}

export async function createPasswordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);
  return { hash, salt: b64(salt) };
}

export async function verifyPassword(password, hash, salt) {
  const computed = await hashPassword(password, fromB64(salt));
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sessionCookieHeader(sessionId, { clear = false, secure = true } = {}) {
  const securePart = secure ? '; Secure' : '';
  if (clear) {
    return `mm_session=; Path=/; HttpOnly${securePart}; SameSite=Lax; Max-Age=0`;
  }
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `mm_session=${sessionId}; Path=/; HttpOnly${securePart}; SameSite=Lax; Max-Age=${maxAge}`;
}

function cookieSecureFromRequest(request) {
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true;
  }
}

export function readSessionId(request) {
  const raw = request.headers.get('Cookie') || '';
  const match = raw.match(/(?:^|;\s*)mm_session=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : '';
}

export async function getCustomerFromRequest(request, env) {
  const sid = readSessionId(request);
  if (!sid) return null;
  const row = await env.LUME_DB.prepare(
    `SELECT c.id, c.email, c.name, s.id AS session_id, s.expires_at
     FROM customer_sessions s
     JOIN customers c ON c.id = s.customer_id
     WHERE s.id = ? LIMIT 1`,
  )
    .bind(sid)
    .first();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.LUME_DB.prepare(`DELETE FROM customer_sessions WHERE id=?`).bind(sid).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name || '', sessionId: row.session_id };
}

async function createSession(env, customerId) {
  const id = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await env.LUME_DB.prepare(
    `INSERT INTO customer_sessions (id, customer_id, expires_at) VALUES (?,?,?)`,
  )
    .bind(id, customerId, expires)
    .run();
  return id;
}

export async function registerCustomer(request, env) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const name = String(body.name || '').trim().slice(0, 120);
    const password = String(body.password || '');
    if (!validEmail(email)) return json({ ok: false, error: 'Introduce un correo válido.' }, 400);
    if (password.length < 8) return json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
    if (password.length > 128) return json({ ok: false, error: 'Contraseña demasiado larga.' }, 400);

    const existing = await env.LUME_DB.prepare(`SELECT id FROM customers WHERE email=? LIMIT 1`).bind(email).first();
    if (existing) return json({ ok: false, error: 'Ya existe una cuenta con este correo.' }, 409);

    const { hash, salt } = await createPasswordHash(password);
    const ins = await env.LUME_DB.prepare(
      `INSERT INTO customers (email, password_hash, password_salt, name, updated_at)
       VALUES (?,?,?,?,CURRENT_TIMESTAMP)`,
    )
      .bind(email, hash, salt, name)
      .run();
    const customerId = ins.meta.last_row_id;
    const sessionId = await createSession(env, customerId);

    // Attach any guest orders that used this email
    await env.LUME_DB.prepare(
      `UPDATE orders SET customer_id=? WHERE lower(email)=? AND (customer_id IS NULL OR customer_id=0)`,
    )
      .bind(customerId, email)
      .run();

    return json(
      { ok: true, customer: { id: customerId, email, name } },
      201,
      { 'Set-Cookie': sessionCookieHeader(sessionId, { secure: cookieSecureFromRequest(request) }) },
    );
  } catch (e) {
    return json({ ok: false, error: e.message || 'No se pudo crear la cuenta.' }, 500);
  }
}

export async function loginCustomer(request, env) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!validEmail(email) || !password) {
      return json({ ok: false, error: 'Correo o contraseña incorrectos.' }, 401);
    }
    const row = await env.LUME_DB.prepare(
      `SELECT id, email, name, password_hash, password_salt FROM customers WHERE email=? LIMIT 1`,
    )
      .bind(email)
      .first();
    if (!row || !(await verifyPassword(password, row.password_hash, row.password_salt))) {
      return json({ ok: false, error: 'Correo o contraseña incorrectos.' }, 401);
    }
    const sessionId = await createSession(env, row.id);
    await env.LUME_DB.prepare(
      `UPDATE orders SET customer_id=? WHERE lower(email)=? AND (customer_id IS NULL OR customer_id=0)`,
    )
      .bind(row.id, email)
      .run();
    return json(
      { ok: true, customer: { id: row.id, email: row.email, name: row.name || '' } },
      200,
      { 'Set-Cookie': sessionCookieHeader(sessionId, { secure: cookieSecureFromRequest(request) }) },
    );
  } catch (e) {
    return json({ ok: false, error: e.message || 'No se pudo iniciar sesión.' }, 500);
  }
}

export async function logoutCustomer(request, env) {
  const sid = readSessionId(request);
  if (sid) {
    try {
      await env.LUME_DB.prepare(`DELETE FROM customer_sessions WHERE id=?`).bind(sid).run();
    } catch {
      /* ignore */
    }
  }
  return json(
    { ok: true },
    200,
    { 'Set-Cookie': sessionCookieHeader('', { clear: true, secure: cookieSecureFromRequest(request) }) },
  );
}

export async function meCustomer(request, env) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, customer: null }, 401);
  return json({ ok: true, customer: { id: customer.id, email: customer.email, name: customer.name } });
}

export async function listCustomerOrders(request, env) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, error: 'Inicia sesión para ver tus pedidos.' }, 401);
  const r = await env.LUME_DB.prepare(
    `SELECT id, order_number, status, total_eur, currency, created_at, updated_at, cj_status
     FROM orders
     WHERE customer_id=? OR lower(email)=?
     ORDER BY id DESC LIMIT 50`,
  )
    .bind(customer.id, customer.email)
    .all();
  return json({ ok: true, orders: r.results || [] });
}

export async function getCustomerOrder(request, env, orderNumber) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, error: 'Inicia sesión.' }, 401);
  const order = await env.LUME_DB.prepare(
    `SELECT * FROM orders WHERE order_number=? AND (customer_id=? OR lower(email)=?) LIMIT 1`,
  )
    .bind(orderNumber, customer.id, customer.email)
    .first();
  if (!order) return json({ ok: false, error: 'Pedido no encontrado.' }, 404);
  const items = await env.LUME_DB.prepare(`SELECT * FROM order_items WHERE order_id=?`).bind(order.id).all();
  return json({ ok: true, order, items: items.results || [] });
}

export async function listWishlist(request, env) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, error: 'Inicia sesión.' }, 401);
  const r = await env.LUME_DB.prepare(
    `SELECT p.id, p.slug, p.name, p.image_url, p.image_urls, p.retail_price_eur, p.compare_at_price_eur, p.category, p.stock, p.status
     FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.customer_id=? AND p.status='live'
     ORDER BY w.created_at DESC LIMIT 100`,
  )
    .bind(customer.id)
    .all();
  return json({ ok: true, items: r.results || [] });
}

export async function addWishlist(request, env) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, error: 'Inicia sesión para guardar favoritos.' }, 401);
  const body = await request.json().catch(() => ({}));
  const productId = Number(body.productId || body.id);
  if (!productId) return json({ ok: false, error: 'Producto no válido.' }, 400);
  const p = await env.LUME_DB.prepare(`SELECT id FROM products WHERE id=? AND status='live' LIMIT 1`)
    .bind(productId)
    .first();
  if (!p) return json({ ok: false, error: 'Producto no disponible.' }, 404);
  await env.LUME_DB.prepare(
    `INSERT OR IGNORE INTO wishlists (customer_id, product_id) VALUES (?,?)`,
  )
    .bind(customer.id, productId)
    .run();
  return json({ ok: true });
}

export async function removeWishlist(request, env) {
  const customer = await getCustomerFromRequest(request, env);
  if (!customer) return json({ ok: false, error: 'Inicia sesión.' }, 401);
  const body = await request.json().catch(() => ({}));
  const productId = Number(body.productId || body.id);
  if (!productId) return json({ ok: false, error: 'Producto no válido.' }, 400);
  await env.LUME_DB.prepare(`DELETE FROM wishlists WHERE customer_id=? AND product_id=?`)
    .bind(customer.id, productId)
    .run();
  return json({ ok: true });
}

export async function getWishlistProductIds(env, customerId) {
  const r = await env.LUME_DB.prepare(`SELECT product_id FROM wishlists WHERE customer_id=?`)
    .bind(customerId)
    .all();
  return (r.results || []).map((row) => row.product_id);
}

export async function listWishlistProducts(env, customerId) {
  const r = await env.LUME_DB.prepare(
    `SELECT p.id, p.slug, p.name, p.image_url, p.image_urls, p.retail_price_eur, p.compare_at_price_eur, p.category, p.stock, p.status
     FROM wishlists w
     JOIN products p ON p.id = w.product_id
     WHERE w.customer_id=? AND p.status='live'
     ORDER BY w.created_at DESC LIMIT 100`,
  )
    .bind(customerId)
    .all();
  return r.results || [];
}

export async function listOrdersForCustomer(env, customer) {
  const r = await env.LUME_DB.prepare(
    `SELECT id, order_number, status, total_eur, currency, created_at, updated_at, cj_status, shipping_country
     FROM orders
     WHERE customer_id=? OR lower(email)=?
     ORDER BY id DESC LIMIT 50`,
  )
    .bind(customer.id, customer.email)
    .all();
  return r.results || [];
}
