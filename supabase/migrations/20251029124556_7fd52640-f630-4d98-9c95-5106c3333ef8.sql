-- ============================================
-- MIGRATION: SPIN Selling Solution - Campos Completos
-- ============================================

-- 1. REMOVER campos antigos (substituídos)
ALTER TABLE spin_selling_solutions 
  DROP COLUMN IF EXISTS case_study_name,
  DROP COLUMN IF EXISTS storytelling_hook,
  DROP COLUMN IF EXISTS google_ads_headline,
  DROP COLUMN IF EXISTS whatsapp_hook;

-- 2. MODIFICAR real_quotes (preservar dados existentes com conversão)
ALTER TABLE spin_selling_solutions 
  RENAME COLUMN real_quotes TO real_quotes_old;

ALTER TABLE spin_selling_solutions 
  ADD COLUMN real_quotes JSONB DEFAULT '[]'::jsonb;

-- Migrar dados antigos para novo formato
UPDATE spin_selling_solutions
SET real_quotes = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'client_name', COALESCE((quote->>'speaker')::text, 'Cliente'),
      'desire', COALESCE((quote->>'quote')::text, ''),
      'pain', '',
      'expected_result', ''
    )
  )
  FROM jsonb_array_elements(real_quotes_old) AS quote
)
WHERE real_quotes_old IS NOT NULL 
  AND jsonb_array_length(real_quotes_old) > 0;

ALTER TABLE spin_selling_solutions 
  DROP COLUMN real_quotes_old;

-- 3. ADICIONAR novos campos (array de cases + URL personalizada)
ALTER TABLE spin_selling_solutions
  ADD COLUMN success_cases JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN custom_url JSONB DEFAULT '{
    "url": "",
    "enabled": false,
    "label": "Saiba Mais"
  }'::jsonb;

-- 4. ADICIONAR campos gerados pela IA (APENAS quando o usuário clicar)
ALTER TABLE spin_selling_solutions
  ADD COLUMN google_ads_campaign JSONB DEFAULT NULL,
  ADD COLUMN whatsapp_complete_message TEXT DEFAULT NULL,
  ADD COLUMN storytelling_auto_generated TEXT DEFAULT NULL;

-- 5. COMENTÁRIOS explicativos
COMMENT ON COLUMN spin_selling_solutions.success_cases IS 
  'Array de casos reais (múltiplos): {client_name, specialty, area, city, state, instagram, clinic_name, usage_time, results_achieved}';

COMMENT ON COLUMN spin_selling_solutions.real_quotes IS 
  'Jornada SPIN do cliente: {client_name, desire (o que queria), pain (dor), expected_result (resultado esperado)}';

COMMENT ON COLUMN spin_selling_solutions.custom_url IS 
  'URL personalizada para campanhas: {url, enabled, label}';

COMMENT ON COLUMN spin_selling_solutions.google_ads_campaign IS 
  '⚡ Gerado APENAS ao clicar "Gerar Google Ads": {csv, config, keywords, warnings, generated_at}';

COMMENT ON COLUMN spin_selling_solutions.whatsapp_complete_message IS 
  '⚡ Gerado APENAS ao clicar "Gerar WhatsApp": mensagem copy-paste completa';

COMMENT ON COLUMN spin_selling_solutions.storytelling_auto_generated IS 
  '⚡ Gerado APENAS ao clicar "Gerar WhatsApp": storytelling automático usando sales_pitch dos produtos';

-- 6. CONSTRAINTS de validação
ALTER TABLE spin_selling_solutions
  ADD CONSTRAINT success_cases_is_array 
  CHECK (jsonb_typeof(success_cases) = 'array');

ALTER TABLE spin_selling_solutions
  ADD CONSTRAINT real_quotes_is_array 
  CHECK (jsonb_typeof(real_quotes) = 'array');

ALTER TABLE spin_selling_solutions
  ADD CONSTRAINT custom_url_is_object 
  CHECK (jsonb_typeof(custom_url) = 'object');

-- 7. INDEX para busca por produtos
CREATE INDEX IF NOT EXISTS idx_spin_solutions_product_ids 
  ON spin_selling_solutions USING GIN (product_ids);