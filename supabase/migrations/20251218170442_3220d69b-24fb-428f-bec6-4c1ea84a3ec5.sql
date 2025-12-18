-- Tabela de Marcos Históricos da Empresa
CREATE TABLE public.company_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados Temporais
  year INTEGER NOT NULL,
  month INTEGER,
  day INTEGER,
  slug TEXT NOT NULL,
  
  -- Conteúdo Editorial
  title TEXT NOT NULL,
  description TEXT,
  market_context TEXT,
  strategic_decision TEXT,
  impact TEXT,
  legacy TEXT,
  
  -- Dados Técnicos (JSONB)
  location JSONB DEFAULT '{"city": "", "state": "", "country": "Brasil"}'::jsonb,
  key_people JSONB DEFAULT '[]'::jsonb,
  products_involved JSONB DEFAULT '[]'::jsonb,
  technologies JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  
  -- Mídia
  image_url TEXT,
  video_url TEXT,
  
  -- Controle
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE UNIQUE INDEX company_milestones_user_slug_idx ON public.company_milestones(user_id, slug);
CREATE INDEX company_milestones_year_idx ON public.company_milestones(year DESC);
CREATE INDEX company_milestones_published_idx ON public.company_milestones(is_published) WHERE is_published = true;

-- Enable RLS
ALTER TABLE public.company_milestones ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ver marcos publicados
CREATE POLICY "Anyone can view published milestones"
ON public.company_milestones
FOR SELECT
USING (is_published = true);

-- Política: Admins podem gerenciar todos os marcos
CREATE POLICY "Admins can manage all milestones"
ON public.company_milestones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política: Usuários podem gerenciar seus próprios marcos
CREATE POLICY "Users can manage own milestones"
ON public.company_milestones
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_milestones_updated_at
BEFORE UPDATE ON public.company_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();