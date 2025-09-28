-- Adicionar campo tiktok_content para armazenar copies geradas para TikTok
ALTER TABLE public.products_repository 
ADD COLUMN tiktok_content jsonb DEFAULT '{"copies": [], "last_generated": null}'::jsonb;