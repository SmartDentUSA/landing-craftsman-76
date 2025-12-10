-- Remover trigger que causa timeout em updates frequentes
DROP TRIGGER IF EXISTS update_landing_page_completion_score ON public.landing_pages;

-- Criar uma função mais leve que apenas marca para recálculo
-- O score será calculado on-demand ou por um job separado
CREATE OR REPLACE FUNCTION public.mark_landing_page_for_score_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Apenas atualizar o timestamp, não recalcular o score
  -- Isso evita timeout em updates frequentes
  UPDATE content_completion_tracking 
  SET updated_at = NOW()
  WHERE entity_type = 'landing_page' AND entity_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger leve (não bloqueia o update principal)
CREATE TRIGGER mark_landing_page_score_update
AFTER UPDATE ON public.landing_pages
FOR EACH ROW
WHEN (OLD.data IS DISTINCT FROM NEW.data)
EXECUTE FUNCTION public.mark_landing_page_for_score_update();