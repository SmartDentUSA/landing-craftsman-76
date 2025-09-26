-- Adicionar coluna bot_trigger_words na tabela products_repository
ALTER TABLE products_repository 
ADD COLUMN bot_trigger_words jsonb DEFAULT '[]'::jsonb;