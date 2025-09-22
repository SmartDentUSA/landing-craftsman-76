-- Add market keywords and search intent keywords to products_repository
ALTER TABLE public.products_repository 
ADD COLUMN market_keywords jsonb DEFAULT '[]'::jsonb,
ADD COLUMN search_intent_keywords jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.products_repository.market_keywords IS 'Keywords relacionadas ao mercado/concorrência para SEO white-hat';
COMMENT ON COLUMN public.products_repository.search_intent_keywords IS 'Keywords baseadas na intenção de busca dos usuários';