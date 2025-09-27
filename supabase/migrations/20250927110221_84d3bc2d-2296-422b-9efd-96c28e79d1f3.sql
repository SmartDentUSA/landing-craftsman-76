-- Create external_links table for centralized URL management
CREATE TABLE public.external_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'produto',
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_links ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved external_links" 
ON public.external_links 
FOR SELECT 
USING (approved = true);

CREATE POLICY "Only admins can manage external_links" 
ON public.external_links 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_external_links_updated_at
BEFORE UPDATE ON public.external_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();