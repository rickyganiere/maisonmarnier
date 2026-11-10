import { json } from '../lib/json.js';

export function makeOrderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `MM-${t}-${r}`;
}

export async function createPendingOrder(env, { orderNumber, items, subtotal, shipping, total, customerId = null, email = null }) {
  const ins = await env.LUME_DB.prepare(
    `INSERT INTO orders (order_number,status,currency,subtotal_eur,shipping_eur,total_eur,customer_id,email,updated_at)
     VALUES (?,'pending_payment','eur',?,?,?,?,?,CURRENT_TIMESTAMP)`,
  )
    .bind(orderNumber, subtotal, shipping, total, customerId || null, email || null)
    .run();
  const orderId = ins.meta.last_row_id;
  const stmts = items.map((it) =>
    env.LUME_DB.prepare(
      `INSERT INTO order_items
       (order_id,product_id,lume_sku,name,image_url,slug,supplier_product_id,supplier_sku,cj_vid,unit_price_eur,quantity,supplier_cost_usd)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      orderId,
      it.product_id,
      it.lume_sku || '',
      it.name,
      it.image_url || '',
      it.slug || '',
      it.supplier_product_id || '',
      it.supplier_sku || '',
      it.cj_vid || '',
      it.unit_price_eur,
      it.quantity,
      it.supplier_cost_usd || 0,
    ),
  );
  if (stmts.length) await env.LUME_DB.batch(stmts);
  return orderId;
}

export async function attachStripeSession(env, orderNumber, sessionId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET stripe_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE order_number=?`,
  )
    .bind(sessionId, orderNumber)
    .run();
}

export async function getOrderByNumber(env, orderNumber) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE order_number=?`).bind(orderNumber).first();
}

export async function getOrderByStripeSession(env, sessionId) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE stripe_session_id=?`).bind(sessionId).first();
}

export async function getOrderItems(env, orderId) {
  const r = await env.LUME_DB.prepare(`SELECT * FROM order_items WHERE order_id=?`).bind(orderId).all();
  return r.results || [];
}

export async function markOrderPaid(env, orderId, { email, customerName, shipping, paymentIntent, customerId = null }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET
      status='paid',
      email=?,
      customer_name=?,
      shipping_phone=?,
      shipping_address=?,
      shipping_address2=?,
      shipping_city=?,
      shipping_province=?,
      shipping_zip=?,
      shipping_country=?,
      shipping_country_code=?,
      stripe_payment_intent=?,
      customer_id=COALESCE(?, customer_id),
      updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND status IN ('pending_payment','paid')`,
  )
    .bind(
      email || '',
      customerName || '',
      shipping.phone || '',
      shipping.address || '',
      shipping.address2 || '',
      shipping.city || '',
      shipping.province || '',
      shipping.zip || '',
      shipping.country || '',
      shipping.countryCode || '',
      paymentIntent || '',
      customerId || null,
      orderId,
    )
    .run();

  // Link guest order to an existing account with the same email when possible.
  if (email) {
    await env.LUME_DB.prepare(
      `UPDATE orders
       SET customer_id = (
         SELECT id FROM customers WHERE lower(email)=lower(?) LIMIT 1
       )
       WHERE id=? AND (customer_id IS NULL OR customer_id=0)`,
    )
      .bind(email, orderId)
      .run();
  }
}

export async function markOrderFulfilling(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilling',updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  )
    .bind(orderId)
    .run();
}

export async function markOrderFulfilled(env, orderId, { cjOrderId, cjStatus }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilled',cj_order_id=?,cj_status=?,cj_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  )
    .bind(cjOrderId || '', cjStatus || 'created', orderId)
    .run();
}

export async function markOrderFulfillFailed(env, orderId, error) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfill_failed',cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  )
    .bind(String(error || '').slice(0, 2000), orderId)
    .run();
}

export async function updateCjMeta(env, orderId, { cjOrderId, cjStatus, cjError }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET cj_order_id=COALESCE(?,cj_order_id),cj_status=COALESCE(?,cj_status),cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  )
    .bind(cjOrderId || null, cjStatus || null, cjError == null ? null : String(cjError).slice(0, 2000), orderId)
    .run();
}

export async function markOrderExpired(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending_payment'`,
  )
    .bind(orderId)
    .run();
}

export async function markOrderRefunded(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?`,
  )
    .bind(orderId)
    .run();
}

export async function updateItemVid(env, itemId, vid) {
  await env.LUME_DB.prepare(`UPDATE order_items SET cj_vid=? WHERE id=?`).bind(vid, itemId).run();
}

export async function listOrdersAdmin(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT id,order_number,status,email,customer_name,total_eur,currency,cj_order_id,cj_status,cj_error,created_at,updated_at
       FROM orders ORDER BY id DESC LIMIT 100`,
    ).all();
    return json({ ok: true, orders: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Could not load orders' }, 500);
  }
}

export async function getOrderAdmin(env, id) {
  const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
  if (!order) return json({ ok: false, error: 'Not found' }, 404);
  const items = await getOrderItems(env, id);
  return json({ ok: true, order, items });
}
