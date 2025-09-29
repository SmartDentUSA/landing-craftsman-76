-- Add history columns to google_ads_campaigns table for versioning  
ALTER TABLE public.google_ads_campaigns 
ADD COLUMN IF NOT EXISTS campaign_history JSONB DEFAULT '{"campaigns": [], "last_generated": null}'::jsonb;

-- Add comment explaining the new column
COMMENT ON COLUMN public.google_ads_campaigns.campaign_history IS 'Stores version history of generated campaigns with timestamps for reuse and anti-duplication';