-- ═══════════════════════════════════════════════════════════
-- ENRICHMENT TABLES — Sistema de Enriquecimento Progressivo
-- ═══════════════════════════════════════════════════════════
--
-- Tabelas dedicadas ao sistema de enriquecimento HTML progressivo.
-- Cada republicação consulta estas tabelas para enriquecer o HTML
-- com novos reviews e vídeos — sem alterar CSS ou layout.
--
-- reviews: Fonte de reviews para Organization.review[] e AggregateRating
-- videos:  Fonte de vídeos para VideoObject[] no schema
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- TABELA: reviews
-- Reviews de clientes prontos para consumo pelo enrichment system.
-- product_id é opcional: NULL = review geral da empresa.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do autor
  author_name TEXT NOT NULL,

  -- Avaliação
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

  -- Conteúdo
  review_body TEXT NOT NULL,
  date_published DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Vínculo opcional com produto
  product_id UUID REFERENCES public.products_repository(id) ON DELETE SET NULL,

  -- Status
  approved BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,

  -- Metadados
  source TEXT DEFAULT 'manual',  -- 'manual', 'google', 'nps', 'csv'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(approved);
CREATE INDEX IF NOT EXISTS idx_reviews_date ON public.reviews(date_published DESC);

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (approved = true);

CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────
-- TABELA: videos
-- Galeria de vídeos para enriquecimento progressivo de HTML.
-- product_id é opcional: NULL = vídeo institucional da empresa.
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do vídeo
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT,
  duration TEXT,            -- Formato ISO 8601: PT1M30S
  description TEXT,

  -- Tipo e origem
  video_type TEXT NOT NULL DEFAULT 'youtube'
    CHECK (video_type IN ('youtube', 'instagram', 'technical', 'testimonial', 'other')),

  -- Vínculo opcional com produto
  product_id UUID REFERENCES public.products_repository(id) ON DELETE SET NULL,

  -- Status
  approved BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_videos_product_id ON public.videos(product_id);
CREATE INDEX IF NOT EXISTS idx_videos_approved ON public.videos(approved);
CREATE INDEX IF NOT EXISTS idx_videos_type ON public.videos(video_type);

-- RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved videos"
  ON public.videos FOR SELECT
  USING (approved = true);

CREATE POLICY "Admins can manage videos"
  ON public.videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ─────────────────────────────────────
COMMENT ON TABLE public.reviews IS
  'Reviews de clientes para enriquecimento progressivo HTML. product_id opcional = review geral da empresa.';

COMMENT ON TABLE public.videos IS
  'Galeria de vídeos para enriquecimento progressivo HTML. product_id opcional = vídeo institucional.';

COMMENT ON COLUMN public.reviews.product_id IS
  'NULL = review geral da empresa; UUID = review vinculado a produto específico';

COMMENT ON COLUMN public.videos.product_id IS
  'NULL = vídeo institucional; UUID = vídeo vinculado a produto específico';

COMMENT ON COLUMN public.videos.duration IS
  'Duração no formato ISO 8601 (ex: PT1M30S = 1 min 30 sec)';
