-- Add subcategory column to external_links table
ALTER TABLE public.external_links 
ADD COLUMN subcategory text DEFAULT NULL;

-- Add index for better performance on category and subcategory searches
CREATE INDEX idx_external_links_category_subcategory ON public.external_links(category, subcategory);

-- Update existing records to have default subcategories based on category
UPDATE public.external_links 
SET subcategory = CASE 
  WHEN category = 'produto' THEN 'geral'
  WHEN category = 'servico' THEN 'geral'
  WHEN category = 'tecnico' THEN 'geral'
  ELSE 'outros'
END
WHERE subcategory IS NULL;