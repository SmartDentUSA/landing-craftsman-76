-- Add SEO context fields to company_profile table
ALTER TABLE public.company_profile 
ADD COLUMN seo_context_keywords jsonb DEFAULT '[]'::jsonb,
ADD COLUMN seo_market_positioning text,
ADD COLUMN seo_competitive_advantages text,
ADD COLUMN seo_technical_expertise text,
ADD COLUMN seo_service_areas text;