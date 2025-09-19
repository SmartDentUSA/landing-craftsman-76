-- Add video collections back to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN instagram_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN youtube_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN testimonial_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN technical_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN video_captions JSONB DEFAULT '{}'::jsonb;