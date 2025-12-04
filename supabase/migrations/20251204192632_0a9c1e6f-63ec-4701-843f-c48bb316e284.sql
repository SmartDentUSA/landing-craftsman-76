-- Create table for product blog publications
CREATE TABLE public.product_blog_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products_repository(id) ON DELETE CASCADE,
  blog_type TEXT NOT NULL CHECK (blog_type IN ('commercial', 'technical')),
  target_domain TEXT NOT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  html_content TEXT,
  publish_status TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'pending', 'published', 'error')),
  published_url TEXT,
  cloudflare_deployment_id TEXT,
  publish_error_message TEXT,
  seo_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(product_id, blog_type, target_domain)
);

-- Enable RLS
ALTER TABLE public.product_blog_publications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage product_blog_publications"
ON public.product_blog_publications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view published blogs"
ON public.product_blog_publications
FOR SELECT
USING (auth.uid() IS NOT NULL AND publish_status = 'published');

-- Indexes
CREATE INDEX idx_product_blog_publications_product_id ON public.product_blog_publications(product_id);
CREATE INDEX idx_product_blog_publications_status ON public.product_blog_publications(publish_status);
CREATE INDEX idx_product_blog_publications_domain ON public.product_blog_publications(target_domain);

-- Trigger for updated_at
CREATE TRIGGER update_product_blog_publications_updated_at
BEFORE UPDATE ON public.product_blog_publications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();