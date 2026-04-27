-- ============================================================
-- reado-station billing observability
-- Structured billing event logs for checkout, webhook, portal, and credits.
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_event_logs (
  id                          TEXT PRIMARY KEY,
  trace_id                    TEXT NOT NULL,
  stage                       TEXT NOT NULL,
  status                      TEXT NOT NULL,
  workspace_id                TEXT,
  user_id                     TEXT,
  plan_id                     TEXT,
  stripe_customer_id          TEXT,
  stripe_subscription_id      TEXT,
  stripe_checkout_session_id  TEXT,
  stripe_invoice_id           TEXT,
  stripe_event_id             TEXT,
  amount                      INTEGER,
  currency                    TEXT,
  message                     TEXT,
  metadata_json               TEXT DEFAULT '{}',
  created_at                  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_created_at
  ON billing_event_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_trace
  ON billing_event_logs (trace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_workspace
  ON billing_event_logs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_checkout_session
  ON billing_event_logs (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_subscription
  ON billing_event_logs (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_invoice
  ON billing_event_logs (stripe_invoice_id);

CREATE INDEX IF NOT EXISTS idx_billing_event_logs_event
  ON billing_event_logs (stripe_event_id);
