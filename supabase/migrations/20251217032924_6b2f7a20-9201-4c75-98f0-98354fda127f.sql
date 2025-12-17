-- Tabela de cache para Knowledge Base
CREATE TABLE IF NOT EXISTS public.knowledge_base_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL DEFAULT 'rag',
  data JSONB NOT NULL,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '3 hours',
  UNIQUE(format)
);

-- Índice para busca rápida por formato
CREATE INDEX IF NOT EXISTS idx_kb_cache_format ON public.knowledge_base_cache(format);

-- Índice para verificar expiração
CREATE INDEX IF NOT EXISTS idx_kb_cache_expires ON public.knowledge_base_cache(expires_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_kb_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.expires_at = NOW() + INTERVAL '3 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_kb_cache_updated_at
BEFORE UPDATE ON public.knowledge_base_cache
FOR EACH ROW
EXECUTE FUNCTION update_kb_cache_updated_at();

-- RLS Policies
ALTER TABLE public.knowledge_base_cache ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para LLMs e APIs)
CREATE POLICY "Anyone can read kb cache" ON public.knowledge_base_cache
FOR SELECT USING (true);

-- Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Only admins can manage kb cache" ON public.knowledge_base_cache
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Comentário para documentação
COMMENT ON TABLE public.knowledge_base_cache IS 'Cache da Knowledge Base para LLMs. Atualizado automaticamente a cada 3 horas.';