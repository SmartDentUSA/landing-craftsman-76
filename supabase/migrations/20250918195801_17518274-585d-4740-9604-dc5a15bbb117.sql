-- Add video_captions column to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN video_captions JSONB DEFAULT '{}'::jsonb;