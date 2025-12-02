-- ============================================================================
-- SMART DENT — CLINICAL BRAIN v1.0
-- FASE 2 — MIGRAÇÃO SQL: Campos Anti-Alucinação e Compatibilidade Clínica
-- Data: 2025-12-02
-- ============================================================================

ALTER TABLE products_repository 
ADD COLUMN IF NOT EXISTS forbidden_products jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS required_products jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS anti_hallucination_rules jsonb DEFAULT '{
  "never_claim": [],
  "never_mix_with": [],
  "never_use_in_stages": [],
  "always_require": [],
  "always_explain": []
}'::jsonb,
ADD COLUMN IF NOT EXISTS product_type text DEFAULT NULL;

-- ============================================================================
-- DOCUMENTAÇÃO DOS CAMPOS (para Supabase Studio)
-- ============================================================================

COMMENT ON COLUMN products_repository.forbidden_products 
IS 'Clinical Brain: Produtos que NUNCA podem ser combinados com este produto.';

COMMENT ON COLUMN products_repository.required_products 
IS 'Clinical Brain: Produtos ou materiais obrigatórios para o uso correto.';

COMMENT ON COLUMN products_repository.anti_hallucination_rules 
IS 'Clinical Brain: Regras anti-alucinação (never_claim, never_mix_with, never_use_in_stages, always_require, always_explain).';

COMMENT ON COLUMN products_repository.product_type 
IS 'Clinical Brain: Tipo de produto (resina_rigida, resina_flexivel, scanner, impressora, software, acessorio, cimento, cabine_uv).';