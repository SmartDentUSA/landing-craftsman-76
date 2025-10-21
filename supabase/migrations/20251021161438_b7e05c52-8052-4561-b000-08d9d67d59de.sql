-- Add consolidated HTML cache columns to landing_pages
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS consolidated_html_cache JSONB NULL,
ADD COLUMN IF NOT EXISTS consolidated_generated_at TIMESTAMPTZ NULL;

-- Create index for faster queries on generation timestamp
CREATE INDEX IF NOT EXISTS idx_landing_pages_consolidated_generated_at 
ON public.landing_pages(consolidated_generated_at DESC);

-- Add comment explaining the columns
COMMENT ON COLUMN public.landing_pages.consolidated_html_cache IS 
'Stores pre-generated consolidated HTML for both domains (dentala + eodonto) with metadata. Cache-first strategy to avoid automatic regeneration.';

COMMENT ON COLUMN public.landing_pages.consolidated_generated_at IS 
'Timestamp of last manual consolidated HTML generation. Used for cache invalidation and reporting.';