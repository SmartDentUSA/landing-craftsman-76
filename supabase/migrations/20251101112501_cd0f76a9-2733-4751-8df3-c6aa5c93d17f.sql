-- Adicionar coluna competitor_comparison na tabela spin_selling_solutions
ALTER TABLE spin_selling_solutions
ADD COLUMN IF NOT EXISTS competitor_comparison JSONB DEFAULT '{"enabled": false, "title": "", "subtitle": "", "table_headers": [], "table_data": []}'::jsonb;

-- Criar índice JSONB para melhor performance
CREATE INDEX IF NOT EXISTS idx_spin_competitor_comparison 
ON spin_selling_solutions USING GIN (competitor_comparison);

-- Comentário explicativo
COMMENT ON COLUMN spin_selling_solutions.competitor_comparison IS 'Tabela de comparação com concorrentes (enabled, title, subtitle, table_headers, table_data)';