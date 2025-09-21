-- FASE 1: LIMPEZA CRÍTICA DE DADOS CORROMPIDOS

-- 1. Deletar blogs com conteúdo corrompido/inválido
DELETE FROM blog_posts 
WHERE content LIKE '%rfrfrfrfrfrfrfr%' 
   OR length(content) < 50 
   OR title IS NULL 
   OR title = '';

-- 2. Para landing pages com múltiplos blogs, manter apenas o mais recente com conteúdo válido
WITH ranked_blogs AS (
  SELECT id, landing_page_id, 
         ROW_NUMBER() OVER (PARTITION BY landing_page_id ORDER BY created_at DESC, length(content) DESC) as rn
  FROM blog_posts 
  WHERE status = 'published' 
    AND length(content) >= 50 
    AND title IS NOT NULL 
    AND title != ''
)
DELETE FROM blog_posts 
WHERE id IN (
  SELECT id FROM ranked_blogs WHERE rn > 1
);

-- 3. Criar índice único para garantir apenas um blog published por landing page
CREATE UNIQUE INDEX unique_published_blog_per_landing_page 
ON blog_posts (landing_page_id) 
WHERE status = 'published';

-- 4. Adicionar função de validação de conteúdo
CREATE OR REPLACE FUNCTION validate_blog_content()
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
  
  -- Validar meta description para blogs publicados
  IF NEW.status = 'published' AND (NEW.meta_description IS NULL OR length(trim(NEW.meta_description)) < 50 OR length(trim(NEW.meta_description)) > 160) THEN
    RAISE EXCEPTION 'Meta description deve ter entre 50 e 160 caracteres para blogs publicados';
  END IF;
  
  -- Validar keywords para blogs publicados
  IF NEW.status = 'published' AND (NEW.keywords IS NULL OR array_length(NEW.keywords, 1) < 3) THEN
    RAISE EXCEPTION 'Blogs publicados devem ter pelo menos 3 keywords';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para validação automática
DROP TRIGGER IF EXISTS validate_blog_content_trigger ON blog_posts;
CREATE TRIGGER validate_blog_content_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_blog_content();