-- ==========================================
-- FASE 1: CONSOLIDAÇÃO SEM MIGRAÇÃO DESTRUTIVA
-- Adicionar campos semânticos mantendo 'name'
-- ==========================================

-- 1.1 Log início da migração
INSERT INTO system_monitoring (event_type, component_name, event_data, severity, tags)
VALUES (
  'keyword_consolidation_start',
  'external_links',
  jsonb_build_object(
    'timestamp', now(),
    'strategy', 'additive_evolution'
  ),
  'info',
  '["migration", "keywords", "zero_risk"]'::jsonb
);

-- 1.2 Adicionar Novos Campos Semânticos (NÃO renomear 'name')
ALTER TABLE external_links 
  ADD COLUMN IF NOT EXISTS keyword_type TEXT DEFAULT 'primary' 
    CHECK (keyword_type IN ('primary', 'secondary', 'long_tail', 'negative')),
  ADD COLUMN IF NOT EXISTS search_intent TEXT 
    CHECK (search_intent IN ('informational', 'commercial', 'transactional', 'navigational'));

-- Métricas SEO
ALTER TABLE external_links
  ADD COLUMN IF NOT EXISTS monthly_searches INTEGER,
  ADD COLUMN IF NOT EXISTS competition_level TEXT 
    CHECK (competition_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS cpc_estimate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS relevance_score INTEGER 
    CHECK (relevance_score BETWEEN 0 AND 100);

-- Analytics de uso
ALTER TABLE external_links
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Metadados AI
ALTER TABLE external_links
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_products UUID[],
  ADD COLUMN IF NOT EXISTS related_keywords TEXT[];

-- 1.3 Índices Otimizados
CREATE INDEX IF NOT EXISTS idx_external_links_name_lower 
  ON external_links(LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_external_links_keyword_type 
  ON external_links(keyword_type) WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_external_links_search_intent 
  ON external_links(search_intent) WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_external_links_usage_count 
  ON external_links(usage_count DESC) WHERE approved = true;

CREATE INDEX IF NOT EXISTS idx_external_links_source_products 
  ON external_links USING GIN(source_products);

CREATE INDEX IF NOT EXISTS idx_external_links_related_keywords 
  ON external_links USING GIN(related_keywords);

-- 1.4 Trigger para updated_at
CREATE OR REPLACE FUNCTION update_external_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_external_links_updated_at ON external_links;
CREATE TRIGGER trigger_external_links_updated_at
  BEFORE UPDATE ON external_links
  FOR EACH ROW
  EXECUTE FUNCTION update_external_links_updated_at();

-- 1.5 Constraint de Unicidade (prevenir duplicatas futuras)
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_links_name_unique
  ON external_links(LOWER(TRIM(name)));

-- 1.6 Adicionar keyword_ids em outras tabelas
ALTER TABLE products_repository 
  ADD COLUMN IF NOT EXISTS keyword_ids UUID[];

ALTER TABLE categories_config 
  ADD COLUMN IF NOT EXISTS keyword_ids UUID[];

ALTER TABLE blog_posts 
  ADD COLUMN IF NOT EXISTS keyword_ids UUID[];

-- Índices GIN para keyword_ids
CREATE INDEX IF NOT EXISTS idx_products_keyword_ids 
  ON products_repository USING GIN(keyword_ids);

CREATE INDEX IF NOT EXISTS idx_categories_keyword_ids 
  ON categories_config USING GIN(keyword_ids);

CREATE INDEX IF NOT EXISTS idx_blog_posts_keyword_ids 
  ON blog_posts USING GIN(keyword_ids);

-- 1.7 Habilitar RLS na tabela de backup
ALTER TABLE external_links_backup_20251013 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view backup"
  ON external_links_backup_20251013
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.8 Log pós-migração
INSERT INTO system_monitoring (event_type, component_name, event_data, severity, tags)
VALUES (
  'keyword_consolidation_phase1_complete',
  'external_links',
  jsonb_build_object(
    'timestamp', now(),
    'fields_added', 11,
    'indexes_created', 8,
    'tables_updated', 4,
    'backward_compatible', true
  ),
  'info',
  '["migration", "keywords", "success"]'::jsonb
);