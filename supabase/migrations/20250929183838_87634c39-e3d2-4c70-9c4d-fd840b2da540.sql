-- Expandir prompt templates com campos de monitoring e analytics
ALTER TABLE prompts_configuration 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{"success_rate": 0, "avg_response_time": 0, "usage_count": 0, "last_used": null}'::jsonb,
ADD COLUMN IF NOT EXISTS template_category TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS backup_prompt TEXT,
ADD COLUMN IF NOT EXISTS content_validation_rules JSONB DEFAULT '{"min_length": 100, "max_length": 5000, "required_keywords": [], "forbidden_words": [], "tone_requirements": []}'::jsonb,
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;

-- Criar tabela de monitoramento em tempo real
CREATE TABLE IF NOT EXISTS system_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  component_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  performance_data JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb
);

-- Criar tabela de analytics de conteúdo
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  performance_score NUMERIC(3,2),
  quality_metrics JSONB DEFAULT '{}'::jsonb,
  user_feedback JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar função de validação suave de conteúdo (warnings)
CREATE OR REPLACE FUNCTION validate_blog_content_soft()
RETURNS TRIGGER AS $$
DECLARE
  warning_messages TEXT[] := '{}';
  title_len INTEGER;
  content_len INTEGER;
  meta_len INTEGER;
BEGIN
  -- Validações de título
  title_len := length(trim(NEW.title));
  IF title_len < 10 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Título muito curto (menos de 10 caracteres)');
  END IF;
  IF title_len > 60 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Título muito longo (mais de 60 caracteres)');
  END IF;
  
  -- Validações de conteúdo
  content_len := length(trim(NEW.content));
  IF content_len < 500 THEN
    warning_messages := array_append(warning_messages, 'AVISO: Conteúdo muito curto (menos de 500 caracteres)');
  END IF;
  
  -- Validações de meta description
  IF NEW.meta_description IS NOT NULL THEN
    meta_len := length(trim(NEW.meta_description));
    IF meta_len < 50 THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description muito curta (menos de 50 caracteres)');
    END IF;
    IF meta_len > 160 THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description muito longa (mais de 160 caracteres)');
    END IF;
    
    -- Verificar CTA na meta description
    IF NEW.meta_description !~* '(saiba|descubra|conheça|entenda|veja|confira|acesse|encontre|aprenda|explore)' THEN
      warning_messages := array_append(warning_messages, 'AVISO: Meta description poderia incluir um CTA (saiba, descubra, conheça, etc.)');
    END IF;
  END IF;
  
  -- Validações de keywords
  IF NEW.status = 'published' AND (NEW.keywords IS NULL OR array_length(NEW.keywords, 1) < 3) THEN
    warning_messages := array_append(warning_messages, 'AVISO: Blogs publicados deveriam ter pelo menos 3 keywords');
  END IF;
  
  -- Log warnings no sistema de monitoramento
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
$$ LANGUAGE plpgsql;

-- Criar trigger de validação suave
DROP TRIGGER IF EXISTS soft_validate_blog_content ON blog_posts;
CREATE TRIGGER soft_validate_blog_content
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_blog_content_soft();

-- Criar função para logging automático de performance
CREATE OR REPLACE FUNCTION log_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar contador de uso
  UPDATE prompts_configuration 
  SET performance_metrics = performance_metrics || jsonb_build_object(
    'usage_count', COALESCE((performance_metrics->>'usage_count')::integer, 0) + 1,
    'last_used', now()
  )
  WHERE id = NEW.id;
  
  -- Log no sistema de monitoramento
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
$$ LANGUAGE plpgsql;

-- Trigger para monitorar uso de prompts
DROP TRIGGER IF EXISTS track_prompt_usage ON prompts_configuration;
CREATE TRIGGER track_prompt_usage
  AFTER UPDATE ON prompts_configuration
  FOR EACH ROW
  WHEN (OLD.updated_at != NEW.updated_at)
  EXECUTE FUNCTION log_prompt_usage();

-- Configurar RLS para novas tabelas
ALTER TABLE system_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_monitoring
CREATE POLICY "Admins can manage system_monitoring" 
ON system_monitoring FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view system_monitoring" 
ON system_monitoring FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para content_analytics
CREATE POLICY "Admins can manage content_analytics" 
ON content_analytics FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view content_analytics" 
ON content_analytics FOR SELECT 
USING (auth.uid() IS NOT NULL);