-- Add video fields to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN instagram_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN youtube_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN testimonial_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN technical_videos JSONB DEFAULT '[]'::jsonb;

-- Add comments to explain the structure
COMMENT ON COLUMN public.products_repository.instagram_videos IS 'Array of Instagram video objects: [{"url": "...", "description": "..."}] - up to 5';
COMMENT ON COLUMN public.products_repository.youtube_videos IS 'Array of YouTube video objects: [{"url": "...", "description": "..."}] - up to 5';
COMMENT ON COLUMN public.products_repository.testimonial_videos IS 'Array of testimonial video objects: [{"url": "...", "description": "..."}] - up to 5';
COMMENT ON COLUMN public.products_repository.technical_videos IS 'Array of technical explanation video objects: [{"url": "...", "description": "..."}] - up to 5';