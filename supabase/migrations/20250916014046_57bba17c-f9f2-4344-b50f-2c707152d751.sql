-- Create table for manual reviews
CREATE TABLE IF NOT EXISTS public.manual_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.manual_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for manual reviews
CREATE POLICY "Allow all operations on manual_reviews" 
ON public.manual_reviews 
FOR ALL 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manual_reviews_updated_at
BEFORE UPDATE ON public.manual_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();