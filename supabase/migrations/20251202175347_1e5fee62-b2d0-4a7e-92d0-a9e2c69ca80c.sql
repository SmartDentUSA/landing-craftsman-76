-- Tabela principal para LPs clonadas
CREATE TABLE public.cloned_landing_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Identificação
  name TEXT NOT NULL,
  brand TEXT,
  product TEXT,
  
  -- HTML
  original_html TEXT NOT NULL,
  transformed_html TEXT,
  
  -- Configurações
  cta_url TEXT NOT NULL,
  target_domain TEXT,
  
  -- Imagens capturadas
  captured_images JSONB DEFAULT '[]',
  
  -- SEO
  seo_config JSONB DEFAULT '{}',
  
  -- Status e versão
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_cloned_landing_pages_updated_at
  BEFORE UPDATE ON cloned_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Bucket para assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('lp-clone-assets', 'lp-clone-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE cloned_landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cloned LPs"
  ON cloned_landing_pages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cloned LPs"
  ON cloned_landing_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Storage RLS para lp-clone-assets
CREATE POLICY "Anyone can view lp-clone-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lp-clone-assets');

CREATE POLICY "Authenticated users can upload lp-clone-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lp-clone-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update lp-clone-assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lp-clone-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete lp-clone-assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lp-clone-assets' AND auth.uid() IS NOT NULL);