-- Adicionar campos para integração Cloudflare na tabela cloned_landing_pages
ALTER TABLE cloned_landing_pages 
  ADD COLUMN IF NOT EXISTS page_path TEXT DEFAULT '/',
  ADD COLUMN IF NOT EXISTS is_homepage BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cloudflare_deployment_id TEXT,
  ADD COLUMN IF NOT EXISTS published_url TEXT,
  ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_error_message TEXT,
  ADD COLUMN IF NOT EXISTS deployment_history JSONB DEFAULT '[]'::jsonb;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cloned_lp_domain ON cloned_landing_pages(target_domain);
CREATE INDEX IF NOT EXISTS idx_cloned_lp_status ON cloned_landing_pages(publish_status);
CREATE INDEX IF NOT EXISTS idx_cloned_lp_homepage ON cloned_landing_pages(target_domain, is_homepage) WHERE is_homepage = true;

-- Comentários para documentação
COMMENT ON COLUMN cloned_landing_pages.page_path IS 'Caminho da página no domínio (/ para homepage)';
COMMENT ON COLUMN cloned_landing_pages.is_homepage IS 'Se true, esta é a página principal do domínio';
COMMENT ON COLUMN cloned_landing_pages.cloudflare_deployment_id IS 'ID do último deployment no Cloudflare Pages';
COMMENT ON COLUMN cloned_landing_pages.published_url IS 'URL final publicada';
COMMENT ON COLUMN cloned_landing_pages.publish_status IS 'Status: draft, pending, success, error';
COMMENT ON COLUMN cloned_landing_pages.publish_error_message IS 'Mensagem de erro do último deploy';
COMMENT ON COLUMN cloned_landing_pages.deployment_history IS 'Histórico de deployments';