-- Adicionar coluna technical_specifications na tabela products_repository
ALTER TABLE public.products_repository 
ADD COLUMN IF NOT EXISTS technical_specifications jsonb DEFAULT '[]'::jsonb;

-- Comentário: Esta coluna armazenará as especificações técnicas do produto em formato JSON
-- Exemplo de estrutura: [{"label": "Voltagem", "value": "110V"}, {"label": "Potência", "value": "1200W"}]