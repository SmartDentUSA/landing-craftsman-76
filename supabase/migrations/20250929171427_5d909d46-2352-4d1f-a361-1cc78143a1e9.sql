-- Clean up legacy external_links data
-- Update links with product URLs to use real categories from products_repository
UPDATE external_links 
SET 
  category = pr.category,
  subcategory = pr.subcategory,
  updated_at = now()
FROM products_repository pr
WHERE external_links.url ~ '^/produto/[0-9a-f-]{36}$' 
  AND pr.id = substring(external_links.url from '/produto/([0-9a-f-]{36})$')::uuid
  AND external_links.category LIKE 'keyword%';

-- Update links whose description follows pattern "Keyword do produto: ... (Category • Subcategory)"
UPDATE external_links
SET 
  category = CASE 
    WHEN description ~ '\\([^)]+\\)$' THEN
      split_part(substring(description from '\\(([^)]+)\\)$'), ' • ', 1)
    ELSE category
  END,
  subcategory = CASE 
    WHEN description ~ '\\([^)]+\\)$' AND position(' • ' in substring(description from '\\(([^)]+)\\)$')) > 0 THEN
      split_part(substring(description from '\\(([^)]+)\\)$'), ' • ', 2)
    ELSE subcategory
  END,
  updated_at = now()
WHERE category LIKE 'keyword%' 
  AND description ~ 'Keyword do produto:.*\\([^)]+\\)$';