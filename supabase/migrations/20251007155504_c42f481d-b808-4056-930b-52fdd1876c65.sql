-- Migration: Create google_oauth_tokens table for unified Google OAuth
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider_token TEXT, -- access_token
  provider_refresh_token TEXT, -- refresh_token (CRÍTICO)
  scopes TEXT[], -- scopes autorizados
  expires_at TIMESTAMPTZ, -- expiração do access_token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_user_id 
  ON public.google_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_expires_at 
  ON public.google_oauth_tokens(expires_at);

-- RLS: Usuários só acessam seus tokens
ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own google tokens"
  ON public.google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google tokens"
  ON public.google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google tokens"
  ON public.google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_google_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_google_oauth_tokens_updated_at
  BEFORE UPDATE ON public.google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_google_oauth_tokens_updated_at();

-- Migration: Update handle_new_user trigger for Google OAuth admin promotion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'smartdentcadcam@gmail.com', 
    'danilohen@gmail.com'
  ];
  user_role app_role;
  is_google_login BOOLEAN := FALSE;
  is_trusted_email BOOLEAN := FALSE;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.email
    )
  );
  
  -- 🔍 Detectar login via Google OAuth (robusto)
  -- Método 1: OpenID Connect issuer
  IF NEW.raw_user_meta_data->>'iss' = 'https://accounts.google.com' THEN
    is_google_login := TRUE;
    RAISE NOTICE 'User % authenticated via Google (OpenID)', NEW.email;
  END IF;
  
  -- Método 2: Campo provider (fallback)
  IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
    is_google_login := TRUE;
    RAISE NOTICE 'User % authenticated via Google (provider)', NEW.email;
  END IF;
  
  -- 🔒 Verificar whitelist de e-mails
  IF NEW.email = ANY(admin_emails) THEN
    is_trusted_email := TRUE;
    RAISE NOTICE 'User % in admin whitelist', NEW.email;
  END IF;
  
  -- ✅ REGRA CRÍTICA: TODOS USUÁRIOS GOOGLE = ADMIN
  IF is_google_login THEN
    user_role := 'admin';
    RAISE NOTICE '🔑 User % promoted to admin (Google OAuth)', NEW.email;
  ELSIF is_trusted_email THEN
    user_role := 'admin';
    RAISE NOTICE '🔑 User % promoted to admin (whitelist)', NEW.email;
  ELSE
    user_role := 'user';
    RAISE NOTICE '👤 User % assigned user role', NEW.email;
  END IF;
  
  -- Assign role (previne duplicatas)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger seguro: Promove TODOS usuários Google OAuth para admin automaticamente.
Detecta via OpenID Connect (iss) ou provider field.
Atualizado: 2025-10-07';