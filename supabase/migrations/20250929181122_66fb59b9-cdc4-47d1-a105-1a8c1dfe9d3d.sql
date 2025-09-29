-- Phase 1: Add AI prompt personalization fields
ALTER TABLE prompts_configuration 
ADD COLUMN tone TEXT DEFAULT 'professional',
ADD COLUMN style_guidelines JSONB DEFAULT '{
  "frases_curtas": true, 
  "evitar_robotico": true,
  "incluir_keywords_naturalmente": true,
  "usar_linguagem_humana": true,
  "estrutura_h1_h2": true,
  "incluir_cta_natural": true
}'::jsonb;

-- Enhance blog content validation
CREATE OR REPLACE FUNCTION public.validate_blog_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar título
  IF NEW.title IS NULL OR length(trim(NEW.title)) < 10 OR length(trim(NEW.title)) > 60 THEN
    RAISE EXCEPTION 'Título deve ter entre 10 e 60 caracteres';
  END IF;
  
  -- Validar conteúdo
  IF NEW.content IS NULL OR length(trim(NEW.content)) < 500 THEN
    RAISE EXCEPTION 'Conteúdo deve ter pelo menos 500 caracteres';
  END IF;
  
  -- Enhanced meta description validation for published blogs
  IF NEW.status = 'published' AND NEW.meta_description IS NOT NULL THEN
    -- Length validation (existing)
    IF length(trim(NEW.meta_description)) < 50 OR length(trim(NEW.meta_description)) > 160 THEN
      RAISE EXCEPTION 'Meta description deve ter entre 50 e 160 caracteres para blogs publicados';
    END IF;
    
    -- CTA validation (new)
    IF NEW.meta_description !~* '(saiba|descubra|conheça|entenda|veja|confira|acesse|encontre|aprenda|explore)' THEN
      RAISE WARNING 'Meta description recomenda incluir uma palavra de ação (CTA) como: saiba, descubra, conheça, etc.';
    END IF;
  END IF;
  
  -- Validar keywords para blogs publicados
  IF NEW.status = 'published' AND (NEW.keywords IS NULL OR array_length(NEW.keywords, 1) < 3) THEN
    RAISE EXCEPTION 'Blogs publicados devem ter pelo menos 3 keywords';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;