-- Add all_categories field to store multiple categories from API
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS all_categories jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products_repository.all_categories IS 'Array of all categories from the import source (e.g., Loja Integrada categorias array)';