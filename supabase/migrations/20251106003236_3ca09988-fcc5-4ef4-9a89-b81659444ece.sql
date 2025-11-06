-- Adicionar coluna para transcrições de documentos PDF processados por IA
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS document_transcriptions JSONB DEFAULT '[]'::jsonb;

-- Índice para melhorar performance de queries em transcrições
CREATE INDEX IF NOT EXISTS idx_products_document_transcriptions 
ON products_repository USING gin (document_transcriptions);

-- Comentário descritivo
COMMENT ON COLUMN products_repository.document_transcriptions IS 
'Transcrições de documentos PDF processadas por IA (catálogos, fichas técnicas, manuais). Armazena array de objetos com: id, filename, transcribed_at, transcribed_text, ai_model, extracted_data';