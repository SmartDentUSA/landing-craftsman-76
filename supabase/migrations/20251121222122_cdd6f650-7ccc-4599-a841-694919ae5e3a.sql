-- ===================================
-- FASE 4.2: ADICIONAR METADADOS DE RASTREABILIDADE
-- ===================================

-- Adicionar coluna metadata em spin_selling_solutions
ALTER TABLE spin_selling_solutions 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{
  "artifact_chain": {},
  "quality_metrics": {},
  "generation_history": []
}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN spin_selling_solutions.metadata IS 'Metadados de rastreabilidade: artifact_chain (fonte de dados, versões), quality_metrics (scores de qualidade/confiança), generation_history (histórico de gerações)';

-- Criar índice para consultas eficientes por version
CREATE INDEX IF NOT EXISTS idx_spin_solutions_metadata_version 
ON spin_selling_solutions ((metadata->'artifact_chain'->>'pitch_version'));

-- Criar índice para consultas por data_quality_score
CREATE INDEX IF NOT EXISTS idx_spin_solutions_metadata_quality 
ON spin_selling_solutions (((metadata->'quality_metrics'->>'data_quality_score')::integer));