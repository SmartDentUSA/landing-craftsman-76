-- ========================================
-- FASE 0: LIMPEZA CRÍTICA DO company_profile
-- ========================================

-- 1. Criar backup de segurança
CREATE TABLE IF NOT EXISTS backup_company_profile_20250114 AS
SELECT * FROM company_profile;

-- 2. Deletar registro antigo (duplicata de 2025-09-17)
DELETE FROM company_profile
WHERE id = '58b83021-41dc-439f-9c70-69df762206df';

-- 3. Verificação de integridade
-- Apenas 1 registro deve permanecer (Smart Dent completo de 2025-10-07)
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM company_profile;
  
  IF record_count != 1 THEN
    RAISE EXCEPTION 'ERRO: Esperado 1 registro em company_profile, mas encontrado %', record_count;
  END IF;
  
  RAISE NOTICE 'Limpeza concluída: 1 registro remanescente em company_profile';
END $$;