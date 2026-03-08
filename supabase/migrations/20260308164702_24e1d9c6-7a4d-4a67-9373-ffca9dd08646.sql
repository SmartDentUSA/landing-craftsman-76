
-- Drop unique constraint on user_id to allow multiple profiles per user
ALTER TABLE publication_settings DROP CONSTRAINT IF EXISTS publication_settings_user_id_key;

-- Add partial unique index on profile_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_publication_settings_profile
ON publication_settings(profile_name)
WHERE profile_name IS NOT NULL;
