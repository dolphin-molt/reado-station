-- ============================================================
-- reado-station input closure and public collection pool
-- Channel profiles, onboarding, source-level collection jobs, radio episodes.
-- ============================================================

CREATE TABLE IF NOT EXISTS channel_profiles (
  id             TEXT PRIMARY KEY,
  source_type    TEXT NOT NULL,
  source_value   TEXT NOT NULL,
  domain         TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT,
  description    TEXT,
  why_follow     TEXT,
  suitable_for   TEXT,
  tags_json      TEXT DEFAULT '[]',
  cadence        TEXT,
  featured_json  TEXT DEFAULT '[]',
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  UNIQUE(source_type, source_value)
);

CREATE INDEX IF NOT EXISTS idx_channel_profiles_domain ON channel_profiles (domain);
CREATE INDEX IF NOT EXISTS idx_channel_profiles_source ON channel_profiles (source_type, source_value);

CREATE TABLE IF NOT EXISTS channel_packs (
  id           TEXT PRIMARY KEY,
  domain       TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_channel_packs_domain ON channel_packs (domain);

CREATE TABLE IF NOT EXISTS channel_pack_items (
  pack_id     TEXT NOT NULL,
  channel_id  TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pack_id, channel_id),
  FOREIGN KEY (pack_id) REFERENCES channel_packs(id) ON DELETE CASCADE,
  FOREIGN KEY (channel_id) REFERENCES channel_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channel_pack_items_channel ON channel_pack_items (channel_id);

CREATE TABLE IF NOT EXISTS user_interest_profiles (
  user_id        TEXT PRIMARY KEY,
  workspace_id   TEXT,
  industry       TEXT,
  goals_json     TEXT DEFAULT '[]',
  topics_json    TEXT DEFAULT '[]',
  language       TEXT DEFAULT 'mixed',
  reading_use    TEXT,
  skipped_at     TEXT,
  completed_at   TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS source_collection_jobs (
  id                           TEXT PRIMARY KEY,
  source_id                    TEXT NOT NULL,
  source_type                  TEXT NOT NULL,
  window_start                 TEXT NOT NULL,
  window_end                   TEXT NOT NULL,
  status                       TEXT NOT NULL DEFAULT 'queued',
  requested_by_workspace_count INTEGER NOT NULL DEFAULT 1,
  requester_workspace_id       TEXT,
  credits_used                 INTEGER NOT NULL DEFAULT 0,
  error                        TEXT,
  created_at                   TEXT DEFAULT (datetime('now')),
  updated_at                   TEXT DEFAULT (datetime('now')),
  started_at                   TEXT,
  completed_at                 TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_collection_jobs_window ON source_collection_jobs (source_id, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_source_collection_jobs_status ON source_collection_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_source_collection_jobs_source ON source_collection_jobs (source_id, status);

CREATE TABLE IF NOT EXISTS source_collection_snapshots (
  source_id          TEXT PRIMARY KEY,
  source_type        TEXT NOT NULL,
  window_start       TEXT NOT NULL,
  window_end         TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'fresh',
  item_count         INTEGER NOT NULL DEFAULT 0,
  account_fetched_at TEXT,
  collected_at       TEXT NOT NULL,
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_collection_snapshots_status ON source_collection_snapshots (status, collected_at);

CREATE TABLE IF NOT EXISTS radio_episodes (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,
  user_id           TEXT,
  date              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'queued',
  title             TEXT,
  script            TEXT,
  provider          TEXT NOT NULL DEFAULT 'minimax-tts',
  provider_model    TEXT NOT NULL DEFAULT 'speech-2.8-turbo',
  provider_task_id  TEXT,
  provider_json     TEXT DEFAULT '{}',
  r2_key            TEXT,
  duration_seconds  INTEGER,
  credits_estimated INTEGER NOT NULL DEFAULT 0,
  credits_used      INTEGER NOT NULL DEFAULT 0,
  error             TEXT,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now')),
  completed_at      TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_radio_episodes_workspace_date ON radio_episodes (workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_radio_episodes_status ON radio_episodes (status, created_at);
