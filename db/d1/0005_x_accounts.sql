-- ============================================================
-- reado-station D1 X account subscriptions
-- System-level X account cache plus per-user subscriptions.
-- ============================================================

CREATE TABLE IF NOT EXISTS x_accounts (
  id                TEXT PRIMARY KEY,
  username          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name              TEXT NOT NULL,
  description       TEXT,
  profile_image_url TEXT,
  verified          INTEGER DEFAULT 0,
  followers_count   INTEGER,
  following_count   INTEGER,
  tweet_count       INTEGER,
  listed_count      INTEGER,
  raw_json          TEXT DEFAULT '{}',
  fetched_at        TEXT NOT NULL,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_x_accounts_username ON x_accounts (username);

CREATE TABLE IF NOT EXISTS user_x_account_subscriptions (
  user_id      TEXT NOT NULL,
  x_account_id TEXT NOT NULL,
  subscribed_at TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, x_account_id),
  FOREIGN KEY (x_account_id) REFERENCES x_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_x_subscriptions_user ON user_x_account_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_x_subscriptions_account ON user_x_account_subscriptions (x_account_id);
