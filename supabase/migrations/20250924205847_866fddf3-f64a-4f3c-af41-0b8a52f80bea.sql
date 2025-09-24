-- Rename seo_hidden_content to contextual_seo_info in approved_reviews table
ALTER TABLE public.approved_reviews 
RENAME COLUMN seo_hidden_content TO contextual_seo_info;

-- Add comment to clarify the purpose of this field
COMMENT ON COLUMN public.approved_reviews.contextual_seo_info IS 'Informações contextuais de SEO incorporadas no HTML para mecanismos de busca';