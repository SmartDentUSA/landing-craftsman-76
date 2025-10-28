-- Adicionar campo ecommerce_html ao products_repository
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS ecommerce_html JSONB DEFAULT NULL;

-- Criar índice GIN para busca eficiente (apenas se HTML estiver presente)
CREATE INDEX IF NOT EXISTS idx_products_ecommerce_html_generated 
ON products_repository 
USING GIN ((ecommerce_html->'html_content')) 
WHERE ecommerce_html IS NOT NULL;

-- Comentário descritivo
COMMENT ON COLUMN products_repository.ecommerce_html IS 
'Armazena HTML gerado para e-commerce com benefícios IA, opções de geração e metadata. Estrutura: {html_content, generated_at, last_edited_at, generated_benefits, generation_options, ai_model_used, version}';