-- ============================================================
-- reado-station D1 admin content moderation schema
-- Soft-hide items from public pages while keeping them recoverable.
-- ============================================================

ALTER TABLE items ADD COLUMN hidden_at TEXT;
ALTER TABLE items ADD COLUMN hidden_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_items_hidden_at ON items (hidden_at);
CREATE INDEX IF NOT EXISTS idx_items_visible_date ON items (date, hidden_at);
