-- X-first input preferences and item metadata used for workspace-visible filtering.

ALTER TABLE workspace_source_subscriptions ADD COLUMN collection_preferences_json TEXT DEFAULT '{}';

ALTER TABLE items ADD COLUMN metadata_json TEXT DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_items_metadata_content_type ON items (json_extract(metadata_json, '$.content_type'));
