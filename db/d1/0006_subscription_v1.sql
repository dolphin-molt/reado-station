-- ============================================================
-- reado-station V1 personal subscription system
-- Accounts, workspaces, shared sources, credits, Stripe, backfill queue.
-- ============================================================

ALTER TABLE auth_users ADD COLUMN email TEXT;
ALTER TABLE auth_users ADD COLUMN display_name TEXT;
ALTER TABLE auth_users ADD COLUMN avatar_url TEXT;
ALTER TABLE auth_users ADD COLUMN default_workspace_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email);
CREATE INDEX IF NOT EXISTS idx_auth_users_default_workspace ON auth_users (default_workspace_id);

CREATE TABLE IF NOT EXISTS auth_identities (
  provider         TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id          TEXT NOT NULL,
  email            TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (provider, provider_user_id),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_email ON auth_identities (email);

CREATE TABLE IF NOT EXISTS workspaces (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL DEFAULT 'personal',
  owner_user_id TEXT NOT NULL,
  plan_id      TEXT NOT NULL DEFAULT 'free',
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_plan ON workspaces (plan_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'owner',
  created_at   TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);

CREATE TABLE IF NOT EXISTS workspace_source_subscriptions (
  workspace_id    TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  source_type     TEXT NOT NULL,
  visibility      TEXT NOT NULL DEFAULT 'private',
  backfill_hours  INTEGER NOT NULL DEFAULT 24,
  status          TEXT NOT NULL DEFAULT 'pending_backfill',
  created_by      TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, source_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_source_subscriptions_source ON workspace_source_subscriptions (source_id);
CREATE INDEX IF NOT EXISTS idx_workspace_source_subscriptions_public ON workspace_source_subscriptions (visibility, source_type);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  user_id       TEXT,
  action        TEXT NOT NULL,
  credits_delta INTEGER NOT NULL,
  source_id     TEXT,
  item_count    INTEGER DEFAULT 0,
  metadata_json TEXT DEFAULT '{}',
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_workspace ON credit_ledger (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_action ON credit_ledger (action);

CREATE TABLE IF NOT EXISTS stripe_customers (
  workspace_id       TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_billing_subscriptions (
  workspace_id            TEXT PRIMARY KEY,
  stripe_subscription_id  TEXT,
  stripe_customer_id      TEXT,
  plan_id                 TEXT NOT NULL DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'free',
  current_period_start    TEXT,
  current_period_end      TEXT,
  cancel_at_period_end    INTEGER DEFAULT 0,
  created_at              TEXT DEFAULT (datetime('now')),
  updated_at              TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_billing_subscription_id ON workspace_billing_subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_workspace_billing_customer ON workspace_billing_subscriptions (stripe_customer_id);

CREATE TABLE IF NOT EXISTS source_backfill_jobs (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL,
  source_id      TEXT NOT NULL,
  source_type    TEXT NOT NULL,
  backfill_hours INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'queued',
  credits_used   INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  started_at     TEXT,
  completed_at   TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_backfill_jobs_status ON source_backfill_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_source_backfill_jobs_workspace ON source_backfill_jobs (workspace_id, created_at);
