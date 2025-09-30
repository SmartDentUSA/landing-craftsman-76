-- Add EAN column to products_repository
ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS ean TEXT;

COMMENT ON COLUMN products_repository.ean IS 'European Article Number (EAN) - separate from GTIN for better Google Merchant Center compatibility';