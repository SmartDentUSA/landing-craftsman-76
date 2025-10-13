-- Migration: Create content completion tracking system

-- 1. Create content_completion_tracking table
CREATE TABLE IF NOT EXISTS content_completion_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'landing_page')),
  entity_id TEXT NOT NULL,
  
  -- Scores automáticos (0-100)
  completion_score INTEGER NOT NULL DEFAULT 0,
  completion_status TEXT NOT NULL DEFAULT 'critical' 
    CHECK (completion_status IN ('complete', 'good', 'regular', 'critical')),
  
  -- Detalhamento por seção (JSONB com 12 seções)
  score_details JSONB NOT NULL DEFAULT '{
    "basic_info": {"score": 0, "max": 10},
    "seo": {"score": 0, "max": 20},
    "hero": {"score": 0, "max": 25},
    "video": {"score": 0, "max": 10},
    "solutions": {"score": 0, "max": 15},
    "desktop_info": {"score": 0, "max": 10},
    "resources": {"score": 0, "max": 20},
    "advisory": {"score": 0, "max": 10},
    "faq": {"score": 0, "max": 15},
    "cta_final": {"score": 0, "max": 10},
    "footer": {"score": 0, "max": 10},
    "email": {"score": 0, "max": 10},
    "linked_products": {"count": 0},
    "has_blog": false
  }'::JSONB,
  
  -- Campos faltantes
  missing_fields TEXT[] DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  
  -- Override manual
  marked_complete BOOLEAN DEFAULT FALSE,
  marked_complete_by UUID,
  marked_complete_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id)
);

-- 2. Create indexes for performance
CREATE INDEX idx_completion_entity ON content_completion_tracking(entity_type, entity_id);
CREATE INDEX idx_completion_score ON content_completion_tracking(completion_score DESC);
CREATE INDEX idx_completion_status ON content_completion_tracking(completion_status);
CREATE INDEX idx_completion_last_calc ON content_completion_tracking(last_calculated_at DESC);

-- 3. Enable RLS
ALTER TABLE content_completion_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage completion tracking"
ON content_completion_tracking FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Function to calculate landing page score
CREATE OR REPLACE FUNCTION calculate_landing_page_score(lp_id TEXT)
RETURNS JSONB AS $$
DECLARE
  lp RECORD;
  score_basic INTEGER := 0;
  score_seo INTEGER := 0;
  score_hero INTEGER := 0;
  score_video INTEGER := 0;
  score_solutions INTEGER := 0;
  score_desktop INTEGER := 0;
  score_resources INTEGER := 0;
  score_advisory INTEGER := 0;
  score_faq INTEGER := 0;
  score_cta INTEGER := 0;
  score_footer INTEGER := 0;
  score_email INTEGER := 0;
  missing TEXT[] := '{}';
  required TEXT[] := '{}';
  total_score INTEGER;
  percentage INTEGER;
BEGIN
  SELECT * FROM landing_pages WHERE id = lp_id INTO lp;
  
  IF lp IS NULL THEN
    RAISE EXCEPTION 'Landing page % não encontrada', lp_id;
  END IF;
  
  -- BÁSICO (10 pts)
  IF lp.name IS NOT NULL AND LENGTH(TRIM(lp.name)) > 0 THEN
    score_basic := score_basic + 5;
  ELSE
    missing := array_append(missing, 'Nome da LP');
    required := array_append(required, 'name');
  END IF;
  
  IF lp.status IS NOT NULL THEN
    score_basic := score_basic + 5;
  END IF;
  
  -- SEO (20 pts)
  IF lp.data->>'seo_title' IS NOT NULL AND LENGTH(TRIM(lp.data->>'seo_title')) > 0 THEN
    score_seo := score_seo + 3;
  ELSE
    missing := array_append(missing, 'SEO Title');
    required := array_append(required, 'seo.seo_title');
  END IF;
  
  IF lp.data->>'seo_description' IS NOT NULL AND LENGTH(TRIM(lp.data->>'seo_description')) >= 50 THEN
    score_seo := score_seo + 3;
  ELSE
    missing := array_append(missing, 'SEO Description (min 50 chars)');
  END IF;
  
  IF lp.data->'seo'->>'canonical_url' IS NOT NULL THEN
    score_seo := score_seo + 2;
  ELSE
    missing := array_append(missing, 'Canonical URL');
  END IF;
  
  IF lp.data->'seo'->>'og_title' IS NOT NULL THEN
    score_seo := score_seo + 3;
  ELSE
    missing := array_append(missing, 'OG Title');
  END IF;
  
  IF lp.data->'seo'->>'og_description' IS NOT NULL THEN
    score_seo := score_seo + 3;
  ELSE
    missing := array_append(missing, 'OG Description');
  END IF;
  
  IF lp.data->'seo'->'og_image'->>'src' IS NOT NULL THEN
    score_seo := score_seo + 3;
  ELSE
    missing := array_append(missing, 'OG Image');
  END IF;
  
  IF lp.data->'seo'->>'twitter_title' IS NOT NULL THEN
    score_seo := score_seo + 2;
  END IF;
  
  IF lp.data->'seo'->>'twitter_description' IS NOT NULL THEN
    score_seo := score_seo + 1;
  END IF;
  
  -- HERO SECTION (25 pts)
  IF lp.data->'banner'->>'badge_text' IS NOT NULL THEN
    score_hero := score_hero + 3;
  END IF;
  
  IF lp.data->'banner'->>'title' IS NOT NULL AND LENGTH(TRIM(lp.data->'banner'->>'title')) > 0 THEN
    score_hero := score_hero + 5;
  ELSE
    missing := array_append(missing, 'Banner Title');
    required := array_append(required, 'banner.title');
  END IF;
  
  IF lp.data->'banner'->>'subtitle' IS NOT NULL THEN
    score_hero := score_hero + 5;
  ELSE
    missing := array_append(missing, 'Banner Subtitle');
  END IF;
  
  IF lp.data->'banner'->'cta_primary'->>'label' IS NOT NULL THEN
    score_hero := score_hero + 4;
  ELSE
    missing := array_append(missing, 'CTA Primary');
  END IF;
  
  IF lp.data->'banner'->'cta_secondary'->>'label' IS NOT NULL THEN
    score_hero := score_hero + 3;
  END IF;
  
  IF jsonb_array_length(COALESCE(lp.data->'banner'->'images', '[]'::jsonb)) > 0 THEN
    score_hero := score_hero + 5;
  ELSE
    missing := array_append(missing, 'Banner Images');
  END IF;
  
  -- VÍDEO EXPLICATIVO (10 pts)
  IF lp.data->'explanatory_video_section'->'selected_video'->>'url' IS NOT NULL THEN
    score_video := score_video + 10;
  ELSE
    missing := array_append(missing, 'Vídeo Explicativo');
  END IF;
  
  -- SOLUTIONS (15 pts)
  IF jsonb_array_length(COALESCE(lp.data->'solutions', '[]'::jsonb)) >= 3 THEN
    score_solutions := score_solutions + 15;
  ELSIF jsonb_array_length(COALESCE(lp.data->'solutions', '[]'::jsonb)) > 0 THEN
    score_solutions := score_solutions + 8;
    missing := array_append(missing, 'Solutions (mínimo 3, tem ' || jsonb_array_length(lp.data->'solutions') || ')');
  ELSE
    missing := array_append(missing, 'Solutions (mínimo 3)');
  END IF;
  
  -- DESKTOP INFO (10 pts)
  IF lp.data->'desktop_info'->>'title' IS NOT NULL THEN
    score_desktop := score_desktop + 5;
  ELSE
    missing := array_append(missing, 'Desktop Info Title');
  END IF;
  
  IF lp.data->'desktop_info'->>'text' IS NOT NULL THEN
    score_desktop := score_desktop + 5;
  ELSE
    missing := array_append(missing, 'Desktop Info Text');
  END IF;
  
  -- RECURSOS & OFERTAS (20 pts)
  IF array_length(lp.selected_product_ids, 1) > 0 THEN
    score_resources := score_resources + 10;
  ELSE
    missing := array_append(missing, 'Produtos Vinculados');
    required := array_append(required, 'selected_product_ids');
  END IF;
  
  IF jsonb_array_length(COALESCE(lp.data->'schema'->'offers', '[]'::jsonb)) > 0 THEN
    score_resources := score_resources + 10;
  ELSE
    missing := array_append(missing, 'Offers (Schema)');
  END IF;
  
  -- ADVISORY (10 pts)
  IF lp.data->'advisory'->>'title' IS NOT NULL THEN
    score_advisory := score_advisory + 5;
  END IF;
  
  IF lp.data->'advisory'->>'paragraph' IS NOT NULL THEN
    score_advisory := score_advisory + 5;
  END IF;
  
  -- FAQ (15 pts)
  IF jsonb_array_length(COALESCE(lp.data->'faq', '[]'::jsonb)) >= 5 THEN
    score_faq := score_faq + 15;
  ELSIF jsonb_array_length(COALESCE(lp.data->'faq', '[]'::jsonb)) > 0 THEN
    score_faq := score_faq + 8;
    missing := array_append(missing, 'FAQ (mínimo 5, tem ' || jsonb_array_length(lp.data->'faq') || ')');
  ELSE
    missing := array_append(missing, 'FAQ (mínimo 5)');
  END IF;
  
  -- CTA FINAL (10 pts)
  IF lp.data->'cta_final'->>'title' IS NOT NULL THEN
    score_cta := score_cta + 5;
  ELSE
    missing := array_append(missing, 'CTA Final Title');
  END IF;
  
  IF lp.data->'cta_final'->'primary'->>'label' IS NOT NULL THEN
    score_cta := score_cta + 5;
  ELSE
    missing := array_append(missing, 'CTA Final Button');
  END IF;
  
  -- FOOTER (10 pts)
  IF jsonb_array_length(COALESCE(lp.data->'footer'->'links', '[]'::jsonb)) > 0 THEN
    score_footer := score_footer + 5;
  END IF;
  
  IF jsonb_array_length(COALESCE(lp.data->'footer'->'social', '[]'::jsonb)) > 0 THEN
    score_footer := score_footer + 5;
  ELSE
    missing := array_append(missing, 'Redes Sociais (Footer)');
  END IF;
  
  -- EMAIL (10 pts)
  IF lp.data->'email'->>'assunto_email' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  IF lp.data->'email'->>'preheader_texto' IS NOT NULL THEN
    score_email := score_email + 5;
  END IF;
  
  -- CALCULAR TOTAL
  total_score := score_basic + score_seo + score_hero + score_video + 
                 score_solutions + score_desktop + score_resources + 
                 score_advisory + score_faq + score_cta + score_footer + score_email;
  
  percentage := ROUND((total_score::NUMERIC / 165) * 100);
  
  RETURN jsonb_build_object(
    'total_score', total_score,
    'max_score', 165,
    'percentage', percentage,
    'details', jsonb_build_object(
      'basic_info', jsonb_build_object('score', score_basic, 'max', 10),
      'seo', jsonb_build_object('score', score_seo, 'max', 20),
      'hero', jsonb_build_object('score', score_hero, 'max', 25),
      'video', jsonb_build_object('score', score_video, 'max', 10),
      'solutions', jsonb_build_object('score', score_solutions, 'max', 15),
      'desktop_info', jsonb_build_object('score', score_desktop, 'max', 10),
      'resources', jsonb_build_object('score', score_resources, 'max', 20),
      'advisory', jsonb_build_object('score', score_advisory, 'max', 10),
      'faq', jsonb_build_object('score', score_faq, 'max', 15),
      'cta_final', jsonb_build_object('score', score_cta, 'max', 10),
      'footer', jsonb_build_object('score', score_footer, 'max', 10),
      'email', jsonb_build_object('score', score_email, 'max', 10),
      'linked_products', jsonb_build_object('count', COALESCE(array_length(lp.selected_product_ids, 1), 0)),
      'has_blog', (lp.blog_generated = TRUE AND lp.blog_generated_at IS NOT NULL)
    ),
    'missing_fields', to_jsonb(missing),
    'required_fields', to_jsonb(required)
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger function to update completion score
CREATE OR REPLACE FUNCTION update_landing_page_completion_score()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 6. Create trigger
CREATE TRIGGER trigger_update_lp_completion
AFTER INSERT OR UPDATE ON landing_pages
FOR EACH ROW
EXECUTE FUNCTION update_landing_page_completion_score();