-- Adicionar campos SEO avançado
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS seo_title_override TEXT,
ADD COLUMN IF NOT EXISTS seo_description_override TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Adicionar campos de Estoque & Logística
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER,
ADD COLUMN IF NOT EXISTS stock_managed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER,
ADD COLUMN IF NOT EXISTS max_order_quantity INTEGER,
ADD COLUMN IF NOT EXISTS multiple_order_quantity INTEGER,
ADD COLUMN IF NOT EXISTS unit_measure TEXT,
ADD COLUMN IF NOT EXISTS shipping_time TEXT,
ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shipping_type TEXT;

-- Adicionar campos de Status & Flags
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS launch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promotion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS showcase BOOLEAN DEFAULT false;

-- Adicionar campos Fiscais
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS fiscal_class TEXT,
ADD COLUMN IF NOT EXISTS tax_situation TEXT,
ADD COLUMN IF NOT EXISTS fiscal_origin TEXT;

-- Criar índice para slug (para URLs amigáveis)
CREATE INDEX IF NOT EXISTS idx_products_repository_slug ON products_repository(slug);

-- Criar índice para active (para filtros de produtos ativos)
CREATE INDEX IF NOT EXISTS idx_products_repository_active ON products_repository(active);

-- Criar índice para featured (para produtos em destaque)
CREATE INDEX IF NOT EXISTS idx_products_repository_featured ON products_repository(featured);

COMMENT ON COLUMN products_repository.seo_title_override IS 'Título SEO personalizado para o produto';
COMMENT ON COLUMN products_repository.seo_description_override IS 'Meta descrição SEO personalizada (max 160 caracteres)';
COMMENT ON COLUMN products_repository.slug IS 'URL amigável do produto';
COMMENT ON COLUMN products_repository.stock_quantity IS 'Quantidade disponível em estoque';
COMMENT ON COLUMN products_repository.stock_managed IS 'Se o estoque é controlado automaticamente';
COMMENT ON COLUMN products_repository.active IS 'Se o produto está ativo/visível';
COMMENT ON COLUMN products_repository.featured IS 'Se o produto está em destaque';
COMMENT ON COLUMN products_repository.launch IS 'Se o produto é um lançamento';
COMMENT ON COLUMN products_repository.promotion IS 'Se o produto está em promoção';
COMMENT ON COLUMN products_repository.free_shipping IS 'Se o produto tem frete grátis';
COMMENT ON COLUMN products_repository.ncm IS 'Nomenclatura Comum do Mercosul (código fiscal)';