-- Block-based news editor (phase 4). `blocks_json` is a JSON array of block
-- objects authored by the admin; `long_html` is derived from it on write and
-- remains the public render source. Nullable until the JS backfill populates
-- legacy rows; after that, application code keeps it always populated.

ALTER TABLE news ADD COLUMN blocks_json TEXT;
