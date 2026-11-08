#!/usr/bin/env node
/**
 * Generate ~100 curated Maison decor products as SQL for D1.
 * Images: Unsplash (relevant home/lifestyle). Supplier: SEED (manual catalog).
 */
import { writeFileSync } from 'fs';

const IMG = {
  lamp: [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543198126-a87ad3b895db?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1524484483546-bf6a2a0a4d88?auto=format&fit=crop&w=800&q=80',
  ],
  vase: [
    'https://images.unsplash.com/photo-1578508907020-040944bfea4a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1603204077779-bed963ea7d0e?auto=format&fit=crop&w=800&q=80',
  ],
  textile: [
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
  ],
  candle: [
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602602673140-4d1b0ed7a0a5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602602672395-55c7a7d2b4c1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602874801006-e26c4c4c0c8a?auto=format&fit=crop&w=800&q=80',
  ],
  wall: [
    'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
  ],
  seasonal: [
    'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=800&q=80',
  ],
  furniture: [
    'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1538688525198-50d4021302d8?auto=format&fit=crop&w=800&q=80',
  ],
  object: [
    'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1484101403633-562f8913981e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
  ],
};

const NAMES = {
  Lighting: [
    'Arc Floor Lamp', 'Ceramic Table Lamp', 'Linen Shade Desk Light', 'Brass Reading Lamp',
    'Paper Globe Pendant', 'Walnut Sconce', 'Opal Glass Night Light', 'Rattan Floor Lantern',
    'Matte Black Wall Light', 'Alabaster Table Lamp', 'Cord Pendant Light', 'Tripod Floor Lamp',
  ],
  Objects: [
    'Stoneware Bud Vase', 'Travertine Catchall', 'Oak Pedestal Bowl', 'Matte Ceramic Vessel',
    'Marble Bookend Pair', 'Handblown Glass Orb', 'Clay Sculpture Form', 'Brass Tray',
    'Ceramic Pitcher', 'Stone Diffuser Base', 'Walnut Desk Object', 'Porcelain Bud Cup',
  ],
  Textiles: [
    'Heavy Linen Throw', 'Bouclé Cushion Cover', 'Washed Cotton Pillow', 'Wool Blend Blanket',
    'Stonewashed Duvet Cover', 'Ribbed Knit Throw', 'Linen Napkin Set', 'Velvet Cushion',
    'Organic Cotton Runner', 'Waffle Bath Towel', 'Soft Mohair Throw', 'Canvas Floor Cushion',
  ],
  Candles: [
    'Soy Column Candle', 'Amber Glass Candle', 'Beeswax Taper Pair', 'Ceramic Candle Vessel',
    'Cedar Scented Candle', 'Fig Leaf Candle', 'Matte Black Candle Jar', 'Travel Tin Candle',
    'Pillar Candle Trio', 'Ceramic Oil Diffuser', 'Incense Holder Stone', 'Room Spray Set',
  ],
  'Wall Decor': [
    'Framed Abstract Print', 'Oak Floating Shelf', 'Woven Wall Hanging', 'Brass Wall Mirror',
    'Linen Textile Art', 'Ceramic Wall Plate', 'Minimal Line Print', 'Round Rattan Mirror',
    'Gallery Frame Set', 'Plaster Relief Panel', 'Ink Wash Print', 'Wood Slat Accent',
  ],
  Seasonal: [
    'Winter Greenery Bundle', 'Pinecone Centerpiece', 'Wool Stocking', 'Brass Candle Ring',
    'Dried Flower Bunch', 'Festive Table Runner', 'Ceramic Ornament Set', 'Evergreen Wreath',
    'Amber Fairy Lights', 'Linen Holiday Cushion', 'Wood Advent Box', 'Frost Glass Lantern',
  ],
  Furniture: [
    'Oak Side Table', 'Rattan Accent Chair', 'Walnut Bench', 'Stone Coffee Table',
    'Linen Ottoman', 'Oak Console Table', 'Woven Storage Basket Stand', 'Ceramic Side Table',
  ],
};

function slugify(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}
function esc(s) {
  return String(s).replace(/'/g, "''");
}
function pick(arr, i) {
  return arr[i % arr.length];
}
function retailFromCost(cost) {
  return Math.max(9.95, Math.ceil(cost * 3) - 0.05);
}
function compareFromRetail(r) {
  return Math.round(r * 1.28 * 20) / 20;
}

const products = [];
let n = 0;
const catKeys = Object.keys(NAMES);
while (products.length < 100) {
  const cat = catKeys[n % catKeys.length];
  const names = NAMES[cat];
  const name = names[Math.floor(n / catKeys.length) % names.length];
  // slight variation to keep unique
  const variant = Math.floor(n / (catKeys.length * names.length));
  const fullName = variant === 0 ? name : `${name} ${['II', 'III', 'Atelier', 'Studio'][variant % 4]}`;
  const id = String(products.length + 1).padStart(3, '0');
  const costBase = {
    Lighting: 8, Objects: 5, Textiles: 6, Candles: 3.5, 'Wall Decor': 4.5, Seasonal: 4, Furniture: 22,
  }[cat];
  const cost = Math.round((costBase + (n % 7) * 0.85) * 100) / 100;
  const retail = retailFromCost(cost);
  const compare = compareFromRetail(retail);
  const imgPool =
    cat === 'Lighting' ? IMG.lamp :
    cat === 'Objects' ? IMG.object.concat(IMG.vase) :
    cat === 'Textiles' ? IMG.textile :
    cat === 'Candles' ? IMG.candle :
    cat === 'Wall Decor' ? IMG.wall :
    cat === 'Seasonal' ? IMG.seasonal :
    IMG.furniture;
  const image = pick(imgPool, n);
  const slug = slugify(`${fullName}-${id}`);
  products.push({
    sku: `LL-SEED-${id}`,
    supplier_product_id: `SEED-MM-${id}`,
    name: fullName,
    slug,
    category: cat,
    cost,
    retail,
    compare,
    image,
    stock: 80 + (n % 40) * 3,
    description: `A considered ${cat.toLowerCase()} piece for calm interiors — curated for Maison Marnier.\\n\\n${fullName}.`,
  });
  n += 1;
}

const stmts = products.map((p) => {
  return `INSERT INTO products (lume_sku,supplier,supplier_product_id,supplier_sku,name,image_url,supplier_cost_usd,retail_price_eur,compare_at_price_eur,category,stock,delivery_days,status,slug,description,published_at,updated_at)
VALUES ('${esc(p.sku)}','SEED','${esc(p.supplier_product_id)}','${esc(p.sku)}','${esc(p.name)}','${esc(p.image)}',${p.cost},${p.retail},${p.compare},'${esc(p.category)}',${p.stock},'7-15','live','${esc(p.slug)}','${esc(p.description)}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT(supplier_product_id) DO UPDATE SET
  name=excluded.name,image_url=excluded.image_url,supplier_cost_usd=excluded.supplier_cost_usd,
  retail_price_eur=excluded.retail_price_eur,compare_at_price_eur=excluded.compare_at_price_eur,
  category=excluded.category,stock=excluded.stock,status='live',slug=excluded.slug,
  description=excluded.description,published_at=COALESCE(products.published_at,CURRENT_TIMESTAMP),
  updated_at=CURRENT_TIMESTAMP;`;
});

writeFileSync('/tmp/seed-100.sql', stmts.join('\n'));
writeFileSync('/tmp/seed-100.json', JSON.stringify(products, null, 2));
console.log('products', products.length);
console.log('sql_bytes', stmts.join('\n').length);
