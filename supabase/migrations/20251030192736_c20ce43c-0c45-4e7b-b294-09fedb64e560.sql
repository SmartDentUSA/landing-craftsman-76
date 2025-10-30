-- Adicionar coluna para armazenar edições manuais do usuário
ALTER TABLE public.spin_selling_solutions 
ADD COLUMN IF NOT EXISTS landing_page_custom_text jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.spin_selling_solutions.landing_page_custom_text IS 'Armazena edições manuais feitas pelo usuário no preview editável (rótulos de métricas, FAQ, etc)';
