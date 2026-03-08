ALTER TABLE publication_settings
ADD COLUMN IF NOT EXISTS profile_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_publication_settings_profile
ON publication_settings(profile_name)
WHERE profile_name IS NOT NULL;