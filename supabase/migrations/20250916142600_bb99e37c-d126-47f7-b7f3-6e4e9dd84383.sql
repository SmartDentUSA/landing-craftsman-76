-- Adicionar campos para SEO inteligente com DeepSeek
-- Estes campos vão armazenar conteúdo gerado por IA para otimização SEO

-- Verificar se existe uma tabela para landing pages (assumindo que usamos a mesma estrutura das reviews)
-- Se não existir, vamos adicionar os campos às tabelas relevantes

-- Adicionar campos SEO à tabela approved_reviews (assumindo que é onde ficam os dados das landing pages)
ALTER TABLE public.approved_reviews 
ADD COLUMN IF NOT EXISTS seo_hidden_content TEXT,
ADD COLUMN IF NOT EXISTS ai_keywords JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS seo_generated_by_ai BOOLEAN DEFAULT false;

-- Criar índice para busca nas keywords geradas por IA
CREATE INDEX IF NOT EXISTS idx_approved_reviews_ai_keywords 
ON public.approved_reviews USING GIN(ai_keywords);

-- Comentários para documentação
COMMENT ON COLUMN public.approved_reviews.seo_hidden_content IS 'Conteúdo oculto para SEO gerado por IA - não aparece visualmente mas é usado pelos mecanismos de busca';
COMMENT ON COLUMN public.approved_reviews.ai_keywords IS 'Palavras-chave semânticas geradas por IA em formato JSON';
COMMENT ON COLUMN public.approved_reviews.seo_generated_by_ai IS 'Flag indicando se o conteúdo SEO foi gerado por IA';