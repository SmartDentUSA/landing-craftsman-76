-- ============================================================================
-- OAuth Secure Schema - Multi-Provider Support
-- Suporta YouTube, Google Business Profile e futuros providers
-- ============================================================================

-- 1️⃣ Tabela: oauth_client_configs (apenas admin pode criar/editar)
-- Armazena client_id + client_secret por provider
CREATE TABLE IF NOT EXISTS public.oauth_client_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'googleBusiness')),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_user_id, provider)
);

-- RLS para oauth_client_configs (ADMIN-ONLY)
ALTER TABLE public.oauth_client_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view oauth_client_configs"
  ON public.oauth_client_configs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert oauth_client_configs"
  ON public.oauth_client_configs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update oauth_client_configs"
  ON public.oauth_client_configs
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete oauth_client_configs"
  ON public.oauth_client_configs
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2️⃣ Tabela: oauth_credentials (refresh_tokens por usuário)
-- Cada usuário pode ter múltiplos providers
CREATE TABLE IF NOT EXISTS public.oauth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'googleBusiness')),
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS para oauth_credentials (usuários podem gerenciar suas próprias credenciais)
ALTER TABLE public.oauth_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oauth_credentials"
  ON public.oauth_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oauth_credentials"
  ON public.oauth_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oauth_credentials"
  ON public.oauth_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own oauth_credentials"
  ON public.oauth_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3️⃣ Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oauth_client_configs_updated_at
  BEFORE UPDATE ON public.oauth_client_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oauth_updated_at();

CREATE TRIGGER update_oauth_credentials_updated_at
  BEFORE UPDATE ON public.oauth_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_oauth_updated_at();

-- 4️⃣ Índices para performance
CREATE INDEX IF NOT EXISTS idx_oauth_client_configs_provider 
  ON public.oauth_client_configs(provider);

CREATE INDEX IF NOT EXISTS idx_oauth_credentials_user_provider 
  ON public.oauth_credentials(user_id, provider);