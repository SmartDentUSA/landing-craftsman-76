-- Garantir políticas RLS corretas para product-images bucket

-- 1. Política de leitura pública
DROP POLICY IF EXISTS "Public read for product-images" ON storage.objects;
CREATE POLICY "Public read for product-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 2. Política de upload para usuários autenticados
DROP POLICY IF EXISTS "Authenticated upload for product-images" ON storage.objects;
CREATE POLICY "Authenticated upload for product-images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 3. Política de atualização (para upsert)
DROP POLICY IF EXISTS "Authenticated update for product-images" ON storage.objects;
CREATE POLICY "Authenticated update for product-images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Política de deleção (para remover imagens antigas)
DROP POLICY IF EXISTS "Authenticated delete for product-images" ON storage.objects;
CREATE POLICY "Authenticated delete for product-images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);