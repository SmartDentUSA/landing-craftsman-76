-- Remover triggers pesados duplicados que causam timeout em landing pages grandes
-- Manter apenas o trigger leve mark_landing_page_score_update

DROP TRIGGER IF EXISTS trigger_update_landing_page_completion ON public.landing_pages;
DROP TRIGGER IF EXISTS trigger_update_lp_completion ON public.landing_pages;

-- Verificar e garantir que o trigger leve existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'mark_landing_page_score_update' 
    AND tgrelid = 'public.landing_pages'::regclass
  ) THEN
    CREATE TRIGGER mark_landing_page_score_update
    AFTER UPDATE ON public.landing_pages
    FOR EACH ROW
    WHEN (OLD.data IS DISTINCT FROM NEW.data)
    EXECUTE FUNCTION public.mark_landing_page_for_score_update();
  END IF;
END $$;