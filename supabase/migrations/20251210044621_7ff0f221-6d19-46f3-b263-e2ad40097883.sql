-- Adicionar campo google_aggregate_rating ao company_profile
-- Valores reais do Google: 5.0 estrelas e 150 avaliações
ALTER TABLE public.company_profile 
ADD COLUMN IF NOT EXISTS google_aggregate_rating JSONB DEFAULT '{"ratingValue": "5.0", "reviewCount": 150}'::jsonb;

-- Atualizar registros existentes com os valores reais do Google
UPDATE public.company_profile 
SET google_aggregate_rating = '{"ratingValue": "5.0", "reviewCount": 150}'::jsonb
WHERE google_aggregate_rating IS NULL;