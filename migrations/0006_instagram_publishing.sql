CREATE TABLE IF NOT EXISTS instagram_account (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  user_id TEXT NOT NULL,
  sealed_token TEXT NOT NULL,
  refreshed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS instagram_posts (
  fingerprint TEXT PRIMARY KEY,
  product_id INTEGER NOT NULL,
  photo_key TEXT NOT NULL,
  caption TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('creating', 'ready', 'publishing', 'published', 'failed')),
  container_id TEXT,
  lease TEXT,
  media_id TEXT,
  permalink TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS instagram_posts_product ON instagram_posts(product_id, updated_at DESC);
