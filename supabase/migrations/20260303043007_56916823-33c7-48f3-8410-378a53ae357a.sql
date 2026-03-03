
-- Step 1: Clear existing embeddings (they're 768-dim, incompatible with new 384-dim)
DELETE FROM public.knowledge_vectors;

-- Step 2: Alter column from vector(768) to vector(384)
ALTER TABLE public.knowledge_vectors ALTER COLUMN embedding TYPE vector(384);

-- Step 3: Recreate match function with vector(384)
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(384),
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  filter_chunk_type text DEFAULT NULL,
  filter_product_id text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  product_id text,
  product_name text,
  chunk_type text,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Step 4: Recreate HNSW index for 384 dimensions
DROP INDEX IF EXISTS knowledge_vectors_embedding_idx;
CREATE INDEX knowledge_vectors_embedding_idx ON public.knowledge_vectors 
USING hnsw (embedding vector_cosine_ops);
