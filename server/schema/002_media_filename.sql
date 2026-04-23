-- Phase 3 (Mediathek): track the uploader's original filename so the admin
-- media library has something human-readable to display. Nullable because the
-- column doesn't exist on rows uploaded before this migration.
ALTER TABLE media ADD COLUMN original_filename TEXT;
