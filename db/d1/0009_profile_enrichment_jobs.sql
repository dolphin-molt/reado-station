-- ============================================================
-- Profile enrichment jobs
-- Model/search jobs fill channel_profiles.featured_json with
-- website, GitHub, YouTube, and other profile assets.
-- ============================================================

CREATE TABLE IF NOT EXISTS enrichment_jobs (
  id            TEXT PRIMARY KEY,
  source_type   TEXT NOT NULL,
  source_value  TEXT NOT NULL,
  job_type      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  input_json    TEXT DEFAULT '{}',
  output_json   TEXT DEFAULT '{}',
  error         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  started_at    TEXT,
  completed_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_source ON enrichment_jobs (source_type, source_value, job_type, status);
