-- Criar bucket público para imagens de landing pages e logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-page-images', 'landing-page-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Permitir INSERT (upload) para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'auth_insert_landing_page_images'
  ) THEN
    CREATE POLICY "auth_insert_landing_page_images"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'landing-page-images');
  END IF;
END $$;

-- Política: Permitir UPDATE (metadados/renomear) para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'auth_update_landing_page_images'
  ) THEN
    CREATE POLICY "auth_update_landing_page_images"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'landing-page-images');
  END IF;
END $$;

-- Política: Permitir DELETE para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'auth_delete_landing_page_images'
  ) THEN
    CREATE POLICY "auth_delete_landing_page_images"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'landing-page-images');
  END IF;
END $$;

-- Política: Permitir SELECT (listar/ler) para usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'auth_select_landing_page_images'
  ) THEN
    CREATE POLICY "auth_select_landing_page_images"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'landing-page-images');
  END IF;
END $$;