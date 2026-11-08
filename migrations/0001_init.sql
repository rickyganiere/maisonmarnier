-- Maison Marnier core schema (products + homepage content)

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lume_sku TEXT NOT NULL,
  supplier TEXT NOT NULL DEFAULT 'CJ',
  supplier_product_id TEXT NOT NULL UNIQUE,
  supplier_sku TEXT,
  name TEXT NOT NULL,
  image_url TEXT,
  supplier_cost_usd REAL DEFAULT 0,
  retail_price_eur REAL DEFAULT 0,
  compare_at_price_eur REAL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  delivery_days TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  slug TEXT,
  description TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
