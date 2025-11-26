-- Adicionar campo para backup da URL original antes da migração
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS image_url_original TEXT;

COMMENT ON COLUMN products_repository.image_url_original IS 
'URL original da imagem externa antes da migração para Supabase Storage (backup)';

-- Índice para facilitar consultas de produtos migrados vs não migrados
CREATE INDEX IF NOT EXISTS idx_products_external_images 
ON products_repository(image_url) 
WHERE image_url LIKE '%cdn.awsli.com.br%' OR image_url LIKE 'http%://';

CREATE INDEX IF NOT EXISTS idx_products_migrated_images 
ON products_repository(image_url) 
WHERE image_url LIKE '%supabase.co/storage%';