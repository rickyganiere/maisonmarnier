CREATE TABLE IF NOT EXISTS instagram_studio_connection (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  sealed_key TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS instagram_mockups (
  product_id INTEGER NOT NULL REFERENCES products(id),
  revision TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 4),
  image_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK(state IN ('creating','ready','failed')),
  lease TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(product_id,revision,slot)
);
