-- Adicionar campo "Aplicações" para descrever casos de uso do produto
ALTER TABLE products_repository 
ADD COLUMN applications TEXT;

COMMENT ON COLUMN products_repository.applications IS 'Descrição das aplicações práticas e casos de uso do produto para uso em geração de conteúdo IA';