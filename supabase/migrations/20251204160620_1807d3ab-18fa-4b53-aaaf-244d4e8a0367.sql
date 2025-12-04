-- Corrigir os 7 project names incorretos no seo_domains
UPDATE company_profile 
SET seo_domains = (
  SELECT jsonb_agg(
    CASE 
      WHEN elem->>'domain' = 'rayshape.com.br' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"rayshapecom"')
      WHEN elem->>'domain' = 'mediti900.com' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"mediti900com"')
      WHEN elem->>'domain' = 'mediti600.com.br' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"mediti600combr"')
      WHEN elem->>'domain' = 'eodonto.com' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"eodontocom"')
      WHEN elem->>'domain' = 'dentala.com.br' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"dentalacombr"')
      WHEN elem->>'domain' = 'labtechdent.com.br' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"labtechdentcombr"')
      WHEN elem->>'domain' = 'printsafebr.com.br' THEN 
        jsonb_set(elem, '{cloudflare_project_name}', '"printsafebrcombr"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(seo_domains) AS elem
)
WHERE seo_domains IS NOT NULL;