-- Add new product fields for physical specifications, variations, and store category
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS variations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS package_size text,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS width numeric,
ADD COLUMN IF NOT EXISTS depth numeric,
ADD COLUMN IF NOT EXISTS store_category text;

-- Add comments for documentation
COMMENT ON COLUMN products_repository.variations IS 'Product variations with name, price, stock, color, size';
COMMENT ON COLUMN products_repository.package_size IS 'Package size description';
COMMENT ON COLUMN products_repository.weight IS 'Product weight in kg';
COMMENT ON COLUMN products_repository.height IS 'Product height in cm';
COMMENT ON COLUMN products_repository.width IS 'Product width in cm';
COMMENT ON COLUMN products_repository.depth IS 'Product depth in cm';
COMMENT ON COLUMN products_repository.store_category IS 'Original category from store';