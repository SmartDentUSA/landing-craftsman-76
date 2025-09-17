-- Create video_testimonials table for storing YouTube and Instagram testimonials
CREATE TABLE public.video_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  profession TEXT,
  location TEXT,
  state TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  testimonial_text TEXT NOT NULL,
  specialty TEXT, -- implantodontia, ortodontia, etc.
  ai_keywords JSONB DEFAULT '[]'::jsonb,
  ai_extracted_benefits JSONB DEFAULT '[]'::jsonb,
  sentiment_score DECIMAL(3,2), -- 0.00 to 1.00
  approved BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_testimonials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved video_testimonials" 
ON public.video_testimonials 
FOR SELECT 
USING (approved = true);

CREATE POLICY "Only admins can insert video_testimonials" 
ON public.video_testimonials 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update video_testimonials" 
ON public.video_testimonials 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete video_testimonials" 
ON public.video_testimonials 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_testimonials_updated_at
BEFORE UPDATE ON public.video_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_video_testimonials_landing_page_id ON public.video_testimonials(landing_page_id);
CREATE INDEX idx_video_testimonials_location ON public.video_testimonials(location);
CREATE INDEX idx_video_testimonials_specialty ON public.video_testimonials(specialty);
CREATE INDEX idx_video_testimonials_approved ON public.video_testimonials(approved);

-- Insert sample testimonial (Dra. Paloma from the example)
INSERT INTO public.video_testimonials (
  landing_page_id,
  client_name,
  profession,
  location,
  state,
  youtube_url,
  instagram_url,
  testimonial_text,
  specialty,
  ai_keywords,
  ai_extracted_benefits,
  sentiment_score,
  approved,
  display_order
) VALUES (
  'smartdent-bahia',
  'Dra. Paloma Fagundes',
  'Implantodontista',
  'Bahia',
  'BA',
  'https://www.youtube.com/shorts/E2k_HUHBXnE',
  'https://www.instagram.com/reel/DIoFCUGMRqc/',
  'A implantodontista Paloma Fagundes conheceu a Smartdent pela internet e se surpreendeu com o suporte. Após participar da Imersão em São Carlos, adquiriu o scanner intraoral e destacou a entrega pontual, a assessoria impecável e a oportunidade de aprofundar-se cada vez mais no fluxo digital odontológico.',
  'implantodontia',
  '["scanner intraoral", "fluxo digital", "implantodontia", "suporte técnico", "entrega pontual", "assessoria", "smartdent", "bahia"]'::jsonb,
  '["suporte surpreendente", "entrega pontual", "assessoria impecável", "aprofundamento no fluxo digital"]'::jsonb,
  0.95,
  true,
  1
);