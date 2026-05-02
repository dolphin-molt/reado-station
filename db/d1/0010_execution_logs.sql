-- ============================================================
-- Execution logs
-- Developer-facing step logs for subscription, collection,
-- enrichment, digest, and other operational flows.
-- ============================================================

CREATE TABLE IF NOT EXISTS execution_logs (
  id             TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL,
  scope          TEXT NOT NULL,
  subject_type   TEXT,
  subject_id     TEXT,
  step           TEXT NOT NULL,
  status         TEXT NOT NULL,
  message        TEXT,
  metadata_json  TEXT DEFAULT '{}',
  duration_ms    INTEGER,
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_created ON execution_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_run ON execution_logs (run_id, created_at);
CREATE INDEX IF NOT EXISTS idx_execution_logs_scope ON execution_logs (scope, created_at);
CREATE INDEX IF NOT EXISTS idx_execution_logs_subject ON execution_logs (subject_type, subject_id, created_at);
