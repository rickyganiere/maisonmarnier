CREATE TABLE IF NOT EXISTS catalog_import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_key TEXT NOT NULL UNIQUE,
  run_date TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'cron',
  status TEXT NOT NULL DEFAULT 'running',
  target INTEGER NOT NULL DEFAULT 50,
  imported INTEGER NOT NULL DEFAULT 0,
  scanned INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_catalog_import_runs_date
  ON catalog_import_runs(run_date DESC);
