-- 1️⃣ Corrigir RLS na company_profile (adicionar policies de owner)
-- Manter policies de admin + adicionar policies de proprietário

-- Policy para usuários visualizarem seu próprio perfil
CREATE POLICY "Users can view own company_profile"
ON public.company_profile
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy para usuários inserirem seu próprio perfil
CREATE POLICY "Users can insert own company_profile"
ON public.company_profile
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy para usuários atualizarem seu próprio perfil
CREATE POLICY "Users can update own company_profile"
ON public.company_profile
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy para usuários deletarem seu próprio perfil
CREATE POLICY "Users can delete own company_profile"
ON public.company_profile
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2️⃣ Padronizar OAuth em 1 tabela (oauth_credentials já existe)
-- Migrar dados existentes de google_business_oauth_credentials para oauth_credentials

-- Inserir credenciais existentes do Google Business (se houver)
INSERT INTO public.oauth_credentials (user_id, provider, refresh_token, created_at, updated_at)
SELECT 
  user_id,
  'google_business' as provider,
  refresh_token,
  created_at,
  updated_at
FROM public.google_business_oauth_credentials
ON CONFLICT (user_id, provider) DO NOTHING;

-- Inserir credenciais existentes do YouTube (se houver)
INSERT INTO public.oauth_credentials (user_id, provider, refresh_token, created_at, updated_at)
SELECT 
  user_id,
  'youtube' as provider,
  refresh_token,
  created_at,
  updated_at
FROM public.youtube_oauth_credentials
ON CONFLICT (user_id, provider) DO NOTHING;

-- Dropar tabelas antigas (dados já migrados)
DROP TABLE IF EXISTS public.google_business_oauth_credentials CASCADE;
DROP TABLE IF EXISTS public.youtube_oauth_credentials CASCADE;

-- Garantir que oauth_credentials tem as colunas necessárias
-- (a tabela já existe, apenas verificar se precisamos adicionar colunas)
ALTER TABLE public.oauth_credentials 
ADD COLUMN IF NOT EXISTS client_id TEXT,
ADD COLUMN IF NOT EXISTS client_secret TEXT;