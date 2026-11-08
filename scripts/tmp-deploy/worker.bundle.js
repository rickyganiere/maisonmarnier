var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/json.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
var init_json = __esm({
  "src/lib/json.js"() {
    __name(json, "json");
  }
});

// src/lib/merch.js
function cleanProductName(name) {
  let n = String(name || "").replace(/\s+/g, " ").trim();
  if (!n) return "";
  const dash = n.split(/\s+[–—-]\s+/);
  if (dash[0] && dash[0].length >= 16 && dash[0].length <= 72) n = dash[0];
  const parts = n.split(",");
  if (parts[0] && parts[0].length >= 16 && parts[0].length <= 72) n = parts[0].trim();
  if (n.length > 68) n = n.slice(0, 65).replace(/\s+\S*$/, "") + "\u2026";
  return n;
}
function mapMaisonCategory(name, category) {
  const t = `${name || ""} ${category || ""}`.toLowerCase();
  if (/candle|candlestick|diffuser|fragrance/.test(t)) return "Candles";
  if (/pillow|cushion|throw|textile|blanket|linen/.test(t)) return "Textiles";
  if (/lamp|light|lantern|projector|led|neon/.test(t) && !/candle/.test(t)) return "Lighting";
  if (/wall|tapestry|mirror|frame|sticker|decal|dreamcatcher|hanging|poster/.test(t)) return "Wall Decor";
  if (/christmas|santa|xmas|garland|stocking|snow|holiday|seasonal|ornament/.test(t)) return "Seasonal";
  if (/table|chair|shelf|stool|cabinet|furniture/.test(t)) return "Furniture";
  if (/vase|statue|ornament|sculpture|tray|object|decor|sign|letter|whale/.test(t)) return "Objects";
  return "Decor";
}
function suggestedRetailEur(costUSD) {
  const c = Number(costUSD) || 0;
  if (!(c > 0)) return 0;
  const raw = Math.max(c * 3, 9.95);
  return Math.max(9.95, Math.ceil(raw) - 0.05);
}
function suggestedCompareEur(retail) {
  const r = Number(retail) || 0;
  if (!(r > 0)) return null;
  return Math.round(r * 1.28 * 20) / 20;
}
var init_merch = __esm({
  "src/lib/merch.js"() {
    __name(cleanProductName, "cleanProductName");
    __name(mapMaisonCategory, "mapMaisonCategory");
    __name(suggestedRetailEur, "suggestedRetailEur");
    __name(suggestedCompareEur, "suggestedCompareEur");
  }
});

// src/cj.js
var cj_exports = {};
__export(cj_exports, {
  cjSearch: () => cjSearch,
  cjStatus: () => cjStatus,
  createCJOrder: () => createCJOrder,
  getCJOrderDetail: () => getCJOrderDetail,
  getCJToken: () => getCJToken,
  refreshProductFromCJ: () => refreshProductFromCJ,
  resolveCJVariantId: () => resolveCJVariantId
});
async function getCJToken(env) {
  if (cjAccessToken && Date.now() < cjAccessExpiry - 3e5) return cjAccessToken;
  if (!env.CJ_API_KEY) throw new Error("CJ_API_KEY is not configured");
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: env.CJ_API_KEY })
    }
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200 || !d.data || !d.data.accessToken) {
    throw new Error("CJ authentication failed: " + (d.message || r.status));
  }
  cjAccessToken = d.data.accessToken;
  cjAccessExpiry = Date.parse(d.data.accessTokenExpiryDate) || Date.now() + 12 * 60 * 60 * 1e3;
  return cjAccessToken;
}
async function cjStatus(env) {
  const configured = !!env.CJ_API_KEY;
  if (!configured) return json({ ok: true, configured: false, authenticated: false });
  try {
    await getCJToken(env);
    return json({ ok: true, configured: true, authenticated: true });
  } catch (e) {
    return json({
      ok: true,
      configured: true,
      authenticated: false,
      error: e && e.message ? e.message : "CJ auth failed"
    });
  }
}
async function cjSearch(url, env) {
  try {
    const q = (url.searchParams.get("q") || "home decor").trim().slice(0, 100);
    const size = Math.max(1, Math.min(24, parseInt(url.searchParams.get("size") || "24", 10) || 24));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const token = await getCJToken(env);
    const p = new URLSearchParams({ page: String(page), size: String(size), keyWord: q });
    p.append("features", "enable_category");
    const r = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + p.toString(),
      { headers: { "CJ-Access-Token": token, accept: "application/json" } }
    );
    const d = await r.json();
    if (!r.ok || d.code !== 200) {
      return json(
        { ok: false, error: d.message || "CJ product search failed", code: d.code || r.status },
        r.status || 502
      );
    }
    const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
    const products = groups.flatMap((g) => Array.isArray(g.productList) ? g.productList : []).slice(0, size).map((x) => ({
      id: x.id,
      name: x.nameEn,
      sku: x.sku,
      image: x.bigImage,
      costUSD: x.nowPrice || x.sellPrice,
      stock: x.warehouseInventoryNum,
      verifiedStock: x.totalVerifiedInventory,
      deliveryDays: x.deliveryCycle,
      category: x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || null,
      categoryId: x.categoryId || null,
      freeShipping: x.addMarkStatus === 1,
      supplier: x.supplierName || "CJ",
      suggestedRetailEUR: suggestedRetailEur(x.nowPrice || x.sellPrice)
    }));
    return json({
      ok: true,
      query: q,
      page,
      size,
      total: d.data && d.data.totalRecords || products.length,
      products,
      shippingCountryChecked: false,
      note: "Search is global. Shipping availability and freight to Spain are checked separately before publishing."
    });
  } catch (e) {
    return json({ ok: false, error: e && e.message ? e.message : "CJ connector error" }, 502);
  }
}
async function refreshProductFromCJ(env, supplierProductId) {
  const token = await getCJToken(env);
  const p = new URLSearchParams({
    page: "1",
    size: "20",
    productIds: String(supplierProductId)
  });
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + p.toString(),
    { headers: { "CJ-Access-Token": token, accept: "application/json" } }
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || "CJ refresh failed");
  }
  const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
  const items = groups.flatMap((g) => Array.isArray(g.productList) ? g.productList : []);
  const match = items.find((x) => String(x.id) === String(supplierProductId)) || items[0];
  if (!match) throw new Error("CJ product not found for refresh");
  return {
    costUSD: Number(match.nowPrice || match.sellPrice || 0) || 0,
    stock: Number(match.warehouseInventoryNum || match.totalVerifiedInventory || 0) || 0,
    deliveryDays: String(match.deliveryCycle || ""),
    image: match.bigImage || "",
    name: match.nameEn || "",
    sku: match.sku || ""
  };
}
async function resolveCJVariantId(env, supplierProductId, supplierSku) {
  const token = await getCJToken(env);
  const pid = String(supplierProductId || "");
  if (!pid) throw new Error("Missing supplier product id");
  const q = new URLSearchParams({ pid });
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?" + q.toString(),
    { headers: { "CJ-Access-Token": token, accept: "application/json" } }
  );
  const d = await r.json();
  if (r.ok && d.code === 200) {
    const list = Array.isArray(d.data) ? d.data : Array.isArray(d.data?.variants) ? d.data.variants : d.data ? [d.data] : [];
    if (list.length) {
      const bySku = supplierSku ? list.find((v) => String(v.variantSku || v.sku || "") === String(supplierSku)) : null;
      const pick = bySku || list[0];
      const vid = pick.vid || pick.variantId || pick.id;
      if (vid) return String(vid);
    }
  }
  return pid;
}
async function createCJOrder(env, payload) {
  const token = await getCJToken(env);
  const sandbox = env.CJ_ORDER_SANDBOX === "1" || env.CJ_ORDER_SANDBOX === "true";
  const eu = /* @__PURE__ */ new Set([
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE"
  ]);
  const dest = String(payload.shippingCountryCode || "").toUpperCase();
  let iossType = Number(env.CJ_IOSS_TYPE || 0) || 0;
  let iossNumber = String(env.CJ_IOSS_NUMBER || "").trim();
  if (!iossType && eu.has(dest)) {
    iossType = 3;
    iossNumber = "CJ-IOSS";
  } else if (iossType === 3) {
    iossNumber = iossNumber || "CJ-IOSS";
  }
  const body = {
    orderNumber: payload.orderNumber,
    shippingZip: payload.shippingZip || "",
    shippingCountry: payload.shippingCountry || payload.shippingCountryCode || "",
    shippingCountryCode: payload.shippingCountryCode || "",
    shippingProvince: payload.shippingProvince || payload.shippingCity || "",
    shippingCity: payload.shippingCity || "",
    shippingCounty: "",
    shippingPhone: payload.shippingPhone || "0000000000",
    shippingCustomerName: payload.shippingCustomerName || "Customer",
    shippingAddress: payload.shippingAddress || "",
    shippingAddress2: payload.shippingAddress2 || "",
    email: payload.email || "",
    remark: payload.remark || "Maison Marnier",
    logisticName: payload.logisticName || env.CJ_LOGISTIC_NAME || "CJPacket Ordinary",
    fromCountryCode: payload.fromCountryCode || "CN",
    shopLogisticsType: 2,
    payType: 2,
    isSandbox: sandbox ? 1 : 0,
    shopAmount: payload.shopAmount != null ? String(payload.shopAmount) : void 0,
    products: payload.products
  };
  if (iossType) {
    body.iossType = iossType;
    if (iossNumber) body.iossNumber = iossNumber;
  }
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV3",
    {
      method: "POST",
      headers: {
        "CJ-Access-Token": token,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || d.errorCode || "CJ createOrder failed");
  }
  const cjOrderId = typeof d.data === "string" || typeof d.data === "number" ? String(d.data) : d.data?.orderId || d.data?.id || JSON.stringify(d.data);
  return { cjOrderId, raw: d };
}
async function getCJOrderDetail(env, cjOrderId) {
  const token = await getCJToken(env);
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/shopping/order/getOrderDetail?orderId=" + encodeURIComponent(cjOrderId),
    { headers: { "CJ-Access-Token": token, accept: "application/json" } }
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || "CJ getOrderDetail failed");
  }
  return d.data;
}
var cjAccessToken, cjAccessExpiry;
var init_cj = __esm({
  "src/cj.js"() {
    init_json();
    init_merch();
    cjAccessToken = null;
    cjAccessExpiry = 0;
    __name(getCJToken, "getCJToken");
    __name(cjStatus, "cjStatus");
    __name(cjSearch, "cjSearch");
    __name(refreshProductFromCJ, "refreshProductFromCJ");
    __name(resolveCJVariantId, "resolveCJVariantId");
    __name(createCJOrder, "createCJOrder");
    __name(getCJOrderDetail, "getCJOrderDetail");
  }
});

// src/auth.js
init_json();
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a ?? ""));
  const bb = enc.encode(String(b ?? ""));
  if (aa.byteLength !== bb.byteLength) {
    const pad = new Uint8Array(aa.byteLength);
    crypto.getRandomValues(pad);
    await crypto.subtle.digest("SHA-256", pad);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aa.byteLength; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
async function isAdmin(request, env) {
  if (!env.LUME_ADMIN_TOKEN) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return false;
  const token = h.slice(7).trim();
  return timingSafeEqual(token, env.LUME_ADMIN_TOKEN);
}
__name(isAdmin, "isAdmin");
async function isImportCode(request, env) {
  if (!env.LUME_IMPORT_CODE) return false;
  const c = request.headers.get("x-lume-import-code") || "";
  return timingSafeEqual(c, env.LUME_IMPORT_CODE);
}
__name(isImportCode, "isImportCode");
async function requireAdmin(request, env) {
  if (await isAdmin(request, env)) return null;
  return json({ ok: false, error: "Unauthorized" }, 401);
}
__name(requireAdmin, "requireAdmin");
async function requireImportAuth(request, env) {
  if (await isAdmin(request, env) || await isImportCode(request, env)) return null;
  return json({ ok: false, error: "Unauthorized" }, 401);
}
__name(requireImportAuth, "requireImportAuth");

// src/router.js
init_cj();

// src/commerce.js
init_json();
init_cj();

// src/db/orders.js
init_json();
function makeOrderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `MM-${t}-${r}`;
}
__name(makeOrderNumber, "makeOrderNumber");
async function createPendingOrder(env, { orderNumber, items, subtotal, shipping, total }) {
  const ins = await env.LUME_DB.prepare(
    `INSERT INTO orders (order_number,status,currency,subtotal_eur,shipping_eur,total_eur,updated_at)
     VALUES (?,'pending_payment','eur',?,?,?,CURRENT_TIMESTAMP)`
  ).bind(orderNumber, subtotal, shipping, total).run();
  const orderId = ins.meta.last_row_id;
  const stmts = items.map(
    (it) => env.LUME_DB.prepare(
      `INSERT INTO order_items
       (order_id,product_id,lume_sku,name,image_url,slug,supplier_product_id,supplier_sku,cj_vid,unit_price_eur,quantity,supplier_cost_usd)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      orderId,
      it.product_id,
      it.lume_sku || "",
      it.name,
      it.image_url || "",
      it.slug || "",
      it.supplier_product_id || "",
      it.supplier_sku || "",
      it.cj_vid || "",
      it.unit_price_eur,
      it.quantity,
      it.supplier_cost_usd || 0
    )
  );
  if (stmts.length) await env.LUME_DB.batch(stmts);
  return orderId;
}
__name(createPendingOrder, "createPendingOrder");
async function attachStripeSession(env, orderNumber, sessionId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET stripe_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE order_number=?`
  ).bind(sessionId, orderNumber).run();
}
__name(attachStripeSession, "attachStripeSession");
async function getOrderByNumber(env, orderNumber) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE order_number=?`).bind(orderNumber).first();
}
__name(getOrderByNumber, "getOrderByNumber");
async function getOrderByStripeSession(env, sessionId) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE stripe_session_id=?`).bind(sessionId).first();
}
__name(getOrderByStripeSession, "getOrderByStripeSession");
async function getOrderItems(env, orderId) {
  const r = await env.LUME_DB.prepare(`SELECT * FROM order_items WHERE order_id=?`).bind(orderId).all();
  return r.results || [];
}
__name(getOrderItems, "getOrderItems");
async function markOrderPaid(env, orderId, { email, customerName, shipping, paymentIntent }) {
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
      updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND status IN ('pending_payment','paid')`
  ).bind(
    email || "",
    customerName || "",
    shipping.phone || "",
    shipping.address || "",
    shipping.address2 || "",
    shipping.city || "",
    shipping.province || "",
    shipping.zip || "",
    shipping.country || "",
    shipping.countryCode || "",
    paymentIntent || "",
    orderId
  ).run();
}
__name(markOrderPaid, "markOrderPaid");
async function markOrderFulfilling(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilling',updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(orderId).run();
}
__name(markOrderFulfilling, "markOrderFulfilling");
async function markOrderFulfilled(env, orderId, { cjOrderId, cjStatus: cjStatus2 }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilled',cj_order_id=?,cj_status=?,cj_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(cjOrderId || "", cjStatus2 || "created", orderId).run();
}
__name(markOrderFulfilled, "markOrderFulfilled");
async function markOrderFulfillFailed(env, orderId, error) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfill_failed',cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(String(error || "").slice(0, 2e3), orderId).run();
}
__name(markOrderFulfillFailed, "markOrderFulfillFailed");
async function updateCjMeta(env, orderId, { cjOrderId, cjStatus: cjStatus2, cjError }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET cj_order_id=COALESCE(?,cj_order_id),cj_status=COALESCE(?,cj_status),cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(cjOrderId || null, cjStatus2 || null, cjError == null ? null : String(cjError).slice(0, 2e3), orderId).run();
}
__name(updateCjMeta, "updateCjMeta");
async function markOrderExpired(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending_payment'`
  ).bind(orderId).run();
}
__name(markOrderExpired, "markOrderExpired");
async function markOrderRefunded(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(orderId).run();
}
__name(markOrderRefunded, "markOrderRefunded");
async function updateItemVid(env, itemId, vid) {
  await env.LUME_DB.prepare(`UPDATE order_items SET cj_vid=? WHERE id=?`).bind(vid, itemId).run();
}
__name(updateItemVid, "updateItemVid");
async function listOrdersAdmin(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT id,order_number,status,email,customer_name,total_eur,currency,cj_order_id,cj_status,cj_error,created_at,updated_at
       FROM orders ORDER BY id DESC LIMIT 100`
    ).all();
    return json({ ok: true, orders: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not load orders" }, 500);
  }
}
__name(listOrdersAdmin, "listOrdersAdmin");
async function getOrderAdmin(env, id) {
  const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
  if (!order) return json({ ok: false, error: "Not found" }, 404);
  const items = await getOrderItems(env, id);
  return json({ ok: true, order, items });
}
__name(getOrderAdmin, "getOrderAdmin");

// src/stripe.js
var EU_SHIPPING = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE"
];
function stripeConfigured(env) {
  return !!env.STRIPE_SECRET_KEY;
}
__name(stripeConfigured, "stripeConfigured");
async function stripeForm(env, path, params, { method = "POST", idempotencyKey } = {}) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === void 0 || v === null) continue;
    body.set(k, String(v));
  }
  const headers = {
    authorization: "Bearer " + env.STRIPE_SECRET_KEY,
    "content-type": "application/x-www-form-urlencoded"
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const r = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers,
    body: method === "GET" ? void 0 : body
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data && data.error && data.error.message || "Stripe error " + r.status;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}
__name(stripeForm, "stripeForm");
async function createCheckoutSession(env, { orderNumber, lineItems, shippingCents, successUrl, cancelUrl, customerEmail }) {
  const params = {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: orderNumber,
    "metadata[order_number]": orderNumber,
    "automatic_tax[enabled]": "true",
    customer_creation: "always",
    billing_address_collection: "auto",
    "phone_number_collection[enabled]": "true",
    "payment_intent_data[metadata][order_number]": orderNumber
    // Physical goods PTC — General Tangible Goods
    // tax_behavior exclusive: VAT added on top of listed EUR retail prices
  };
  EU_SHIPPING.forEach((cc, i) => {
    params[`shipping_address_collection[allowed_countries][${i}]`] = cc;
  });
  if (shippingCents > 0) {
    params["shipping_options[0][shipping_rate_data][type]"] = "fixed_amount";
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = String(shippingCents);
    params["shipping_options[0][shipping_rate_data][fixed_amount][currency]"] = "eur";
    params["shipping_options[0][shipping_rate_data][display_name]"] = "Standard shipping";
    params["shipping_options[0][shipping_rate_data][tax_behavior]"] = "exclusive";
    params["shipping_options[0][shipping_rate_data][tax_code]"] = "txcd_92010001";
  } else {
    params["shipping_options[0][shipping_rate_data][type]"] = "fixed_amount";
    params["shipping_options[0][shipping_rate_data][fixed_amount][amount]"] = "0";
    params["shipping_options[0][shipping_rate_data][fixed_amount][currency]"] = "eur";
    params["shipping_options[0][shipping_rate_data][display_name]"] = "Free shipping (orders over \u20AC100)";
    params["shipping_options[0][shipping_rate_data][tax_behavior]"] = "exclusive";
    params["shipping_options[0][shipping_rate_data][tax_code]"] = "txcd_92010001";
  }
  if (customerEmail) params.customer_email = customerEmail;
  lineItems.forEach((li, i) => {
    params[`line_items[${i}][quantity]`] = String(li.quantity);
    params[`line_items[${i}][price_data][currency]`] = "eur";
    params[`line_items[${i}][price_data][unit_amount]`] = String(li.unitAmountCents);
    params[`line_items[${i}][price_data][tax_behavior]`] = "exclusive";
    params[`line_items[${i}][price_data][product_data][name]`] = li.name;
    params[`line_items[${i}][price_data][product_data][tax_code]`] = "txcd_99999999";
    if (li.image) params[`line_items[${i}][price_data][product_data][images][0]`] = li.image;
  });
  return stripeForm(env, "/checkout/sessions", params, {
    idempotencyKey: `checkout-${orderNumber}`
  });
}
__name(createCheckoutSession, "createCheckoutSession");
async function retrieveCheckoutSession(env, sessionId) {
  const r = await fetch(
    "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=line_items&expand[]=total_details",
    { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error && data.error.message || "Session retrieve failed");
  return data;
}
__name(retrieveCheckoutSession, "retrieveCheckoutSession");
function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
__name(timingSafeEqualBytes, "timingSafeEqualBytes");
async function verifyStripeWebhook(env, rawBody, signatureHeader) {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  const parts = Object.fromEntries(
    String(signatureHeader || "").split(",").map((p) => p.trim().split("=")).filter((kv) => kv.length === 2)
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new Error("Missing Stripe signature");
  const age = Math.abs(Math.floor(Date.now() / 1e3) - Number(timestamp));
  if (age > 300) throw new Error("Stripe webhook timestamp too old");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(env.STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(signed)].map((b2) => b2.toString(16).padStart(2, "0")).join("");
  const a = enc.encode(expected);
  const b = enc.encode(v1);
  if (!timingSafeEqualBytes(a, b)) throw new Error("Invalid Stripe signature");
  return JSON.parse(rawBody);
}
__name(verifyStripeWebhook, "verifyStripeWebhook");

// src/commerce.js
var FREE_SHIPPING_EUR = 100;
var FLAT_SHIPPING_EUR = 6.9;
function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_EUR ? 0 : FLAT_SHIPPING_EUR;
}
__name(shippingFor, "shippingFor");
async function checkout(request, env) {
  try {
    if (!stripeConfigured(env)) {
      return json({ ok: false, error: "Checkout is not configured yet (missing STRIPE_SECRET_KEY)." }, 503);
    }
    const body = await request.json();
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (!rawItems.length) return json({ ok: false, error: "Cart is empty" }, 400);
    const normalized = [];
    for (const it of rawItems.slice(0, 30)) {
      const productId = Number(it.productId || it.id);
      const quantity = Math.max(1, Math.min(20, Number(it.quantity || 1) || 1));
      if (!productId) return json({ ok: false, error: "Invalid product in cart" }, 400);
      normalized.push({ productId, quantity });
    }
    const lines = [];
    for (const it of normalized) {
      const p = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,stock,status,supplier_product_id,supplier_sku,supplier_cost_usd
         FROM products WHERE id=? LIMIT 1`
      ).bind(it.productId).first();
      if (!p || p.status !== "live") {
        return json({ ok: false, error: "A product in your cart is no longer available" }, 400);
      }
      if (!(Number(p.retail_price_eur) > 0)) {
        return json({ ok: false, error: "A product has an invalid price" }, 400);
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
        cj_vid: "",
        unit_price_eur: Number(p.retail_price_eur),
        quantity: it.quantity,
        supplier_cost_usd: Number(p.supplier_cost_usd || 0)
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
      total
    });
    const origin = new URL(request.url).origin;
    const stripeLines = lines.map((l) => ({
      name: l.name,
      quantity: l.quantity,
      unitAmountCents: Math.round(l.unit_price_eur * 100),
      image: l.image_url && String(l.image_url).startsWith("http") ? l.image_url : void 0
    }));
    const session = await createCheckoutSession(env, {
      orderNumber,
      lineItems: stripeLines,
      shippingCents: Math.round(shipping * 100),
      successUrl: origin + "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: origin + "/cart?cancelled=1",
      customerEmail: body.email || void 0
    });
    await attachStripeSession(env, orderNumber, session.id);
    return json({ ok: true, orderNumber, url: session.url, sessionId: session.id });
  } catch (e) {
    return json({ ok: false, error: e.message || "Checkout failed" }, e.status || 500);
  }
}
__name(checkout, "checkout");
async function fulfillOrder(env, order) {
  if (!order) throw new Error("Missing order");
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
    products
  });
  await markOrderFulfilled(env, order.id, { cjOrderId, cjStatus: "created" });
  return { cjOrderId };
}
__name(fulfillOrder, "fulfillOrder");
function shippingFromStripe(session) {
  const details = session.shipping_details || session.collected_information?.shipping_details || {};
  const addr = details.address || {};
  const name = details.name || session.customer_details?.name || "";
  return {
    phone: session.customer_details?.phone || details.phone || "",
    address: [addr.line1, addr.line2].filter(Boolean).join(", ") || addr.line1 || "",
    address2: addr.line2 || "",
    city: addr.city || "",
    province: addr.state || "",
    zip: addr.postal_code || "",
    country: addr.country || "",
    countryCode: addr.country || "",
    customerName: name,
    email: session.customer_details?.email || session.customer_email || ""
  };
}
__name(shippingFromStripe, "shippingFromStripe");
async function handleStripeWebhook(request, env, ctx) {
  const raw = await request.text();
  let event;
  try {
    event = await verifyStripeWebhook(env, raw, request.headers.get("stripe-signature"));
  } catch (e) {
    return json({ ok: false, error: e.message || "Invalid signature" }, 400);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const orderNumber = session?.metadata?.order_number || session?.client_reference_id;
    let order = orderNumber ? await getOrderByNumber(env, orderNumber) : null;
    if (!order && session?.id) order = await getOrderByStripeSession(env, session.id);
    if (!order) return json({ ok: false, error: "Order not found" }, 404);
    if (["paid", "fulfilling", "fulfilled", "fulfill_failed"].includes(order.status) && order.stripe_payment_intent) {
      if (!order.cj_order_id && order.status !== "fulfilled") {
        const fresh2 = await getOrderByNumber(env, order.order_number);
        const run2 = /* @__PURE__ */ __name(async () => {
          try {
            await fulfillOrder(env, fresh2);
          } catch (e) {
            await markOrderFulfillFailed(env, fresh2.id, e.message || String(e));
          }
        }, "run");
        if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run2());
        else await run2();
      }
      return json({ ok: true, received: true, duplicate: true });
    }
    const ship = shippingFromStripe(session);
    await markOrderPaid(env, order.id, {
      email: ship.email,
      customerName: ship.customerName,
      shipping: ship,
      paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || ""
    });
    const fresh = await getOrderByNumber(env, order.order_number);
    const run = /* @__PURE__ */ __name(async () => {
      try {
        await fulfillOrder(env, fresh);
      } catch (e) {
        await markOrderFulfillFailed(env, fresh.id, e.message || String(e));
      }
    }, "run");
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run());
    else await run();
  }
  if (event.type === "checkout.session.expired") {
    const session = event.data?.object;
    const order = await getOrderByStripeSession(env, session?.id) || (session?.metadata?.order_number ? await getOrderByNumber(env, session.metadata.order_number) : null);
    if (order) await markOrderExpired(env, order.id);
  }
  if (event.type === "charge.refunded") {
    const charge = event.data?.object;
    const pi = typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;
    if (pi) {
      const row = await env.LUME_DB.prepare(
        `SELECT id FROM orders WHERE stripe_payment_intent=? LIMIT 1`
      ).bind(pi).first();
      if (row) await markOrderRefunded(env, row.id);
    }
  }
  return json({ ok: true, received: true });
}
__name(handleStripeWebhook, "handleStripeWebhook");
async function checkoutSuccessPage(url, env) {
  const sessionId = url.searchParams.get("session_id") || "";
  let orderNumber = "";
  let status = "paid";
  if (sessionId && stripeConfigured(env)) {
    try {
      const session = await retrieveCheckoutSession(env, sessionId);
      orderNumber = session.metadata?.order_number || session.client_reference_id || "";
      const order = await getOrderByStripeSession(env, sessionId);
      if (order) {
        orderNumber = order.order_number;
        status = order.status;
      }
    } catch {
    }
  }
  return { orderNumber, status, sessionId };
}
__name(checkoutSuccessPage, "checkoutSuccessPage");
async function retryFulfill(request, env) {
  let id = 0;
  try {
    const body = await request.json();
    id = Number(body.id);
    if (!id) return json({ ok: false, error: "Missing order id" }, 400);
    const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
    if (!order) return json({ ok: false, error: "Not found" }, 404);
    if (order.cj_order_id) return json({ ok: true, already: true, cjOrderId: order.cj_order_id });
    if (!["paid", "fulfill_failed", "fulfilling"].includes(order.status)) {
      return json({ ok: false, error: "Order is not ready to fulfill" }, 400);
    }
    const result = await fulfillOrder(env, order);
    return json({ ok: true, ...result });
  } catch (e) {
    if (id) await markOrderFulfillFailed(env, id, e.message || String(e));
    return json({ ok: false, error: e.message || "Fulfill failed" }, 502);
  }
}
__name(retryFulfill, "retryFulfill");
async function refreshOrderCj(request, env) {
  try {
    const body = await request.json();
    const id = Number(body.id);
    const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
    if (!order) return json({ ok: false, error: "Not found" }, 404);
    if (!order.cj_order_id) return json({ ok: false, error: "No CJ order id yet" }, 400);
    const { getCJOrderDetail: getCJOrderDetail2 } = await Promise.resolve().then(() => (init_cj(), cj_exports));
    const detail = await getCJOrderDetail2(env, order.cj_order_id);
    const cjStatus2 = detail?.orderStatus || detail?.status || detail?.state || "unknown";
    await updateCjMeta(env, order.id, { cjStatus: cjStatus2, cjError: null });
    return json({ ok: true, cjStatus: cjStatus2, detail });
  } catch (e) {
    return json({ ok: false, error: e.message || "Refresh failed" }, 502);
  }
}
__name(refreshOrderCj, "refreshOrderCj");

// src/db/products.js
init_json();

// src/lib/slugify.js
function slugify(v) {
  return String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
__name(slugify, "slugify");

// src/lib/escape.js
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
__name(esc, "esc");
function safeUrl(value, fallback = "") {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 1200);
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString().slice(0, 1200);
  } catch {
  }
  return fallback;
}
__name(safeUrl, "safeUrl");

// src/db/products.js
init_merch();
init_cj();
var PRODUCT_COLS = "id,lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,created_at";
function publishValidationError(row) {
  if (!row) return "Product not found";
  if (!row.name || !row.image_url) return "Title and image are required before publishing";
  if (!(Number(row.retail_price_eur) > 0)) return "Set a retail price before publishing";
  if (!(Number(row.supplier_cost_usd) > 0)) {
    return "CJ cost is missing/zero. Review the real variant cost before publishing.";
  }
  if (Number(row.stock) <= 0) return "Product is out of stock";
  return null;
}
__name(publishValidationError, "publishValidationError");
async function listLumeProducts(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products ORDER BY id DESC LIMIT 500`
    ).all();
    return json({ ok: true, products: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || "Database error" }, 500);
  }
}
__name(listLumeProducts, "listLumeProducts");
async function listPublishedProducts(env, { q = "", limit = 48 } = {}) {
  try {
    const lim = Math.max(1, Math.min(200, Number(limit) || 48));
    const query = String(q || "").trim().slice(0, 80).toLowerCase();
    let r;
    if (query) {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,stock,description
         FROM products WHERE status='live'
         AND (lower(name) LIKE ? OR lower(category) LIKE ? OR lower(ifnull(description,'')) LIKE ?)
         ORDER BY published_at DESC,id DESC LIMIT ?`
      ).bind(`%${query}%`, `%${query}%`, `%${query}%`, lim).all();
    } else {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,stock,description
         FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`
      ).bind(lim).all();
    }
    return json({ ok: true, products: r.results || [], q: query || void 0 });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not load products" }, 500);
  }
}
__name(listPublishedProducts, "listPublishedProducts");
async function importLumeProduct(request, env) {
  try {
    const p = await request.json();
    if (!p || !p.id || !p.name) return json({ ok: false, error: "Missing product id/name" }, 400);
    const cost = Number(p.costUSD || 0) || 0;
    let retail = Number(p.retailPriceEUR || 0) || 0;
    if (!(retail > 0) && cost > 0) retail = suggestedRetailEur(cost);
    const rawName = String(p.name).slice(0, 240);
    const name = cleanProductName(rawName) || rawName;
    const category = mapMaisonCategory(name, p.category);
    const compare = suggestedCompareEur(retail);
    const slug = slugify(name);
    const description = `A considered piece for calm interiors \u2014 curated for Maison Marnier.

${name}`;
    const sku = ("LL-CJ-" + String(p.sku || p.id).replace(/[^A-Za-z0-9]/g, "").slice(-18)).toUpperCase();
    const image = safeUrl(p.image, "");
    await env.LUME_DB.prepare(
      `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(supplier_product_id) DO UPDATE SET
         supplier_sku=excluded.supplier_sku,name=excluded.name,image_url=excluded.image_url,
         supplier_cost_usd=excluded.supplier_cost_usd,retail_price_eur=excluded.retail_price_eur,
         compare_at_price_eur=excluded.compare_at_price_eur,category=excluded.category,
         stock=excluded.stock,delivery_days=excluded.delivery_days,slug=excluded.slug,
         description=CASE WHEN products.description IS NULL OR products.description='' THEN excluded.description ELSE products.description END,
         updated_at=CURRENT_TIMESTAMP`
    ).bind(
      sku,
      "CJ",
      String(p.id),
      String(p.sku || ""),
      name,
      image,
      cost,
      retail,
      compare,
      category,
      Number(p.stock || 0) || 0,
      String(p.deliveryDays || ""),
      "draft",
      slug,
      description
    ).run();
    return json({ ok: true, lumeSku: sku, status: "draft", name, category, slug });
  } catch (e) {
    return json({ ok: false, error: e.message || "Import failed" }, 500);
  }
}
__name(importLumeProduct, "importLumeProduct");
async function updateLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const name = String(p.name || "").trim().slice(0, 240);
    if (!name) return json({ ok: false, error: "Product title is required" }, 400);
    const slug = slugify(p.slug || name);
    const description = String(p.description || "").trim().slice(0, 5e3);
    const image = safeUrl(p.image_url, "");
    if (p.image_url && !image) return json({ ok: false, error: "Image URL must be http(s) or a site path" }, 400);
    const category = String(p.category || "").trim().slice(0, 160);
    let retail = Number(p.retail_price_eur || 0) || 0;
    let compare = Number(p.compare_at_price_eur || 0) || null;
    if (!(compare > 0) && retail > 0) compare = suggestedCompareEur(retail);
    await env.LUME_DB.prepare(
      `UPDATE products SET name=?,slug=?,description=?,image_url=?,category=?,retail_price_eur=?,compare_at_price_eur=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(name, slug, description, image, category, retail, compare, id).run();
    return json({ ok: true, id, slug, status: "saved" });
  } catch (e) {
    return json({ ok: false, error: e.message || "Save failed" }, 500);
  }
}
__name(updateLumeProduct, "updateLumeProduct");
async function publishLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const row = await env.LUME_DB.prepare(
      "SELECT id,name,image_url,supplier_cost_usd,retail_price_eur,stock,slug FROM products WHERE id=?"
    ).bind(id).first();
    const err = publishValidationError(row);
    if (err === "Product not found") return json({ ok: false, error: err }, 404);
    if (err) return json({ ok: false, error: err }, 400);
    const slug = slugify(row.slug || row.name);
    await env.LUME_DB.prepare(
      "UPDATE products SET status='live',slug=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(slug, id).run();
    return json({ ok: true, id, slug, status: "live" });
  } catch (e) {
    return json({ ok: false, error: e.message || "Publish failed" }, 500);
  }
}
__name(publishLumeProduct, "publishLumeProduct");
async function publishAllLumeProducts(request, env) {
  try {
    const drafts = await env.LUME_DB.prepare(
      `SELECT id,name,image_url,supplier_cost_usd,retail_price_eur,stock,slug
       FROM products WHERE status!='live' ORDER BY id ASC`
    ).all();
    const rows = drafts.results || [];
    let published = 0;
    let skipped = 0;
    const errors = [];
    for (const row of rows) {
      const err = publishValidationError(row);
      if (err) {
        skipped += 1;
        errors.push({ id: row.id, error: err });
        continue;
      }
      try {
        const slug = slugify(row.slug || row.name);
        await env.LUME_DB.prepare(
          "UPDATE products SET status='live',slug=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(slug, row.id).run();
        published += 1;
      } catch (e) {
        skipped += 1;
        errors.push({ id: row.id, error: e.message || "Publish failed" });
      }
    }
    return json({ ok: true, published, skipped, errors, total: rows.length });
  } catch (e) {
    return json({ ok: false, error: e.message || "Publish all failed" }, 500);
  }
}
__name(publishAllLumeProducts, "publishAllLumeProducts");
async function refreshLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const row = await env.LUME_DB.prepare(
      "SELECT id,supplier,supplier_product_id FROM products WHERE id=?"
    ).bind(id).first();
    if (!row) return json({ ok: false, error: "Product not found" }, 404);
    if (row.supplier !== "CJ" || !row.supplier_product_id) {
      return json({ ok: false, error: "Only CJ products can be refreshed" }, 400);
    }
    const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
    await env.LUME_DB.prepare(
      `UPDATE products SET supplier_cost_usd=?,stock=?,delivery_days=?,
       image_url=CASE WHEN ?!='' THEN ? ELSE image_url END,
       supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(
      fresh.costUSD,
      fresh.stock,
      fresh.deliveryDays,
      fresh.image,
      fresh.image,
      fresh.sku,
      fresh.sku,
      id
    ).run();
    return json({
      ok: true,
      id,
      supplier_cost_usd: fresh.costUSD,
      stock: fresh.stock,
      delivery_days: fresh.deliveryDays
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Refresh failed" }, 502);
  }
}
__name(refreshLumeProduct, "refreshLumeProduct");
async function getLiveProducts(env, limit = 100) {
  const r = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`
  ).bind(limit).all();
  return r.results || [];
}
__name(getLiveProducts, "getLiveProducts");
async function getLiveProductBySlug(env, slug) {
  return env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,retail_price_eur,compare_at_price_eur,category,description,stock
     FROM products WHERE status='live' AND slug=? LIMIT 1`
  ).bind(slug).first();
}
__name(getLiveProductBySlug, "getLiveProductBySlug");

// src/db/site-content.js
init_json();
var HOME_KEYS = [
  "hero_image",
  "hero_link",
  "cat_textiles_image",
  "cat_textiles_link",
  "cat_objects_image",
  "cat_objects_link",
  "cat_candles_image",
  "cat_candles_link",
  "cat_wall_image",
  "cat_wall_link",
  "cat_seasonal_image",
  "cat_seasonal_link",
  "season_image",
  "season_link",
  "story_quiet_image",
  "story_quiet_link",
  "story_objects_image",
  "story_objects_link"
];
async function getHomeContent(env) {
  try {
    const r = await env.LUME_DB.prepare("SELECT key,value FROM site_content").all();
    const content = {};
    for (const row of r.results || []) content[row.key] = row.value;
    return json({ ok: true, content });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not load homepage content" }, 500);
  }
}
__name(getHomeContent, "getHomeContent");
async function saveHomeContent(request, env) {
  try {
    const body = await request.json();
    const batch = [];
    for (const k of HOME_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(body, k)) continue;
      let v = String(body[k] || "").slice(0, 1600);
      if (k.endsWith("_image") || k.endsWith("_link")) {
        const cleaned = safeUrl(v, "");
        if (v && !cleaned) {
          return json({ ok: false, error: `Invalid URL for ${k}` }, 400);
        }
        v = cleaned;
      }
      batch.push(
        env.LUME_DB.prepare(
          `INSERT INTO site_content(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`
        ).bind(k, v)
      );
    }
    if (batch.length) await env.LUME_DB.batch(batch);
    return json({ ok: true, saved: batch.length });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not save homepage content" }, 500);
  }
}
__name(saveHomeContent, "saveHomeContent");

// src/db/journal.js
init_json();
async function listJournalAdmin(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT id,slug,title,excerpt,body,image_url,status,published_at,created_at,updated_at
       FROM journal_articles ORDER BY id DESC LIMIT 100`
    ).all();
    return json({ ok: true, articles: r.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not load journal" }, 500);
  }
}
__name(listJournalAdmin, "listJournalAdmin");
async function listPublishedArticles(env) {
  const r = await env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,image_url,published_at
     FROM journal_articles WHERE status='live'
     ORDER BY published_at DESC,id DESC LIMIT 50`
  ).all();
  return r.results || [];
}
__name(listPublishedArticles, "listPublishedArticles");
async function getArticleBySlug(env, slug) {
  return env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,body,image_url,status,published_at
     FROM journal_articles WHERE slug=? LIMIT 1`
  ).bind(slug).first();
}
__name(getArticleBySlug, "getArticleBySlug");
async function saveJournalArticle(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id) || null;
    const title = String(p.title || "").trim().slice(0, 240);
    if (!title) return json({ ok: false, error: "Title is required" }, 400);
    const slug = slugify(p.slug || title);
    if (!slug) return json({ ok: false, error: "Slug is required" }, 400);
    const excerpt = String(p.excerpt || "").trim().slice(0, 800);
    const body = String(p.body || "").trim().slice(0, 2e4);
    const image = safeUrl(p.image_url, "");
    if (p.image_url && !image) return json({ ok: false, error: "Invalid image URL" }, 400);
    const status = p.status === "live" ? "live" : "draft";
    if (id) {
      await env.LUME_DB.prepare(
        `UPDATE journal_articles SET slug=?,title=?,excerpt=?,body=?,image_url=?,status=?,
         published_at=CASE WHEN ?='live' AND published_at IS NULL THEN CURRENT_TIMESTAMP
                           WHEN ?='live' THEN published_at ELSE published_at END,
         updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).bind(slug, title, excerpt, body, image, status, status, status, id).run();
      if (status === "live") {
        await env.LUME_DB.prepare(
          `UPDATE journal_articles SET published_at=COALESCE(published_at,CURRENT_TIMESTAMP) WHERE id=?`
        ).bind(id).run();
      }
      return json({ ok: true, id, slug, status });
    }
    const result = await env.LUME_DB.prepare(
      `INSERT INTO journal_articles (slug,title,excerpt,body,image_url,status,published_at,updated_at)
       VALUES (?,?,?,?,?,?,CASE WHEN ?='live' THEN CURRENT_TIMESTAMP ELSE NULL END,CURRENT_TIMESTAMP)`
    ).bind(slug, title, excerpt, body, image, status, status).run();
    return json({ ok: true, id: result.meta.last_row_id, slug, status });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not save article" }, 500);
  }
}
__name(saveJournalArticle, "saveJournalArticle");
async function deleteJournalArticle(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing id" }, 400);
    await env.LUME_DB.prepare("DELETE FROM journal_articles WHERE id=?").bind(id).run();
    return json({ ok: true, id });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not delete article" }, 500);
  }
}
__name(deleteJournalArticle, "deleteJournalArticle");

// src/router.js
init_json();

// src/lib/seo.js
var SITE_ORIGIN = "https://maisonmarnier.com";
var DEFAULT_OG_IMAGE = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80";
function absoluteUrl(pathOrUrl = "/") {
  if (!pathOrUrl) return `${SITE_ORIGIN}/`;
  const s = String(pathOrUrl);
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${SITE_ORIGIN}${path}`;
}
__name(absoluteUrl, "absoluteUrl");
function escXml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(escXml, "escXml");
function formatLastmod(value) {
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}
__name(formatLastmod, "formatLastmod");
function jsonLdScript(data) {
  if (!data) return "";
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}<\/script>`;
}
__name(jsonLdScript, "jsonLdScript");
function organizationWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "Maison Marnier",
        url: SITE_ORIGIN,
        logo: DEFAULT_OG_IMAGE,
        email: "hello@maisonmarnier.com",
        areaServed: "EU"
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        name: "Maison Marnier",
        url: SITE_ORIGIN,
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_ORIGIN}/collections/new?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };
}
__name(organizationWebsiteJsonLd, "organizationWebsiteJsonLd");
function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path || it.url || "/")
    }))
  };
}
__name(breadcrumbJsonLd, "breadcrumbJsonLd");
function productJsonLd(p, { url, collectionPath } = {}) {
  const retail = Number(p.retail_price_eur || 0);
  const stock = Number(p.stock || 0);
  const productUrl = absoluteUrl(url || `/products/${encodeURIComponent(p.slug || "")}`);
  const availability = stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const crumbs = [
    { name: "Home", path: "/" },
    { name: p.category || "Shop", path: collectionPath || "/collections/new" },
    { name: p.name || "Product", path: productUrl }
  ];
  return [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name || "",
      description: String(p.description || p.name || "").slice(0, 5e3),
      image: p.image_url ? [p.image_url] : void 0,
      sku: p.slug || void 0,
      brand: { "@type": "Brand", name: "Maison Marnier" },
      offers: {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "EUR",
        price: retail.toFixed(2),
        availability,
        itemCondition: "https://schema.org/NewCondition"
      }
    },
    breadcrumbJsonLd(crumbs)
  ];
}
__name(productJsonLd, "productJsonLd");
function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeAttr, "escapeAttr");
function seoHeadHtml({
  title,
  description = "",
  canonical = "/",
  ogImage = "",
  ogType = "website",
  noindex = false
} = {}) {
  const pageTitle = title || "Maison Marnier";
  const canon = absoluteUrl(canonical);
  const image = absoluteUrl(ogImage || DEFAULT_OG_IMAGE);
  const desc = description || "";
  const robots = noindex ? '<meta name="robots" content="noindex,nofollow">\n' : "";
  return `${robots}<link rel="canonical" href="${escapeAttr(canon)}">
<meta property="og:title" content="${escapeAttr(pageTitle)}">
<meta property="og:description" content="${escapeAttr(desc)}">
<meta property="og:url" content="${escapeAttr(canon)}">
<meta property="og:type" content="${escapeAttr(ogType)}">
<meta property="og:image" content="${escapeAttr(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(pageTitle)}">
<meta name="twitter:description" content="${escapeAttr(desc)}">
<meta name="twitter:image" content="${escapeAttr(image)}">`;
}
__name(seoHeadHtml, "seoHeadHtml");

// src/lib/html.js
var GTM_ID = "GTM-WL3RFMH4";
function gtmHeadHtml() {
  return `<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"><\/script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
<\/script>`;
}
__name(gtmHeadHtml, "gtmHeadHtml");
function gtmNoscriptHtml() {
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}
__name(gtmNoscriptHtml, "gtmNoscriptHtml");
var NAV = [
  ["New", "/collections/new"],
  ["Decor", "/collections/decor"],
  ["Lighting", "/collections/lighting"],
  ["Seasonal", "/collections/seasonal"],
  ["Objects", "/collections/objects"],
  ["Journal", "/journal"]
];
function navHtml() {
  return NAV.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join("");
}
__name(navHtml, "navHtml");
var LAYOUT_CSS = `
:root{
  --bg:#12100e;--panel:#1a1714;--panel2:#221e1a;--ink:#f3eee6;--muted:#a89f94;
  --line:#2e2924;--accent:#c4a574;--accent2:#e0c08a;--soft:#d8cfc3;
  --pad:clamp(18px,4vw,56px);--max:1420px;--nav-h:78px;
  --font:"Hanken Grotesk",system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.55 var(--font);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.announce{background:#0c0b0a;color:var(--soft);text-align:center;font:700 11px/1 var(--font);letter-spacing:.16em;text-transform:uppercase;padding:12px 16px;border-bottom:1px solid var(--line)}
.site-nav{display:grid;grid-template-columns:240px 1fr auto;align-items:center;gap:24px;min-height:var(--nav-h);padding:0 var(--pad);border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(18,16,14,.94);backdrop-filter:blur(14px);z-index:40}
.brand{display:flex;align-items:center;gap:0;font:900 15px/1 var(--font);letter-spacing:.2em;text-transform:uppercase;color:#fff}
.brand span{color:var(--accent)}
.site-nav .links{display:flex;flex-wrap:wrap;justify-content:center;gap:22px}
.site-nav .links a{color:var(--soft);font:700 13px/1 var(--font);letter-spacing:.02em;opacity:.9;transition:color .2s}
.site-nav .links a:hover{color:var(--accent2)}
.tools{display:flex;gap:10px;align-items:center;justify-content:flex-end}
.tools .search{width:150px;padding:11px 12px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 12px/1.2 var(--font);border-radius:6px}
.cart-link{display:inline-flex;align-items:center;gap:6px;padding:11px 14px;border:1px solid var(--accent);border-radius:6px;font:800 11px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:#fff;background:transparent}
.cart-link:hover{background:rgba(196,165,116,.12)}
.wrap{max-width:var(--max);margin:auto;padding:0 var(--pad) 56px}
.crumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:22px 0 0;font:700 11px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.crumbs a:hover{color:var(--accent2)}
.crumbs .sep{opacity:.4}

.collection-top{margin:0 calc(-1 * var(--pad));padding:36px var(--pad) 28px;background:
  radial-gradient(900px 380px at 10% -20%, rgba(196,165,116,.18), transparent 55%),
  linear-gradient(180deg, #1a1714 0%, var(--bg) 100%);
  border-bottom:1px solid var(--line)}
.collection-top .head{margin:0}
.head{display:flex;justify-content:space-between;align-items:end;gap:20px;margin:28px 0 24px;flex-wrap:wrap}
.head-meta{color:var(--muted);font:700 12px/1.3 var(--font);letter-spacing:.1em;text-transform:uppercase}
h1{font:900 clamp(34px,4.6vw,56px)/.98 var(--font);margin:0;letter-spacing:-.045em;color:#fff}
.lead{color:var(--muted);max-width:44ch;margin:14px 0 0;line-height:1.55;font-size:15px;font-weight:500}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:22px 0 8px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:6px;font:700 11px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--panel);transition:.2s}
.chip:hover{color:#fff;border-color:#4a433c}
.chip.is-active{background:var(--accent);color:#12100e;border-color:var(--accent)}

.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:22px 16px;padding-top:12px}
.grid > .p{animation:fadeRise .5s ease both}
.p{display:block;color:var(--ink);position:relative}
.p .media{position:relative;overflow:hidden;background:var(--panel2);aspect-ratio:4/5;border-radius:8px;border:1px solid var(--line)}
.p .media img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .7s cubic-bezier(.2,.65,.3,1)}
.p:hover .media img{transform:scale(1.04)}
.p .badge{position:absolute;left:12px;top:12px;z-index:1;background:rgba(18,16,14,.88);color:var(--accent2);font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;padding:8px 10px;border-radius:5px}
.p .meta{padding-top:14px}
.p h3{font:800 16px/1.25 var(--font);margin:0;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.5em}
.p:hover h3{color:var(--accent2)}
.p .price-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:10px}
.p .price{font:800 14px/1 var(--font)}
.p .compare{font:600 12px/1 var(--font);color:var(--muted);text-decoration:line-through;margin-left:8px}
.p .catline{font:700 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.p .cta-hint{font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);opacity:0;transform:translateY(4px);transition:.25s}
.p:hover .cta-hint{opacity:1;transform:none}

.product{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:clamp(24px,4vw,56px);align-items:start;padding-top:22px}
.product-gallery{position:sticky;top:calc(var(--nav-h) + 24px)}
.product-gallery .frame{overflow:hidden;background:var(--panel2);aspect-ratio:4/5;border-radius:10px;border:1px solid var(--line)}
.product-gallery img{width:100%;height:100%;object-fit:cover;display:block;animation:fadeRise .55s ease both}
.product-buy{padding:4px 0 0;animation:fadeRise .65s .05s ease both}
.buy-panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px 26px 24px}
.product .eyebrow{letter-spacing:.12em;text-transform:uppercase;font:800 11px/1 var(--font);color:var(--accent);margin-bottom:14px}
.product .eyebrow a:hover{color:var(--accent2)}
.product h1{margin:0 0 16px;font-size:clamp(28px,3.2vw,42px);max-width:14ch}
.product .price-block{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.product .price-now{font:900 26px/1 var(--font)}
.product .price-was{font:600 14px/1 var(--font);color:var(--muted);text-decoration:line-through}
.product .save{font:800 10px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:#12100e;background:var(--accent);padding:6px 8px;border-radius:4px}
.stock-line{margin:10px 0 0;font-size:13px;color:var(--muted);font-weight:500}
.desc{line-height:1.7;color:var(--soft);white-space:pre-wrap;margin:20px 0 4px;max-width:46ch;font-size:14.5px;font-weight:500}
.buy-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:22px}
.trust{display:grid;gap:10px;margin-top:26px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:500}
.trust span{display:grid;grid-template-columns:14px 1fr;gap:10px}
.trust i{font-style:normal;color:var(--accent)}
.specs{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
.specs div{font-size:12px;color:var(--muted);font-weight:500}
.specs strong{display:block;font:800 10px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--ink);margin-bottom:6px}

.cart-layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.7fr);gap:28px;align-items:start;padding-top:8px}
.cart-lines{display:grid;gap:0;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.cart-line{display:grid;grid-template-columns:88px 1fr auto;gap:16px;align-items:center;padding:16px;border-bottom:1px solid var(--line)}
.cart-line:last-child{border-bottom:0}
.cart-line img{width:88px;height:110px;object-fit:cover;background:var(--panel2);border-radius:6px}
.cart-line strong{font:800 15px/1.3 var(--font)}
.cart-summary{position:sticky;top:calc(var(--nav-h) + 24px);background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:24px}
.cart-summary h2{font:900 22px/1.2 var(--font);margin:0 0 16px;letter-spacing:-.03em}
.cart-summary .row{display:flex;justify-content:space-between;gap:12px;margin:8px 0;font-size:14px;font-weight:600}
.cart-summary .total{font:900 20px/1.2 var(--font);margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.qty{width:64px;padding:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;font:inherit}
.rm{display:inline-block;margin-top:8px;background:none;border:0;padding:0;color:var(--muted);cursor:pointer;text-decoration:underline;font:700 12px var(--font)}

.btn{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:15px 22px;margin:0;border:0;border-radius:6px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:filter .2s,transform .2s;box-shadow:0 10px 28px rgba(196,165,116,.18)}
.btn:hover{filter:brightness(1.06);transform:translateY(-1px)}
.btn[disabled],.btn.is-disabled{opacity:.5;pointer-events:none;transform:none;box-shadow:none}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
.btn-ghost:hover{border-color:var(--accent)}
.btn-block{width:100%}
.muted{color:var(--muted);font-size:13px;font-weight:500}
.empty{padding:56px 0;color:var(--muted);font:800 22px/1.4 var(--font);letter-spacing:-.02em}
.related{margin-top:80px;padding-top:40px;border-top:1px solid var(--line)}
.related-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:8px}
.related h2{font:900 28px/1.1 var(--font);margin:0;letter-spacing:-.03em;color:#fff}
.related .view-all{font:800 11px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.journal-list{display:grid;gap:0}
.journal-card{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:22px;align-items:center;padding:22px 0;border-bottom:1px solid var(--line)}
.journal-card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:var(--panel2)}
.journal-card h2{font:900 1.45rem/1.15 var(--font);margin:0 0 8px;letter-spacing:-.03em;color:#fff}
.journal-card:hover h2{color:var(--accent2)}
.article-hero{width:100%;max-height:420px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin:12px 0 24px;background:var(--panel2)}
.site-footer{margin-top:56px;border-top:1px solid var(--line);padding:40px var(--pad) 24px;background:#0c0b0a}
.footer-grid{max-width:var(--max);margin:auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:28px}
.site-footer h4{font:800 12px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;margin:0 0 14px;color:#fff}
.site-footer a{display:block;color:var(--muted);margin:8px 0;font-size:14px;font-weight:600}
.site-footer a:hover{color:var(--accent2)}
.bottom{max-width:var(--max);margin:28px auto 0;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px;font-weight:600;border-top:1px solid var(--line);padding-top:16px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:var(--panel2);color:#fff;border:1px solid var(--line);padding:12px 18px;border-radius:8px;opacity:0;transition:.25s;pointer-events:none;z-index:50;font:700 12px/1.3 var(--font)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@keyframes fadeRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@media(max-width:1200px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .site-nav{grid-template-columns:1fr auto;min-height:68px}
  .site-nav .links{display:none}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .product{grid-template-columns:1fr}
  .product-gallery{position:static}
  .cart-layout{grid-template-columns:1fr}
  .cart-summary{position:static}
  .footer-grid{grid-template-columns:1fr 1fr}
  .journal-card{grid-template-columns:1fr}
}
@media(max-width:520px){
  .tools .search{display:none}
  .footer-grid{grid-template-columns:1fr}
  .p h3{min-height:0}
}
`;
function footerHtml() {
  return `<footer class="site-footer">
  <div class="footer-grid">
    <div><div class="brand">MAISON <span>MARNIER</span></div><p class="muted" style="margin-top:12px;max-width:34ch">Curated home objects for quieter rooms and slower evenings.</p></div>
    <div><h4>Shop</h4><a href="/collections/new">New Arrivals</a><a href="/collections/decor">Decor</a><a href="/collections/seasonal">Seasonal</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a></div>
  </div>
  <div class="bottom"><span>\xA9 2026 Maison Marnier.</span><span>Europe \xB7 EUR \u20AC</span></div>
</footer>
<div class="toast" id="toast"></div>
<script>
const t=document.getElementById('toast');
function toast(m){if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
const WISH_KEY='mm_wishlist';
function loadWish(){try{return JSON.parse(localStorage.getItem(WISH_KEY)||'[]')}catch(e){return []}}
function saveWish(ids){localStorage.setItem(WISH_KEY,JSON.stringify(ids))}
<\/script>`;
}
__name(footerHtml, "footerHtml");
function fontLinksHtml() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;
}
__name(fontLinksHtml, "fontLinksHtml");
function htmlPage(title, body, {
  description = "",
  status = 200,
  cache = "private, no-store",
  canonical = "",
  ogImage = "",
  noindex = false,
  ogType = "website",
  jsonLd = null
} = {}) {
  const pageTitle = `${title} \u2014 Maison Marnier`;
  const canonPath = canonical || "/";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#12100e">
${gtmHeadHtml()}
<title>${esc(pageTitle)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ""}
${seoHeadHtml({
    title: pageTitle,
    description,
    canonical: canonPath,
    ogImage: ogImage || DEFAULT_OG_IMAGE,
    ogType,
    noindex
  })}
${jsonLdScript(jsonLd)}
${fontLinksHtml()}
<style>${LAYOUT_CSS}</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Free shipping on orders over \u20AC100 \xB7 Europe</div>
<header class="site-nav">
  <a class="brand" href="/">MAISON <span>MARNIER</span></a>
  <nav class="links">${navHtml()}</nav>
  <div class="tools">
    <form action="/collections/new" method="get" role="search">
      <input class="search" type="search" name="q" placeholder="Search\u2026" aria-label="Search products">
    </form>
    <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
  </div>
</header>
<main class="wrap">${body}</main>
${footerHtml()}
<script>
(function(){
  function count(){try{return (JSON.parse(localStorage.getItem('mm_cart')||'[]')||[]).reduce((s,i)=>s+Number(i.qty||1),0)}catch(e){return 0}}
  function paint(){const el=document.getElementById('cartCount'); if(!el)return; const n=count(); el.textContent=n?('('+n+')'):'';}
  paint(); window.addEventListener('mm-cart',paint); window.addEventListener('storage',paint);
})();
<\/script>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff"
    }
  });
}
__name(htmlPage, "htmlPage");
function productCard(p) {
  const href = "/products/" + encodeURIComponent(p.slug || "");
  const retail = Number(p.retail_price_eur || 0);
  const compareAt = Number(p.compare_at_price_eur || 0);
  const onSale = compareAt > retail && retail > 0;
  const compare = onSale ? `<span class="compare">\u20AC${compareAt.toFixed(2)}</span>` : "";
  const badge = onSale ? `<span class="badge">Edit</span>` : "";
  const img = esc(p.image_url || "");
  return `<a class="p" href="${href}">
    <div class="media">${badge}<img src="${img}" alt="${esc(p.name || "")}" loading="lazy" decoding="async"></div>
    <div class="meta">
      <div class="catline">${esc(p.category || "Maison Marnier")}</div>
      <h3>${esc(p.name || "")}</h3>
      <div class="price-row">
        <span class="price">\u20AC${retail.toFixed(2)}${compare}</span>
        <span class="cta-hint">View \u2192</span>
      </div>
    </div>
  </a>`;
}
__name(productCard, "productCard");

// src/pages/home.js
var HOME_CSS = `
${LAYOUT_CSS}
.home-main{overflow:hidden}
.mm-hero{position:relative;min-height:min(78vh,640px);isolation:isolate;display:flex;align-items:center}
.mm-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:
  linear-gradient(105deg,rgba(12,10,8,.94) 0%,rgba(12,10,8,.78) 36%,rgba(12,10,8,.35) 66%,rgba(12,10,8,.6) 100%),
  url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80') center/cover no-repeat}
.mm-hero::after{content:"";position:absolute;inset:auto 0 0;height:100px;z-index:-1;background:linear-gradient(180deg,transparent,var(--bg))}
.mm-hero-inner{width:min(1420px,calc(100% - 2 * var(--pad)));margin:0 auto;padding:56px 0 64px}
.mm-kicker{display:block;margin-bottom:18px;color:var(--accent);font:900 12px/1 var(--font);letter-spacing:.16em;text-transform:uppercase}
.mm-hero h1{margin:0;max-width:11ch;font:900 clamp(3.2rem,7vw,5.6rem)/.92 var(--font);letter-spacing:-.055em;color:#fff}
.mm-hero h1 em{font-style:normal;color:var(--accent2)}
.mm-hero .lead{margin:18px 0 0;max-width:38ch;color:#d2cbc1;font:500 1.05rem/1.55 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.mm-section{padding:40px var(--pad)}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:18px}
.mm-section-head h2{margin:0;font:900 clamp(1.6rem,3vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.mm-cat{position:relative;min-height:210px;overflow:hidden;border-radius:10px;border:1px solid var(--line);display:block}
.mm-cat img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .7s ease}
.mm-cat:hover img{transform:scale(1.05)}
.mm-cat::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(8,7,6,.78))}
.mm-cat span{position:absolute;left:20px;right:20px;bottom:18px;z-index:1;font:900 1.05rem/1.1 var(--font);letter-spacing:-.02em;color:#fff}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.mm-band{margin:4px var(--pad) 0;border-radius:12px;overflow:hidden;border:1px solid var(--line);display:grid;grid-template-columns:1fr 1.15fr;min-height:300px;background:var(--panel)}
.mm-band-copy{padding:36px clamp(20px,3.5vw,44px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:10px 0 12px;font:900 clamp(1.8rem,3.2vw,2.6rem)/1.05 var(--font);letter-spacing:-.04em;color:#fff;max-width:12ch}
.mm-band-copy p{margin:0;color:var(--muted);max-width:36ch;font-weight:500;line-height:1.55}
.mm-band-img{background:url('https://images.unsplash.com/photo-1602874801006-e26c4c4c0c8a?auto=format&fit=crop&w=1400&q=80') center/cover no-repeat;min-height:240px}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:28px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0b0a;margin-top:36px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:40px var(--pad)}
.mm-story{min-height:280px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);display:flex;align-items:flex-end;padding:28px;color:#fff;background-size:cover;background-position:center}
.mm-story::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 25%,rgba(8,7,6,.78))}
.mm-story > div{position:relative;z-index:1}
.mm-story h3{margin:8px 0;font:900 1.8rem/1.05 var(--font);letter-spacing:-.03em}
.mm-story p{margin:0;max-width:34ch;color:#ddd5cb;font:500 14px/1.5 var(--font)}
.mm-news{margin:0 var(--pad) 48px;padding:32px clamp(20px,3.5vw,40px);border-radius:12px;border:1px solid var(--line);background:linear-gradient(135deg,#1f1a15,#151210 55%,#1a1612);display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}
.mm-news h2{margin:0 0 10px;font:900 clamp(1.6rem,3vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.mm-news p{margin:0;color:var(--muted);font-weight:500}
.mm-form{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.mm-form input{flex:1;border:0;padding:16px 18px;background:var(--bg);color:var(--ink);font:600 14px var(--font)}
.mm-form button{border:0;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:0 22px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-cats,.mm-products{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-band,.mm-stories,.mm-news{grid-template-columns:1fr}
  .mm-benefits{grid-template-columns:1fr 1fr}
  .mm-hero{min-height:520px}
}
@media(max-width:560px){
  .mm-benefits{grid-template-columns:1fr}
}
`;
async function homePage(env) {
  let featuredHtml = "";
  try {
    const products = await getLiveProducts(env, 10);
    featuredHtml = products.map(productCard).join("");
  } catch {
    featuredHtml = "";
  }
  if (!featuredHtml) {
    featuredHtml = `<p class="empty">New pieces are on the way.</p>`;
  }
  const homeTitle = "Maison Marnier \u2014 Curated Home Decor";
  const homeDescription = "Premium curated home decor for calm European interiors. Shop lighting, objects, textiles and seasonal edits.";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#12100e">
${gtmHeadHtml()}
<title>${esc(homeTitle)}</title>
<meta name="description" content="${esc(homeDescription)}">
${seoHeadHtml({
    title: homeTitle,
    description: homeDescription,
    canonical: "/",
    ogImage: DEFAULT_OG_IMAGE,
    ogType: "website"
  })}
${jsonLdScript(organizationWebsiteJsonLd())}
${fontLinksHtml()}
<style>${HOME_CSS}</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Free shipping on orders over \u20AC100 \xB7 Europe</div>
<header class="site-nav">
  <a class="brand" href="/">MAISON <span>MARNIER</span></a>
  <nav class="links">
    <a href="/collections/new">New</a>
    <a href="/collections/decor">Decor</a>
    <a href="/collections/lighting">Lighting</a>
    <a href="/collections/seasonal">Seasonal</a>
    <a href="/collections/objects">Objects</a>
    <a href="/journal">Journal</a>
  </nav>
  <div class="tools">
    <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
  </div>
</header>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-hero-inner">
      <span class="mm-kicker">Curated for quieter rooms</span>
      <h1>Live with <em>fewer</em>, better pieces</h1>
      <p class="lead">Bold edits for cozy European homes \u2014 lighting, objects and seasonal texture without the noise.</p>
      <div class="mm-actions">
        <a class="btn" href="/collections/new">Shop new arrivals</a>
        <a class="btn btn-ghost" href="/collections/decor">Browse decor</a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="categories">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Shop the house</h2>
        <a href="/collections/decor">View all \u2192</a>
      </div>
      <div class="mm-cats">
        <a class="mm-cat" href="/collections/lighting"><img src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80" alt="Lighting" loading="lazy"><span>Lighting</span></a>
        <a class="mm-cat" href="/collections/objects"><img src="https://images.unsplash.com/photo-1578508907020-040944bfea4a?auto=format&fit=crop&w=900&q=80" alt="Objects" loading="lazy"><span>Objects</span></a>
        <a class="mm-cat" href="/collections/textiles"><img src="https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80" alt="Textiles" loading="lazy"><span>Textiles</span></a>
        <a class="mm-cat" href="/collections/candles"><img src="https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=80" alt="Candles" loading="lazy"><span>Candles</span></a>
      </div>
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>New arrivals</h2>
        <a href="/collections/new">View all \u2192</a>
      </div>
      <div class="mm-products grid">${featuredHtml}</div>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Seasonal edit</span>
      <h2>Warm layers for slower nights</h2>
      <p>Soft light, tactile detail and pieces that make a room feel finished \u2014 not decorated.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Shop seasonal</a></div>
    </div>
    <div class="mm-band-img" role="img" aria-label="Cozy seasonal interior"></div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>EU shipping</strong><span>Partner fulfilment across Europe.</span></div>
    <div class="mm-benefit"><strong>30-day returns</strong><span>Clear, simple and fair.</span></div>
    <div class="mm-benefit"><strong>Edited catalog</strong><span>Fewer SKUs, chosen with care.</span></div>
    <div class="mm-benefit"><strong>Secure checkout</strong><span>Stripe \xB7 VAT calculated at payment.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal/quiet-living-room" style="background-image:url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80')">
      <div><span class="mm-kicker">Journal</span><h3>The quiet living room</h3><p>Layer light and natural materials without over-styling the space.</p></div>
    </a>
    <a class="mm-story" href="/journal/objects-worth-keeping" style="background-image:url('https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80')">
      <div><span class="mm-kicker">Journal</span><h3>Objects worth keeping</h3><p>How we choose pieces that stay relevant past a single season.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Stay close to the maison</h2>
      <p>New edits and seasonal notes \u2014 occasionally, not constantly.</p>
    </div>
    <form class="mm-form" id="form">
      <input required type="email" placeholder="Your email" aria-label="Email">
      <button type="submit">Subscribe</button>
    </form>
  </section>
</main>

<footer class="site-footer">
  <div class="footer-grid">
    <div><div class="brand">MAISON <span>MARNIER</span></div><p class="muted" style="margin-top:12px;max-width:34ch">Curated home objects for quieter rooms and slower evenings.</p></div>
    <div><h4>Shop</h4><a href="/collections/new">New Arrivals</a><a href="/collections/decor">Decor</a><a href="/collections/seasonal">Seasonal</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a></div>
  </div>
  <div class="bottom"><span>\xA9 2026 Maison Marnier.</span><span>Europe \xB7 EUR \u20AC</span></div>
</footer>
<div class="toast" id="toast"></div>
<script>
const t=document.getElementById('toast');
function toast(m){if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
document.getElementById('form').onsubmit=e=>{e.preventDefault();toast('Thanks \u2014 welcome to Maison Marnier.');e.target.reset()};
(function(){
  function count(){try{return (JSON.parse(localStorage.getItem('mm_cart')||'[]')||[]).reduce((s,i)=>s+Number(i.qty||1),0)}catch(e){return 0}}
  function paint(){const el=document.getElementById('cartCount'); if(!el)return; const n=count(); el.textContent=n?('('+n+')'):'';}
  paint(); window.addEventListener('mm-cart',paint);
})();
<\/script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=300",
      "x-frame-options": "SAMEORIGIN",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}
__name(homePage, "homePage");

// src/pages/admin.js
function adminPage() {
  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Maison Marnier Admin</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f6f2eb;color:#211f1b;font:14px system-ui,-apple-system,sans-serif}
a{color:#6e665d}
.wrap{max-width:1320px;margin:auto;padding:28px 20px}
h1,h2,h3{font-family:Georgia,serif;font-weight:400;margin:0}
h1{font-size:36px}
h2{font-size:22px;margin:0 0 12px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
.layout{display:grid;grid-template-columns:220px 1fr;gap:18px}
.side{background:#fff;border:1px solid #d4cec4;padding:12px}
.sideBtn{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;margin:2px 0;font:inherit;cursor:pointer;border-radius:4px}
.sideBtn.active,.sideBtn:hover{background:#efe7da}
.panel{display:none;background:#fff;border:1px solid #d4cec4;padding:18px}
.panel.active{display:block}
.auth,.searchbar,.row{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
input,textarea,select{padding:10px;border:1px solid #d4cec4;background:#fff;font:inherit;width:100%}
textarea{min-height:110px}
.auth input{width:260px}
.searchbar input{flex:1;min-width:180px}
.btn{border:0;background:#24211d;color:#fff;padding:10px 14px;cursor:pointer;font:inherit}
.btn.secondary{background:#efe7da;color:#211f1b;border:1px solid #d4cec4}
.btn:disabled{opacity:.5;cursor:not-allowed}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
.kpi{background:#f6f2eb;border:1px solid #d4cec4;padding:14px}
.kpi b{display:block;font:400 28px Georgia,serif}
.msg{margin:10px 0;color:#6e665d;min-height:1.2em}
.msg.err{color:#8b2e2e}
.card{border:1px solid #d4cec4;padding:12px;margin:10px 0;background:#faf7f2}
.card img{width:72px;height:96px;object-fit:cover;background:#e9e0d3}
.card .cols{display:grid;grid-template-columns:84px 1fr;gap:12px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.hidden{display:none!important}
table{width:100%;border-collapse:collapse}
td,th{border-bottom:1px solid #e4ddd2;padding:8px;text-align:left;vertical-align:top}
.login-gate{max-width:420px;margin:80px auto;background:#fff;border:1px solid #d4cec4;padding:28px}
@media(max-width:900px){.layout{grid-template-columns:1fr}.kpis{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}}
</style>
</head>
<body>
<div id="loginView" class="login-gate">
  <h1>Maison Marnier</h1>
  <p style="color:#6e665d">Admin access. Use the Bearer admin token from Cloudflare secrets.</p>
  <div class="auth">
    <input id="adminToken" type="password" placeholder="LUME_ADMIN_TOKEN" autocomplete="current-password">
    <button class="btn" type="button" id="loginBtn">Enter</button>
  </div>
  <div class="msg" id="loginMsg"></div>
</div>

<div id="app" class="wrap hidden">
  <div class="top">
    <div>
      <h1>Admin</h1>
      <p style="color:#6e665d;margin:6px 0 0">Catalog \xB7 homepage \xB7 journal</p>
    </div>
    <div>
      <a href="/" target="_blank">View storefront</a>
      \xB7 <button class="btn secondary" type="button" id="logoutBtn">Log out</button>
    </div>
  </div>
  <div class="layout">
    <aside class="side" id="side">
      <button class="sideBtn active" data-panel="overview" type="button">Overview</button>
      <button class="sideBtn" data-panel="finder" type="button">Product Finder</button>
      <button class="sideBtn" data-panel="products" type="button">Draft Products</button>
      <button class="sideBtn" data-panel="published" type="button">Published</button>
      <button class="sideBtn" data-panel="homepage" type="button">Homepage</button>
      <button class="sideBtn" data-panel="orders" type="button">Orders</button>
      <button class="sideBtn" data-panel="journal" type="button">Journal</button>
      <button class="sideBtn" data-panel="settings" type="button">Settings</button>
    </aside>
    <div>
      <section class="panel active" id="panel-overview">
        <h2>Overview</h2>
        <div class="kpis">
          <div class="kpi"><span>Drafts</span><b id="kpiDrafts">\u2014</b></div>
          <div class="kpi"><span>Live</span><b id="kpiLive">\u2014</b></div>
          <div class="kpi"><span>Journal</span><b id="kpiJournal">\u2014</b></div>
          <div class="kpi"><span>CJ</span><b id="kpiCJ">\u2014</b></div>
        </div>
        <div class="msg" id="overviewMsg"></div>
      </section>

      <section class="panel" id="panel-finder">
        <h2>CJ Product Finder</h2>
        <div class="searchbar">
          <input id="cjQ" placeholder="Search CJ products\u2026">
          <button class="btn" type="button" id="cjSearchBtn">Search</button>
        </div>
        <div class="msg" id="finderMsg"></div>
        <div id="cjResults"></div>
      </section>

      <section class="panel" id="panel-products">
        <h2>Draft Products</h2>
        <div class="row">
          <button class="btn" type="button" id="publishAllBtn">Publish all</button>
          <span class="msg" style="margin:0">Publishes drafts that have name, image, retail&gt;0, cost&gt;0, stock&gt;0, and a slug.</span>
        </div>
        <div class="msg" id="draftsMsg"></div>
        <div id="drafts"></div>
      </section>

      <section class="panel" id="panel-published">
        <h2>Published</h2>
        <div class="msg" id="publishedMsg"></div>
        <div id="published"></div>
      </section>

      <section class="panel" id="panel-homepage">
        <h2>Homepage content</h2>
        <p style="color:#6e665d">Image and link fields for hero, categories, seasonal and story cards.</p>
        <div id="homeFields" class="grid2"></div>
        <button class="btn" type="button" id="saveHomeBtn">Save homepage</button>
        <div class="msg" id="homeMsg"></div>
      </section>

      <section class="panel" id="panel-orders">
        <h2>Orders</h2>
        <p style="color:#6e665d">Stripe payments and CJ fulfillment status.</p>
        <button class="btn secondary" type="button" id="reloadOrdersBtn">Refresh</button>
        <div class="msg" id="ordersMsg"></div>
        <div id="ordersList"></div>
      </section>
      <section class="panel" id="panel-journal">
        <h2>Journal CMS</h2>
        <div class="card">
          <input type="hidden" id="jId">
          <div class="grid2">
            <div><label>Title</label><input id="jTitle"></div>
            <div><label>Slug</label><input id="jSlug" placeholder="auto from title"></div>
          </div>
          <label>Excerpt</label><input id="jExcerpt">
          <label>Image URL</label><input id="jImage">
          <label>Body</label><textarea id="jBody"></textarea>
          <div class="row">
            <select id="jStatus"><option value="draft">draft</option><option value="live">live</option></select>
            <button class="btn" type="button" id="saveJournalBtn">Save article</button>
            <button class="btn secondary" type="button" id="newJournalBtn">New</button>
          </div>
        </div>
        <div class="msg" id="journalMsg"></div>
        <div id="journalList"></div>
      </section>

      <section class="panel" id="panel-settings">
        <h2>Settings</h2>
        <table>
          <tr><th>CJ API</th><td id="setCJ">\u2014</td></tr>
          <tr><th>D1 binding</th><td id="setD1">\u2014</td></tr>
          <tr><th>Storefront</th><td><a href="/" target="_blank">maisonmarnier.com</a></td></tr>
          <tr><th>Import automation</th><td>POST /api/lume/import with header <code>x-lume-import-code</code></td></tr>
        </table>
        <div class="msg" id="settingsMsg"></div>
        <button class="btn secondary" type="button" id="probeCJBtn">Probe CJ auth</button>
      </section>
    </div>
  </div>
</div>
<script>
const TOKEN_KEY='lumeAdminToken';
const HOME_KEYS=['hero_image','hero_link','cat_textiles_image','cat_textiles_link','cat_objects_image','cat_objects_link','cat_candles_image','cat_candles_link','cat_wall_image','cat_wall_link','cat_seasonal_image','cat_seasonal_link','season_image','season_link','story_quiet_image','story_quiet_link','story_objects_image','story_objects_link'];
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function token(){return sessionStorage.getItem(TOKEN_KEY)||''}
function hdr(){return {'content-type':'application/json','authorization':'Bearer '+token()}}
function msg(id,text,err){const el=document.getElementById(id);if(!el)return;el.textContent=text||'';el.className='msg'+(err?' err':'')}
async function api(path,opts={}){
  const r=await fetch(path,{...opts,headers:{...hdr(),...(opts.headers||{})}});
  const d=await r.json().catch(()=>({ok:false,error:'Invalid JSON'}));
  if(r.status===401){logout(true);throw new Error('Unauthorized')}
  return d;
}
function logout(soft){
  sessionStorage.removeItem(TOKEN_KEY);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginView').classList.remove('hidden');
  if(!soft)msg('loginMsg','Logged out.');
}
function goAdmin(id){
  document.querySelectorAll('.sideBtn').forEach(b=>b.classList.toggle('active',b.dataset.panel===id));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+id));
}
async function boot(){
  if(!token())return;
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  await loadAdminAll();
}
document.getElementById('loginBtn').onclick=async()=>{
  const v=document.getElementById('adminToken').value.trim();
  if(!v){msg('loginMsg','Enter the admin token.',true);return}
  sessionStorage.setItem(TOKEN_KEY,v);
  try{
    const d=await api('/api/cj/status');
    if(!d.ok&&d.error==='Unauthorized')throw new Error('Unauthorized');
    msg('loginMsg','');
    boot();
  }catch(e){
    sessionStorage.removeItem(TOKEN_KEY);
    msg('loginMsg','Invalid admin token.',true);
  }
};
document.getElementById('logoutBtn').onclick=()=>logout();
document.getElementById('side').onclick=e=>{
  const b=e.target.closest('.sideBtn');if(!b)return;goAdmin(b.dataset.panel);
};
document.getElementById('cjSearchBtn').onclick=()=>searchCJ();
document.getElementById('cjQ').addEventListener('keydown',e=>{if(e.key==='Enter')searchCJ()});
document.getElementById('saveHomeBtn').onclick=()=>saveHomeContent();
document.getElementById('saveJournalBtn').onclick=()=>saveJournal();
document.getElementById('newJournalBtn').onclick=()=>clearJournalForm();
document.getElementById('probeCJBtn').onclick=()=>checkCJStatus(true);
document.getElementById('reloadOrdersBtn').onclick=()=>loadOrders();
document.getElementById('publishAllBtn').onclick=()=>publishAllDrafts();

async function checkCJStatus(show){
  try{
    const d=await api('/api/cj/status');
    const label=d.authenticated?'OK':(d.configured?'Key set, auth failed':'Not configured');
    document.getElementById('kpiCJ').textContent=d.authenticated?'OK':(d.configured?'!':'\u2014');
    document.getElementById('setCJ').textContent=label+(d.error?': '+d.error:'');
    document.getElementById('setD1').textContent='LUME_DB bound';
    if(show)msg('settingsMsg',label,!d.authenticated);
  }catch(e){if(show)msg('settingsMsg',e.message,true)}
}

async function loadAdminAll(){
  msg('overviewMsg','Loading\u2026');
  await checkCJStatus(false);
  const [products, journal]=await Promise.all([
    api('/api/lume/products'),
    api('/api/lume/journal'),
  ]);
  const list=products.products||[];
  const drafts=list.filter(p=>p.status!=='live');
  const live=list.filter(p=>p.status==='live');
  document.getElementById('kpiDrafts').textContent=String(drafts.length);
  document.getElementById('kpiLive').textContent=String(live.length);
  document.getElementById('kpiJournal').textContent=String((journal.articles||[]).length);
  renderDrafts(drafts);
  renderPublished(live);
  renderJournal(journal.articles||[]);
  await loadHomeContent();
  await loadOrders();
  msg('overviewMsg','Ready.');
}

async function searchCJ(){
  const q=document.getElementById('cjQ').value.trim()||'home decor';
  msg('finderMsg','Searching\u2026');
  const d=await api('/api/cj/search?q='+encodeURIComponent(q)+'&size=24');
  if(!d.ok){msg('finderMsg',d.error||'Search failed',true);return}
  msg('finderMsg',(d.products||[]).length+' results');
  document.getElementById('cjResults').innerHTML=(d.products||[]).map(p=>{
    const retail=p.suggestedRetailEUR||Math.max(19.95,Math.ceil(Number(p.costUSD||0)*2.5)-0.05);
    return \`<div class="card"><div class="cols">
      <img src="\${esc(p.image||'')}" alt="">
      <div>
        <strong>\${esc(p.name||'')}</strong>
        <div class="msg">SKU \${esc(p.sku||'')} \xB7 cost $\${Number(p.costUSD||0).toFixed(2)} \xB7 stock \${esc(p.stock)} \xB7 \${esc(p.category||'')}</div>
        <button class="btn" type="button" data-import='\${esc(JSON.stringify({id:p.id,name:p.name,sku:p.sku,image:p.image,costUSD:p.costUSD,retailPriceEUR:retail,stock:p.stock,deliveryDays:p.deliveryDays,category:p.category}))}'>Import draft</button>
      </div></div></div>\`;
  }).join('')||'<p class="msg">No products.</p>';
  document.getElementById('cjResults').onclick=async e=>{
    const b=e.target.closest('[data-import]');if(!b)return;
    const payload=JSON.parse(b.getAttribute('data-import'));
    b.disabled=true;
    const r=await api('/api/lume/import',{method:'POST',body:JSON.stringify(payload)});
    b.disabled=false;
    msg('finderMsg',r.ok?'Imported '+r.lumeSku:(r.error||'Import failed'),!r.ok);
    if(r.ok)loadAdminAll();
  };
}

async function publishAllDrafts(){
  if(!confirm('Publish all valid drafts? Invalid drafts will be skipped.'))return;
  const btn=document.getElementById('publishAllBtn');
  btn.disabled=true;
  try{
    const r=await api('/api/lume/publish-all',{method:'POST',body:'{}'});
    if(!r.ok){msg('draftsMsg',r.error||'Publish all failed',true);return}
    msg('draftsMsg','Published '+r.published+' \xB7 skipped '+r.skipped+(r.errors&&r.errors.length?' \xB7 first skip: '+(r.errors[0].error||''):''));
    await loadAdminAll();
  }catch(e){msg('draftsMsg',e.message||'Publish all failed',true)}
  finally{btn.disabled=false}
}

function renderDrafts(drafts){
  const box=document.getElementById('drafts');
  if(!drafts.length){box.innerHTML='<p class="msg">No drafts.</p>';return}
  box.innerHTML=drafts.map(p=>\`<div class="card" data-id="\${p.id}">
    <div class="cols">
      <img src="\${esc(p.image_url||'')}" alt="">
      <div>
        <div class="grid2">
          <div><label>Name</label><input data-f="name" value="\${esc(p.name||'')}"></div>
          <div><label>Slug</label><input data-f="slug" value="\${esc(p.slug||'')}"></div>
          <div><label>Category</label><input data-f="category" value="\${esc(p.category||'')}"></div>
          <div><label>Retail EUR</label><input data-f="retail_price_eur" value="\${esc(p.retail_price_eur||'')}"></div>
          <div><label>Compare EUR</label><input data-f="compare_at_price_eur" value="\${esc(p.compare_at_price_eur||'')}"></div>
          <div><label>Image URL</label><input data-f="image_url" value="\${esc(p.image_url||'')}"></div>
        </div>
        <label>Description</label><textarea data-f="description">\${esc(p.description||'')}</textarea>
        <div class="msg">SKU \${esc(p.lume_sku)} \xB7 cost $\${Number(p.supplier_cost_usd||0).toFixed(2)} \xB7 stock \${esc(p.stock)} \xB7 \${esc(p.status)}</div>
        <div class="row">
          <button class="btn" type="button" data-act="save">Save</button>
          <button class="btn secondary" type="button" data-act="refresh">Refresh CJ</button>
          <button class="btn" type="button" data-act="publish">Publish</button>
        </div>
      </div>
    </div>
  </div>\`).join('');
  box.onclick=async e=>{
    const btn=e.target.closest('[data-act]');if(!btn)return;
    const card=btn.closest('.card');const id=Number(card.dataset.id);
    const fields={};card.querySelectorAll('[data-f]').forEach(i=>fields[i.dataset.f]=i.value);
    btn.disabled=true;
    try{
      if(btn.dataset.act==='save'){
        const r=await api('/api/lume/update',{method:'POST',body:JSON.stringify({id,...fields})});
        msg('draftsMsg',r.ok?'Saved.':(r.error||'Save failed'),!r.ok);
      }else if(btn.dataset.act==='publish'){
        const r=await api('/api/lume/publish',{method:'POST',body:JSON.stringify({id})});
        msg('draftsMsg',r.ok?'Published.':(r.error||'Publish failed'),!r.ok);
        if(r.ok)loadAdminAll();
      }else if(btn.dataset.act==='refresh'){
        const r=await api('/api/lume/refresh',{method:'POST',body:JSON.stringify({id})});
        msg('draftsMsg',r.ok?('Refreshed cost $'+Number(r.supplier_cost_usd).toFixed(2)+' \xB7 stock '+r.stock):(r.error||'Refresh failed'),!r.ok);
        if(r.ok)loadAdminAll();
      }
    }finally{btn.disabled=false}
  };
}

function renderPublished(live){
  const box=document.getElementById('published');
  if(!live.length){box.innerHTML='<p class="msg">No live products.</p>';return}
  box.innerHTML=\`<table><tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr>\${live.map(p=>\`<tr>
    <td><strong>\${esc(p.name)}</strong><div class="msg">\${esc(p.lume_sku)} \xB7 \${esc(p.category||'')}</div></td>
    <td>\u20AC\${Number(p.retail_price_eur||0).toFixed(2)}</td>
    <td>\${esc(p.stock)}</td>
    <td><a href="/products/\${encodeURIComponent(p.slug||'')}" target="_blank">View</a></td>
  </tr>\`).join('')}</table>\`;
}

async function loadHomeContent(){
  const d=await api('/api/lume/home');
  const c=d.content||{};
  const box=document.getElementById('homeFields');
  box.innerHTML=HOME_KEYS.map(k=>\`<div><label>\${k}</label><input data-home="\${k}" value="\${esc(c[k]||'')}"></div>\`).join('');
}
async function saveHomeContent(){
  const body={};
  document.querySelectorAll('[data-home]').forEach(i=>body[i.dataset.home]=i.value);
  const r=await api('/api/lume/home',{method:'POST',body:JSON.stringify(body)});
  msg('homeMsg',r.ok?('Saved '+r.saved+' fields.'):(r.error||'Save failed'),!r.ok);
}

function clearJournalForm(){
  ['jId','jTitle','jSlug','jExcerpt','jImage','jBody'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('jStatus').value='draft';
}
function renderJournal(articles){
  const box=document.getElementById('journalList');
  if(!articles.length){box.innerHTML='<p class="msg">No articles yet.</p>';return}
  box.innerHTML=articles.map(a=>\`<div class="card">
    <strong>\${esc(a.title)}</strong> \xB7 <code>\${esc(a.slug)}</code> \xB7 \${esc(a.status)}
    <div class="row">
      <button class="btn secondary" type="button" data-jed="\${a.id}">Edit</button>
      <button class="btn secondary" type="button" data-jdel="\${a.id}">Delete</button>
      \${a.status==='live'?\`<a href="/journal/\${encodeURIComponent(a.slug)}" target="_blank">View</a>\`:''}
    </div>
  </div>\`).join('');
  box.onclick=async e=>{
    const ed=e.target.closest('[data-jed]');
    const del=e.target.closest('[data-jdel]');
    if(ed){
      const a=articles.find(x=>String(x.id)===ed.dataset.jed);if(!a)return;
      document.getElementById('jId').value=a.id;
      document.getElementById('jTitle').value=a.title||'';
      document.getElementById('jSlug').value=a.slug||'';
      document.getElementById('jExcerpt').value=a.excerpt||'';
      document.getElementById('jImage').value=a.image_url||'';
      document.getElementById('jBody').value=a.body||'';
      document.getElementById('jStatus').value=a.status||'draft';
      msg('journalMsg','Editing #'+a.id);
    }
    if(del){
      if(!confirm('Delete this article?'))return;
      const r=await api('/api/lume/journal',{method:'DELETE',body:JSON.stringify({id:Number(del.dataset.jdel)})});
      msg('journalMsg',r.ok?'Deleted.':(r.error||'Delete failed'),!r.ok);
      if(r.ok)loadAdminAll();
    }
  };
}
async function saveJournal(){
  const body={
    id:document.getElementById('jId').value||undefined,
    title:document.getElementById('jTitle').value,
    slug:document.getElementById('jSlug').value,
    excerpt:document.getElementById('jExcerpt').value,
    image_url:document.getElementById('jImage').value,
    body:document.getElementById('jBody').value,
    status:document.getElementById('jStatus').value,
  };
  const r=await api('/api/lume/journal',{method:'POST',body:JSON.stringify(body)});
  msg('journalMsg',r.ok?('Saved '+r.slug):(r.error||'Save failed'),!r.ok);
  if(r.ok){clearJournalForm();loadAdminAll()}
}


async function loadOrders(){
  try{
    const d=await api('/api/lume/orders');
    if(!d.ok){msg('ordersMsg',d.error||'Failed',true);return}
    const box=document.getElementById('ordersList');
    const orders=d.orders||[];
    document.getElementById('kpiLive');
    if(!orders.length){box.innerHTML='<p class="msg">No orders yet.</p>';msg('ordersMsg','');return}
    box.innerHTML='<table><tr><th>Order</th><th>Status</th><th>Total</th><th>CJ</th><th></th></tr>'+orders.map(o=>\`<tr>
      <td><strong>\${esc(o.order_number)}</strong><div class="msg">\${esc(o.email||o.customer_name||'')}</div></td>
      <td>\${esc(o.status)}</td>
      <td>\u20AC\${Number(o.total_eur||0).toFixed(2)}</td>
      <td>\${esc(o.cj_order_id||'\u2014')}<div class="msg">\${esc(o.cj_status||o.cj_error||'')}</div></td>
      <td>
        \${(o.status==='fulfill_failed'||o.status==='paid')&&!o.cj_order_id?\`<button class="btn secondary" type="button" data-fulfill="\${o.id}">Retry CJ</button>\`:''}
        \${o.cj_order_id?\`<button class="btn secondary" type="button" data-orefresh="\${o.id}">Refresh CJ</button>\`:''}
        <button class="btn secondary" type="button" data-odetail="\${o.id}">Details</button>
      </td>
    </tr>\`).join('')+'</table>';
    box.onclick=async e=>{
      const f=e.target.closest('[data-fulfill]');
      const r=e.target.closest('[data-orefresh]');
      const dbtn=e.target.closest('[data-odetail]');
      if(f){
        f.disabled=true;
        const res=await api('/api/lume/orders/fulfill',{method:'POST',body:JSON.stringify({id:Number(f.dataset.fulfill)})});
        msg('ordersMsg',res.ok?('CJ order '+ (res.cjOrderId||'ok')):(res.error||'Failed'),!res.ok);
        f.disabled=false; if(res.ok)loadOrders();
      }
      if(r){
        r.disabled=true;
        const res=await api('/api/lume/orders/refresh',{method:'POST',body:JSON.stringify({id:Number(r.dataset.orefresh)})});
        msg('ordersMsg',res.ok?('CJ status '+res.cjStatus):(res.error||'Failed'),!res.ok);
        r.disabled=false; if(res.ok)loadOrders();
      }
      if(dbtn){
        const res=await api('/api/lume/orders?id='+dbtn.dataset.odetail);
        if(!res.ok){msg('ordersMsg',res.error||'Failed',true);return}
        const items=(res.items||[]).map(i=>i.quantity+'\xD7 '+i.name).join(', ');
        msg('ordersMsg',res.order.order_number+': '+items+(res.order.shipping_city?(' \u2192 '+res.order.shipping_city):''));
      }
    };
    msg('ordersMsg',orders.length+' orders');
  }catch(e){msg('ordersMsg',e.message,true)}
}

if(token())boot();
<\/script>
</body>
</html>`, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex,nofollow"
    }
  });
}
__name(adminPage, "adminPage");

// src/pages/cart.js
function cartPage(url) {
  const cancelled = url.searchParams.get("cancelled") === "1";
  const body = `
<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/">Home</a><span class="sep">/</span>
  <span>Cart</span>
</nav>
<div class="head">
  <div>
    <h1>Your cart</h1>
    <p class="lead">Free shipping on orders over \u20AC100.</p>
  </div>
</div>
${cancelled ? '<p class="muted" style="margin-bottom:18px">Checkout was cancelled \u2014 your cart is still here.</p>' : ""}
<div id="cartRoot" class="empty">Loading cart\u2026</div>
<script>
(function(){
  const KEY='mm_cart';
  const root=document.getElementById('cartRoot');
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  function save(c){localStorage.setItem(KEY,JSON.stringify(c));window.dispatchEvent(new Event('mm-cart'));}
  function money(n){return '\u20AC'+Number(n||0).toFixed(2)}
  function render(){
    const cart=load();
    if(!cart.length){
      root.className='empty';
      root.innerHTML='Your cart is empty. <a href="/collections/new">Browse new arrivals \u2192</a>';
      return;
    }
    const sub=cart.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||1),0);
    const ship=sub>=100?0:6.9;
    root.className='cart-layout';
    root.innerHTML='<div class="cart-lines">'+cart.map((i,idx)=>\`
      <div class="cart-line">
        <img src="\${String(i.image||'').replace(/"/g,'&quot;')}" alt="">
        <div>
          <a href="/products/\${encodeURIComponent(i.slug||'')}"><strong>\${String(i.name||'').replace(/</g,'&lt;')}</strong></a>
          <div class="muted">\${money(i.price)}</div>
          <label class="muted">Qty <input data-idx="\${idx}" class="qty" type="number" min="1" max="20" value="\${Number(i.qty||1)}"></label>
          <button type="button" data-rm="\${idx}" class="rm">Remove</button>
        </div>
        <div>\${money(Number(i.price||0)*Number(i.qty||1))}</div>
      </div>\`).join('')+'</div>'+
      \`<aside class="cart-summary">
        <h2>Summary</h2>
        <div class="row"><span>Subtotal</span><span>\${money(sub)}</span></div>
        <div class="row muted"><span>Shipping</span><span>\${ship?money(ship):'Free'}</span></div>
        <div class="row total"><span>Total</span><span>\${money(sub+ship)}</span></div>
        <div class="buy-actions" style="margin-top:18px;flex-direction:column;align-items:stretch">
          <button class="btn btn-block" type="button" id="checkoutBtn">Checkout with Stripe</button>
          <button class="btn btn-ghost btn-block" type="button" id="clearCartBtn">Clear cart</button>
        </div>
        <p class="muted" id="cartMsg" style="margin-top:12px"></p>
      </aside>\`;
    root.querySelectorAll('.qty').forEach(inp=>{
      inp.onchange=()=>{
        const c=load(); const i=Number(inp.dataset.idx);
        c[i].qty=Math.max(1,Math.min(20,Number(inp.value)||1)); save(c); render();
      };
    });
    root.querySelectorAll('[data-rm]').forEach(btn=>{
      btn.onclick=()=>{ const c=load(); c.splice(Number(btn.dataset.rm),1); save(c); render(); };
    });
    document.getElementById('clearCartBtn').onclick=()=>{save([]);render()};
    document.getElementById('checkoutBtn').onclick=async()=>{
      const msg=document.getElementById('cartMsg');
      const cart=load();
      if(!cart.length)return;
      msg.textContent='Redirecting to Stripe\u2026';
      document.getElementById('checkoutBtn').disabled=true;
      try{
        const r=await fetch('/api/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:cart.map(i=>({productId:i.id,quantity:i.qty}))})});
        const d=await r.json();
        if(!d.ok||!d.url){msg.textContent=d.error||'Checkout failed';document.getElementById('checkoutBtn').disabled=false;return}
        location.href=d.url;
      }catch(e){msg.textContent='Checkout failed';document.getElementById('checkoutBtn').disabled=false}
    };
  }
  render();
})();
<\/script>`;
  return htmlPage("Cart", body, {
    description: "Your Maison Marnier cart.",
    canonical: "/cart",
    noindex: true
  });
}
__name(cartPage, "cartPage");
function checkoutSuccessPageHtml(orderId) {
  const id = String(orderId || "").slice(0, 64);
  const body = `
<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/">Home</a><span class="sep">/</span>
  <span>Order confirmed</span>
</nav>
<div class="head">
  <div>
    <h1>Thank you</h1>
    <p class="lead">Your order is confirmed. We\u2019ll email updates as it moves to fulfilment.</p>
  </div>
</div>
${id ? `<p class="muted">Order reference: <strong>${id.replace(/</g, "&lt;")}</strong></p>` : ""}
<p style="margin-top:24px"><a class="btn" href="/collections/new">Continue shopping</a></p>
<script>try{localStorage.removeItem('mm_cart');window.dispatchEvent(new Event('mm-cart'))}catch(e){}<\/script>`;
  return htmlPage("Order confirmed", body, {
    description: "Your Maison Marnier order is confirmed.",
    canonical: "/checkout/success",
    noindex: true
  });
}
__name(checkoutSuccessPageHtml, "checkoutSuccessPageHtml");

// src/pages/collection.js
var COLLECTION_RULES = {
  new: { categories: [], keywords: [], blurb: "Fresh arrivals for calm, considered rooms." },
  decor: {
    categories: ["Decor", "Objects", "Wall Decor", "Candles", "Lighting", "Textiles", "Seasonal"],
    keywords: ["decor", "ornament", "home"],
    blurb: "The broader edit \u2014 objects, light, and quiet detail."
  },
  textiles: {
    categories: ["Textiles"],
    keywords: ["pillow", "cushion", "textile", "throw", "blanket", "linen"],
    blurb: "Soft layers for sofas, beds, and reading corners."
  },
  objects: {
    categories: ["Objects"],
    keywords: ["vase", "ornament", "sculpture", "tray", "object", "statue"],
    blurb: "Small sculptural pieces that settle a shelf."
  },
  candles: {
    categories: ["Candles"],
    keywords: ["candle", "diffuser", "fragrance", "incense", "candlestick"],
    blurb: "Warm light and quiet fragrance for evening rooms."
  },
  "wall-decor": {
    categories: ["Wall Decor"],
    keywords: ["wall", "tapestry", "poster", "mirror", "frame", "decal"],
    blurb: "Wall stories \u2014 tapestries, decals, and hangings."
  },
  seasonal: {
    categories: ["Seasonal"],
    keywords: ["christmas", "seasonal", "holiday", "xmas", "santa"],
    blurb: "Seasonal accents without the visual noise."
  },
  lighting: {
    categories: ["Lighting"],
    keywords: ["lamp", "light", "lantern", "led", "projector"],
    blurb: "Soft glow for desks, windows, and night tables."
  },
  furniture: {
    categories: ["Furniture"],
    keywords: ["table", "chair", "shelf", "stool", "cabinet", "furniture"],
    blurb: "Useful forms for slower living."
  }
};
var CHIP_LINKS = [
  ["New", "/collections/new"],
  ["Decor", "/collections/decor"],
  ["Lighting", "/collections/lighting"],
  ["Seasonal", "/collections/seasonal"],
  ["Objects", "/collections/objects"],
  ["Candles", "/collections/candles"],
  ["Wall Decor", "/collections/wall-decor"],
  ["Textiles", "/collections/textiles"]
];
function matchesCollection(p, rule) {
  const cat = String(p.category || "").trim();
  if (rule.categories.length && rule.categories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
    return true;
  }
  if (!rule.keywords.length) return !rule.categories.length;
  const t = ((p.name || "") + " " + cat).toLowerCase();
  return rule.keywords.some((w) => t.includes(w));
}
__name(matchesCollection, "matchesCollection");
async function collectionPage(url, env) {
  try {
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "").toLowerCase();
    const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
    if (!slug || !(slug in COLLECTION_RULES)) {
      return htmlPage(
        "Collection not found",
        `<div class="head"><h1>Collection not found</h1></div>
         <p class="empty">This collection does not exist. <a href="/collections/decor">Browse decor \u2192</a></p>`,
        { status: 404 }
      );
    }
    let all = await getLiveProducts(env, 200);
    if (q) {
      const qq = q.toLowerCase();
      all = all.filter((p) => {
        const t = ((p.name || "") + " " + (p.category || "") + " " + (p.description || "")).toLowerCase();
        return t.includes(qq);
      });
    }
    const rule = COLLECTION_RULES[slug];
    const ps = slug === "new" || !rule.categories.length && !rule.keywords.length ? all : all.filter((p) => matchesCollection(p, rule));
    const title = q ? `Search: ${q}` : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const lead = q ? `${ps.length} result${ps.length === 1 ? "" : "s"} for \u201C${esc(q)}\u201D` : rule.blurb || "An edited selection for calm, considered rooms.";
    const chips = CHIP_LINKS.map(
      ([label, href]) => `<a class="chip${href.endsWith("/" + slug) ? " is-active" : ""}" href="${href}">${esc(label)}</a>`
    ).join("");
    const cards = ps.map(productCard).join("") || `<p class="empty">${q ? "No products match this search." : "No published products in this collection yet."}</p>`;
    const collectionPath = `/collections/${slug}`;
    const description = q ? `Search results for \u201C${q}\u201D at Maison Marnier.` : `${rule.blurb || "An edited selection for calm, considered rooms."} Shop ${title} at Maison Marnier.`;
    const jsonLd = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Shop", path: "/collections/new" },
      { name: title, path: collectionPath }
    ]);
    return htmlPage(
      title,
      `<nav class="crumbs" aria-label="Breadcrumb">
         <a href="/">Home</a><span class="sep">/</span>
         <a href="/collections/new">Shop</a><span class="sep">/</span>
         <span>${esc(title)}</span>
       </nav>
       <section class="collection-top">
         <div class="head">
           <div>
             <h1>${esc(title)}</h1>
             <p class="lead">${lead}</p>
           </div>
           <div class="head-meta">${ps.length} piece${ps.length === 1 ? "" : "s"}</div>
         </div>
       </section>
       <div class="toolbar">
         <div class="chips" role="navigation" aria-label="Collections">${chips}</div>
       </div>
       <div class="grid">${cards}</div>`,
      {
        description: description.slice(0, 160),
        canonical: collectionPath,
        noindex: Boolean(q),
        jsonLd,
        cache: "public, max-age=300"
      }
    );
  } catch {
    return htmlPage("Collection", '<h1>Collection</h1><p class="empty">Could not load this collection.</p>', {
      status: 500
    });
  }
}
__name(collectionPage, "collectionPage");

// src/pages/product.js
async function productPage(url, env) {
  try {
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "");
    const p = await getLiveProductBySlug(env, slug);
    if (!p) {
      return htmlPage(
        "Product not found",
        `<div class="head"><h1>Product not found</h1></div>
         <p class="empty">This piece is no longer available. <a href="/collections/new">See new arrivals \u2192</a></p>`,
        { status: 404 }
      );
    }
    const retail = Number(p.retail_price_eur || 0);
    const compareAt = Number(p.compare_at_price_eur || 0);
    const onSale = compareAt > retail && retail > 0;
    const savePct = onSale ? Math.round((compareAt - retail) / compareAt * 100) : 0;
    const priceBlock = `<div class="price-block">
      <span class="price-now">\u20AC${retail.toFixed(2)}</span>
      ${onSale ? `<span class="price-was">\u20AC${compareAt.toFixed(2)}</span><span class="save">Save ${savePct}%</span>` : ""}
    </div>`;
    const stock = Number(p.stock || 0);
    const stockHint = stock <= 0 ? '<p class="stock-line">Currently unavailable.</p>' : stock <= 5 ? `<p class="stock-line">Limited stock \xB7 only ${stock} remaining with our partner warehouse.</p>` : `<p class="stock-line">In stock \xB7 ships from partner warehouse.</p>`;
    const relatedAll = await getLiveProducts(env, 48);
    const related = relatedAll.filter((r) => r.slug !== p.slug).filter((r) => {
      if (!p.category) return true;
      const a = (r.category || "").toLowerCase();
      const b = (p.category || "").toLowerCase();
      return a && b && a === b;
    }).slice(0, 5);
    const relatedFallback = related.length >= 5 ? related : [
      ...related,
      ...relatedAll.filter((r) => r.slug !== p.slug && !related.some((x) => x.slug === r.slug))
    ].slice(0, 5);
    const collectionHref = p.category ? `/collections/${encodeURIComponent(String(p.category).toLowerCase().replace(/\s+/g, "-"))}` : "/collections/new";
    const relatedHtml = relatedFallback.length ? `<section class="related">
           <div class="related-head">
             <h2>You may also like</h2>
             <a class="view-all" href="${collectionHref}">View collection \u2192</a>
           </div>
           <div class="grid">${relatedFallback.map(productCard).join("")}</div>
         </section>` : "";
    const canBuy = stock > 0 && retail > 0;
    const body = `<nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="sep">/</span>
        <a href="${collectionHref}">${esc(p.category || "Shop")}</a><span class="sep">/</span>
        <span>${esc(p.name || "")}</span>
      </nav>
      <div class="product">
      <div class="product-gallery">
        <div class="frame"><img src="${esc(p.image_url || "")}" alt="${esc(p.name || "")}"></div>
      </div>
      <div class="product-buy">
        <div class="buy-panel">
          <div class="eyebrow"><a href="${collectionHref}">${esc(p.category || "Maison Marnier")}</a></div>
          <h1>${esc(p.name || "")}</h1>
          ${priceBlock}
          ${stockHint}
          <div class="desc">${esc(p.description || "Thoughtfully selected for Maison Marnier.")}</div>
          <div class="buy-actions">
          ${canBuy ? `<button class="btn" type="button" id="addCart"
                  data-id="${p.id}"
                  data-slug="${esc(p.slug || "")}"
                  data-name="${esc(p.name || "")}"
                  data-price="${retail}"
                  data-image="${esc(p.image_url || "")}">Add to cart</button>
                 <a class="btn btn-ghost" href="/cart">View cart</a>` : `<button class="btn is-disabled" type="button" disabled>Unavailable</button>`}
          </div>
          <p class="muted" style="margin-top:12px" id="addMsg"></p>
          <div class="specs">
            <div><strong>Category</strong>${esc(p.category || "Decor")}</div>
            <div><strong>Shipping</strong>Europe \xB7 partner warehouse</div>
            <div><strong>Returns</strong>30-day returns</div>
            <div><strong>Checkout</strong>Stripe \xB7 VAT at payment</div>
          </div>
          <div class="trust">
            <span><i>\u2713</i> Free shipping on orders over \u20AC100</span>
            <span><i>\u2713</i> Secure Stripe checkout</span>
            <span><i>\u2713</i> Partner fulfilment across Europe</span>
          </div>
        </div>
      </div>
    </div>${relatedHtml}
<script>
(function(){
  const btn=document.getElementById('addCart'); if(!btn)return;
  const KEY='mm_cart';
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []}}
  btn.onclick=()=>{
    const item={id:Number(btn.dataset.id),slug:btn.dataset.slug,name:btn.dataset.name,price:Number(btn.dataset.price),image:btn.dataset.image,qty:1};
    const cart=load();
    const ex=cart.find(x=>x.id===item.id);
    if(ex)ex.qty=Math.min(20,(ex.qty||1)+1); else cart.push(item);
    localStorage.setItem(KEY,JSON.stringify(cart));
    window.dispatchEvent(new Event('mm-cart'));
    const m=document.getElementById('addMsg');
    if(m){m.innerHTML='Added to cart. <a href="/cart">View cart \u2192</a>';}
    if(typeof toast==='function') toast('Added to cart');
  };
})();
<\/script>`;
    const productPath = `/products/${encodeURIComponent(p.slug || "")}`;
    return htmlPage(p.name, body, {
      description: String(p.description || p.name || "").slice(0, 160),
      canonical: productPath,
      ogImage: p.image_url || "",
      ogType: "product",
      jsonLd: productJsonLd(p, { url: productPath, collectionPath: collectionHref }),
      cache: "public, max-age=300"
    });
  } catch {
    return htmlPage("Product", '<p class="empty">Product error.</p>', { status: 500 });
  }
}
__name(productPage, "productPage");

// src/pages/journal.js
async function journalPage(url, env) {
  try {
    const slug = url.pathname.split("/").filter(Boolean)[1] || "";
    if (!slug) {
      const articles = await listPublishedArticles(env);
      if (!articles.length) {
        return htmlPage(
          "Maison Journal",
          `<div class="head"><h1>Maison Journal</h1><p class="lead">Stories and notes from the maison.</p></div>
           <p class="empty">No journal pieces published yet.</p>`,
          {
            description: "Stories and notes from Maison Marnier.",
            canonical: "/journal",
            cache: "public, max-age=300"
          }
        );
      }
      const list = articles.map(
        (a2) => `<a class="journal-card" href="/journal/${encodeURIComponent(a2.slug)}">
            ${a2.image_url ? `<img src="${esc(a2.image_url)}" alt="" loading="lazy">` : "<div></div>"}
            <div>
              <h2>${esc(a2.title)}</h2>
              <p class="muted">${esc(a2.excerpt || "")}</p>
            </div>
          </a>`
      ).join("");
      return htmlPage(
        "Maison Journal",
        `<div class="head"><h1>Maison Journal</h1><p class="lead">Stories and notes from the maison.</p></div>
         <div class="journal-list">${list}</div>`,
        {
          description: "Stories and notes from Maison Marnier.",
          canonical: "/journal",
          cache: "public, max-age=300"
        }
      );
    }
    const a = await getArticleBySlug(env, slug);
    if (!a || a.status !== "live") {
      return htmlPage(
        "Article not found",
        `<div class="head"><h1>Article not found</h1></div>
         <p class="empty"><a href="/journal">Back to journal \u2192</a></p>`,
        { status: 404, noindex: true }
      );
    }
    const articlePath = `/journal/${encodeURIComponent(a.slug)}`;
    return htmlPage(
      a.title,
      `${a.image_url ? `<img class="article-hero" src="${esc(a.image_url)}" alt="">` : ""}
       <div class="head"><h1>${esc(a.title)}</h1></div>
       ${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ""}
       <div class="desc">${esc(a.body || "")}</div>
       <p style="margin-top:28px"><a class="btn" href="/collections/decor">Shop the edit</a></p>`,
      {
        description: String(a.excerpt || a.title).slice(0, 160),
        canonical: articlePath,
        ogImage: a.image_url || "",
        ogType: "article",
        cache: "public, max-age=300"
      }
    );
  } catch {
    return htmlPage("Maison Journal", '<p class="empty">Could not load the journal.</p>', { status: 500 });
  }
}
__name(journalPage, "journalPage");

// src/pages/info.js
var PAGES = {
  shipping: [
    "Shipping",
    "Maison Marnier ships across the European Union from partner warehouses. Delivery windows vary by piece and destination.\n\nStandard shipping is \u20AC6.90. Orders over \u20AC100 ship free within the EU. Tracking details are emailed when your parcel leaves the warehouse."
  ],
  returns: [
    "Returns",
    "We want every piece to feel right at home. Unused items in original condition may be returned within 30 days of delivery.\n\nContact hello@maisonmarnier.com with your order number to start a return. Custom or final-sale seasonal pieces may be excluded."
  ],
  contact: [
    "Contact",
    "Questions about a piece, an order, or collaboration?\n\nEmail hello@maisonmarnier.com and we will reply within two business days."
  ],
  sourcing: [
    "Sourcing",
    "Maison Marnier curates home decor from selected suppliers. Every candidate is reviewed for price, stock, delivery, imagery and how it sits with the rest of the edit before it is published to the storefront.\n\nWe favour materials and forms that stay useful beyond a single season."
  ],
  about: [
    "About Maison Marnier",
    "Maison Marnier is a curated home edit for calm, considered everyday spaces \u2014 natural materials, soft light, and objects worth keeping.\n\nThe maison is based in Europe and publishes in EUR. Payments are processed securely by Stripe."
  ]
};
function infoPage(path) {
  const key = path.replace(/^\//, "");
  const [title, body] = PAGES[key] || PAGES.about;
  const description = String(body).split("\n\n")[0].slice(0, 160);
  return htmlPage(
    title,
    `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">/</span><span>${esc(title)}</span></nav>
     <div class="head"><h1>${esc(title)}</h1></div>
     <div class="buy-panel" style="max-width:720px"><div class="desc" style="margin:0">${esc(body)}</div></div>`,
    {
      description,
      canonical: `/${key}`,
      cache: "public, max-age=3600"
    }
  );
}
__name(infoPage, "infoPage");

// src/pages/seo.js
var INFO_PATHS = ["/about", "/shipping", "/returns", "/contact", "/sourcing", "/journal"];
var PRODUCT_CAP = 4500;
var JOURNAL_CAP = 200;
function xmlResponse(body) {
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
      "x-content-type-options": "nosniff"
    }
  });
}
__name(xmlResponse, "xmlResponse");
function urlEntry(loc, lastmod) {
  const last = lastmod ? `<lastmod>${escXml(lastmod)}</lastmod>` : "";
  return `<url><loc>${escXml(loc)}</loc>${last}</url>`;
}
__name(urlEntry, "urlEntry");
function urlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}
__name(urlset, "urlset");
function robotsTxt() {
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /cart

Sitemap: ${SITE_ORIGIN}/sitemap.xml
Sitemap: ${SITE_ORIGIN}/sitemap_index.xml
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=UTF-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff"
    }
  });
}
__name(robotsTxt, "robotsTxt");
function sitemapIndexXml() {
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const maps = [
    `${SITE_ORIGIN}/sitemap-pages.xml`,
    `${SITE_ORIGIN}/sitemap-products.xml`,
    `${SITE_ORIGIN}/sitemap-journal.xml`
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map(
    (loc) => `<sitemap><loc>${escXml(loc)}</loc><lastmod>${escXml(now)}</lastmod></sitemap>`
  ).join("\n")}
</sitemapindex>
`;
  return xmlResponse(body);
}
__name(sitemapIndexXml, "sitemapIndexXml");
function sitemapXml() {
  return sitemapIndexXml();
}
__name(sitemapXml, "sitemapXml");
function sitemapPagesXml() {
  const entries = [];
  entries.push(urlEntry(`${SITE_ORIGIN}/`));
  for (const slug of Object.keys(COLLECTION_RULES)) {
    entries.push(urlEntry(`${SITE_ORIGIN}/collections/${encodeURIComponent(slug)}`));
  }
  for (const path of INFO_PATHS) {
    entries.push(urlEntry(`${SITE_ORIGIN}${path}`));
  }
  return xmlResponse(urlset(entries));
}
__name(sitemapPagesXml, "sitemapPagesXml");
async function sitemapProductsXml(env) {
  const entries = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT ?`
    ).bind(PRODUCT_CAP).all();
    for (const p of r.results || []) {
      entries.push(
        urlEntry(`${SITE_ORIGIN}/products/${encodeURIComponent(p.slug)}`, formatLastmod(p.published_at))
      );
    }
  } catch {
  }
  return xmlResponse(urlset(entries));
}
__name(sitemapProductsXml, "sitemapProductsXml");
async function sitemapJournalXml(env) {
  const entries = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at FROM journal_articles
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT ?`
    ).bind(JOURNAL_CAP).all();
    for (const a of r.results || []) {
      entries.push(
        urlEntry(`${SITE_ORIGIN}/journal/${encodeURIComponent(a.slug)}`, formatLastmod(a.published_at))
      );
    }
  } catch {
  }
  return xmlResponse(urlset(entries));
}
__name(sitemapJournalXml, "sitemapJournalXml");

// src/jobs/replaceSeedWithCj.js
init_json();
init_cj();
init_merch();
var SEARCHES = [
  "ceramic vase",
  "table lamp",
  "floor lamp",
  "linen cushion",
  "throw blanket",
  "soy candle",
  "candle holder",
  "wall mirror",
  "wall art decor",
  "wooden tray",
  "rattan basket",
  "desk lamp",
  "night light home",
  "home fragrance diffuser",
  "decorative bowl"
];
var JUNK = /slipper|sock|earring|ring|necklace|hat|shoe|dress|pant|shirt|bra|underwear|wig|phone case|cable|charger/i;
async function searchCj(token, q, page = 1, size = 20) {
  const p = new URLSearchParams({
    page: String(page),
    size: String(size),
    keyWord: q
  });
  p.append("features", "enable_category");
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + p.toString(),
    { headers: { "CJ-Access-Token": token, accept: "application/json" } }
  );
  const d = await r.json();
  if (!r.ok || d.code !== 200) {
    throw new Error(d.message || `CJ search failed for ${q}`);
  }
  const groups = Array.isArray(d.data?.content) ? d.data.content : [];
  return groups.flatMap((g) => Array.isArray(g.productList) ? g.productList : []);
}
__name(searchCj, "searchCj");
function normalizeCj(x) {
  const rawName = String(x.nameEn || x.name || "").slice(0, 240);
  if (!rawName || JUNK.test(rawName)) return null;
  const cost = Number(x.nowPrice || x.sellPrice || 0) || 0;
  if (!(cost > 0)) return null;
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || 0) || 0;
  if (stock <= 0) return null;
  const image = safeUrl(x.bigImage || x.productImage || "", "");
  if (!image) return null;
  const name = cleanProductName(rawName) || rawName;
  const category = mapMaisonCategory(name, x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || "");
  if (!["Lighting", "Objects", "Textiles", "Candles", "Wall Decor", "Seasonal", "Furniture", "Decor"].includes(category)) {
    return null;
  }
  const retail = suggestedRetailEur(cost);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name + "-" + String(x.id).slice(-6));
  const sku = ("LL-CJ-" + String(x.sku || x.id).replace(/[^A-Za-z0-9]/g, "").slice(-18)).toUpperCase();
  return {
    id: String(x.id),
    sku,
    supplierSku: String(x.sku || ""),
    name,
    slug,
    category,
    cost,
    retail,
    compare,
    image,
    stock,
    deliveryDays: String(x.deliveryCycle || "7-15"),
    description: `A considered piece for calm interiors \u2014 curated for Maison Marnier.

${name}`
  };
}
__name(normalizeCj, "normalizeCj");
async function upsertLive(env, p) {
  await env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier='CJ',
       supplier_sku=excluded.supplier_sku,
       name=excluded.name,
       image_url=excluded.image_url,
       supplier_cost_usd=excluded.supplier_cost_usd,
       retail_price_eur=excluded.retail_price_eur,
       compare_at_price_eur=excluded.compare_at_price_eur,
       category=excluded.category,
       stock=excluded.stock,
       delivery_days=excluded.delivery_days,
       status='live',
       slug=excluded.slug,
       description=excluded.description,
       published_at=COALESCE(products.published_at, CURRENT_TIMESTAMP),
       updated_at=CURRENT_TIMESTAMP`
  ).bind(
    p.sku,
    "CJ",
    p.id,
    p.supplierSku,
    p.name,
    p.image,
    p.cost,
    p.retail,
    p.compare,
    p.category,
    p.stock,
    p.deliveryDays,
    "live",
    p.slug,
    p.description
  ).run();
}
__name(upsertLive, "upsertLive");
async function replaceSeedWithCj(request, env) {
  try {
    const expected = env.LUME_JOB_TOKEN;
    if (!expected) return json({ ok: false, error: "LUME_JOB_TOKEN not configured" }, 503);
    const h = request.headers.get("authorization") || "";
    const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
    if (!token || token !== expected) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    const target = Math.max(40, Math.min(120, Number(body.target || 100) || 100));
    const demoteSeed = body.demoteSeed !== false;
    const cjToken = await getCJToken(env);
    const byId = /* @__PURE__ */ new Map();
    const errors = [];
    for (const q of SEARCHES) {
      if (byId.size >= target * 1.4) break;
      try {
        const items = await searchCj(cjToken, q, 1, 24);
        for (const raw of items) {
          const n = normalizeCj(raw);
          if (!n) continue;
          if (!byId.has(n.id)) byId.set(n.id, n);
        }
      } catch (e) {
        errors.push({ q, error: e.message || String(e) });
      }
    }
    const selected = [...byId.values()].slice(0, target);
    let upserted = 0;
    for (const p of selected) {
      try {
        await upsertLive(env, p);
        upserted += 1;
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }
    let seedDemoted = 0;
    if (demoteSeed) {
      const r = await env.LUME_DB.prepare(
        `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP
         WHERE supplier='SEED' AND status='live'`
      ).run();
      seedDemoted = r?.meta?.changes || 0;
    }
    const counts = await env.LUME_DB.prepare(
      `SELECT status, COUNT(*) AS c FROM products GROUP BY status`
    ).all();
    const cjLive = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products WHERE supplier='CJ' AND status='live'`
    ).first();
    return json({
      ok: true,
      target,
      found: byId.size,
      upserted,
      seedDemoted,
      cjLive: Number(cjLive?.c || 0),
      counts: counts.results || [],
      errors: errors.slice(0, 8)
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Replace job failed" }, 502);
  }
}
__name(replaceSeedWithCj, "replaceSeedWithCj");

// src/router.js
function methodNotAllowed() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
__name(methodNotAllowed, "methodNotAllowed");
function apexRedirect(request, url) {
  const host = (request.headers.get("Host") || url.host || "").split(":")[0].toLowerCase();
  if (host !== "www.maisonmarnier.com") return null;
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = "maisonmarnier.com";
  target.port = "";
  return Response.redirect(target.toString(), 301);
}
__name(apexRedirect, "apexRedirect");
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();
  const redirected = apexRedirect(request, url);
  if (redirected) return redirected;
  if (pathname === "/robots.txt") return robotsTxt();
  if (pathname === "/sitemap.xml" || pathname === "/sitemap_index.xml") return sitemapXml();
  if (pathname === "/sitemap-pages.xml") return sitemapPagesXml();
  if (pathname === "/sitemap-products.xml") return sitemapProductsXml(env);
  if (pathname === "/sitemap-journal.xml") return sitemapJournalXml(env);
  if (pathname === "/api/store/products") {
    const q = url.searchParams.get("q") || "";
    const limit = url.searchParams.get("limit") || "24";
    return listPublishedProducts(env, { q, limit });
  }
  if (pathname === "/api/store/home") {
    return getHomeContent(env);
  }
  if (pathname === "/api/checkout") {
    if (method !== "POST") return methodNotAllowed();
    return checkout(request, env);
  }
  if (pathname === "/api/stripe/webhook") {
    if (method !== "POST") return methodNotAllowed();
    return handleStripeWebhook(request, env, ctx);
  }
  if (pathname === "/api/cj/status") {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return cjStatus(env);
  }
  if (pathname === "/api/cj/search") {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return cjSearch(url, env);
  }
  if (pathname === "/api/lume/products") {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return listLumeProducts(env);
  }
  if (pathname === "/api/lume/update") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return updateLumeProduct(request, env);
  }
  if (pathname === "/api/lume/publish") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return publishLumeProduct(request, env);
  }
  if (pathname === "/api/lume/publish-all") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return publishAllLumeProducts(request, env);
  }
  if (pathname === "/api/lume/refresh") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshLumeProduct(request, env);
  }
  if (pathname === "/api/lume/import") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importLumeProduct(request, env);
  }
  if (pathname === "/api/lume/replace-seed-cj") {
    if (method !== "POST") return methodNotAllowed();
    return replaceSeedWithCj(request, env);
  }
  if (pathname === "/api/lume/home") {
    if (method === "GET") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return getHomeContent(env);
    }
    if (method === "POST") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return saveHomeContent(request, env);
    }
    return methodNotAllowed();
  }
  if (pathname === "/api/lume/journal") {
    if (method === "GET") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return listJournalAdmin(env);
    }
    if (method === "POST") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return saveJournalArticle(request, env);
    }
    if (method === "DELETE") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      return deleteJournalArticle(request, env);
    }
    return methodNotAllowed();
  }
  if (pathname === "/api/lume/orders") {
    if (method === "GET") {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
      const id = url.searchParams.get("id");
      if (id) return getOrderAdmin(env, Number(id));
      return listOrdersAdmin(env);
    }
    return methodNotAllowed();
  }
  if (pathname === "/api/lume/orders/fulfill") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return retryFulfill(request, env);
  }
  if (pathname === "/api/lume/orders/refresh") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return refreshOrderCj(request, env);
  }
  if (pathname === "/cart") return cartPage(url);
  if (pathname === "/checkout/success") {
    const info = await checkoutSuccessPage(url, env);
    return checkoutSuccessPageHtml(info);
  }
  if (pathname.startsWith("/collections/")) return collectionPage(url, env);
  if (pathname.startsWith("/products/")) return productPage(url, env);
  if (pathname === "/journal" || pathname.startsWith("/journal/")) return journalPage(url, env);
  if (["/shipping", "/returns", "/contact", "/sourcing", "/about"].includes(pathname)) {
    return infoPage(pathname);
  }
  if (pathname === "/admin") return adminPage();
  if (pathname === "/" || pathname === "") return homePage(env);
  return htmlNotFound();
}
__name(handleRequest, "handleRequest");
function htmlNotFound() {
  return new Response(
    '<!doctype html><html><body><h1>Not found</h1><p><a href="/">Maison Marnier</a></p></body></html>',
    {
      status: 404,
      headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" }
    }
  );
}
__name(htmlNotFound, "htmlNotFound");

// src/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
