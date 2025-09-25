-- Adicionar campo de descrições para recursos CTAs
ALTER TABLE products_repository 
ADD COLUMN resource_descriptions JSONB DEFAULT '{"cta1": "", "cta2": "", "cta3": ""}'::jsonb;