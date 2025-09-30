-- Adicionar campo images_gallery mantendo image_url para compatibilidade total
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS images_gallery jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products_repository.images_gallery IS 'Galeria de imagens do produto: [{url: string, alt: string, order: number, is_main: boolean}]';