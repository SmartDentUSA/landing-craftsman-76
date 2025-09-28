-- Add tiktok_videos field to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN tiktok_videos jsonb DEFAULT '[]'::jsonb;