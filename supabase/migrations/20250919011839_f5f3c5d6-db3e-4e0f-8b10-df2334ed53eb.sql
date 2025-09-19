-- Remover campos individuais de redes sociais do repositório de produtos
-- já que são dados da empresa, não de produtos individuais

-- Remover as coleções de vídeos individuais também, pois não fazem sentido por produto
ALTER TABLE products_repository DROP COLUMN IF EXISTS youtube_videos;
ALTER TABLE products_repository DROP COLUMN IF EXISTS instagram_videos;
ALTER TABLE products_repository DROP COLUMN IF EXISTS testimonial_videos;
ALTER TABLE products_repository DROP COLUMN IF EXISTS technical_videos;
ALTER TABLE products_repository DROP COLUMN IF EXISTS video_captions;

-- Adicionar campos de redes sociais da empresa no company_profile se não existirem
DO $$
BEGIN
    -- Verificar se a coluna youtube_channel não existe antes de adicionar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='company_profile' AND column_name='youtube_channel') THEN
        ALTER TABLE company_profile ADD COLUMN youtube_channel text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='company_profile' AND column_name='instagram_profile') THEN
        ALTER TABLE company_profile ADD COLUMN instagram_profile text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='company_profile' AND column_name='company_videos') THEN
        ALTER TABLE company_profile ADD COLUMN company_videos jsonb DEFAULT '{"youtube_videos": [], "instagram_videos": [], "testimonial_videos": [], "technical_videos": []}'::jsonb;
    END IF;
END
$$;