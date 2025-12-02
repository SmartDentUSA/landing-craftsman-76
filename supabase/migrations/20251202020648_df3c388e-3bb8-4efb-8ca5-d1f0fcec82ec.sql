-- Adicionar campo navigation_footer_config na tabela company_profile
ALTER TABLE public.company_profile
ADD COLUMN IF NOT EXISTS navigation_footer_config JSONB DEFAULT '{
  "navigation_menu": [],
  "footer": {
    "title": "",
    "locations": [],
    "links": [],
    "social_links": []
  }
}'::jsonb;