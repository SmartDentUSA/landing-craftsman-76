-- Create company_profile table for storing company information to enhance AI context
CREATE TABLE public.company_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  company_description TEXT,
  business_sector TEXT,
  target_audience TEXT,
  main_products_services TEXT,
  brand_values TEXT,
  mission_statement TEXT,
  vision_statement TEXT,
  company_culture TEXT,
  working_methodology TEXT,
  delivery_approach TEXT,
  differentiators TEXT,
  company_logo_url TEXT,
  website_url TEXT,
  founded_year INTEGER,
  team_size TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  social_media_links JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;

-- Create policies for company_profile
CREATE POLICY "Only admins can manage company_profile" 
ON public.company_profile 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_company_profile_updated_at
BEFORE UPDATE ON public.company_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add use_in_ai_generation column to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN use_in_ai_generation BOOLEAN DEFAULT true;