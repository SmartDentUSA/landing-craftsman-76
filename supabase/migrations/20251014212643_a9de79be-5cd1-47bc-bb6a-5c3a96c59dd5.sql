-- Add SELECT policy so users can read their own OAuth credentials
ALTER TABLE public.oauth_credentials ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'oauth_credentials'
      AND policyname = 'Users can view own oauth_credentials'
  ) THEN
    CREATE POLICY "Users can view own oauth_credentials"
    ON public.oauth_credentials
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure idempotent unique index for upsert semantics
CREATE UNIQUE INDEX IF NOT EXISTS ux_oauth_credentials_user_provider
  ON public.oauth_credentials (user_id, provider);
