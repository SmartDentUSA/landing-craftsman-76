-- Adicionar coluna FAQ para produtos
ALTER TABLE public.products_repository 
ADD COLUMN faq JSONB DEFAULT '[]'::jsonb;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.products_repository.faq IS 'Perguntas frequentes do produto em formato JSON: [{question: string, answer: string}]';