-- Create table for raw extracted reviews
CREATE TABLE public.raw_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_url TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_date TEXT,
  relative_time TEXT,
  profile_photo_url TEXT,
  response_from_owner TEXT,
  response_date TEXT,
  is_local_guide BOOLEAN DEFAULT false,
  review_likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for approved reviews per landing page
CREATE TABLE public.approved_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id TEXT NOT NULL,
  raw_review_id UUID NOT NULL REFERENCES public.raw_reviews(id) ON DELETE CASCADE,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for extraction jobs tracking
CREATE TABLE public.extraction_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id TEXT NOT NULL,
  google_maps_url TEXT NOT NULL,
  business_name TEXT,
  total_reviews_found INTEGER DEFAULT 0,
  reviews_extracted INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_raw_reviews_place_id ON public.raw_reviews(place_id);
CREATE INDEX idx_approved_reviews_landing_page ON public.approved_reviews(landing_page_id);
CREATE INDEX idx_extraction_jobs_place_id ON public.extraction_jobs(place_id);
CREATE INDEX idx_extraction_jobs_status ON public.extraction_jobs(status);

-- Enable Row Level Security (for future authentication if needed)
ALTER TABLE public.raw_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later)
CREATE POLICY "Allow all operations on raw_reviews" ON public.raw_reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on approved_reviews" ON public.approved_reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on extraction_jobs" ON public.extraction_jobs FOR ALL USING (true);