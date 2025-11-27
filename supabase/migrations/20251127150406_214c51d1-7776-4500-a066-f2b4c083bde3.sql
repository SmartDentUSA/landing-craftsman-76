-- Adicionar campo competitor_comparison na tabela products_repository
ALTER TABLE products_repository
ADD COLUMN competitor_comparison jsonb DEFAULT '{
  "enabled": false,
  "title": "",
  "subtitle": "",
  "table_headers": [],
  "table_data": []
}'::jsonb;

COMMENT ON COLUMN products_repository.competitor_comparison IS 'Tabela de comparação com concorrentes para uso em FAQs SPIN e landing pages';