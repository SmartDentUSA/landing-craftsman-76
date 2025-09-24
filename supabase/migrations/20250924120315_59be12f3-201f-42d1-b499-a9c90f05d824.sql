-- Criar tabela para configurações de categorias
CREATE TABLE public.categories_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  target_audience JSONB DEFAULT '[]'::jsonb,
  keywords JSONB DEFAULT '[]'::jsonb,
  market_keywords JSONB DEFAULT '[]'::jsonb,
  search_intent_keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, subcategory)
);

-- Enable Row Level Security
ALTER TABLE public.categories_config ENABLE ROW LEVEL SECURITY;

-- Create policies for category config
CREATE POLICY "Anyone can view categories_config" 
ON public.categories_config 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage categories_config" 
ON public.categories_config 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_categories_config_updated_at
BEFORE UPDATE ON public.categories_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_categories_config_category_subcategory ON public.categories_config(category, subcategory);