-- Adicionar coluna technical_documents à tabela products_repository
ALTER TABLE products_repository 
ADD COLUMN technical_documents JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products_repository.technical_documents IS 
'Documentos técnicos importados do Sistema B (catálogo e resinas)';