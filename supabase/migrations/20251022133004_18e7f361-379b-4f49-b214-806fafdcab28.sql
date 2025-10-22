-- Corrigir search_path da função sync_company_location para segurança
CREATE OR REPLACE FUNCTION sync_company_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Gerar location automático concatenando os campos estruturados
  NEW.location := TRIM(CONCAT_WS(', ',
    NULLIF(TRIM(NEW.street_address), ''),
    NULLIF(TRIM(NEW.address_number), ''),
    NULLIF(TRIM(NEW.city), ''),
    NULLIF(TRIM(NEW.state), ''),
    NULLIF(TRIM(NEW.postal_code), ''),
    NULLIF(TRIM(NEW.country), '')
  ));
  
  -- Se location ficar vazio, usar fallback
  IF NEW.location = '' OR NEW.location IS NULL THEN
    NEW.location := 'Localização não informada';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER;