-- Add seo_settings column to publication_settings table
ALTER TABLE publication_settings 
ADD COLUMN IF NOT EXISTS seo_settings jsonb DEFAULT '{
  "robots_config": {
    "allowAll": true,
    "disallowPaths": [],
    "crawlDelay": null,
    "userAgents": ["*", "Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit"]
  }
}'::jsonb;

COMMENT ON COLUMN publication_settings.seo_settings IS 'SEO configuration including robots.txt rules and other SEO settings';