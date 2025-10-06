-- ============================================
-- Migration: Add company_reviews to company_profile
-- Date: 2025-01-06
-- Description: Adiciona suporte a reviews globais da empresa
-- ============================================

-- Adicionar coluna company_reviews (JSONB)
ALTER TABLE company_profile 
ADD COLUMN IF NOT EXISTS company_reviews jsonb DEFAULT '{
  "manual_reviews": [],
  "google_reviews_imported": false,
  "google_place_id": null,
  "last_google_sync": null
}'::jsonb;

-- Criar índice GIN para queries eficientes em JSONB
CREATE INDEX IF NOT EXISTS idx_company_reviews_gin 
ON company_profile USING gin(company_reviews);

-- ============================================
-- Rollback (comentado para referência)
-- ============================================
-- Para reverter esta migração, execute:
-- DROP INDEX IF EXISTS idx_company_reviews_gin;
-- ALTER TABLE company_profile DROP COLUMN IF EXISTS company_reviews;