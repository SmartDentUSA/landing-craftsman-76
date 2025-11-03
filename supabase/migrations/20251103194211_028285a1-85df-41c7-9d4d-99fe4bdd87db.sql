-- Adicionar coluna para armazenar caminho do arquivo de logo no Supabase Storage
ALTER TABLE company_profile
ADD COLUMN IF NOT EXISTS company_logo_supabase_path TEXT;

-- Comentário explicativo
COMMENT ON COLUMN company_profile.company_logo_supabase_path IS 'Caminho do arquivo de logo armazenado no Supabase Storage (bucket: product-images)';