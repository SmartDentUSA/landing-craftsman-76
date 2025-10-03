-- Create table to store YouTube OAuth credentials per user
CREATE TABLE IF NOT EXISTS public.youtube_oauth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.youtube_oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own credentials
CREATE POLICY "Users can manage own YouTube credentials"
  ON public.youtube_oauth_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all credentials
CREATE POLICY "Admins can view all YouTube credentials"
  ON public.youtube_oauth_credentials
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_youtube_oauth_credentials_updated_at
  BEFORE UPDATE ON public.youtube_oauth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();