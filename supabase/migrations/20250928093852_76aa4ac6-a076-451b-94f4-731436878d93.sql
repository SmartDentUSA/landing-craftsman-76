-- Adicionar campos Google Merchant SEO à tabela products_repository
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS gtin text,
ADD COLUMN IF NOT EXISTS mpn text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS google_product_category text,
ADD COLUMN IF NOT EXISTS condition text DEFAULT 'new',
ADD COLUMN IF NOT EXISTS availability text DEFAULT 'in stock',
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS material text,
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS seo_title_override text,
ADD COLUMN IF NOT EXISTS seo_description_override text,
ADD COLUMN IF NOT EXISTS canonical_url text,
ADD COLUMN IF NOT EXISTS seo_enhanced boolean DEFAULT false;