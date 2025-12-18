-- Adicionar campos para YouTube Script e Instagram Reels Script
ALTER TABLE public.products_repository 
ADD COLUMN IF NOT EXISTS youtube_scripts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS instagram_reels_scripts JSONB DEFAULT '{}'::jsonb;

-- Comentários explicativos
COMMENT ON COLUMN public.products_repository.youtube_scripts IS 'Roteiros de vídeo para YouTube (institucional, técnico, educacional, passo-a-passo)';
COMMENT ON COLUMN public.products_repository.instagram_reels_scripts IS 'Roteiros de vídeo para Instagram Reels (4 variações com hook, cenas e CTA)';