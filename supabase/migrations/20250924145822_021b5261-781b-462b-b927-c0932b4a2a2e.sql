-- Add missing columns to products_repository table for landing page sections and CTAs

-- Add column for Resources section visibility
ALTER TABLE public.products_repository 
ADD COLUMN show_in_resources boolean DEFAULT false;

-- Add column for Offers section visibility  
ALTER TABLE public.products_repository 
ADD COLUMN selected boolean DEFAULT false;

-- Add columns for Resource CTAs (JSON format: {label, url, visible})
ALTER TABLE public.products_repository 
ADD COLUMN resource_cta1 jsonb DEFAULT '{"label": "", "url": "", "visible": false}'::jsonb;

ALTER TABLE public.products_repository 
ADD COLUMN resource_cta2 jsonb DEFAULT '{"label": "", "url": "", "visible": false}'::jsonb;

ALTER TABLE public.products_repository 
ADD COLUMN resource_cta3 jsonb DEFAULT '{"label": "", "url": "", "visible": false}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.products_repository.show_in_resources IS 'Controls if product appears in Resources and Downloads section';
COMMENT ON COLUMN public.products_repository.selected IS 'Controls if product appears in Offers section';
COMMENT ON COLUMN public.products_repository.resource_cta1 IS 'First CTA button config: {label, url, visible}';
COMMENT ON COLUMN public.products_repository.resource_cta2 IS 'Second CTA button config: {label, url, visible}';
COMMENT ON COLUMN public.products_repository.resource_cta3 IS 'Third CTA button config: {label, url, visible}';