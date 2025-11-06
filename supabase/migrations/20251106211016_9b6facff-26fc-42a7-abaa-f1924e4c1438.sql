-- Adicionar colunas para métricas de impacto geradas por IA
ALTER TABLE spin_selling_solutions
ADD COLUMN impact_metrics JSONB,
ADD COLUMN metrics_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN spin_selling_solutions.impact_metrics IS 'Array de 3 métricas geradas por IA no formato [{label, value, unit, description}]';
COMMENT ON COLUMN spin_selling_solutions.metrics_generated_at IS 'Timestamp da última geração das métricas pela IA';