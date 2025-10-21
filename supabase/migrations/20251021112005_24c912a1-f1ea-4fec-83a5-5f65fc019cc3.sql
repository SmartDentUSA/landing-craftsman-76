-- Remove a constraint antiga
ALTER TABLE google_ads_campaigns 
DROP CONSTRAINT IF EXISTS google_ads_campaigns_product_id_fkey;

-- Adiciona nova constraint com CASCADE
ALTER TABLE google_ads_campaigns
ADD CONSTRAINT google_ads_campaigns_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES products_repository(id) 
ON DELETE CASCADE;

-- Adicionar comentário para documentação
COMMENT ON CONSTRAINT google_ads_campaigns_product_id_fkey 
ON google_ads_campaigns 
IS 'Campanhas são automaticamente deletadas quando o produto é removido';