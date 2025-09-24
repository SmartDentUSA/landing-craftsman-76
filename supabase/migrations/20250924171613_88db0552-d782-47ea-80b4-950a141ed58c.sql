-- Vincular produtos às landing pages recuperadas
UPDATE public.landing_pages 
SET selected_product_ids = ARRAY(
  SELECT id::text FROM products_repository 
  WHERE approved = true 
  LIMIT 3
) 
WHERE id = 'lp_1758075930044';

UPDATE public.landing_pages 
SET selected_product_ids = ARRAY(
  SELECT id::text FROM products_repository 
  WHERE approved = true 
  ORDER BY created_at DESC
  LIMIT 2
) 
WHERE id = 'lp_1758075930046';