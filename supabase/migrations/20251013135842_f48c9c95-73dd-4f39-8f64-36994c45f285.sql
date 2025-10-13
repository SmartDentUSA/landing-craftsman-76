-- ✅ CORREÇÃO 1: Proteger emails na tabela profiles
-- Remove policy antiga que pode estar expondo dados
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Cria policy correta que protege email
CREATE POLICY "Users can view own profile data" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- ✅ CORREÇÃO 2: Remover SELECT público de OAuth tokens
-- Remove policy que expõe refresh_tokens publicamente
DROP POLICY IF EXISTS "Users can view own oauth_credentials" ON public.oauth_credentials;

-- As policies de INSERT/UPDATE/DELETE já existem e continuarão funcionando:
-- - "Users can insert own oauth_credentials" 
-- - "Users can update own oauth_credentials"
-- - "Users can delete own oauth_credentials"

-- ✅ VERIFICAÇÃO: Confirmar que políticas essenciais estão ativas
-- (não executável, apenas documentação)
-- SELECT * FROM pg_policies WHERE tablename IN ('profiles', 'oauth_credentials');