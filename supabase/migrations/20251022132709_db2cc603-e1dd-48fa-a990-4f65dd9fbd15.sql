-- Adicionar campos estruturados de endereço ao perfil da empresa
ALTER TABLE company_profile
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN company_profile.country IS 'País da empresa (padrão: Brasil)';
COMMENT ON COLUMN company_profile.state IS 'Estado/UF da empresa (ex: SP, RJ, MG)';
COMMENT ON COLUMN company_profile.city IS 'Cidade da empresa';
COMMENT ON COLUMN company_profile.street_address IS 'Endereço (rua, avenida, etc)';
COMMENT ON COLUMN company_profile.address_number IS 'Número do endereço';
COMMENT ON COLUMN company_profile.postal_code IS 'CEP (formato: 00000-000)';
COMMENT ON COLUMN company_profile.location IS 'DEPRECATED: Auto-gerado a partir dos campos estruturados. Mantido para retrocompatibilidade.';

-- Função para sincronizar location automaticamente
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
$$ LANGUAGE plpgsql;

-- Trigger para executar antes de INSERT ou UPDATE
DROP TRIGGER IF EXISTS update_company_location ON company_profile;
CREATE TRIGGER update_company_location
  BEFORE INSERT OR UPDATE ON company_profile
  FOR EACH ROW
  EXECUTE FUNCTION sync_company_location();