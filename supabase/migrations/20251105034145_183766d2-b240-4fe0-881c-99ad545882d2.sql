-- Corrigir li_product_id do produto Bio Vitality
UPDATE products_repository
SET 
  original_data = jsonb_set(
    COALESCE(original_data, '{}'::jsonb),
    '{li_product_id}',
    '"153131198"'
  ),
  updated_at = now()
WHERE id = 'bf091211-09ad-4057-9cb8-d4adf78a442b';