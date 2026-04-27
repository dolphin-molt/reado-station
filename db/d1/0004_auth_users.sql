-- ============================================================
-- reado-station D1 registered users
-- Adds first-party username/password accounts alongside env admin login.
-- ============================================================

CREATE TABLE IF NOT EXISTS auth_users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_users_username ON auth_users (username);
CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users (role);
