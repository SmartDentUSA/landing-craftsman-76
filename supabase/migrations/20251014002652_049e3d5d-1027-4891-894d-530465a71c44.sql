-- ========================================
-- FASE 3: VALIDAÇÕES SQL DE SEGURANÇA
-- ========================================

-- Validação de preços (preços inválidos)
CREATE OR REPLACE FUNCTION validate_product_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.price IS NOT NULL AND NEW.price < 0 THEN
    RAISE EXCEPTION 'Preço não pode ser negativo';
  END IF;
  
  IF NEW.promo_price IS NOT NULL AND NEW.price IS NOT NULL AND NEW.promo_price >= NEW.price THEN
    RAISE EXCEPTION 'Preço promocional deve ser menor que preço normal';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_price_trigger ON products_repository;
CREATE TRIGGER validate_product_price_trigger
  BEFORE INSERT OR UPDATE ON products_repository
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_price();

-- Validação de URLs malformadas
CREATE OR REPLACE FUNCTION validate_product_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.product_url IS NOT NULL AND NEW.product_url != '' AND NEW.product_url !~ '^https?://' THEN
    RAISE WARNING 'URL do produto sem protocolo HTTP(S): %', NEW.product_url;
  END IF;
  
  IF NEW.image_url IS NOT NULL AND NEW.image_url != '' AND NEW.image_url !~ '^https?://' THEN
    RAISE WARNING 'URL da imagem sem protocolo HTTP(S): %', NEW.image_url;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_urls_trigger ON products_repository;
CREATE TRIGGER validate_product_urls_trigger
  BEFORE INSERT OR UPDATE ON products_repository
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_urls();

-- Validação de estoque
CREATE OR REPLACE FUNCTION validate_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stock_managed = true AND NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Quantidade em estoque não pode ser negativa quando gerenciado';
  END IF;
  
  IF NEW.min_order_quantity IS NOT NULL AND NEW.max_order_quantity IS NOT NULL THEN
    IF NEW.min_order_quantity > NEW.max_order_quantity THEN
      RAISE EXCEPTION 'Quantidade mínima não pode ser maior que quantidade máxima';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_stock_trigger ON products_repository;
CREATE TRIGGER validate_product_stock_trigger
  BEFORE INSERT OR UPDATE ON products_repository
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_stock();