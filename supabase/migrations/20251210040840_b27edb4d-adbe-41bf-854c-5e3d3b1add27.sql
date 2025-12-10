-- Habilitar extensão pg_vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela para armazenar embeddings dos chunks de conhecimento
CREATE TABLE public.knowledge_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    product_name TEXT,
    chunk_type TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),  -- Gemini usa 768 dimensões
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.knowledge_vectors ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem gerenciar tudo
CREATE POLICY "Admins can manage knowledge_vectors"
ON public.knowledge_vectors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Qualquer um pode ler (para API pública do chatbot)
CREATE POLICY "Anyone can read knowledge_vectors"
ON public.knowledge_vectors
FOR SELECT
USING (true);

-- Índice para busca vetorial rápida (IVFFlat)
CREATE INDEX idx_knowledge_vectors_embedding 
ON public.knowledge_vectors 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Índices para filtros
CREATE INDEX idx_knowledge_vectors_product_id ON public.knowledge_vectors(product_id);
CREATE INDEX idx_knowledge_vectors_chunk_type ON public.knowledge_vectors(chunk_type);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_knowledge_vectors_updated_at
BEFORE UPDATE ON public.knowledge_vectors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função de busca por similaridade de cosseno
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_chunk_type TEXT DEFAULT NULL,
    filter_product_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    product_id TEXT,
    product_name TEXT,
    chunk_type TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kv.id,
        kv.product_id,
        kv.product_name,
        kv.chunk_type,
        kv.content,
        kv.metadata,
        1 - (kv.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_vectors kv
    WHERE 
        (filter_chunk_type IS NULL OR kv.chunk_type = filter_chunk_type)
        AND (filter_product_id IS NULL OR kv.product_id = filter_product_id)
        AND 1 - (kv.embedding <=> query_embedding) > match_threshold
    ORDER BY kv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;