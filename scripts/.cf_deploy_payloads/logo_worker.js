var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
  }
});

// src/lib/escape.js
function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
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
var init_escape = __esm({
  "src/lib/escape.js"() {
  }
});

// src/cj.js
var cj_exports = {};
__export(cj_exports, {
  cjSearch: () => cjSearch,
  cjStatus: () => cjStatus,
  collectCjProducts: () => collectCjProducts,
  createCJOrder: () => createCJOrder,
  extractCjImages: () => extractCjImages,
  fetchCjProduct: () => fetchCjProduct,
  getCJOrderDetail: () => getCJOrderDetail,
  getCJToken: () => getCJToken,
  refreshProductFromCJ: () => refreshProductFromCJ,
  resolveCJVariantId: () => resolveCJVariantId
});
function extractCjImages(x, { max = 8 } = {}) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (raw) => {
    const u = safeUrl(raw, "");
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  if (!x || typeof x !== "object") return out;
  push(x.bigImage || x.productImage || x.bigimg || x.image);
  const sets = [x.productImageSet, x.productImages, x.imageSet, x.images, x.productImageList];
  for (const set of sets) {
    if (Array.isArray(set)) set.forEach(push);
    else if (typeof set === "string" && set.trim()) {
      try {
        const parsed = JSON.parse(set);
        if (Array.isArray(parsed)) parsed.forEach(push);
      } catch {
        set.split(/[\n,]+/).forEach(push);
      }
    }
  }
  const variants = [
    ...Array.isArray(x.variants) ? x.variants : [],
    ...Array.isArray(x.stanProducts) ? x.stanProducts : [],
    ...Array.isArray(x.variantList) ? x.variantList : []
  ];
  for (const v of variants) {
    push(v?.variantImage || v?.image || v?.img || v?.bigImage || v?.bigimg);
  }
  return out.slice(0, max);
}
function mergeCjPayloads(...parts) {
  const base = {};
  const imageBag = [];
  const variants = [];
  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    Object.assign(base, part);
    imageBag.push(...extractCjImages(part, { max: 24 }));
    if (Array.isArray(part.variants)) variants.push(...part.variants);
    if (Array.isArray(part.stanProducts)) variants.push(...part.stanProducts);
  }
  if (variants.length) base.variants = variants;
  if (imageBag.length) base.productImageSet = [...new Set(imageBag)];
  return base;
}
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
function mapCjListItem(x) {
  const images = extractCjImages(x, { max: 16 });
  return {
    id: x.id,
    name: x.nameEn || x.productNameEn || "",
    sku: x.sku || x.productSku || "",
    image: images[0] || x.bigImage || x.productImage || "",
    images,
    imageCount: images.length,
    costUSD: x.nowPrice || x.sellPrice,
    stock: x.warehouseInventoryNum,
    verifiedStock: x.totalVerifiedInventory,
    deliveryDays: x.deliveryCycle,
    category: x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || null,
    categoryId: x.categoryId || null,
    freeShipping: x.addMarkStatus === 1,
    supplier: x.supplierName || "CJ",
    suggestedRetailEUR: suggestedRetailEur(x.nowPrice || x.sellPrice)
  };
}
async function collectCjProducts(env, {
  q = "home decor",
  limit = 24,
  minImages = 4,
  startPage = 1,
  maxPages = 12,
  pageSize = 20
} = {}) {
  const query = String(q || "home decor").trim().slice(0, 100) || "home decor";
  const want = Math.max(1, Math.min(100, Number(limit) || 24));
  const min = Math.max(3, Math.min(8, Number(minImages) || 4));
  const token = await getCJToken(env);
  const products = [];
  const seen = /* @__PURE__ */ new Set();
  let page = Math.max(1, Number(startPage) || 1);
  let scanned = 0;
  let totalRecords = 0;
  const pagesCap = Math.max(1, Math.min(20, Number(maxPages) || 12));
  for (let i = 0; i < pagesCap && products.length < want; i += 1) {
    const p = new URLSearchParams({
      page: String(page),
      size: String(Math.max(1, Math.min(50, Number(pageSize) || 20))),
      keyWord: query
    });
    p.append("features", "enable_category");
    const r = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + p.toString(),
      { headers: { "CJ-Access-Token": token, accept: "application/json" } }
    );
    const d = await r.json();
    if (!r.ok || d.code !== 200) {
      const err = new Error(d.message || "CJ product search failed");
      err.code = d.code || r.status;
      throw err;
    }
    totalRecords = Number(d.data?.totalRecords || totalRecords) || totalRecords;
    const groups = Array.isArray(d.data?.content) ? d.data.content : [];
    const batch = groups.flatMap((g) => Array.isArray(g.productList) ? g.productList : []);
    if (!batch.length) break;
    scanned += batch.length;
    for (const raw of batch) {
      if (products.length >= want) break;
      const mapped = mapCjListItem(raw);
      const id = String(mapped.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (mapped.imageCount < min) continue;
      products.push(mapped);
    }
    page += 1;
  }
  return {
    query,
    minImages: min,
    limit: want,
    page,
    scanned,
    totalRecords,
    products
  };
}
async function cjSearch(url, env) {
  try {
    const q = (url.searchParams.get("q") || "home decor").trim().slice(0, 100);
    const size = Math.max(1, Math.min(100, parseInt(url.searchParams.get("size") || "24", 10) || 24));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const minImages = Math.max(
      3,
      Math.min(8, parseInt(url.searchParams.get("minImages") || "4", 10) || 4)
    );
    const collected = await collectCjProducts(env, {
      q,
      limit: size,
      minImages,
      startPage: page,
      maxPages: Math.max(6, Math.ceil(size / 4) + 4),
      pageSize: 20
    });
    return json({
      ok: true,
      query: collected.query,
      page,
      size,
      minImages: collected.minImages,
      scanned: collected.scanned,
      total: collected.totalRecords || collected.products.length,
      products: collected.products,
      shippingCountryChecked: false,
      note: `Only products with ${collected.minImages}+ supplier photos are listed. Tick boxes to import selected, or import 50/100 by query.`
    });
  } catch (e) {
    return json(
      {
        ok: false,
        error: e && e.message ? e.message : "CJ connector error",
        code: e?.code
      },
      502
    );
  }
}
async function fetchCjProduct(env, supplierProductId) {
  const token = await getCJToken(env);
  const pid = String(supplierProductId);
  const headers = { "CJ-Access-Token": token, accept: "application/json" };
  const parts = [];
  const p = new URLSearchParams({ page: "1", size: "20", productIds: pid });
  const r = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/listV2?" + p.toString(),
    { headers }
  );
  const d = await r.json();
  if (r.ok && d.code === 200) {
    const groups = Array.isArray(d.data && d.data.content) ? d.data.content : [];
    const items = groups.flatMap((g) => Array.isArray(g.productList) ? g.productList : []);
    const match = items.find((x) => String(x.id) === pid || String(x.pid) === pid) || items[0];
    if (match) parts.push(match);
  }
  try {
    const rDetail = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/productDetail/query",
      {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ id: pid })
      }
    );
    const dDetail = await rDetail.json();
    if (rDetail.ok && dDetail.code === 200 && dDetail.data) parts.push(dDetail.data);
  } catch {
  }
  try {
    const q = new URLSearchParams({ pid });
    const r2 = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/query?" + q.toString(),
      { headers }
    );
    const d2 = await r2.json();
    if (r2.ok && d2.code === 200 && d2.data) parts.push(d2.data);
  } catch {
  }
  try {
    const qv = new URLSearchParams({ pid });
    const rv = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?" + qv.toString(),
      { headers }
    );
    const dv = await rv.json();
    if (rv.ok && dv.code === 200 && dv.data) {
      const list = Array.isArray(dv.data) ? dv.data : Array.isArray(dv.data.variants) ? dv.data.variants : [dv.data];
      parts.push({ variants: list });
    }
  } catch {
  }
  if (!parts.length) throw new Error(d.message || "CJ product fetch failed");
  return mergeCjPayloads(...parts);
}
async function refreshProductFromCJ(env, supplierProductId) {
  const match = await fetchCjProduct(env, supplierProductId);
  const images = extractCjImages(match);
  return {
    costUSD: Number(match.nowPrice || match.sellPrice || 0) || 0,
    stock: Number(match.warehouseInventoryNum || match.totalVerifiedInventory || 0) || 0,
    deliveryDays: String(match.deliveryCycle || ""),
    image: images[0] || match.bigImage || match.productImage || "",
    images,
    name: match.nameEn || match.productNameEn || "",
    sku: match.sku || match.productSku || ""
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
    init_escape();
    cjAccessToken = null;
    cjAccessExpiry = 0;
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
async function isAdmin(request, env) {
  if (!env.LUME_ADMIN_TOKEN) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return false;
  const token = h.slice(7).trim();
  return timingSafeEqual(token, env.LUME_ADMIN_TOKEN);
}
async function isImportCode(request, env) {
  if (!env.LUME_IMPORT_CODE) return false;
  const c = request.headers.get("x-lume-import-code") || "";
  return timingSafeEqual(c, env.LUME_IMPORT_CODE);
}
async function requireAdmin(request, env) {
  if (await isAdmin(request, env)) return null;
  return json({ ok: false, error: "Unauthorized" }, 401);
}
async function requireImportAuth(request, env) {
  if (await isAdmin(request, env) || await isImportCode(request, env)) return null;
  return json({ ok: false, error: "Unauthorized" }, 401);
}

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
async function attachStripeSession(env, orderNumber, sessionId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET stripe_session_id=?,updated_at=CURRENT_TIMESTAMP WHERE order_number=?`
  ).bind(sessionId, orderNumber).run();
}
async function getOrderByNumber(env, orderNumber) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE order_number=?`).bind(orderNumber).first();
}
async function getOrderByStripeSession(env, sessionId) {
  return env.LUME_DB.prepare(`SELECT * FROM orders WHERE stripe_session_id=?`).bind(sessionId).first();
}
async function getOrderItems(env, orderId) {
  const r = await env.LUME_DB.prepare(`SELECT * FROM order_items WHERE order_id=?`).bind(orderId).all();
  return r.results || [];
}
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
async function markOrderFulfilling(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilling',updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(orderId).run();
}
async function markOrderFulfilled(env, orderId, { cjOrderId, cjStatus: cjStatus2 }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfilled',cj_order_id=?,cj_status=?,cj_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(cjOrderId || "", cjStatus2 || "created", orderId).run();
}
async function markOrderFulfillFailed(env, orderId, error) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='fulfill_failed',cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(String(error || "").slice(0, 2e3), orderId).run();
}
async function updateCjMeta(env, orderId, { cjOrderId, cjStatus: cjStatus2, cjError }) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET cj_order_id=COALESCE(?,cj_order_id),cj_status=COALESCE(?,cj_status),cj_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(cjOrderId || null, cjStatus2 || null, cjError == null ? null : String(cjError).slice(0, 2e3), orderId).run();
}
async function markOrderExpired(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending_payment'`
  ).bind(orderId).run();
}
async function markOrderRefunded(env, orderId) {
  await env.LUME_DB.prepare(
    `UPDATE orders SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(orderId).run();
}
async function updateItemVid(env, itemId, vid) {
  await env.LUME_DB.prepare(`UPDATE order_items SET cj_vid=? WHERE id=?`).bind(vid, itemId).run();
}
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
async function getOrderAdmin(env, id) {
  const order = await env.LUME_DB.prepare(`SELECT * FROM orders WHERE id=?`).bind(id).first();
  if (!order) return json({ ok: false, error: "Not found" }, 404);
  const items = await getOrderItems(env, id);
  return json({ ok: true, order, items });
}

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
async function retrieveCheckoutSession(env, sessionId) {
  const r = await fetch(
    "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=line_items&expand[]=total_details",
    { headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error && data.error.message || "Session retrieve failed");
  return data;
}
function timingSafeEqualBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
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

// src/commerce.js
var FREE_SHIPPING_EUR = 100;
var FLAT_SHIPPING_EUR = 6.9;
function shippingFor(subtotal) {
  return subtotal >= FREE_SHIPPING_EUR ? 0 : FLAT_SHIPPING_EUR;
}
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
        const run2 = async () => {
          try {
            await fulfillOrder(env, fresh2);
          } catch (e) {
            await markOrderFulfillFailed(env, fresh2.id, e.message || String(e));
          }
        };
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
    const run = async () => {
      try {
        await fulfillOrder(env, fresh);
      } catch (e) {
        await markOrderFulfillFailed(env, fresh.id, e.message || String(e));
      }
    };
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

// src/db/products.js
init_json();

// src/lib/slugify.js
function slugify(v) {
  return String(v || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

// src/db/products.js
init_escape();

// src/lib/images.js
init_escape();
var STOCK_HOST = /unsplash\.com|images\.unsplash\.com|pexels\.com|picsum\.photos|placeholder\.com|loremflickr\.com/i;
function isStockImageUrl(url) {
  return STOCK_HOST.test(String(url || ""));
}
function productImages(p, { max = 8, allowStock = false } = {}) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  function push(raw2) {
    const u = safeUrl(raw2, "");
    if (!u || seen.has(u)) return;
    if (!allowStock && isStockImageUrl(u)) return;
    seen.add(u);
    out.push(u);
  }
  push(p?.image_url);
  const raw = p?.image_urls;
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) parsed.forEach(push);
    } catch {
    }
  }
  return out.slice(0, max);
}
function hasMultiRealPhotos(p, { min = 2 } = {}) {
  return productImages(p, { max: 12, allowStock: false }).length >= min;
}
function isStorefrontListable(p, { minPhotos = 2 } = {}) {
  if (!(Number(p?.retail_price_eur || 0) > 0)) return false;
  return hasMultiRealPhotos(p, { min: minPhotos });
}
function galleryValidationError(p, { min = 2 } = {}) {
  const imgs = productImages(p, { max: 12, allowStock: false });
  if (imgs.length < min) {
    return `Need at least ${min} real product photos (CJ/supplier). Unsplash/stock images do not count.`;
  }
  return null;
}
function serializeImageUrls(urls) {
  const list = (Array.isArray(urls) ? urls : []).map((u) => safeUrl(u, "")).filter((u) => u && !isStockImageUrl(u)).slice(0, 12);
  return list.length ? JSON.stringify(list) : null;
}

// src/db/products.js
init_merch();
init_cj();
var PRODUCT_COLS = "id,lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,created_at";
function publishValidationError(row) {
  if (!row) return "Product not found";
  if (!row.name || !row.image_url) return "Title and image are required before publishing";
  const galleryErr = galleryValidationError(row, { min: 2 });
  if (galleryErr) return galleryErr;
  if (!(Number(row.retail_price_eur) > 0)) return "Set a retail price before publishing";
  if (!(Number(row.supplier_cost_usd) > 0)) {
    return "CJ cost is missing/zero. Review the real variant cost before publishing.";
  }
  if (Number(row.stock) <= 0) return "Product is out of stock";
  return null;
}
function withGalleryMeta(row) {
  if (!row) return row;
  const images = productImages(row, { max: 12, allowStock: false });
  return {
    ...row,
    images,
    image_count: images.length,
    published_at: row.published_at || null
  };
}
async function listLumeProducts(env) {
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT ${PRODUCT_COLS} FROM products ORDER BY id DESC LIMIT 500`
    ).all();
    return json({ ok: true, products: (r.results || []).map(withGalleryMeta) });
  } catch (e) {
    return json({ ok: false, error: e.message || "Database error" }, 500);
  }
}
async function listPublishedProducts(env, { q = "", limit = 48 } = {}) {
  try {
    const lim = Math.max(1, Math.min(200, Number(limit) || 48));
    const query = String(q || "").trim().slice(0, 80).toLowerCase();
    let r;
    if (query) {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,stock,description,published_at
         FROM products WHERE status='live'
         AND (lower(name) LIKE ? OR lower(category) LIKE ? OR lower(ifnull(description,'')) LIKE ?)
         ORDER BY published_at DESC,id DESC LIMIT ?`
      ).bind(`%${query}%`, `%${query}%`, `%${query}%`, lim * 3).all();
    } else {
      r = await env.LUME_DB.prepare(
        `SELECT id,lume_sku,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,stock,description,published_at
         FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`
      ).bind(Math.min(600, lim * 4)).all();
    }
    const products = (r.results || []).filter((p) => isStorefrontListable(p, { minPhotos: 2 })).slice(0, lim).map(withGalleryMeta);
    return json({ ok: true, products, q: query || void 0 });
  } catch (e) {
    return json({ ok: false, error: e.message || "Could not load products" }, 500);
  }
}
async function upsertImportedCjProduct(env, p, { minImages = 4 } = {}) {
  if (!p || !p.id) throw new Error("Missing product id");
  const min = Math.max(3, Math.min(8, Number(minImages) || 4));
  let images = Array.isArray(p.images) ? p.images : Array.isArray(p.image_urls) ? p.image_urls : [];
  let cost = Number(p.costUSD || 0) || 0;
  let stock = Number(p.stock || 0) || 0;
  let deliveryDays = String(p.deliveryDays || "");
  let nameRaw = String(p.name || "").slice(0, 240);
  let skuRaw = String(p.sku || "");
  let image = safeUrl(p.image || images[0] || "", "");
  if (!p.skipEnrich) {
    try {
      const fresh = await refreshProductFromCJ(env, p.id);
      if (fresh) {
        if (Array.isArray(fresh.images) && fresh.images.length) images = fresh.images;
        if (fresh.image) image = safeUrl(fresh.image, image);
        if (fresh.costUSD > 0) cost = Number(fresh.costUSD) || cost;
        if (fresh.stock > 0) stock = Number(fresh.stock) || stock;
        if (fresh.deliveryDays) deliveryDays = String(fresh.deliveryDays);
        if (fresh.name) nameRaw = String(fresh.name).slice(0, 240);
        if (fresh.sku) skuRaw = String(fresh.sku);
      }
    } catch {
    }
  }
  images = (images || []).map((u) => safeUrl(u, "")).filter(Boolean);
  if (!image && images[0]) image = images[0];
  if (images.length < min) {
    throw new Error(`Need at least ${min} supplier photos (found ${images.length})`);
  }
  let retail = Number(p.retailPriceEUR || 0) || 0;
  if (!(retail > 0) && cost > 0) retail = suggestedRetailEur(cost);
  if (!(retail > 0)) throw new Error("Missing retail price");
  const name = cleanProductName(nameRaw) || nameRaw || "Untitled";
  const category = mapMaisonCategory(name, p.category);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name);
  const description = `A considered piece for calm interiors \u2014 curated for Maison Marnier.

${name}`;
  const sku = ("LL-CJ-" + String(skuRaw || p.id).replace(/[^A-Za-z0-9]/g, "").slice(-18)).toUpperCase();
  const gallery = serializeImageUrls(images);
  await env.LUME_DB.prepare(
    `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier_sku=excluded.supplier_sku,name=excluded.name,image_url=excluded.image_url,image_urls=excluded.image_urls,
       supplier_cost_usd=excluded.supplier_cost_usd,retail_price_eur=excluded.retail_price_eur,
       compare_at_price_eur=excluded.compare_at_price_eur,category=excluded.category,
       stock=excluded.stock,delivery_days=excluded.delivery_days,slug=excluded.slug,
       description=CASE WHEN products.description IS NULL OR products.description='' THEN excluded.description ELSE products.description END,
       updated_at=CURRENT_TIMESTAMP`
  ).bind(
    sku,
    "CJ",
    String(p.id),
    skuRaw,
    name,
    image,
    gallery,
    cost,
    retail,
    compare,
    category,
    stock,
    deliveryDays,
    "draft",
    slug,
    description
  ).run();
  return {
    ok: true,
    lumeSku: sku,
    status: "draft",
    name,
    category,
    slug,
    imageCount: images.length
  };
}
async function importLumeProduct(request, env) {
  try {
    const p = await request.json();
    if (!p || !p.id || !p.name) return json({ ok: false, error: "Missing product id/name" }, 400);
    const minImages = Math.max(3, Math.min(8, Number(p.minImages || 4) || 4));
    const result = await upsertImportedCjProduct(env, p, { minImages });
    return json(result);
  } catch (e) {
    return json({ ok: false, error: e.message || "Import failed" }, 500);
  }
}
async function importLumeProductsBulk(request, env) {
  try {
    const body = await request.json();
    const minImages = Math.max(3, Math.min(8, Number(body?.minImages || 4) || 4));
    let candidates = Array.isArray(body?.products) ? body.products : [];
    if (!candidates.length) {
      const limit = Math.max(1, Math.min(100, Number(body?.limit || 50) || 50));
      const q = String(body?.q || body?.query || "home decor").trim().slice(0, 100);
      const collected = await collectCjProducts(env, {
        q,
        limit,
        minImages,
        maxPages: Math.max(8, Math.ceil(limit / 3) + 4)
      });
      candidates = collected.products;
    }
    const imported = [];
    const skipped = [];
    const enrichSelected = Array.isArray(body?.products) && body.products.length <= 20;
    for (const p of candidates.slice(0, 100)) {
      try {
        const r = await upsertImportedCjProduct(
          env,
          { ...p, skipEnrich: !enrichSelected },
          { minImages }
        );
        imported.push({ id: p.id, lumeSku: r.lumeSku, imageCount: r.imageCount });
      } catch (e) {
        skipped.push({ id: p?.id, error: e.message || "Import failed" });
      }
    }
    return json({
      ok: true,
      minImages,
      requested: candidates.length,
      imported: imported.length,
      skipped: skipped.length,
      items: imported,
      errors: skipped.slice(0, 12)
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Bulk import failed" }, 500);
  }
}
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
    let gallery = null;
    if (Array.isArray(p.image_urls)) {
      gallery = serializeImageUrls(p.image_urls);
    } else if (typeof p.image_urls === "string" && p.image_urls.trim()) {
      const parts = p.image_urls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      gallery = serializeImageUrls(parts);
    }
    const category = String(p.category || "").trim().slice(0, 160);
    let retail = Number(p.retail_price_eur || 0) || 0;
    let compare = Number(p.compare_at_price_eur || 0) || null;
    if (!(compare > 0) && retail > 0) compare = suggestedCompareEur(retail);
    await env.LUME_DB.prepare(
      `UPDATE products SET name=?,slug=?,description=?,image_url=?,image_urls=?,category=?,retail_price_eur=?,compare_at_price_eur=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(name, slug, description, image, gallery, category, retail, compare, id).run();
    return json({ ok: true, id, slug, status: "saved" });
  } catch (e) {
    return json({ ok: false, error: e.message || "Save failed" }, 500);
  }
}
async function publishLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const row = await env.LUME_DB.prepare(
      "SELECT id,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,stock,slug FROM products WHERE id=?"
    ).bind(id).first();
    const err = publishValidationError(row);
    if (err === "Product not found") return json({ ok: false, error: err }, 404);
    if (err) return json({ ok: false, error: err }, 400);
    const slug = slugify(row.slug || row.name);
    const images = productImages(row, { max: 12, allowStock: false });
    await env.LUME_DB.prepare(
      "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).bind(slug, images[0] || row.image_url, serializeImageUrls(images), id).run();
    return json({ ok: true, id, slug, status: "live", published_at: (/* @__PURE__ */ new Date()).toISOString(), image_count: images.length });
  } catch (e) {
    return json({ ok: false, error: e.message || "Publish failed" }, 500);
  }
}
async function publishAllLumeProducts(request, env) {
  try {
    const drafts = await env.LUME_DB.prepare(
      `SELECT id,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,stock,slug
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
        const images = productImages(row, { max: 12, allowStock: false });
        await env.LUME_DB.prepare(
          "UPDATE products SET status='live',slug=?,image_url=?,image_urls=?,published_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(slug, images[0] || row.image_url, serializeImageUrls(images), row.id).run();
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
async function unpublishLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const row = await env.LUME_DB.prepare("SELECT id,status FROM products WHERE id=?").bind(id).first();
    if (!row) return json({ ok: false, error: "Product not found" }, 404);
    await env.LUME_DB.prepare(
      `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(id).run();
    return json({ ok: true, id, status: "draft" });
  } catch (e) {
    return json({ ok: false, error: e.message || "Unpublish failed" }, 500);
  }
}
async function deleteLumeProduct(request, env) {
  try {
    const p = await request.json();
    const id = Number(p.id);
    if (!id) return json({ ok: false, error: "Missing product id" }, 400);
    const row = await env.LUME_DB.prepare("SELECT id,name FROM products WHERE id=?").bind(id).first();
    if (!row) return json({ ok: false, error: "Product not found" }, 404);
    await env.LUME_DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
    return json({ ok: true, id, deleted: true, name: row.name || "" });
  } catch (e) {
    return json({ ok: false, error: e.message || "Delete failed" }, 500);
  }
}
async function pruneThinLiveProducts(env) {
  const live = (await env.LUME_DB.prepare(
    `SELECT id,name,image_url,image_urls FROM products WHERE status='live'`
  ).all()).results || [];
  let demoted = 0;
  for (const row of live) {
    if (hasMultiRealPhotos(row, { min: 2 })) continue;
    await env.LUME_DB.prepare(
      `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(row.id).run();
    demoted += 1;
  }
  return { scanned: live.length, demoted };
}
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
    const gallery = serializeImageUrls(fresh.images || []);
    await env.LUME_DB.prepare(
      `UPDATE products SET supplier_cost_usd=?,stock=?,delivery_days=?,
       image_url=CASE WHEN ?!='' THEN ? ELSE image_url END,
       image_urls=CASE WHEN ? IS NOT NULL THEN ? ELSE image_urls END,
       supplier_sku=CASE WHEN ?!='' THEN ? ELSE supplier_sku END,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(
      fresh.costUSD,
      fresh.stock,
      fresh.deliveryDays,
      fresh.image,
      fresh.image,
      gallery,
      gallery,
      fresh.sku,
      fresh.sku,
      id
    ).run();
    return json({
      ok: true,
      id,
      supplier_cost_usd: fresh.costUSD,
      stock: fresh.stock,
      delivery_days: fresh.deliveryDays,
      images: fresh.images || []
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Refresh failed" }, 502);
  }
}
async function getLiveProducts(env, limit = 100) {
  const lim = Math.max(1, Math.min(200, Number(limit) || 100));
  const r = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' ORDER BY published_at DESC,id DESC LIMIT ?`
  ).bind(Math.min(600, lim * 4)).all();
  return (r.results || []).filter((p) => isStorefrontListable(p, { minPhotos: 2 })).slice(0, lim).map(withGalleryMeta);
}
async function getLiveProductBySlug(env, slug) {
  const row = await env.LUME_DB.prepare(
    `SELECT id,name,slug,image_url,image_urls,retail_price_eur,compare_at_price_eur,category,description,stock,published_at
     FROM products WHERE status='live' AND slug=? LIMIT 1`
  ).bind(slug).first();
  if (!row) return null;
  if (!isStorefrontListable(row, { minPhotos: 2 })) return null;
  return withGalleryMeta(row);
}

// src/db/site-content.js
init_json();
init_escape();
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

// src/db/journal.js
init_json();
init_escape();
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
async function listPublishedArticles(env) {
  const r = await env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,image_url,published_at
     FROM journal_articles WHERE status='live'
     ORDER BY published_at DESC,id DESC LIMIT 50`
  ).all();
  return r.results || [];
}
async function getArticleBySlug(env, slug) {
  return env.LUME_DB.prepare(
    `SELECT id,slug,title,excerpt,body,image_url,status,published_at
     FROM journal_articles WHERE slug=? LIMIT 1`
  ).bind(slug).first();
}
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

// src/jobs/importChristmasCatalog.js
init_json();
init_cj();
init_merch();
init_escape();
var SEARCHES = [
  "christmas ornament",
  "christmas tree decoration",
  "christmas lights string",
  "christmas wreath",
  "christmas stocking",
  "christmas candle",
  "santa decoration",
  "christmas gift box",
  "holiday table decor",
  "christmas garland",
  "snowflake ornament",
  "christmas bell decor",
  "nativity decoration",
  "christmas pillow cover",
  "christmas night light",
  "christmas wall hanging",
  "christmas tree topper",
  "advent calendar decor",
  "christmas lantern",
  "holiday candle holder",
  "christmas table runner",
  "reindeer decoration",
  "christmas bauble set",
  "festive home decor"
];
var JUNK = /\b(slippers?|socks?|earrings?|rings?|necklaces?|bracelets?|wigs?|phone cases?|cables?|chargers?|underwear|bras?|tattoos?|sex|adult)\b/i;
var FESTIVE = /christmas|xmas|santa|noel|holiday|festive|snow|snowflake|reindeer|wreath|stocking|ornament|garland|advent|nativity|gingerbread|mistletoe|pine cone|tree topper|bauble|elf|nutcracker|hanukkah|new year/i;
function flattenCjListPayload(d) {
  const data = d?.data;
  if (!data || typeof data !== "object") return { items: [], shape: "no-data" };
  if (Array.isArray(data.content)) {
    const items = data.content.flatMap(
      (g) => Array.isArray(g?.productList) ? g.productList : Array.isArray(g) ? g : []
    );
    if (items.length) return { items, shape: "content.productList" };
    const direct = data.content.filter((x) => x && (x.id || x.pid || x.nameEn));
    if (direct.length) return { items: direct, shape: "content[]" };
    return { items: [], shape: "content-empty", total: data.totalRecords };
  }
  if (Array.isArray(data.list)) return { items: data.list, shape: "list" };
  if (Array.isArray(data.productList)) return { items: data.productList, shape: "productList" };
  if (Array.isArray(data)) return { items: data, shape: "data[]" };
  return {
    items: [],
    shape: `keys:${Object.keys(data).slice(0, 8).join(",")}`,
    total: data.totalRecords
  };
}
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
    throw new Error(d.message || `CJ search failed for ${q} (http ${r.status} code ${d.code})`);
  }
  const flat = flattenCjListPayload(d);
  flat.meta = { q, page, code: d.code, result: !!d.result, message: d.message || null };
  return flat;
}
function normalizeCj(x, { minImages = 1, requireFestive = true } = {}) {
  const rawName = String(x.nameEn || x.name || x.productNameEn || "").slice(0, 240);
  if (!rawName || JUNK.test(rawName)) return null;
  const blob = `${rawName} ${x.threeCategoryName || ""} ${x.twoCategoryName || ""} ${x.oneCategoryName || ""}`;
  if (requireFestive && !FESTIVE.test(blob)) return null;
  const cost = Number(x.nowPrice || x.sellPrice || x.discountPrice || 0) || 0;
  if (!(cost > 0)) return null;
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || x.stockNum || 0) || 0;
  const images = extractCjImages(x);
  const image = safeUrl(images[0] || x.bigImage || x.productImage || "", "");
  if (!image) return null;
  if (images.length < minImages) return null;
  if (/unsplash\.com|pexels\.com|picsum\.photos/i.test(image)) return null;
  const name = cleanProductName(rawName) || rawName;
  let category = mapMaisonCategory(name, x.threeCategoryName || x.twoCategoryName || x.oneCategoryName || "");
  if (FESTIVE.test(blob)) category = "Seasonal";
  const retail = suggestedRetailEur(cost);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name + "-" + String(x.id).slice(-6));
  const sku = ("LL-XMAS-" + String(x.sku || x.id).replace(/[^A-Za-z0-9]/g, "").slice(-16)).toUpperCase();
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
    images,
    stock,
    deliveryDays: String(x.deliveryCycle || "7-15"),
    description: `A festive piece for the holidays \u2014 curated for Maison Marnier.

${name}`
  };
}
async function upsertLive(env, p) {
  const gallery = serializeImageUrls(p.images || [p.image].filter(Boolean));
  await env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier='CJ',
       supplier_sku=excluded.supplier_sku,
       name=excluded.name,
       image_url=excluded.image_url,
       image_urls=excluded.image_urls,
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
    gallery,
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
async function authorizeJob(request, env) {
  const expected = env.LUME_JOB_TOKEN || "";
  const admin = env.LUME_ADMIN_TOKEN || "";
  const h = request.headers.get("authorization") || "";
  const bearer = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
  if (expected && bearer && bearer === expected) return { ok: true };
  if (admin && bearer && bearer === admin) return { ok: true };
  const syncHeader = (request.headers.get("x-mm-sync-token") || "").trim();
  if (!syncHeader) return { ok: false };
  await env.LUME_DB.prepare(
    `CREATE TABLE IF NOT EXISTS sync_tokens (
       token TEXT PRIMARY KEY,
       purpose TEXT,
       used INTEGER DEFAULT 0,
       created_at TEXT DEFAULT CURRENT_TIMESTAMP
     )`
  ).run();
  const row = await env.LUME_DB.prepare(
    `SELECT token FROM sync_tokens WHERE token=? AND used=0 LIMIT 1`
  ).bind(syncHeader).first();
  if (!row) return { ok: false };
  return { ok: true, syncToken: syncHeader };
}
async function importChristmasCatalog(request, env) {
  try {
    const authz = await authorizeJob(request, env);
    if (!authz.ok) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    const target = Math.max(80, Math.min(220, Number(body.target || 200) || 200));
    const clearLive = body.clearLive !== false;
    let demoted = 0;
    if (clearLive) {
      const r = await env.LUME_DB.prepare(
        `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE status='live'`
      ).run();
      demoted = r?.meta?.changes || 0;
    }
    const cjToken = await getCJToken(env);
    const byId = /* @__PURE__ */ new Map();
    const errors = [];
    let scanned = 0;
    let listShape = null;
    for (const q of SEARCHES) {
      if (byId.size >= target * 1.5) break;
      for (const page of [1, 2, 3]) {
        if (byId.size >= target * 1.5) break;
        try {
          const flat = await searchCj(cjToken, q, page, 20);
          if (!listShape) {
            listShape = { ...flat.meta, shape: flat.shape, total: flat.total, n: flat.items.length };
          }
          const items = flat.items || [];
          scanned += items.length;
          for (const raw of items) {
            const n = normalizeCj(raw, { minImages: 1 });
            if (!n) continue;
            if (!byId.has(n.id)) byId.set(n.id, n);
          }
          await new Promise((r) => setTimeout(r, 160));
        } catch (e) {
          errors.push({ q, page, error: e.message || String(e) });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
    const enriched = [];
    for (const p of byId.values()) {
      if (enriched.length >= target) break;
      try {
        let images = Array.isArray(p.images) ? p.images.slice() : [];
        if (images.length < 2) {
          const fresh = await refreshProductFromCJ(env, p.id);
          if (fresh?.images?.length) images = fresh.images;
          if (fresh?.image) p.image = fresh.image;
          if (fresh?.costUSD > 0) p.cost = fresh.costUSD;
          if (fresh?.stock > 0) p.stock = fresh.stock;
          if (fresh?.deliveryDays) p.deliveryDays = fresh.deliveryDays;
          await new Promise((r) => setTimeout(r, 120));
        }
        images = images.filter((u) => u && !/unsplash\.com|pexels\.com|picsum\.photos/i.test(u));
        if (images.length < 2) continue;
        if (!(p.stock > 0)) continue;
        p.images = images.slice(0, 12);
        p.image = images[0];
        enriched.push(p);
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }
    const selected = enriched.sort((a, b) => (b.images?.length || 0) - (a.images?.length || 0)).slice(0, target);
    let upserted = 0;
    for (const p of selected) {
      try {
        await upsertLive(env, p);
        upserted += 1;
      } catch (e) {
        errors.push({ id: p.id, error: e.message || String(e) });
      }
    }
    if (authz.syncToken) {
      await env.LUME_DB.prepare(`UPDATE sync_tokens SET used=1 WHERE token=?`).bind(authz.syncToken).run();
    }
    const counts = await env.LUME_DB.prepare(
      `SELECT status, COUNT(*) AS c FROM products GROUP BY status`
    ).all();
    const cjLive = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products WHERE supplier='CJ' AND status='live'`
    ).first();
    const multi = await env.LUME_DB.prepare(
      `SELECT COUNT(*) AS c FROM products
       WHERE status='live' AND image_urls IS NOT NULL AND length(image_urls) > 80`
    ).first();
    return json({
      ok: true,
      target,
      demoted,
      found: byId.size,
      enriched: enriched.length,
      upserted,
      scanned,
      listShape,
      cjLive: Number(cjLive?.c || 0),
      multiApprox: Number(multi?.c || 0),
      counts: counts.results || [],
      errors: errors.slice(0, 12)
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Christmas import failed" }, 502);
  }
}

// src/jobs/replaceSeedWithCj.js
init_json();
init_cj();
init_merch();
init_escape();
var SEARCHES2 = [
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
var JUNK2 = /slipper|sock|earring|ring|necklace|hat|shoe|dress|pant|shirt|bra|underwear|wig|phone case|cable|charger/i;
async function searchCj2(token, q, page = 1, size = 20) {
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
function normalizeCj2(x) {
  const rawName = String(x.nameEn || x.name || "").slice(0, 240);
  if (!rawName || JUNK2.test(rawName)) return null;
  const cost = Number(x.nowPrice || x.sellPrice || 0) || 0;
  if (!(cost > 0)) return null;
  const stock = Number(x.warehouseInventoryNum || x.totalVerifiedInventory || 0) || 0;
  if (stock <= 0) return null;
  const images = extractCjImages(x);
  const image = safeUrl(images[0] || x.bigImage || x.productImage || "", "");
  if (!image) return null;
  if (images.length < 2) return null;
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
    images,
    stock,
    deliveryDays: String(x.deliveryCycle || "7-15"),
    description: `A considered piece for calm interiors \u2014 curated for Maison Marnier.

${name}`
  };
}
async function upsertLive2(env, p) {
  const gallery = serializeImageUrls(p.images || [p.image].filter(Boolean));
  await env.LUME_DB.prepare(
    `INSERT INTO products (
       lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,
       supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,
       status,slug,description,published_at,updated_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO UPDATE SET
       supplier='CJ',
       supplier_sku=excluded.supplier_sku,
       name=excluded.name,
       image_url=excluded.image_url,
       image_urls=excluded.image_urls,
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
    gallery,
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
async function authorizeJob2(request, env) {
  const expected = env.LUME_JOB_TOKEN || "";
  const admin = env.LUME_ADMIN_TOKEN || "";
  const h = request.headers.get("authorization") || "";
  const bearer = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
  if (expected && bearer && bearer === expected) return { ok: true };
  if (admin && bearer && bearer === admin) return { ok: true };
  const syncHeader = (request.headers.get("x-mm-sync-token") || "").trim();
  if (!syncHeader) return { ok: false };
  await env.LUME_DB.prepare(
    `CREATE TABLE IF NOT EXISTS sync_tokens (
       token TEXT PRIMARY KEY,
       purpose TEXT,
       used INTEGER DEFAULT 0,
       created_at TEXT DEFAULT CURRENT_TIMESTAMP
     )`
  ).run();
  const row = await env.LUME_DB.prepare(
    `SELECT token FROM sync_tokens WHERE token=? AND used=0 LIMIT 1`
  ).bind(syncHeader).first();
  if (!row) return { ok: false };
  return { ok: true, syncToken: syncHeader };
}
async function replaceSeedWithCj(request, env) {
  try {
    const authz = await authorizeJob2(request, env);
    if (!authz.ok) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    const target = Math.max(40, Math.min(120, Number(body.target || 100) || 100));
    const demoteSeed = body.demoteSeed !== false;
    const cjToken = await getCJToken(env);
    const byId = /* @__PURE__ */ new Map();
    const errors = [];
    for (const q of SEARCHES2) {
      if (byId.size >= target * 1.4) break;
      try {
        const items = await searchCj2(cjToken, q, 1, 24);
        for (const raw of items) {
          const n = normalizeCj2(raw);
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
        await upsertLive2(env, p);
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
    if (authz.syncToken) {
      await env.LUME_DB.prepare(`UPDATE sync_tokens SET used=1 WHERE token=?`).bind(authz.syncToken).run();
    }
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

// src/jobs/syncGalleries.js
init_json();
init_cj();
async function syncProductGalleries(request, env) {
  try {
    const admin = env.LUME_ADMIN_TOKEN || "";
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    const syncHeader = (request.headers.get("x-mm-sync-token") || "").trim();
    let authorized = !!(admin && bearer && bearer === admin);
    let syncToken = null;
    if (!authorized && syncHeader) {
      await env.LUME_DB.prepare(
        `CREATE TABLE IF NOT EXISTS sync_tokens (
           token TEXT PRIMARY KEY,
           purpose TEXT,
           used INTEGER DEFAULT 0,
           created_at TEXT DEFAULT CURRENT_TIMESTAMP
         )`
      ).run();
      syncToken = await env.LUME_DB.prepare(
        `SELECT token, purpose FROM sync_tokens WHERE token=? AND used=0 LIMIT 1`
      ).bind(syncHeader).first();
      authorized = !!syncToken;
    }
    if (!authorized) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(200, Number(body.limit || 200) || 200));
    const demoteSeed = body.demoteSeed === true;
    const demoteThin = body.demoteThin === true;
    const minImages = Math.max(1, Math.min(8, Number(body.minImages || 2) || 2));
    const onlyThin = body.onlyThin === true;
    let rows = (await env.LUME_DB.prepare(
      `SELECT id,supplier_product_id,name,image_url,image_urls FROM products
         WHERE status='live' AND supplier='CJ' AND supplier_product_id IS NOT NULL
         ORDER BY id ASC LIMIT ?`
    ).bind(limit).all()).results || [];
    if (onlyThin) {
      rows = rows.filter((row) => {
        try {
          const arr = JSON.parse(row.image_urls || "[]");
          return !Array.isArray(arr) || arr.length < minImages;
        } catch {
          return true;
        }
      });
    }
    let updated = 0;
    let withMulti = 0;
    const errors = [];
    const samples = [];
    for (const row of rows) {
      try {
        const fresh = await refreshProductFromCJ(env, row.supplier_product_id);
        const images = Array.isArray(fresh.images) ? fresh.images : [];
        const gallery = serializeImageUrls(images);
        const main = images[0] || fresh.image || row.image_url || "";
        await env.LUME_DB.prepare(
          `UPDATE products SET image_url=?, image_urls=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
        ).bind(main, gallery, row.id).run();
        updated += 1;
        if (images.length >= minImages) withMulti += 1;
        if (samples.length < 8) {
          samples.push({ id: row.id, name: row.name, count: images.length, images: images.slice(0, 4) });
        }
        await new Promise((resolve) => setTimeout(resolve, 180));
      } catch (e) {
        errors.push({ id: row.id, error: e.message || String(e) });
        await new Promise((resolve) => setTimeout(resolve, 400));
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
    let thinDemoted = 0;
    if (demoteThin) {
      const live = (await env.LUME_DB.prepare(
        `SELECT id,image_urls FROM products WHERE status='live' AND supplier='CJ'`
      ).all()).results || [];
      for (const row of live) {
        let count = 0;
        try {
          const arr = JSON.parse(row.image_urls || "[]");
          count = Array.isArray(arr) ? arr.length : 0;
        } catch {
          count = 0;
        }
        if (count < minImages) {
          await env.LUME_DB.prepare(
            `UPDATE products SET status='draft', updated_at=CURRENT_TIMESTAMP WHERE id=?`
          ).bind(row.id).run();
          thinDemoted += 1;
        }
      }
    }
    if (syncToken) {
      await env.LUME_DB.prepare(`UPDATE sync_tokens SET used=1 WHERE token=?`).bind(syncHeader).run();
    }
    return json({
      ok: true,
      scanned: rows.length,
      updated,
      withMulti,
      minImages,
      seedDemoted,
      thinDemoted,
      samples,
      errors: errors.slice(0, 12)
    });
  } catch (e) {
    return json({ ok: false, error: e.message || "Gallery sync failed" }, 502);
  }
}

// src/lib/brandAsset.js
var LOGO_JPEG_BASE64 = "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";
function logoJpegBytes() {
  const bin = atob(LOGO_JPEG_BASE64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function logoJpegResponse() {
  return new Response(logoJpegBytes(), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=604800"
    }
  });
}

// src/router.js
init_json();

// src/pages/home.js
init_escape();

// src/lib/html.js
init_escape();

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
function escXml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function formatLastmod(value) {
  if (!value) return "";
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}
function jsonLdScript(data) {
  if (!data) return "";
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}<\/script>`;
}
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
        areaServed: "EU",
        sameAs: ["https://www.instagram.com/maison.marnier/"]
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
      image: (() => {
        const list = [];
        if (Array.isArray(p.image_urls)) list.push(...p.image_urls);
        else if (typeof p.image_urls === "string" && p.image_urls.startsWith("[")) {
          try {
            list.push(...JSON.parse(p.image_urls));
          } catch {
          }
        }
        if (p.image_url) list.unshift(p.image_url);
        const uniq = [...new Set(list.filter(Boolean))];
        return uniq.length ? uniq : void 0;
      })(),
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
function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
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
function gtmNoscriptHtml() {
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}
var NAV = [
  ["Holiday", "/collections/seasonal"],
  ["New", "/collections/new"],
  ["Lighting", "/collections/lighting"],
  ["Objects", "/collections/objects"],
  ["Candles", "/collections/candles"],
  ["Journal", "/journal"]
];
function navHtml() {
  return NAV.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join("");
}
function snowmanHtml() {
  return `<svg class="nav-snowman" viewBox="0 0 72 86" width="58" height="70" aria-hidden="true" focusable="false">
  <ellipse cx="36" cy="81" rx="22" ry="3.2" fill="rgba(246,240,230,.2)"/>
  <circle cx="36" cy="58" r="17.5" fill="#f7f2ea"/>
  <circle cx="36" cy="32" r="12.2" fill="#faf6f0"/>
  <circle cx="31.4" cy="30.2" r="1.55" fill="#1a1410"/>
  <circle cx="40.8" cy="30.2" r="1.55" fill="#1a1410"/>
  <circle cx="28.6" cy="34.2" r="2.1" fill="#f0b3b0" opacity=".9"/>
  <circle cx="43.6" cy="34.2" r="2.1" fill="#f0b3b0" opacity=".9"/>
  <path d="M33.2 33.4h6.2l-3.1 4.4z" fill="#e07a2f"/>
  <path d="M30.8 38.4c1.6 1.5 8.6 1.5 10.2 0" fill="none" stroke="#1a1410" stroke-width="1.4" stroke-linecap="round"/>
  <g class="santa-hat">
    <path d="M20 22c3.5-14 18-18 28-10 4 3.2 7 7.8 7.6 12.2l-10.5-2.2c-6.2-1.3-12.4.4-17.4 3.6L20 22Z" fill="#9a2430"/>
    <path d="M18.2 24.8c6.4-5.2 16.8-7.2 26.2-4.4 5.4 1.6 9.8 4.4 12.4 7.6.5.6.1 1.5-.7 1.5-7.4.4-16 .2-24.2-2.2-4.4-1.3-8.4-3.2-12.2-5.4-.5-.3-.7-1.1-.1-1.5Z" fill="#f4efe6"/>
    <circle cx="50.5" cy="14.2" r="5.2" fill="#f4efe6"/>
    <circle cx="50.5" cy="14.2" r="2" fill="#c9a46a" opacity=".5"/>
  </g>
  <path d="M22 42c4 4 24 4 28 0 1.2 3.4-1.2 7.2-5.2 8.2l-2.4 10.4c-1.4.4-3.2.6-4.4.6-1.2 0-3-.2-4.4-.6L31.2 50.2C27.2 49.2 24.8 45.4 22 42Z" fill="#9a2430"/>
  <path d="M31.4 50.4l2.2 11.2M40.6 50.4l-2.2 11.2" fill="none" stroke="#c9a46a" stroke-width="2.4"/>
  <path d="M26 56h5M41 56h5" fill="none" stroke="#c9a46a" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="36" cy="52" r="1.5" fill="#1a1410"/>
  <circle cx="36" cy="58.5" r="1.5" fill="#1a1410"/>
  <circle cx="36" cy="65" r="1.5" fill="#1a1410"/>
  <path d="M18.5 52c-5.5 2.2-8.5 7-7.4 9.4" fill="none" stroke="#8b5a2b" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M53.5 52c5.5 2.2 8.5 7 7.4 9.4" fill="none" stroke="#8b5a2b" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="24.2" cy="20.5" r="2.1" fill="#1f3d32"/>
  <circle cx="27.4" cy="18.8" r="2.1" fill="#2f5a48"/>
  <circle cx="22.2" cy="18.2" r="1.7" fill="#9a2430"/>
</svg>`;
}
function cartControlHtml() {
  return `<span class="cart-wrap" title="Holiday cart">
  ${snowmanHtml()}
  <a href="/cart" id="cartBtn" class="cart-link">Cart <span id="cartCount"></span></a>
</span>`;
}
function brandLogoHtml({ compact = false } = {}) {
  const size = compact ? 44 : 58;
  return `<span class="brand-lockup${compact ? " is-compact" : ""}">
  <img class="brand-mark-img" src="/logo.jpg" width="${size}" height="${size}" alt="Maison Marnier" decoding="async" />
</span>`;
}
var LAYOUT_CSS = `
:root{
  --bg:#100e0c;--panel:#171411;--panel2:#211c17;--ink:#f6f0e6;--muted:#b3a89a;
  --line:#342c24;--accent:#c9a46a;--accent2:#e6c48a;--soft:#ddd3c5;
  --festive:#7a1f28;--pine:#1f3d32;--pine2:#2f5a48;
  --pad:clamp(18px,4vw,56px);--max:1420px;--nav-h:92px;
  --font:"Hanken Grotesk",system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:
  radial-gradient(1200px 520px at 8% -10%, rgba(122,31,40,.18), transparent 55%),
  radial-gradient(900px 420px at 92% 0%, rgba(31,61,50,.22), transparent 50%),
  var(--bg);
  color:var(--ink);font:400 15px/1.55 var(--font);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.announce{background:linear-gradient(90deg,#1a0f10,#0c0b0a 40%,#122019);color:var(--soft);text-align:center;font:700 11px/1 var(--font);letter-spacing:.14em;text-transform:uppercase;padding:12px 16px;border-bottom:1px solid var(--line)}
.site-nav{display:grid;grid-template-columns:minmax(240px,320px) 1fr auto;align-items:center;gap:28px;min-height:var(--nav-h);padding:0 var(--pad);border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(16,14,12,.94);backdrop-filter:blur(14px);z-index:40}
.brand,.brand-lockup{display:inline-flex;align-items:center;gap:12px;color:#fff;text-decoration:none}
.brand-mark-img{display:block;width:58px;height:58px;border-radius:50%;object-fit:cover;flex:0 0 auto;box-shadow:0 0 0 1px rgba(230,196,138,.28),0 6px 18px rgba(0,0,0,.35)}
.brand-lockup.is-compact .brand-mark-img{width:44px;height:44px}
@keyframes hatTip{0%,100%{transform:rotate(0deg)}45%{transform:rotate(-4deg)}70%{transform:rotate(2deg)}}
.brand-text{font:900 17px/1 var(--font);letter-spacing:.18em;text-transform:uppercase;color:#fff}
.brand-text span,.brand span{color:var(--accent)}
.xmas-garland{display:flex;justify-content:center;gap:10px;padding:6px var(--pad) 2px;pointer-events:none}
.xmas-garland span{width:7px;height:7px;border-radius:50%;background:var(--accent2);box-shadow:0 0 0 2px rgba(31,61,50,.55);opacity:.85;position:relative}
.xmas-garland span:nth-child(odd){background:#9a2430;box-shadow:0 0 0 2px rgba(154,36,48,.35);transform:translateY(3px)}
.xmas-garland span::after{content:"";position:absolute;left:50%;top:-5px;width:1px;height:5px;background:rgba(47,90,72,.7);transform:translateX(-50%)}
.site-nav .links{display:flex;flex-wrap:wrap;justify-content:center;gap:28px}
.site-nav .links a{color:var(--soft);font:800 15px/1 var(--font);letter-spacing:.04em;text-transform:uppercase;opacity:.95;transition:color .2s}
.site-nav .links a:hover{color:var(--accent2)}
.tools{display:flex;gap:12px;align-items:center;justify-content:flex-end}
.tools .search{width:150px;padding:12px 14px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 13px/1.2 var(--font);border-radius:6px}
.cart-wrap{display:inline-flex;align-items:center;gap:10px}
.nav-snowman{width:58px;height:70px;flex:0 0 auto;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4));animation:snowmanBob 3.2s ease-in-out infinite;transform-origin:50% 100%}
.nav-snowman .santa-hat{transform-origin:36px 18px;animation:hatTip 4.2s ease-in-out infinite}
@keyframes snowmanBob{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-3px) rotate(-4deg)}}
.cart-link{display:inline-flex;align-items:center;gap:6px;padding:13px 16px;border:1px solid var(--accent);border-radius:6px;font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:#fff;background:transparent}
.cart-link:hover{background:rgba(201,164,106,.12)}
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
.product-gallery{position:sticky;top:calc(var(--nav-h) + 24px);display:grid;gap:12px}
.product-gallery .frame{overflow:hidden;background:var(--panel2);aspect-ratio:4/5;border-radius:10px;border:1px solid var(--line)}
.product-gallery .frame img{width:100%;height:100%;object-fit:cover;display:block;animation:fadeRise .4s ease both}
.product-thumbs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.product-thumbs button{appearance:none;border:1px solid var(--line);background:var(--panel2);padding:0;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1;opacity:.72;transition:opacity .2s,border-color .2s}
.product-thumbs button.is-active,.product-thumbs button:hover{opacity:1;border-color:var(--accent)}
.product-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
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
    <div><a class="brand" href="/" aria-label="Maison Marnier">${brandLogoHtml()}</a><p class="muted" style="margin-top:12px;max-width:34ch">Holiday edits for warm rooms \u2014 festive objects chosen with quiet care.</p></div>
    <div><h4>Shop</h4><a href="/collections/seasonal">Holiday</a><a href="/collections/new">New Arrivals</a><a href="/collections/lighting">Lighting</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a><a href="https://www.instagram.com/maison.marnier/" target="_blank" rel="noopener noreferrer">Instagram</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a><a href="/instagram">Link hub</a></div>
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
function fontLinksHtml() {
  return `<link rel="icon" href="/logo.jpg" type="image/jpeg">
<link rel="apple-touch-icon" href="/logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">`;
}
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
<div class="announce">Holiday edit \xB7 Free shipping over \u20AC100 \xB7 Europe</div>
<div class="xmas-garland" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
<header class="site-nav">
  <a class="brand" href="/" aria-label="Maison Marnier home">${brandLogoHtml()}</a>
  <nav class="links">${navHtml()}</nav>
  <div class="tools">
    <form action="/collections/new" method="get" role="search">
      <input class="search" type="search" name="q" placeholder="Search\u2026" aria-label="Search products">
    </form>
    ${cartControlHtml()}
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

// src/pages/home.js
var HOME_CSS = `
${LAYOUT_CSS}
.home-main{overflow:hidden}
.mm-hero{position:relative;isolation:isolate;padding:22px var(--pad) 12px;border-bottom:1px solid var(--line);background:
  radial-gradient(780px 220px at 88% 0%, rgba(154,36,48,.3), transparent 60%),
  radial-gradient(620px 180px at 8% 100%, rgba(31,61,50,.32), transparent 55%),
  linear-gradient(180deg,#161210,var(--bg))}
.mm-hero-inner{width:min(1420px,100%);margin:0 auto;display:grid;grid-template-columns:1fr 1.05fr;gap:28px;align-items:center;padding:8px 0 16px}
.mm-kicker{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;color:var(--accent);font:900 12px/1 var(--font);letter-spacing:.14em;text-transform:uppercase}
.mm-kicker::before{content:"";width:8px;height:8px;border-radius:50%;background:#9a2430;box-shadow:0 0 0 3px rgba(154,36,48,.25)}
.mm-hero h1{margin:0;max-width:13ch;font:900 clamp(2.35rem,5vw,3.55rem)/.94 var(--font);letter-spacing:-.045em;color:#fff}
.mm-hero h1 em{font-style:normal;color:var(--accent2)}
.mm-hero .lead{margin:14px 0 0;max-width:42ch;color:#d2cbc1;font:500 16px/1.5 var(--font)}
.mm-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.mm-carousel{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);background:#14110f;aspect-ratio:5/4;min-height:280px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.mm-carousel-track{display:flex;height:100%;width:100%;transition:transform .85s cubic-bezier(.22,.61,.36,1)}
.mm-carousel-slide{position:relative;min-width:100%;height:100%;flex:0 0 100%}
.mm-carousel-slide img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.05) contrast(1.04)}
.mm-carousel-slide::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 42%,rgba(8,7,6,.78))}
.mm-carousel-meta{position:absolute;left:0;right:0;bottom:0;z-index:2;padding:22px 24px;display:flex;justify-content:space-between;align-items:end;gap:12px}
.mm-carousel-meta strong{display:block;font:800 1.05rem/1.15 var(--font);letter-spacing:-.02em;color:#fff;max-width:28ch}
.mm-carousel-meta span{display:block;margin-top:4px;font:700 12px/1 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--accent2)}
.mm-carousel-dots{position:absolute;top:16px;right:16px;z-index:3;display:flex;gap:6px}
.mm-carousel-dots button{width:8px;height:8px;border-radius:99px;border:0;padding:0;background:rgba(255,255,255,.35);cursor:pointer}
.mm-carousel-dots button.is-on{background:var(--accent2);width:22px}
.mm-carousel-empty{display:grid;place-items:end start;height:100%;padding:24px;background:
  radial-gradient(circle at 30% 40%, rgba(230,196,138,.2), transparent 42%),
  radial-gradient(circle at 78% 30%, rgba(154,36,48,.32), transparent 46%),
  linear-gradient(145deg,#1a221c,#140f0e 55%,#1f1412)}
.mm-carousel-empty strong{font:900 1.5rem/1.05 var(--font);color:#fff}
.mm-lights{display:flex;justify-content:space-between;gap:6px;padding:8px var(--pad) 0;max-width:1420px;margin:0 auto}
.mm-lights i{flex:1;height:3px;border-radius:99px;background:linear-gradient(90deg,transparent,#9a2430,var(--accent2),#2f5a48,transparent);opacity:.55;animation:twinkle 2.8s ease-in-out infinite}
.mm-lights i:nth-child(2){animation-delay:.4s;opacity:.7}
.mm-lights i:nth-child(3){animation-delay:.9s}
.mm-lights i:nth-child(4){animation-delay:1.3s;opacity:.65}
@keyframes twinkle{0%,100%{filter:brightness(.7)}50%{filter:brightness(1.35)}}
.mm-snow{position:fixed;inset:0;pointer-events:none;z-index:35;overflow:hidden}
.mm-snow i{position:absolute;top:-10%;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.55);animation:snowFall linear infinite;opacity:.85}
.mm-snow i:nth-child(3n){background:rgba(246,240,230,.95)}
.mm-snow i:nth-child(4n){width:3px;height:3px}
.mm-snow i:nth-child(5n){width:6px;height:6px;opacity:.7}
@keyframes snowFall{
  0%{transform:translate3d(0,-6vh,0) rotate(0deg);opacity:0}
  6%{opacity:.9}
  100%{transform:translate3d(42px,112vh,0) rotate(220deg);opacity:.12}
}
@media (prefers-reduced-motion:reduce){
  .mm-snow i,.nav-snowman,.mm-carousel-track{animation:none!important;transition:none!important}
}
.mm-section{padding:18px var(--pad) 28px}
.mm-section-inner{width:min(1420px,100%);margin:0 auto}
.mm-section-head{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:14px}
.mm-section-head h2{margin:0;font:900 clamp(1.35rem,2.4vw,1.85rem)/1.05 var(--font);letter-spacing:-.03em;color:#fff}
.mm-section-head a{font:800 12px/1 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.mm-products{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.mm-cats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:8px}
.mm-cat{min-height:84px;border-radius:10px;border:1px solid var(--line);display:flex;align-items:flex-end;padding:16px;background:linear-gradient(160deg, rgba(31,61,50,.55), rgba(16,14,12,.92));transition:border-color .25s,transform .25s}
.mm-cat:nth-child(2){background:linear-gradient(160deg, rgba(154,36,48,.42), rgba(16,14,12,.92))}
.mm-cat:nth-child(3){background:linear-gradient(160deg, rgba(201,164,106,.28), rgba(16,14,12,.92))}
.mm-cat:nth-child(4){background:linear-gradient(160deg, rgba(47,90,72,.5), rgba(16,14,12,.92))}
.mm-cat:hover{border-color:var(--accent);transform:translateY(-2px)}
.mm-cat span{font:900 .95rem/1.1 var(--font);letter-spacing:-.02em;color:#fff}
.mm-band{margin:8px var(--pad) 0;border-radius:12px;overflow:hidden;border:1px solid var(--line);display:grid;grid-template-columns:1fr 1.1fr;min-height:240px;background:var(--panel)}
.mm-band-copy{padding:28px clamp(18px,3vw,36px);display:flex;flex-direction:column;justify-content:center}
.mm-band-copy h2{margin:8px 0 10px;font:900 clamp(1.5rem,2.8vw,2.2rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff;max-width:13ch}
.mm-band-copy p{margin:0;color:var(--muted);max-width:36ch;font-weight:500;line-height:1.5}
.mm-band-img{position:relative;min-height:200px;background:
  radial-gradient(circle at 30% 40%, rgba(230,196,138,.22), transparent 42%),
  radial-gradient(circle at 70% 60%, rgba(154,36,48,.35), transparent 45%),
  linear-gradient(145deg,#1a221c,#140f0e 55%,#1f1412)}
.mm-band-img::before{content:"";position:absolute;inset:18px auto auto 18px;width:54px;height:54px;border-radius:50%;border:2px solid rgba(230,196,138,.35);box-shadow:inset 0 0 0 8px rgba(31,61,50,.35)}
.mm-band-img::after{content:"\u2726  Holiday";position:absolute;inset:auto 22px 22px auto;font:900 1.5rem/1 var(--font);letter-spacing:-.03em;color:rgba(246,240,230,.22)}
.mm-benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:22px var(--pad);border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0c0b0a;margin-top:28px}
.mm-benefit strong{display:block;font:800 13px/1.2 var(--font);margin-bottom:6px;color:#fff}
.mm-benefit span{display:block;font:500 12px/1.45 var(--font);color:var(--muted)}
.mm-stories{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:28px var(--pad)}
.mm-story{min-height:200px;border-radius:12px;overflow:hidden;position:relative;border:1px solid var(--line);display:flex;align-items:flex-end;padding:24px;color:#fff;background:linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),linear-gradient(135deg,#1c1713,#14201a)}
.mm-story:nth-child(2){background:linear-gradient(180deg,transparent 20%,rgba(8,7,6,.82)),linear-gradient(135deg,#221412,#1a100f)}
.mm-story h3{margin:8px 0;font:900 1.45rem/1.05 var(--font);letter-spacing:-.03em}
.mm-story p{margin:0;max-width:34ch;color:#ddd5cb;font:500 13px/1.45 var(--font)}
.mm-news{margin:0 var(--pad) 40px;padding:28px clamp(18px,3vw,36px);border-radius:12px;border:1px solid var(--line);background:linear-gradient(135deg,#221812,#12100e 55%,#152018);display:grid;grid-template-columns:1.2fr .8fr;gap:18px;align-items:center}
.mm-news h2{margin:0 0 8px;font:900 clamp(1.4rem,2.6vw,1.9rem)/1.05 var(--font);letter-spacing:-.03em;color:#fff}
.mm-news p{margin:0;color:var(--muted);font-weight:500}
.mm-form{display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--line)}
.mm-form input{flex:1;border:0;padding:14px 16px;background:var(--bg);color:var(--ink);font:600 14px var(--font)}
.mm-form button{border:0;background:linear-gradient(90deg,var(--accent2),var(--accent));color:#12100e;padding:0 20px;font:900 12px/1 var(--font);letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
@media(max-width:1100px){.mm-products{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:980px){
  .mm-hero-inner{grid-template-columns:1fr}
  .mm-carousel{min-height:240px}
  .mm-cats,.mm-products{grid-template-columns:repeat(2,minmax(0,1fr))}
  .mm-band,.mm-stories,.mm-news{grid-template-columns:1fr}
  .mm-benefits{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .mm-benefits{grid-template-columns:1fr}
  .mm-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
}
`;
function heroCarouselHtml(products) {
  const slides = (products || []).filter((p) => p?.image_url || Array.isArray(p?.images) && p.images[0]).slice(0, 8);
  if (!slides.length) {
    return `<div class="mm-carousel" aria-label="Holiday edit">
      <div class="mm-carousel-empty"><div><strong>Holiday arrivals</strong><span class="muted" style="display:block;margin-top:6px">Garlands \xB7 glow \xB7 table objects</span></div></div>
    </div>`;
  }
  const track = slides.map((p, i) => {
    const img = esc(p.image_url || p.images?.[0] || "");
    const href = `/products/${encodeURIComponent(p.slug || "")}`;
    const price = Number(p.retail_price_eur || 0);
    return `<a class="mm-carousel-slide" href="${href}" data-slide="${i}" aria-label="${esc(p.name || "Product")}">
        <img src="${img}" alt="${esc(p.name || "")}" loading="${i === 0 ? "eager" : "lazy"}">
        <div class="mm-carousel-meta">
          <div>
            <strong>${esc(p.name || "Holiday piece")}</strong>
            <span>${price > 0 ? `\u20AC${price.toFixed(2)}` : "Shop now"}</span>
          </div>
        </div>
      </a>`;
  }).join("");
  const dots = slides.map((_, i) => `<button type="button" data-dot="${i}" aria-label="Slide ${i + 1}"${i === 0 ? ' class="is-on"' : ""}></button>`).join("");
  return `<div class="mm-carousel" id="heroCarousel" aria-roledescription="carousel" aria-label="Featured holiday products">
    <div class="mm-carousel-track" id="heroTrack">${track}</div>
    <div class="mm-carousel-dots" id="heroDots">${dots}</div>
  </div>`;
}
function snowFlakesHtml(count = 56) {
  return Array.from({ length: count }, (_, i) => {
    const left = i * 17 % 100 + i % 7 * 0.3;
    const size = 2 + i % 5;
    const dur = 7 + i % 11;
    const delay = -(i * 0.73 % 14);
    const drift = 18 + i % 40;
    return `<i style="left:${left.toFixed(1)}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay.toFixed(1)}s;--drift:${drift}px"></i>`;
  }).join("");
}
async function homePage(env) {
  let products = [];
  try {
    products = await getLiveProducts(env, 12);
  } catch {
    products = [];
  }
  const featuredHtml = products.length ? products.slice(0, 10).map(productCard).join("") : `<p class="empty">Holiday pieces are arriving.</p>`;
  const carouselHtml = heroCarouselHtml(products);
  const homeTitle = "Maison Marnier \u2014 Holiday Home Edit";
  const homeDescription = "Festive home decor for European interiors \u2014 ornaments, lights, candles and holiday objects curated by Maison Marnier.";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#100e0c">
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
<style>${HOME_CSS}
.mm-snow i{--drift:28px}
@keyframes snowFall{
  0%{transform:translate3d(0,-6vh,0) rotate(0deg);opacity:0}
  6%{opacity:.92}
  100%{transform:translate3d(var(--drift),112vh,0) rotate(220deg);opacity:.1}
}
</style>
</head>
<body>
${gtmNoscriptHtml()}
<div class="announce">Holiday edit \xB7 Free shipping over \u20AC100 \xB7 Europe</div>
<div class="xmas-garland" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
<header class="site-nav">
  <a class="brand" href="/" aria-label="Maison Marnier home">${brandLogoHtml()}</a>
  <nav class="links">
    <a href="/collections/seasonal">Holiday</a>
    <a href="/collections/new">New</a>
    <a href="/collections/lighting">Lighting</a>
    <a href="/collections/objects">Objects</a>
    <a href="/collections/candles">Candles</a>
    <a href="/journal">Journal</a>
  </nav>
  <div class="tools">
    ${cartControlHtml()}
  </div>
</header>
<div class="mm-lights" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
<div class="mm-snow" aria-hidden="true">${snowFlakesHtml(56)}</div>

<main class="home-main">
  <section class="mm-hero">
    <div class="mm-hero-inner">
      <div>
        <span class="mm-kicker">Maison Marnier \xB7 Holiday 2026</span>
        <h1>Light the <em>home</em> for the holidays</h1>
        <p class="lead">Ornaments, warm lights and festive objects \u2014 real supplier photos, ready for quieter holiday rooms.</p>
        <div class="mm-actions">
          <a class="btn" href="/collections/seasonal">Shop the holiday edit</a>
          <a class="btn btn-ghost" href="#featured">See arrivals</a>
        </div>
      </div>
      ${carouselHtml}
    </div>
  </section>

  <section class="mm-section" id="featured">
    <div class="mm-section-inner">
      <div class="mm-section-head">
        <h2>Holiday arrivals</h2>
        <a href="/collections/new">View all \u2192</a>
      </div>
      <div class="mm-products grid">${featuredHtml}</div>
      <div class="mm-cats" style="margin-top:22px">
        <a class="mm-cat" href="/collections/seasonal"><span>Holiday</span></a>
        <a class="mm-cat" href="/collections/lighting"><span>Glow &amp; lights</span></a>
        <a class="mm-cat" href="/collections/candles"><span>Candles</span></a>
        <a class="mm-cat" href="/collections/objects"><span>Objects</span></a>
      </div>
    </div>
  </section>

  <section class="mm-band" id="seasonal">
    <div class="mm-band-copy">
      <span class="mm-kicker">Seasonal edit</span>
      <h2>Warm rooms for the holidays</h2>
      <p>Garlands, stockings, table light and small festive objects \u2014 collected, not cluttered.</p>
      <div class="mm-actions"><a class="btn" href="/collections/seasonal">Shop holiday</a></div>
    </div>
    <div class="mm-band-img" role="img" aria-label="Holiday home atmosphere"></div>
  </section>

  <div class="mm-benefits">
    <div class="mm-benefit"><strong>EU shipping</strong><span>Partner fulfilment across Europe.</span></div>
    <div class="mm-benefit"><strong>30-day returns</strong><span>Clear, simple and fair.</span></div>
    <div class="mm-benefit"><strong>Real product photos</strong><span>Supplier galleries \u2014 not stock fillers.</span></div>
    <div class="mm-benefit"><strong>Secure checkout</strong><span>Stripe \xB7 VAT calculated at payment.</span></div>
  </div>

  <section class="mm-stories" id="journal">
    <a class="mm-story" href="/journal">
      <div><span class="mm-kicker">Journal</span><h3>A quieter Christmas table</h3><p>Light, linen and a few festive objects.</p></div>
    </a>
    <a class="mm-story" href="/collections/candles">
      <div><span class="mm-kicker">Edit</span><h3>Glow for long evenings</h3><p>Candles and warm lamps after dinner.</p></div>
    </a>
  </section>

  <section class="mm-news">
    <div>
      <h2>Stay close to Maison Marnier</h2>
      <p>Holiday drops and seasonal notes \u2014 occasionally, not constantly.</p>
    </div>
    <form class="mm-form" id="form">
      <input required type="email" placeholder="Your email" aria-label="Email">
      <button type="submit">Subscribe</button>
    </form>
  </section>
</main>

<footer class="site-footer">
  <div class="footer-grid">
    <div><a class="brand" href="/" aria-label="Maison Marnier">${brandLogoHtml()}</a><p class="muted" style="margin-top:12px;max-width:34ch">Holiday edits for warm rooms \u2014 festive objects chosen with quiet care.</p></div>
    <div><h4>Shop</h4><a href="/collections/seasonal">Holiday</a><a href="/collections/new">New Arrivals</a><a href="/collections/lighting">Lighting</a></div>
    <div><h4>About</h4><a href="/about">Our Story</a><a href="/journal">Journal</a><a href="/sourcing">Sourcing</a><a href="https://www.instagram.com/maison.marnier/" target="_blank" rel="noopener noreferrer">Instagram</a></div>
    <div><h4>Help</h4><a href="/shipping">Shipping</a><a href="/returns">Returns</a><a href="/contact">Contact</a><a href="/instagram">Link hub</a></div>
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
(function(){
  const track=document.getElementById('heroTrack');
  const dots=document.getElementById('heroDots');
  if(!track||!dots) return;
  const slides=[...track.children];
  if(slides.length<2) return;
  let i=0;
  const paint=()=>{
    track.style.transform='translateX('+(-i*100)+'%)';
    [...dots.children].forEach((d,idx)=>d.classList.toggle('is-on', idx===i));
  };
  dots.addEventListener('click',e=>{
    const b=e.target.closest('[data-dot]'); if(!b) return;
    i=Number(b.dataset.dot)||0; paint();
  });
  setInterval(()=>{ i=(i+1)%slides.length; paint(); }, 4200);
})();
<\/script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "public, max-age=60",
      "x-frame-options": "SAMEORIGIN",
      "referrer-policy": "strict-origin-when-cross-origin"
    }
  });
}

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

.finder-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.finder-toolbar label{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#6e665d}
.finder-toolbar select{width:auto;min-width:90px}
.finder-card{position:relative}
.finder-card .check{position:absolute;top:10px;left:10px;z-index:2;width:18px;height:18px}
.finder-thumbs{display:flex;gap:4px;margin:8px 0;flex-wrap:wrap}
.finder-thumbs img{width:36px;height:48px;object-fit:cover;background:#e9e0d3;border:1px solid #d4cec4}
.badge{display:inline-block;background:#efe7da;border:1px solid #d4cec4;padding:2px 7px;font-size:11px;margin-left:6px}
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
      <p style="color:#6e665d;margin:6px 0 0">Catalog \xC2\xB7 homepage \xC2\xB7 journal</p>
    </div>
    <div>
      <a href="/" target="_blank">View storefront</a>
      \xC2\xB7 <button class="btn secondary" type="button" id="logoutBtn">Log out</button>
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
          <div class="kpi"><span>Drafts</span><b id="kpiDrafts">\xE2\x80\x94</b></div>
          <div class="kpi"><span>Live</span><b id="kpiLive">\xE2\x80\x94</b></div>
          <div class="kpi"><span>Journal</span><b id="kpiJournal">\xE2\x80\x94</b></div>
          <div class="kpi"><span>CJ</span><b id="kpiCJ">\xE2\x80\x94</b></div>
        </div>
        <div class="msg" id="overviewMsg"></div>
      </section>

            <section class="panel" id="panel-finder">
        <h2>CJ Product Finder</h2>
        <p style="color:#6e665d;margin:0 0 8px">Only products with 3+ or 4+ supplier photos. Tick boxes to import selected, or import the first 50 / 100 matches.</p>
        <div class="searchbar">
          <input id="cjQ" placeholder="Search CJ products\u2026">
          <label>Min photos
            <select id="cjMinImages">
              <option value="3">3+</option>
              <option value="4" selected>4+</option>
            </select>
          </label>
          <button class="btn" type="button" id="cjSearchBtn">Search</button>
        </div>
        <div class="finder-toolbar">
          <label><input type="checkbox" id="cjSelectAll"> Select all</label>
          <button class="btn" type="button" id="cjImportSelectedBtn">Import selected</button>
          <button class="btn secondary" type="button" id="cjImport50Btn">Import 50</button>
          <button class="btn secondary" type="button" id="cjImport100Btn">Import 100</button>
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
        <p style="color:#6e665d">Shows publish date. Only SKUs with 2+ real supplier photos stay live. Unpublish keeps a draft; Delete removes the row.</p>
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
          <tr><th>CJ API</th><td id="setCJ">\xE2\x80\x94</td></tr>
          <tr><th>D1 binding</th><td id="setD1">\xE2\x80\x94</td></tr>
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
  msg('loginMsg','Checking\u2026');
  try{
    const r=await fetch('/api/lume/products',{headers:hdr()});
    const d=await r.json().catch(()=>({ok:false,error:'Bad response'}));
    if(r.status===401 || d.error==='Unauthorized'){
      sessionStorage.removeItem(TOKEN_KEY);
      msg('loginMsg','Invalid admin token.',true);
      return;
    }
    if(!r.ok || d.ok===false){
      sessionStorage.removeItem(TOKEN_KEY);
      msg('loginMsg',d.error||('Login failed ('+r.status+')'),true);
      return;
    }
    msg('loginMsg','');
    boot();
  }catch(e){
    sessionStorage.removeItem(TOKEN_KEY);
    msg('loginMsg',e.message||'Login failed',true);
  }
};
document.getElementById('logoutBtn').onclick=()=>logout();
document.getElementById('side').onclick=e=>{
  const b=e.target.closest('.sideBtn');if(!b)return;goAdmin(b.dataset.panel);
};
document.getElementById('cjSearchBtn').onclick=()=>searchCJ();
document.getElementById('cjImportSelectedBtn').onclick=()=>importSelectedCj();
document.getElementById('cjImport50Btn').onclick=()=>importByCount(50);
document.getElementById('cjImport100Btn').onclick=()=>importByCount(100);
document.getElementById('cjSelectAll').onchange=e=>{
  document.querySelectorAll('#cjResults input[data-cj]').forEach(cb=>cb.checked=e.target.checked);
};
document.getElementById('cjResults').onclick=async e=>{
  const b=e.target.closest('[data-import]'); if(!b) return;
  const payload=JSON.parse(b.getAttribute('data-import'));
  b.disabled=true;
  const r=await api('/api/lume/import',{method:'POST',body:JSON.stringify(payload)});
  b.disabled=false;
  msg('finderMsg',r.ok?('Imported '+r.lumeSku+' ('+ (r.imageCount||'?') +' photos)'):(r.error||'Import failed'),!r.ok);
  if(r.ok)loadAdminAll();
};

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
    document.getElementById('kpiCJ').textContent=d.authenticated?'OK':(d.configured?'!':'\xE2\x80\x94');
    document.getElementById('setCJ').textContent=label+(d.error?': '+d.error:'');
    document.getElementById('setD1').textContent='LUME_DB bound';
    if(show)msg('settingsMsg',label,!d.authenticated);
  }catch(e){if(show)msg('settingsMsg',e.message,true)}
}

async function loadAdminAll(){
  msg('overviewMsg','Loading\xE2\x80\xA6');
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

let cjLastResults=[];
function cjMin(){return Math.max(3, Math.min(8, Number(document.getElementById('cjMinImages').value||4)||4))}
function cjQuery(){return document.getElementById('cjQ').value.trim()||'home decor'}
function selectedCjPayloads(){
  return [...document.querySelectorAll('#cjResults input[data-cj]:checked')].map(el=>{
    try{return JSON.parse(el.getAttribute('data-cj'))}catch{return null}
  }).filter(Boolean);
}
function renderCjResults(products, minImages){
  cjLastResults=products||[];
  const box=document.getElementById('cjResults');
  if(!cjLastResults.length){box.innerHTML='<p class="msg">No products with '+minImages+'+ photos.</p>';return}
  box.innerHTML=cjLastResults.map((p,i)=>{
    const retail=p.suggestedRetailEUR||Math.max(19.95,Math.ceil(Number(p.costUSD||0)*2.5)-0.05);
    const imgs=(p.images&&p.images.length?p.images:[p.image]).filter(Boolean).slice(0,6);
    const payload={id:p.id,name:p.name,sku:p.sku,image:p.image,images:p.images||imgs,costUSD:p.costUSD,retailPriceEUR:retail,stock:p.stock,deliveryDays:p.deliveryDays,category:p.category,minImages};
    const payloadAttr=esc(JSON.stringify(payload));
    return \`<div class="card finder-card"><div class="cols">
      <div>
        <input class="check" type="checkbox" data-cj='\${payloadAttr}' data-idx="\${i}">
        <img src="\${esc(p.image||'')}" alt="">
      </div>
      <div>
        <strong>\${esc(p.name||'')}</strong>
        <span class="badge">\${esc(p.imageCount||imgs.length)} photos</span>
        <div class="msg">SKU \${esc(p.sku||'')} \xB7 cost $\${Number(p.costUSD||0).toFixed(2)} \xB7 stock \${esc(p.stock)} \xB7 \${esc(p.category||'')}</div>
        <div class="finder-thumbs">\${imgs.map(u=>\`<img src="\${esc(u)}" alt="">\`).join('')}</div>
        <button class="btn secondary" type="button" data-import='\${payloadAttr}'>Import draft</button>
      </div></div></div>\`;
  }).join('');
}
async function searchCJ(){
  const q=cjQuery();
  const minImages=cjMin();
  msg('finderMsg','Searching (min '+minImages+' photos)\u2026');
  document.getElementById('cjSelectAll').checked=false;
  const d=await api('/api/cj/search?q='+encodeURIComponent(q)+'&size=24&minImages='+minImages);
  if(!d.ok){msg('finderMsg',d.error||'Search failed',true);return}
  msg('finderMsg',(d.products||[]).length+' products with '+minImages+'+ photos (scanned '+(d.scanned||'?')+')');
  renderCjResults(d.products||[], minImages);
}
async function importSelectedCj(){
  const minImages=cjMin();
  const products=selectedCjPayloads();
  if(!products.length){msg('finderMsg','Tick at least one product.',true);return}
  const btn=document.getElementById('cjImportSelectedBtn');
  btn.disabled=true;
  msg('finderMsg','Importing '+products.length+' selected\u2026');
  try{
    const r=await api('/api/lume/import-bulk',{method:'POST',body:JSON.stringify({products,minImages})});
    msg('finderMsg',r.ok?('Imported '+r.imported+' \xB7 skipped '+r.skipped):(r.error||'Import failed'),!r.ok);
    if(r.ok)loadAdminAll();
  }finally{btn.disabled=false}
}
async function importByCount(limit){
  const minImages=cjMin();
  const q=cjQuery();
  if(!confirm('Import up to '+limit+' CJ products for \\"'+q+'\\" with '+minImages+'+ photos?'))return;
  const btn=document.getElementById(limit===100?'cjImport100Btn':'cjImport50Btn');
  btn.disabled=true;
  msg('finderMsg','Importing up to '+limit+'\u2026');
  try{
    const r=await api('/api/lume/import-bulk',{method:'POST',body:JSON.stringify({q,limit,minImages})});
    msg('finderMsg',r.ok?('Imported '+r.imported+' \xB7 skipped '+r.skipped+(r.errors&&r.errors[0]?' \xB7 e.g. '+r.errors[0].error:'')):(r.error||'Import failed'),!r.ok);
    if(r.ok)loadAdminAll();
  }finally{btn.disabled=false}
}

async function publishAllDrafts(){
  if(!confirm('Publish all valid drafts? Invalid drafts will be skipped.'))return;
  const btn=document.getElementById('publishAllBtn');
  btn.disabled=true;
  try{
    const r=await api('/api/lume/publish-all',{method:'POST',body:'{}'});
    if(!r.ok){msg('draftsMsg',r.error||'Publish all failed',true);return}
    msg('draftsMsg','Published '+r.published+' \xC2\xB7 skipped '+r.skipped+(r.errors&&r.errors.length?' \xC2\xB7 first skip: '+(r.errors[0].error||''):''));
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
        <label>Gallery URLs (one per line)</label><textarea data-f="image_urls" rows="3">\${esc((()=>{try{const a=typeof p.image_urls==='string'?JSON.parse(p.image_urls||'[]'):(p.image_urls||[]);return Array.isArray(a)?a.join('\\n'):''}catch(e){return ''}})())}</textarea>
        <label>Description</label><textarea data-f="description">\${esc(p.description||'')}</textarea>
        <div class="msg">SKU \${esc(p.lume_sku)} \xC2\xB7 cost $\${Number(p.supplier_cost_usd||0).toFixed(2)} \xC2\xB7 stock \${esc(p.stock)} \xC2\xB7 photos \${esc(p.image_count!=null?p.image_count:(()=>{try{const a=typeof p.image_urls==='string'?JSON.parse(p.image_urls||'[]'):(p.image_urls||[]);return Array.isArray(a)?a.length:0}catch(e){return 0}})())} \xC2\xB7 \${esc(p.status)}\${p.published_at?(' \xC2\xB7 was live '+esc(p.published_at)):''}</div>
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
        msg('draftsMsg',r.ok?('Refreshed cost $'+Number(r.supplier_cost_usd).toFixed(2)+' \xC2\xB7 stock '+r.stock):(r.error||'Refresh failed'),!r.ok);
        if(r.ok)loadAdminAll();
      }
    }finally{btn.disabled=false}
  };
}

function fmtPub(ts){
  if(!ts)return '\xE2\x80\x94';
  try{const d=new Date(ts.includes('T')||ts.includes('Z')?ts:String(ts).replace(' ','T')+'Z');if(Number.isNaN(d.getTime()))return esc(ts);return d.toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}catch(e){return esc(ts)}
}
function renderPublished(live){
  const box=document.getElementById('published');
  if(!live.length){box.innerHTML='<p class="msg">No live products with 2+ real photos.</p>';return}
  box.innerHTML=\`<div class="row"><button class="btn secondary" type="button" id="pruneThinBtn">Unpublish thin galleries (&lt;2 photos)</button></div><table><tr><th>Product</th><th>Published</th><th>Photos</th><th>Price</th><th>Stock</th><th></th></tr>\${live.map(p=>\`<tr data-pid="\${p.id}">
    <td><strong>\${esc(p.name)}</strong><div class="msg">\${esc(p.lume_sku)} \xC2\xB7 \${esc(p.category||'')}</div></td>
    <td>\${fmtPub(p.published_at)}</td>
    <td>\${esc(p.image_count||0)}</td>
    <td>\xE2\x82\xAC\${Number(p.retail_price_eur||0).toFixed(2)}</td>
    <td>\${esc(p.stock)}</td>
    <td>
      <a href="/products/\${encodeURIComponent(p.slug||'')}" target="_blank">View</a>
      <button class="btn secondary" type="button" data-unpub="\${p.id}">Unpublish</button>
      <button class="btn secondary" type="button" data-del="\${p.id}">Delete</button>
    </td>
  </tr>\`).join('')}</table>\`;
  const prune=document.getElementById('pruneThinBtn');
  if(prune)prune.onclick=async()=>{
    prune.disabled=true;
    try{
      const r=await api('/api/lume/prune-thin',{method:'POST',body:JSON.stringify({})});
      msg('publishedMsg',r.ok?('Demoted '+r.demoted+' of '+r.scanned):(r.error||'Failed'),!r.ok);
      if(r.ok)loadAdminAll();
    }finally{prune.disabled=false}
  };
  box.onclick=async e=>{
    const u=e.target.closest('[data-unpub]');
    const d=e.target.closest('[data-del]');
    if(u){
      if(!confirm('Unpublish this product? It will leave the storefront but stay as draft.'))return;
      u.disabled=true;
      const r=await api('/api/lume/unpublish',{method:'POST',body:JSON.stringify({id:Number(u.dataset.unpub)})});
      msg('publishedMsg',r.ok?'Unpublished.':(r.error||'Failed'),!r.ok);
      u.disabled=false; if(r.ok)loadAdminAll();
    }
    if(d){
      if(!confirm('Permanently delete this product? This cannot be undone.'))return;
      d.disabled=true;
      const r=await api('/api/lume/delete',{method:'POST',body:JSON.stringify({id:Number(d.dataset.del)})});
      msg('publishedMsg',r.ok?'Deleted.':(r.error||'Failed'),!r.ok);
      d.disabled=false; if(r.ok)loadAdminAll();
    }
  };
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
    <strong>\${esc(a.title)}</strong> \xC2\xB7 <code>\${esc(a.slug)}</code> \xC2\xB7 \${esc(a.status)}
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
      <td>\xE2\x82\xAC\${Number(o.total_eur||0).toFixed(2)}</td>
      <td>\${esc(o.cj_order_id||'\xE2\x80\x94')}<div class="msg">\${esc(o.cj_status||o.cj_error||'')}</div></td>
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
        const items=(res.items||[]).map(i=>i.quantity+'\xC3\x97 '+i.name).join(', ');
        msg('ordersMsg',res.order.order_number+': '+items+(res.order.shipping_city?(' \xE2\x86\x92 '+res.order.shipping_city):''));
      }
    };
    msg('ordersMsg',orders.length+' orders');
  }catch(e){msg('ordersMsg',e.message,true)}
}

if(token())boot();
<\/script>
</body>
</html>`, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

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

// src/pages/collection.js
init_escape();
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
  ["Holiday", "/collections/seasonal"],
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

// src/pages/product.js
init_escape();
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
    const images = productImages(p);
    const mainImage = images[0] || "";
    const thumbs = images.length > 1 ? `<div class="product-thumbs" id="galleryThumbs" role="tablist" aria-label="Product images">
            ${images.map(
      (src, i) => `<button type="button" class="${i === 0 ? "is-active" : ""}" data-src="${esc(src)}" aria-label="Image ${i + 1}">
                    <img src="${esc(src)}" alt="" loading="lazy">
                  </button>`
    ).join("")}
          </div>` : "";
    const body = `<nav class="crumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="sep">/</span>
        <a href="${collectionHref}">${esc(p.category || "Shop")}</a><span class="sep">/</span>
        <span>${esc(p.name || "")}</span>
      </nav>
      <div class="product">
      <div class="product-gallery">
        <div class="frame"><img id="galleryMain" src="${esc(mainImage)}" alt="${esc(p.name || "")}"></div>
        ${thumbs}
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
                  data-image="${esc(mainImage)}">Add to cart</button>
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
  const main=document.getElementById('galleryMain');
  const thumbs=document.getElementById('galleryThumbs');
  if(main&&thumbs){
    thumbs.addEventListener('click',(e)=>{
      const btn=e.target.closest('button[data-src]');
      if(!btn)return;
      main.src=btn.dataset.src;
      thumbs.querySelectorAll('button').forEach(b=>b.classList.toggle('is-active',b===btn));
      const cartBtn=document.getElementById('addCart');
      if(cartBtn)cartBtn.dataset.image=btn.dataset.src;
    });
  }
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
    const pForLd = { ...p, image_url: mainImage, image_urls: images };
    return htmlPage(p.name, body, {
      description: String(p.description || p.name || "").slice(0, 160),
      canonical: productPath,
      ogImage: mainImage || "",
      ogType: "product",
      jsonLd: productJsonLd(pForLd, { url: productPath, collectionPath: collectionHref }),
      cache: "public, max-age=300"
    });
  } catch {
    return htmlPage("Product", '<p class="empty">Product error.</p>', { status: 500 });
  }
}

// src/pages/journal.js
init_escape();
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

// src/pages/info.js
init_escape();
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
    "Questions about a piece, an order, or collaboration?\n\nEmail hello@maisonmarnier.com and we will reply within two business days.\n\nFor social and collabs, find us on Instagram @maison.marnier."
  ],
  sourcing: [
    "Sourcing",
    "Maison Marnier curates home decor from selected suppliers. Every candidate is reviewed for price, stock, delivery, imagery and how it sits with the rest of the edit before it is published to the storefront.\n\nWe favour materials and forms that stay useful beyond a single season."
  ],
  about: [
    "About Maison Marnier",
    "Maison Marnier is a curated home edit for calm, considered everyday spaces \u2014 natural materials, soft light, and objects worth keeping.\n\nFollow the maison on Instagram @maison.marnier for holiday rooms, new pieces, and quiet f\xEAtes.\n\nThe maison is based in Europe and publishes in EUR. Payments are processed securely by Stripe."
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

// src/pages/instagram.js
var IG_URL = "https://www.instagram.com/maison.marnier/";
var PAGE_CSS = `
.ig-hub{max-width:420px;margin:0 auto;padding:28px 0 48px;text-align:center}
.ig-hero{padding:12px 0 28px}
.ig-hero .brand-lockup{justify-content:center;margin-bottom:18px}
.ig-hero h1{margin:0;font:900 clamp(1.55rem,4.2vw,1.9rem)/1.05 var(--font);letter-spacing:-.035em;color:#fff}
.ig-hero p{margin:12px auto 0;max-width:32ch;color:var(--muted);font:500 14px/1.5 var(--font)}
.ig-links{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.ig-links a{display:block;padding:16px 18px;border:1px solid var(--line);border-radius:8px;background:
  linear-gradient(135deg, rgba(31,61,50,.28), transparent 55%),
  var(--panel);
  font:800 13px/1.2 var(--font);letter-spacing:.06em;text-transform:uppercase;color:#fff;
  transition:border-color .2s,background .2s,transform .2s}
.ig-links a:hover{border-color:var(--accent);background:rgba(201,164,106,.1);transform:translateY(-1px)}
.ig-links a.ig-primary{border-color:var(--accent);background:linear-gradient(90deg,rgba(201,164,106,.18),rgba(154,36,48,.12))}
.ig-links a.ig-external{font-size:12px;letter-spacing:.08em;color:var(--soft);background:transparent}
.ig-note{margin:22px 0 0;color:var(--muted);font:600 12px/1.45 var(--font)}
`;
var LINKS = [
  { href: "/collections/seasonal", label: "Shop Holiday", primary: true },
  { href: "/collections/new", label: "New arrivals" },
  { href: "/journal", label: "Journal" },
  { href: "/contact", label: "Contact" },
  { href: "/", label: "Full site" }
];
function instagramPage() {
  const linksHtml = LINKS.map((l) => {
    const cls = l.primary ? ' class="ig-primary"' : "";
    return `<li><a${cls} href="${l.href}">${l.label}</a></li>`;
  }).join("");
  const body = `<style>${PAGE_CSS}</style>
<section class="ig-hub">
  <div class="ig-hero">
    ${brandLogoHtml()}
    <h1>Maison Marnier</h1>
    <p>Holiday home edit for warm, quieter rooms \u2014 ornaments, light and objects worth keeping.</p>
  </div>
  <ul class="ig-links">
    ${linksHtml}
    <li><a class="ig-external" href="${IG_URL}" target="_blank" rel="noopener noreferrer">@maison.marnier on Instagram</a></li>
  </ul>
  <p class="ig-note">Europe \xB7 EUR \xB7 Free shipping over \u20AC100</p>
</section>`;
  return htmlPage("Instagram", body, {
    description: "Maison Marnier on Instagram \u2014 shop the holiday home edit, new arrivals, journal and contact.",
    canonical: "/instagram",
    cache: "public, max-age=3600"
  });
}

// src/pages/seo.js
var INFO_PATHS = [
  "/about",
  "/shipping",
  "/returns",
  "/contact",
  "/sourcing",
  "/journal",
  "/instagram"
];
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
function urlEntry(loc, lastmod) {
  const last = lastmod ? `<lastmod>${escXml(lastmod)}</lastmod>` : "";
  return `<url><loc>${escXml(loc)}</loc>${last}</url>`;
}
function urlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}
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
function sitemapXml() {
  return sitemapIndexXml();
}
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
async function sitemapProductsXml(env) {
  const entries = [];
  try {
    const r = await env.LUME_DB.prepare(
      `SELECT slug, published_at, image_url, image_urls FROM products
       WHERE status='live' AND slug IS NOT NULL AND slug!=''
       ORDER BY published_at DESC, id DESC LIMIT ?`
    ).bind(PRODUCT_CAP * 3).all();
    for (const p of r.results || []) {
      if (!isStorefrontListable(p, { minPhotos: 2 })) continue;
      entries.push(
        urlEntry(`${SITE_ORIGIN}/products/${encodeURIComponent(p.slug)}`, formatLastmod(p.published_at))
      );
      if (entries.length >= PRODUCT_CAP) break;
    }
  } catch {
  }
  return xmlResponse(urlset(entries));
}
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

// src/router.js
function methodNotAllowed() {
  return json({ ok: false, error: "Method not allowed" }, 405);
}
function apexRedirect(request, url) {
  const host = (request.headers.get("Host") || url.host || "").split(":")[0].toLowerCase();
  if (host !== "www.maisonmarnier.com") return null;
  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = "maisonmarnier.com";
  target.port = "";
  return Response.redirect(target.toString(), 301);
}
async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method.toUpperCase();
  const redirected = apexRedirect(request, url);
  if (redirected) return redirected;
  if (pathname === "/robots.txt") return robotsTxt();
  if (pathname === "/logo.jpg" || pathname === "/logo.png" || pathname === "/favicon.ico" || pathname === "/favicon.svg" || pathname === "/logo.svg") {
    return logoJpegResponse();
  }
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
  if (pathname === "/api/lume/unpublish") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return unpublishLumeProduct(request, env);
  }
  if (pathname === "/api/lume/delete") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    return deleteLumeProduct(request, env);
  }
  if (pathname === "/api/lume/prune-thin") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    const result = await pruneThinLiveProducts(env);
    return json({ ok: true, ...result });
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
  if (pathname === "/api/lume/import-bulk") {
    if (method !== "POST") return methodNotAllowed();
    const denied = await requireImportAuth(request, env);
    if (denied) return denied;
    return importLumeProductsBulk(request, env);
  }
  if (pathname === "/api/lume/replace-seed-cj") {
    if (method !== "POST") return methodNotAllowed();
    return replaceSeedWithCj(request, env);
  }
  if (pathname === "/api/lume/import-christmas") {
    if (method !== "POST") return methodNotAllowed();
    return importChristmasCatalog(request, env);
  }
  if (pathname === "/api/lume/sync-galleries") {
    if (method !== "POST") return methodNotAllowed();
    return syncProductGalleries(request, env);
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
  if (pathname === "/instagram") return instagramPage();
  if (pathname === "/admin") return adminPage();
  if (pathname === "/" || pathname === "") return homePage(env);
  return htmlNotFound();
}
function htmlNotFound() {
  return new Response(
    '<!doctype html><html><body><h1>Not found</h1><p><a href="/">Maison Marnier</a></p></body></html>',
    {
      status: 404,
      headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-store" }
    }
  );
}

// src/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
export {
  worker_default as default
};
