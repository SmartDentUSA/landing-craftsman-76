-- Atualizar smartdent.com.br: publish_method "ftp" → "git"
-- KingHost webhook detecta push na branch stable-website e deploya para smartdent.com.br

UPDATE company_profile
SET seo_domains = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'domain' = 'smartdent.com.br'
      THEN elem || '{"publish_method": "git"}'::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(seo_domains) AS elem
),
updated_at = now()
WHERE seo_domains IS NOT NULL
  AND seo_domains::text LIKE '%smartdent.com.br%';
