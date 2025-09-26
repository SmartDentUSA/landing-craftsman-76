-- Adicionar campo instagram_copies na tabela products_repository
ALTER TABLE products_repository 
ADD COLUMN instagram_copies jsonb DEFAULT '{"copies": [], "last_generated": null, "template_config": {}}'::jsonb;