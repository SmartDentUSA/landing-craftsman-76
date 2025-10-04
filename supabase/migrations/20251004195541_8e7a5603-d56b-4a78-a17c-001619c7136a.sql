-- FASE 0: Adicionar campo version_history na tabela blog_posts
-- Este campo armazenará o histórico completo de versões dos blogs (últimas 10)

ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS version_history jsonb 
DEFAULT '{"versions": []}'::jsonb;

-- Índice para melhorar performance em queries de histórico
CREATE INDEX IF NOT EXISTS idx_blog_posts_version_history 
ON blog_posts USING GIN (version_history);

-- Comentário para documentação
COMMENT ON COLUMN blog_posts.version_history IS 
'Histórico de versões do blog (últimas 10), incluindo domínios específicos para Dual Blogs. 
Estrutura: {
  "versions": [
    {
      "id": "uuid-v4",
      "title": "...",
      "content": "...",
      "meta_description": "...",
      "keywords": [...],
      "generated_at": "ISO-timestamp",
      "ai_source": "ai-model-name",
      "domain": "dominio.com (para Dual Blogs)",
      "author_kol_id": "uuid ou null",
      "intelligent_links": {...},
      "schema_json_ld": {...}
    }
  ]
}';