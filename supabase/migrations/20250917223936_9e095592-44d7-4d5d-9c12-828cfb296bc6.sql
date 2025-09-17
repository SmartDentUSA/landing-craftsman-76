-- Create products repository table to centralize all product data
CREATE TABLE public.products_repository (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic product information
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  
  -- URLs and media
  product_url TEXT,
  image_url TEXT,
  youtube_url TEXT,
  
  -- Product categorization
  category TEXT,
  subcategory TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- SEO and marketing data
  keywords JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  
  -- AI enrichment fields
  ai_generated_category BOOLEAN DEFAULT false,
  ai_generated_keywords BOOLEAN DEFAULT false,
  ai_generated_benefits BOOLEAN DEFAULT false,
  
  -- Source tracking
  source_type TEXT NOT NULL, -- 'csv_upload', 'loja_integrada', 'manual'
  source_landing_page_id TEXT,
  original_data JSONB,
  
  -- Status and metadata
  approved BOOLEAN DEFAULT true,
  display_order INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products_repository ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved products" 
ON public.products_repository 
FOR SELECT 
USING (approved = true);

CREATE POLICY "Only admins can manage products" 
ON public.products_repository 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_products_repository_category ON public.products_repository(category);
CREATE INDEX idx_products_repository_source_landing_page ON public.products_repository(source_landing_page_id);
CREATE INDEX idx_products_repository_approved ON public.products_repository(approved);
CREATE INDEX idx_products_repository_tags ON public.products_repository USING GIN(tags);
CREATE INDEX idx_products_repository_keywords ON public.products_repository USING GIN(keywords);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_products_repository_updated_at
BEFORE UPDATE ON public.products_repository
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();