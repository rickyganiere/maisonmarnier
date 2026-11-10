/**
 * Supplier-agnostic draft import.
 * Accepts product payloads from any source (CSV→JSON, Spocket export, Syncee, manual…).
 * CJ stays on its own path; other suppliers use namespaced supplier_product_id: CODE:rawId
 */
import { safeUrl } from '../lib/escape.js';
import { productImages, serializeImageUrls } from '../lib/images.js';
import {
  cleanProductName,
  mapMaisonCategory,
  suggestedCompareEur,
  suggestedRetailEur,
} from '../lib/merch.js';
import { slugify } from '../lib/slugify.js';

const RESERVED = new Set(['CJ', 'SEED']);

/** Normalize supplier code: SPOCKET, SYNCEE, MANUAL, … */
export function normalizeSupplierCode(code) {
  const c = String(code || 'EXT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
  if (!c) return 'EXT';
  if (RESERVED.has(c)) {
    throw new Error(`Supplier code ${c} is reserved — use the CJ finder or seed tools instead.`);
  }
  return c;
}

export function namespacedSupplierProductId(supplier, rawId) {
  const id = String(rawId ?? '').trim();
  if (!id) throw new Error('Missing product id');
  const prefix = `${supplier}:`;
  return id.startsWith(prefix) ? id.slice(0, 120) : `${prefix}${id}`.slice(0, 120);
}

function lumeSkuFor(supplier, rawId, skuRaw) {
  const tail = String(skuRaw || rawId)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-16)
    .toUpperCase();
  return (`LL-${supplier.slice(0, 4)}-${tail || 'X'}`).slice(0, 40);
}

/**
 * Map a loose external product object into a draft insert statement.
 * Accepted fields (snake or camel):
 *   id, sku, name, images[], image, costUSD/cost_usd, retailPriceEUR/retail_price_eur,
 *   stock, deliveryDays/delivery_days, category, description
 */
export function prepareExternalDraft(env, supplier, p) {
  const code = normalizeSupplierCode(supplier);
  const rawId = p.id ?? p.supplier_product_id ?? p.sku;
  const supplierProductId = namespacedSupplierProductId(code, rawId);
  const skuRaw = String(p.sku || p.supplier_sku || rawId || '').slice(0, 80);

  let images = Array.isArray(p.images)
    ? p.images
    : Array.isArray(p.image_urls)
      ? p.image_urls
      : [];
  let image = safeUrl(p.image || p.image_url || images[0] || '', '');
  images = productImages({ image_url: image, image_urls: images }, { max: 12 });
  image = images[0] || '';

  let cost = Number(p.costUSD ?? p.cost_usd ?? p.supplier_cost_usd ?? 0) || 0;
  let stock = Number(p.stock ?? 0) || 0;
  let retail = Number(p.retailPriceEUR ?? p.retail_price_eur ?? 0) || 0;
  if (!(retail > 0) && cost > 0) retail = suggestedRetailEur(cost);

  const nameRaw = String(p.name || '').trim().slice(0, 240);
  if (!nameRaw) throw new Error('Product name is required');
  const name = cleanProductName(nameRaw) || nameRaw;
  const category = mapMaisonCategory(name, p.category);
  const compare = suggestedCompareEur(retail);
  const slug = slugify(name);
  const deliveryDays = String(p.deliveryDays || p.delivery_days || '7-15').slice(0, 40);
  const description =
    String(p.description || '').trim().slice(0, 5000) ||
    `A considered piece for calm interiors — curated for Maison Marnier.\n\n${name}`;
  const sku = lumeSkuFor(code, rawId, skuRaw);
  const gallery = serializeImageUrls(images);

  const statement = env.LUME_DB.prepare(
    `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,image_urls,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(supplier_product_id) DO NOTHING RETURNING id`,
  ).bind(
    sku,
    code,
    supplierProductId,
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
    'draft',
    slug,
    description,
  );

  return {
    statement,
    draft: {
      lumeSku: sku,
      supplier: code,
      supplierProductId,
      status: 'draft',
      name,
      category,
      slug,
      imageCount: images.length,
    },
  };
}

/** Example payloads for admin UI — holiday home decor shape. */
export function exampleExternalProducts() {
  return [
    {
      id: 'demo-garland-01',
      sku: 'SPK-GARLAND-01',
      name: 'Warm pine garland with soft gold tips',
      costUSD: 8.4,
      stock: 120,
      deliveryDays: '8-14',
      category: 'Holiday',
      images: [
        'https://cf.cjdropshipping.com/quick/product/f008bf58-f7b0-480f-b191-e9ea6f05a68d.jpg',
        'https://cf.cjdropshipping.com/quick/product/4a272584-3dbe-48da-916a-8c339552f852.jpg',
      ],
    },
    {
      id: 'demo-candle-01',
      sku: 'SPK-CANDLE-01',
      name: 'Amber glass candle for quiet evenings',
      costUSD: 6.2,
      stock: 80,
      deliveryDays: '7-12',
      category: 'Candles',
      images: [
        'https://cf.cjdropshipping.com/quick/product/920ea9f8-5221-43ab-94c0-621693289928.jpg',
        'https://oss-cf.cjdropshipping.com/product/2024/10/17/09/9f88a440-cf3c-4cbf-9a78-61bded43b702.jpg',
      ],
    },
    {
      id: 'demo-ornament-01',
      sku: 'SYN-ORN-01',
      name: 'Matte ceramic ornament set',
      costUSD: 5.1,
      stock: 200,
      deliveryDays: '10-16',
      category: 'Holiday',
      images: [
        'https://cf.cjdropshipping.com/bbdf7d33-3944-47f9-b8fd-cfaf5ac4ba31.jpg',
        'https://cf.cjdropshipping.com/c9b386da-09e4-4d7c-8da3-33b2a386cc8d.jpg',
      ],
    },
  ];
}
