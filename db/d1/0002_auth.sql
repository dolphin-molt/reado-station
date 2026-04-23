-- ============================================================
-- reado-station D1 auth schema
-- Single-admin login sessions for the Cloudflare Worker web app.
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
  id           TEXT PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  user_id      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key               TEXT PRIMARY KEY,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until      TEXT,
  updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until ON auth_login_attempts (locked_until);
