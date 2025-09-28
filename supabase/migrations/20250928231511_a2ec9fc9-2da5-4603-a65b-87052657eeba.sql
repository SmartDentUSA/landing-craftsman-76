-- Expand google_ads_campaigns table to support product-level campaigns
ALTER TABLE google_ads_campaigns 
ADD COLUMN product_id uuid REFERENCES products_repository(id),
ADD COLUMN campaign_type text DEFAULT 'landing_page' CHECK (campaign_type IN ('landing_page', 'product'));

-- Create index for product campaigns
CREATE INDEX idx_google_ads_campaigns_product_id ON google_ads_campaigns(product_id);

-- Allow null landing_page_id when product_id is set
ALTER TABLE google_ads_campaigns 
ALTER COLUMN landing_page_id DROP NOT NULL;

-- Add constraint to ensure either landing_page_id or product_id is set
ALTER TABLE google_ads_campaigns 
ADD CONSTRAINT check_campaign_target 
CHECK (
  (landing_page_id IS NOT NULL AND product_id IS NULL AND campaign_type = 'landing_page') OR
  (product_id IS NOT NULL AND landing_page_id IS NULL AND campaign_type = 'product')
);