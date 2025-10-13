-- ✅ FASE 1: RASTREAMENTO GRANULAR + DOMÍNIOS SEO MULTI-SITE

-- Adicionar configuração granular de pixels (opt-in, sem valores padrão forçados)
ALTER TABLE public.company_profile
ADD COLUMN IF NOT EXISTS tracking_pixels jsonb DEFAULT '{
  "meta_pixel": {
    "enabled": false,
    "pixel_id": null,
    "note": "Meta Pixel global para todos os domínios"
  },
  "google_analytics": {
    "enabled": false,
    "measurement_id": null,
    "note": "Google Analytics 4 (pode ser gerenciado via GTM)"
  },
  "google_tag_manager": {
    "enabled": false,
    "container_id": null,
    "note": "GTM - Única fonte de tags recomendada"
  },
  "tiktok_pixel": {
    "enabled": false,
    "pixel_id": null,
    "note": "TikTok Pixel para remarketing"
  }
}'::jsonb;

-- Adicionar domínios SEO com toggles granulares
ALTER TABLE public.company_profile
ADD COLUMN IF NOT EXISTS seo_domains jsonb DEFAULT '[]'::jsonb;

-- Comentários explicativos
COMMENT ON COLUMN public.company_profile.tracking_pixels IS 'Pixels globais opt-in. Se enabled=false OU pixel_id=null, HTML puro.';
COMMENT ON COLUMN public.company_profile.seo_domains IS 'Domínios SEO multi-site com toggles: enabled, use_in_seo, use_in_schema, use_in_footer, priority';

-- ✅ ESTRUTURA ESPERADA EM seo_domains:
-- [
--   {
--     "name": "Smart Dent - Site Oficial",
--     "domain": "smartdent.com.br",
--     "description": "Institucional - Autoridade de marca",
--     "enabled": true,
--     "use_in_seo": true,        -- Gera <link rel="alternate">
--     "use_in_schema": true,      -- Inclui no Schema.org como sameAs
--     "use_in_footer": true,      -- Aparece no rodapé de links
--     "priority": 1               -- Ordem de exibição (1 = mais importante)
--   }
-- ]