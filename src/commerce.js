import { json } from './lib/json.js';
import { createCJOrder, resolveCJVariantId } from './cj.js';
import {
  attachStripeSession,
  createPendingOrder,
  getOrderAdmin,
  getOrderByNumber,
  getOrderByStripeSession,
  getOrderItems,
  listOrdersAdmin,
  makeOrderNumber,
  markOrderExpired,
  markOrderFulfillFailed,
  markOrderFulfilled,
  markOrderFulfilling,
  markOrderPaid,
  markOrderRefunded,
  updateCjMeta,
  updateItemVid,
} from './db/orders.js';
import {
  createCheckoutSession,
  retrieveCheckoutSession,
  stripeConfigured,
  verifyStripeWebhook,
} from './stripe.js';

const FREE_SHIPPING_EUR = 100;
const FLAT_SHIPPING_EUR = 6.9;

function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_EUR ? 0 : FLAT_SHIPPING_EUR;
}

export async function checkout(request, env) {
  try {
    if (!stripeConfigured(env)) {
      return json({ ok: false, error: 'Checkout is not configured yet (missing STRIPE_SECRET_KEY).' }, 503);
    }
    const body = await request.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) return json({ ok: false, error: 'Cart is empty' }, 400);

    const normalized = [];
    for (const it of rawItems.slice(0, 30)) {
      const productId = Number(it.productId || it.id);
      const quantity = Math.max(1, Math.min(20, Number(it.quantity || 1) || 1));
      if (!productId) return json({ ok: false, error: 'Invalid product in cart' }, 400);
      normalized.push({ productId, quantity });
    }

    const lines = [];
    for (const it of normalized) {
      const p = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,stock,status,supplier_product_id,supplier_sku,supplier_cost_usd
         FROM products WHERE id=? LIMIT 1`,
      )
        .bind(it.productId)
        .first();
      if (!p || p.status !== 'live') {
        return json({ ok: false, error: 'A product in your cart is no longer available' }, 400);
      }
      if (!(Number(p.retail_price_eur) > 0)) {
        return json({ ok: false, error: 'A product has an invalid price' }, 400);
      }
      if (Number(p.stock) < it.quantity) {
        return json({ ok: false, error: `Insufficient stock for ${p.name}` }, 400);
      }
      lines.push({
        product_id: p.id,
        lume_sku: p.lume_sku,
        name: p.name,
        image_url: p.image_url,
        slug: p.slug,
        supplier_product_id: p.supplier_product_id,
        supplier_sku: p.supplier_sku,
        cj_vid: '',
        unit_price_eur: Number(p.retail_price_eur),
        quantity: it.quantity,
        supplier_cost_usd: Number(p.supplier_cost_usd || 0),
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.unit_price_eur * l.quantity, 0);
    const shipping = shippingFor(subtotal);
    const total = Math.round((subtotal + shipping) * 100) / 100;
    const orderNumber = makeOrderNumber();
    await createPendingOrder(env, {
      orderNumber,
      items: lines,
      subtotal: Math.round(subtotal * 100) / 100,
      shipping,
      total,
    });

    const origin = new URL(request.url).origin;
    const stripeLines = lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitAmountCents: Math.round(l.unit_price_eur * 100),
      image: l.image_url && String(l.image_url).startsWith('http') ? l.image_url : undefined,
    }));

    const session = await createCheckoutSession(env, {
      orderNumber,
      lineItems: stripeLines,
      shippingCents: Math.round(shipping * 100),
      successUrl: origin + '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: origin + '/cart?cancelled=1',
      customerEmail: body.email || undefined,
    });

    await attachStripeSession(env, orderNumber, session.id);
    return json({ ok: true, orderNumber, url: session.url, sessionId: session.id });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Checkout failed' }, e.status || 500);
  }
}

export async function fulfillOrder(env, order) {
  if (!order) throw new Error('Missing order');
  if (order.cj_order_id) return { already: true, cjOrderId: order.cj_order_id };
  await markOrderFulfilling(env, order.id);
  const items = await getOrderItems(env, order.id);
  const products = [];
  for (const it of items) {
    let vid = it.cj_vid;
    if (!vid) {
      vid = await resolveCJVariantId(env, it.supplier_product_id, it.supplier_sku);
      await updateItemVid(env, it.id, vid);
    }
    products.push({ vid, quantity: Number(it.quantity) || 1 });
  }
  const { cjOrderId } = await createCJOrder(env, {
    orderNumber: order.order_number,
    shippingZip: order.shipping_zip,
    shippingCountry: order.shipping_country,
    shippingCountryCode: order.shipping_country_code,
    shippingProvince: order.shipping_province,
    shippingCity: order.shipping_city,
    shippingPhone: order.shipping_phone,
    shippingCustomerName: order.customer_name,
    shippingAddress: order.shipping_address,
    shippingAddress2: order.shipping_address2,
    email: order.email,
    shopAmount: order.subtotal_eur,
    products,
  });
  await markOrderFulfilled(env, order.id, { cjOrderId, cjStatus: 'created' });
  return { cjOrderId };
}

function shippingFromStripe(session) {
  const details = session.shipping_details || session.collected_information?.shipping_details || {};
  const addr = details.address || {};
  const name = details.name || session.customer_details?.name || '';
  return {
    phone: session.customer_details?.phone || details.phone || '',
    address: [addr.line1, addr.line2].filter(Boolean).join(', ') || addr.line1 || '',
    address2: addr.line2 || '',
    city: addr.city || '',
    province: addr.state || '',
    zip: addr.postal_code || '',
    country: addr.country || '',
    countryCode: addr.country || '',
    customerName: name,
    email: session.customer_details?.email || session.customer_email || '',
  };
}

export async function handleStripeWebhook(request, env, ctx) {
  const raw = await request.text();
  let event;
  try {
    event = await verifyStripeWebhook(env, raw, request.headers.get('stripe-signature'));
  } catch (e) {
    return json({ ok: false, error: e.message || 'Invalid signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    const orderNumber = session?.metadata?.order_number || session?.client_reference_id;
    let order = orderNumber ? await getOrderByNumber(env, orderNumber) : null;
    if (!order && session?.id) order = await getOrderByStripeSession(env, session.id);
    if (!order) return json({ ok: false, error: 'Order not found' }, 404);

    // Idempotent: already past payment
    if (['paid', 'fulfilling', 'fulfilled', 'fulfill_failed'].includes(order.status) && order.stripe_payment_intent) {
      if (!order.cj_order_id && order.status !== 'fulfilled') {
        const fresh = await getOrderByNumber(env, order.order_number);
        const run = async () => {
          try {
            await fulfillOrder(env, fresh);
          } catch (e) {
            await markOrderFulfillFailed(env, fresh.id, e.message || String(e));
          }
        };
        if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(run());
        else await run();
      }
      return json({ ok: true, received: true, duplicate: true });
    }

    const ship = shippingFromStripe(session);
    await markOrderPaid(env, order.id, {
      email: ship.email,
      customerName: ship.customerName,
      shipping: ship,
      paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '',
    });

    const fresh = await getOrderByNumber(env, order.order_number);
    const run = async () => {
      try {
        await fulfillOrder(env, fresh);
      } catch (e) {
        await markOrderFulfillFailed(env, fresh.id, e.message || String(e));
      }
    };
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(run());
    else await run();
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data?.object;
    const order =
      (await getOrderByStripeSession(env, session?.id)) ||
      (session?.metadata?.order_number ? await getOrderByNumber(env, session.metadata.order_number) : null);
    if (order) await markOrderExpired(env, order.id);
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data?.object;
    const pi = typeof charge?.payment_intent === 'string' ? charge.payment_intent : charge?.payment_intent?.id;
    if (pi) {
      const row = await env.LUME_DB.prepare(
        `SELECT id FROM orders WHERE stripe_payment_intent=? LIMIT 1`,
      )
        .bind(pi)
        .first();
      if (row) await markOrderRefunded(env, row.id);
    }
  }

  return json({ ok: true, received: true });
}

export async function checkoutSuccessPage(url, env) {
  const sessionId = url.searchParams.get('session_id') || '';
  let orderNumber = '';
  let status = 'paid';
  if (sessionId && stripeConfigured(env)) {
    try {
      const session = await retrieveCheckoutSession(env, sessionId);
      orderNumber = session.metadata?.order_number || session.client_reference_id || '';
      const order = await getOrderByStripeSession(env, sessionId);
      if (order) {
        orderNumber = order.order_number;
        status = order.status;
      }
    } catch {
      /* ignore */
    }
  }
  return { orderNumber, status, sessionId };
}

export async function retryFulfill(request, env) {
  let id = 0;
  try {
    const body = await request.json();
    id = Number(body.id);
    if (!id) return json({ ok: false, error: 'Missing order id' }, 400);
    const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
    if (!order) return json({ ok: false, error: 'Not found' }, 404);
    if (order.cj_order_id) return json({ ok: true, already: true, cjOrderId: order.cj_order_id });
    if (!['paid', 'fulfill_failed', 'fulfilling'].includes(order.status)) {
      return json({ ok: false, error: 'Order is not ready to fulfill' }, 400);
    }
    const result = await fulfillOrder(env, order);
    return json({ ok: true, ...result });
  } catch (e) {
    if (id) await markOrderFulfillFailed(env, id, e.message || String(e));
    return json({ ok: false, error: e.message || 'Fulfill failed' }, 502);
  }
}

export async function refreshOrderCj(request, env) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
    if (!order) return json({ ok: false, error: 'Not found' }, 404);
    if (!order.cj_order_id) return json({ ok: false, error: 'No CJ order id yet' }, 400);
    const { getCJOrderDetail } = await import('./cj.js');
    const detail = await getCJOrderDetail(env, order.cj_order_id);
    const cjStatus = detail?.orderStatus || detail?.status || detail?.state || 'unknown';
    await updateCjMeta(env, order.id, { cjStatus, cjError: null });
    return json({ ok: true, cjStatus, detail });
  } catch (e) {
    return json({ ok: false, error: e.message || 'Refresh failed' }, 502);
  }
}

export { listOrdersAdmin, getOrderAdmin };
