-- Create table for Google Ads campaign configurations
CREATE TABLE public.google_ads_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id text NOT NULL,
  config jsonb NOT NULL,
  last_exported timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.google_ads_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Only admins can manage google_ads_campaigns"
ON public.google_ads_campaigns
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_ads_campaigns_updated_at
BEFORE UPDATE ON public.google_ads_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();