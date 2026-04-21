-- ============================================================
-- reado-station D1 core schema
-- Phase 2 migration target: content, digests, sources, runs, ops state.
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id                 TEXT PRIMARY KEY,
  title              TEXT NOT NULL,
  title_zh           TEXT,
  url                TEXT NOT NULL,
  summary            TEXT,
  summary_zh         TEXT,
  published_at       TEXT,
  source             TEXT NOT NULL,
  source_name        TEXT NOT NULL,
  category           TEXT NOT NULL,
  image_url          TEXT,
  date               TEXT NOT NULL,
  batch              TEXT NOT NULL,
  translate_attempts INTEGER DEFAULT 0,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_date_batch ON items (date, batch);
CREATE INDEX IF NOT EXISTS idx_items_source ON items (source);
CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);
CREATE INDEX IF NOT EXISTS idx_items_published_at ON items (published_at);

CREATE TABLE IF NOT EXISTS digests (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  date                TEXT NOT NULL,
  batch               TEXT NOT NULL DEFAULT 'latest',
  headline            TEXT,
  headline_zh         TEXT,
  observation_text    TEXT,
  observation_text_zh TEXT,
  observations        TEXT DEFAULT '[]',
  clusters            TEXT DEFAULT '[]',
  raw_markdown        TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  UNIQUE(date, batch)
);

CREATE INDEX IF NOT EXISTS idx_digests_date ON digests (date);

CREATE TABLE IF NOT EXISTS sources (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  adapter              TEXT NOT NULL,
  url                  TEXT,
  hours                INTEGER DEFAULT 24,
  enabled              INTEGER DEFAULT 1,
  category             TEXT,
  topics               TEXT DEFAULT '[]',
  fallback_adapter     TEXT,
  fallback_url         TEXT,
  google_news_query    TEXT,
  command              TEXT DEFAULT '[]',
  strategy             TEXT,
  searchable           INTEGER DEFAULT 0,
  search_command       TEXT DEFAULT '[]',
  consecutive_failures INTEGER DEFAULT 0,
  last_success         TEXT,
  last_failure         TEXT,
  created_at           TEXT DEFAULT (datetime('now')),
  updated_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collection_runs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  date              TEXT NOT NULL,
  batch             TEXT NOT NULL,
  mode              TEXT NOT NULL,
  fetched_at        TEXT,
  total_sources     INTEGER,
  success_sources   INTEGER,
  failed_sources    INTEGER,
  total_items       INTEGER,
  deduplicated      INTEGER,
  failed_source_ids TEXT DEFAULT '[]',
  success_source_ids TEXT DEFAULT '[]',
  duration_ms       INTEGER,
  created_at        TEXT DEFAULT (datetime('now')),
  UNIQUE(date, batch, mode)
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_date ON collection_runs (date);
CREATE INDEX IF NOT EXISTS idx_collection_runs_batch ON collection_runs (batch);

CREATE TABLE IF NOT EXISTS ops_state (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
