-- Commerce: Stripe checkout + CJ fulfillment

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  email TEXT,
  customer_name TEXT,
  shipping_phone TEXT,
  shipping_address TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_zip TEXT,
  shipping_country TEXT,
  shipping_country_code TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  cj_order_id TEXT,
  cj_status TEXT,
  cj_error TEXT,
  currency TEXT NOT NULL DEFAULT 'eur',
  subtotal_eur REAL NOT NULL DEFAULT 0,
  shipping_eur REAL NOT NULL DEFAULT 0,
  total_eur REAL NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe ON orders(stripe_session_id);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  lume_sku TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  slug TEXT,
  supplier_product_id TEXT,
  supplier_sku TEXT,
  cj_vid TEXT,
  unit_price_eur REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  supplier_cost_usd REAL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
