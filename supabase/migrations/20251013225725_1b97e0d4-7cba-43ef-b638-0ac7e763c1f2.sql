-- Forçar recálculo para landing pages existentes
UPDATE landing_pages 
SET last_modified = NOW() 
WHERE status = 'approved';

-- Forçar recálculo para produtos existentes
UPDATE products_repository 
SET updated_at = NOW() 
WHERE approved = true;

-- Verificar que os dados foram calculados
DO $$
DECLARE
  lp_count INTEGER;
  prod_count INTEGER;
BEGIN
  -- Aguardar 2 segundos para os triggers executarem
  PERFORM pg_sleep(2);
  
  SELECT COUNT(*) INTO lp_count 
  FROM content_completion_tracking 
  WHERE entity_type = 'landing_page';
  
  SELECT COUNT(*) INTO prod_count 
  FROM content_completion_tracking 
  WHERE entity_type = 'product';
  
  RAISE NOTICE 'Landing Pages com score: %', lp_count;
  RAISE NOTICE 'Produtos com score: %', prod_count;
END $$;