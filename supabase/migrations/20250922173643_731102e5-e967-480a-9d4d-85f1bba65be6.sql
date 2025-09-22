-- Criar tabela de KOLs (Key Opinion Leaders)
CREATE TABLE public.key_opinion_leaders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  mini_cv TEXT,
  lattes_url TEXT,
  website_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  specialty TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.key_opinion_leaders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para KOLs
CREATE POLICY "Anyone can view approved KOLs" 
ON public.key_opinion_leaders 
FOR SELECT 
USING (approved = true);

CREATE POLICY "Only admins can manage KOLs" 
ON public.key_opinion_leaders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar campo author_kol_id na tabela blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN author_kol_id UUID REFERENCES public.key_opinion_leaders(id);

-- Trigger para timestamps em KOLs
CREATE TRIGGER update_key_opinion_leaders_updated_at
BEFORE UPDATE ON public.key_opinion_leaders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();