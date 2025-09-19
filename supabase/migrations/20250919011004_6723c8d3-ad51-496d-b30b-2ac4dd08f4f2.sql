-- Migração para unificar campos de vídeo em products_repository
-- Esta migração move dados de youtube_url e instagram_url para as coleções de vídeos

-- Primeiro, vamos migrar os dados existentes para as coleções
UPDATE products_repository 
SET youtube_videos = CASE 
  WHEN youtube_url IS NOT NULL AND youtube_url != '' THEN 
    COALESCE(youtube_videos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'url', youtube_url,
        'description', 'Vídeo principal do produto'
      )
    )
  ELSE youtube_videos
END
WHERE youtube_url IS NOT NULL AND youtube_url != '';

UPDATE products_repository 
SET instagram_videos = CASE 
  WHEN instagram_url IS NOT NULL AND instagram_url != '' THEN 
    COALESCE(instagram_videos, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'url', instagram_url,
        'description', 'Post principal do Instagram'
      )
    )
  ELSE instagram_videos
END
WHERE instagram_url IS NOT NULL AND instagram_url != '';

-- Agora podemos remover as colunas antigas
ALTER TABLE products_repository DROP COLUMN IF EXISTS youtube_url;
ALTER TABLE products_repository DROP COLUMN IF EXISTS instagram_url;