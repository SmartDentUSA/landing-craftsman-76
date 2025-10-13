-- Remover função antiga se existir
DROP FUNCTION IF EXISTS calculate_landing_page_score(text);

-- Função para calcular score de landing pages (165 pontos: 85+40+20+20)
CREATE OR REPLACE FUNCTION public.calculate_landing_page_score(lp_id TEXT)
RETURNS JSONB 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  lp RECORD;
  lp_data JSONB;
  score_content INTEGER := 0;
  score_seo INTEGER := 0;
  score_schema INTEGER := 0;
  score_email INTEGER := 0;
  missing TEXT[] := '{}';
  required TEXT[] := '{}';
  total_score INTEGER;
  percentage INTEGER;
BEGIN
  SELECT * FROM landing_pages WHERE id = lp_id INTO lp;
  
  IF lp IS NULL THEN
    RAISE EXCEPTION 'Landing Page % não encontrada', lp_id;
  END IF;
  
  lp_data := COALESCE(lp.data, '{}'::jsonb);
  
  -- ✅ CONTEÚDO (85 pts)
  -- Banner (25 pts)
  IF lp_data->'banner'->>'title' IS NOT NULL AND LENGTH(TRIM(lp_data->'banner'->>'title')) > 0 THEN
    score_content := score_content + 10;
  ELSE
    missing := array_append(missing, 'Banner - Título');
    required := array_append(required, 'banner.title');
  END IF;
  
  IF lp_data->'banner'->>'subtitle' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  
  IF lp_data->'banner'->'cta'->>'label' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  
  IF jsonb_array_length(COALESCE(lp_data->'banner'->'images', '[]'::jsonb)) > 0 THEN
    score_content := score_content + 5;
  ELSE
    missing := array_append(missing, 'Banner - Imagens');
  END IF;
  
  -- Vídeo (10 pts)
  IF lp_data->'explanatory_video_section'->'selected_video'->>'url' IS NOT NULL THEN
    score_content := score_content + 10;
  END IF;
  
  -- Solutions (15 pts)
  IF jsonb_array_length(COALESCE(lp_data->'solutions', '[]'::jsonb)) >= 3 THEN
    score_content := score_content + 15;
  ELSIF jsonb_array_length(COALESCE(lp_data->'solutions', '[]'::jsonb)) > 0 THEN
    score_content := score_content + 5;
  END IF;
  
  -- Desktop Info (10 pts)
  IF lp_data->'desktop_info'->>'title' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  IF lp_data->'desktop_info'->>'text' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  
  -- Advisory (10 pts)
  IF lp_data->'advisory'->>'title' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  IF lp_data->'advisory'->>'paragraph' IS NOT NULL THEN
    score_content := score_content + 5;
  END IF;
  
  -- FAQ (15 pts)
  IF jsonb_array_length(COALESCE(lp_data->'faq', '[]'::jsonb)) >= 5 THEN
    score_content := score_content + 15;
  ELSIF jsonb_array_length(COALESCE(lp_data->'faq', '[]'::jsonb)) > 0 THEN
    score_content := score_content + 5;
  END IF;
  
  -- ✅ SEO & SOCIAL (40 pts)
  IF lp_data->'seo'->>'seo_title' IS NOT NULL AND LENGTH(TRIM(lp_data->'seo'->>'seo_title')) > 0 THEN
    score_seo := score_seo + 10;
  ELSE
    missing := array_append(missing, 'SEO - Título');
    required := array_append(required, 'seo.seo_title');
  END IF;
  
  IF lp_data->'seo'->>'seo_description' IS NOT NULL AND LENGTH(TRIM(lp_data->'seo'->>'seo_description')) >= 50 THEN
    score_seo := score_seo + 10;
  ELSE
    missing := array_append(missing, 'SEO - Descrição');
  END IF;
  
  IF lp_data->'seo'->>'canonical_url' IS NOT NULL THEN
    score_seo := score_seo + 5;
  END IF;
  
  -- Open Graph (10 pts)
  IF lp_data->'seo'->'open_graph'->>'og_title' IS NOT NULL THEN
    score_seo := score_seo + 5;
  END IF;
  IF lp_data->'seo'->'open_graph'->>'og_image' IS NOT NULL THEN
    score_seo := score_seo + 5;
  END IF;
  
  -- Twitter Cards (5 pts)
  IF lp_data->'seo'->'twitter_card'->>'twitter_title' IS NOT NULL THEN
    score_seo := score_seo + 5;
  END IF;
  
  -- ✅ SCHEMA & OFFERS (20 pts)
  IF jsonb_array_length(COALESCE(lp_data->'schema'->'offers', '[]'::jsonb)) > 0 THEN
    score_schema := score_schema + 10;
  END IF;
  
  IF (lp_data->'schema'->>'reviews_enabled')::boolean = true THEN
    score_schema := score_schema + 5;
  END IF;
  
  IF (lp_data->'schema'->>'local_business_enabled')::boolean = true THEN
    score_schema := score_schema + 5;
  END IF;
  
  -- ✅ EMAIL MARKETING (20 pts)
  IF lp_data->'email'->>'assunto_email' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  IF lp_data->'email'->>'titulo_principal' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  IF lp_data->'email'->'cta_primario'->>'label' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  IF lp_data->'email'->'cta_secundario'->>'label' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  -- CALCULAR TOTAL
  total_score := score_content + score_seo + score_schema + score_email;
  percentage := ROUND((total_score::NUMERIC / 165) * 100);
  
  RETURN jsonb_build_object(
    'total_score', total_score,
    'max_score', 165,
    'percentage', percentage,
    'details', jsonb_build_object(
      'content', jsonb_build_object('score', score_content, 'max', 85),
      'seo_social', jsonb_build_object('score', score_seo, 'max', 40),
      'schema_offers', jsonb_build_object('score', score_schema, 'max', 20),
      'email_marketing', jsonb_build_object('score', score_email, 'max', 20)
    ),
    'missing_fields', to_jsonb(missing),
    'required_fields', to_jsonb(required)
  );
END;
$$;

-- Trigger para landing pages
CREATE OR REPLACE FUNCTION public.update_landing_page_completion_score()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  score_data JSONB;
  total_percentage INTEGER;
  status_value TEXT;
BEGIN
  score_data := calculate_landing_page_score(NEW.id);
  total_percentage := (score_data->>'percentage')::INTEGER;
  
  IF total_percentage >= 90 THEN
    status_value := 'complete';
  ELSIF total_percentage >= 70 THEN
    status_value := 'good';
  ELSIF total_percentage >= 50 THEN
    status_value := 'regular';
  ELSE
    status_value := 'critical';
  END IF;
  
  INSERT INTO content_completion_tracking (
    entity_type,
    entity_id,
    completion_score,
    completion_status,
    score_details,
    missing_fields,
    required_fields,
    last_calculated_at
  ) VALUES (
    'landing_page',
    NEW.id,
    total_percentage,
    status_value,
    score_data->'details',
    ARRAY(SELECT jsonb_array_elements_text(score_data->'missing_fields')),
    ARRAY(SELECT jsonb_array_elements_text(score_data->'required_fields')),
    NOW()
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    completion_score = EXCLUDED.completion_score,
    completion_status = EXCLUDED.completion_status,
    score_details = EXCLUDED.score_details,
    missing_fields = EXCLUDED.missing_fields,
    required_fields = EXCLUDED.required_fields,
    last_calculated_at = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_landing_page_completion ON landing_pages;
CREATE TRIGGER trigger_update_landing_page_completion
AFTER INSERT OR UPDATE ON landing_pages
FOR EACH ROW
EXECUTE FUNCTION update_landing_page_completion_score();

-- Forçar recálculo imediato para páginas existentes
UPDATE landing_pages SET last_modified = NOW() WHERE status = 'approved';