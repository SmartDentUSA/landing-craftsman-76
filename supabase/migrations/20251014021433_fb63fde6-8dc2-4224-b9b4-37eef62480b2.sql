-- ============================================
-- CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ============================================

-- 1. DELETAR REGISTRO DUPLICADO DE company_profile
-- Manter apenas o registro mais recente (criado em 14/01)
DELETE FROM company_profile 
WHERE id = 'a905885e-d084-4d37-8376-4b338fab7fcc';

-- 2. HABILITAR RLS NA TABELA BACKUP
ALTER TABLE backup_company_profile_20250114 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can access backup"
ON backup_company_profile_20250114
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. ADICIONAR search_path ÀS FUNÇÕES (segurança contra SQL injection)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.update_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.update_google_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.log_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompts_configuration 
  SET performance_metrics = performance_metrics || jsonb_build_object(
    'usage_count', COALESCE((performance_metrics->>'usage_count')::integer, 0) + 1,
    'last_used', now()
  )
  WHERE id = NEW.id;
  
  INSERT INTO system_monitoring (
    event_type,
    component_name,
    event_data,
    severity,
    tags
  ) VALUES (
    'prompt_usage',
    'prompts_configuration',
    jsonb_build_object(
      'prompt_id', NEW.id,
      'edge_function_id', NEW.edge_function_id,
      'prompt_name', NEW.prompt_name,
      'timestamp', now()
    ),
    'info',
    '["prompts", "usage", "analytics"]'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.validate_blog_content_soft()
RETURNS TRIGGER AS $$
DECLARE
  warning_messages TEXT[] := '{}';
  title_len INTEGER;
  content_len INTEGER;
  meta_len INTEGER;
BEGIN
  title_len := length(trim(NEW.title));
  IF title_len < 10 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Título muito curto (menos de 10 caracteres)');
  END IF;
  IF title_len > 60 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Título muito longo (mais de 60 caracteres)');
  END IF;
  
  content_len := length(trim(NEW.content));
  IF content_len < 500 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Conteúdo muito curto (menos de 500 caracteres)');
  END IF;
  
  IF NEW.meta_description IS NOT NULL THEN
    meta_len := length(trim(NEW.meta_description));
    IF meta_len < 50 THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description muito curta (menos de 50 caracteres)');
    END IF;
    IF meta_len > 160 THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description muito longa (mais de 160 caracteres)');
    END IF;
    
    IF NEW.meta_description !~* '(saiba|descubra|conheça|entenda|veja|confira|acesse|encontre|aprenda|explore)' THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description poderia incluir um CTA (saiba, descubra, conheça, etc.)');
    END IF;
  END IF;
  
  IF NEW.status = 'published' AND (NEW.keywords IS NULL OR array_length(NEW.keywords, 1) < 3) THEN
    warning_messages := array_append(warning_messages, 'AVISO: Blogs publicados deveriam ter pelo menos 3 keywords');
  END IF;
  
  IF array_length(warning_messages, 1) > 0 THEN
    INSERT INTO system_monitoring (
      event_type, 
      component_name, 
      event_data, 
      severity,
      tags
    ) VALUES (
      'content_validation',
      'blog_posts',
      jsonb_build_object(
        'blog_id', NEW.id,
        'warnings', warning_messages,
        'title', NEW.title,
        'validation_timestamp', now()
      ),
      'warning',
      '["content", "validation", "blog"]'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.update_product_completion_score()
RETURNS TRIGGER AS $$
DECLARE
  score_data JSONB;
  total_percentage INTEGER;
  status_value TEXT;
BEGIN
  score_data := calculate_product_score(NEW.id);
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
    'product',
    NEW.id::TEXT,
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
$$ LANGUAGE plpgsql
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.update_landing_page_completion_score()
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
$$ LANGUAGE plpgsql
SET search_path TO 'public';

-- 4. ADICIONAR CONSTRAINT UNIQUE em company_profile
ALTER TABLE company_profile 
ADD CONSTRAINT unique_user_profile UNIQUE (user_id);

-- 5. DELETAR TABELA BACKUP ÓRFÃ
DROP TABLE IF EXISTS backup_company_profile_20250114;