CREATE TABLE IF NOT EXISTS public.gsc_submission_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain text NOT NULL,
  site_url text NOT NULL,
  sitemap_url text NOT NULL,
  action text NOT NULL,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  response_body jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_submission_log_domain ON public.gsc_submission_log(domain);
CREATE INDEX IF NOT EXISTS idx_gsc_submission_log_submitted_at ON public.gsc_submission_log(submitted_at DESC);

ALTER TABLE public.gsc_submission_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view GSC submission logs"
ON public.gsc_submission_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage GSC submission logs"
ON public.gsc_submission_log FOR ALL
TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE public.domain_config
  ADD COLUMN IF NOT EXISTS gsc_verification_token text,
  ADD COLUMN IF NOT EXISTS gsc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS gsc_last_sitemap_submission_at timestamptz;