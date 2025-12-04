
-- Limpar duplicatas e corrigir domínios malformados no seo_domains
-- Mantém apenas a entrada com GTM configurado para cada domínio
-- Remove prefixo http:// dos domínios

UPDATE company_profile 
SET seo_domains = (
  SELECT jsonb_agg(fixed_elem ORDER BY (fixed_elem->>'domain'))
  FROM (
    SELECT DISTINCT ON (
      CASE 
        WHEN elem->>'domain' LIKE 'http://%' THEN replace(elem->>'domain', 'http://', '')
        ELSE elem->>'domain'
      END
    )
    CASE 
      WHEN elem->>'domain' LIKE 'http://%' THEN
        jsonb_set(elem, '{domain}', to_jsonb(replace(elem->>'domain', 'http://', '')))
      ELSE elem
    END AS fixed_elem
    FROM jsonb_array_elements(seo_domains) AS elem
    ORDER BY 
      CASE 
        WHEN elem->>'domain' LIKE 'http://%' THEN replace(elem->>'domain', 'http://', '')
        ELSE elem->>'domain'
      END,
      (elem->'tracking_pixels'->'google_tag_manager'->>'enabled')::boolean DESC NULLS LAST,
      (elem->>'cloudflare_status') = 'active' DESC
  ) subq
)
WHERE seo_domains IS NOT NULL;
