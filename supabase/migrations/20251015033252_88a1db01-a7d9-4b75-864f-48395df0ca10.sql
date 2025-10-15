-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Admins podem fazer upload e deletar
CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- RLS: Qualquer um pode visualizar (bucket público)
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');