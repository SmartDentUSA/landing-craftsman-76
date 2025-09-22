-- Criação da tabela landing_pages para migração do localStorage
CREATE TABLE public.landing_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  last_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  template TEXT NOT NULL,
  data JSONB,
  embed TEXT,
  selected_product_ids TEXT[] DEFAULT '{}',
  blog_generated BOOLEAN DEFAULT false,
  blog_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilitar RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para landing_pages
CREATE POLICY "Users can manage their own landing pages" 
ON public.landing_pages 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins podem acessar todas as landing pages
CREATE POLICY "Admins can manage all landing pages" 
ON public.landing_pages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_landing_pages_user_id ON public.landing_pages(user_id);
CREATE INDEX idx_landing_pages_status ON public.landing_pages(status);
CREATE INDEX idx_landing_pages_updated_at ON public.landing_pages(updated_at DESC);