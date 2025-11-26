-- Create table to store NPS-generated content suggestions
CREATE TABLE IF NOT EXISTS public.nps_generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('landing-pages', 'blog-topics', 'product-mapping', 'faqs')),
  generated_data JSONB NOT NULL DEFAULT '{}',
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_nps_content_user_id ON public.nps_generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_content_action_type ON public.nps_generated_content(action_type);
CREATE INDEX IF NOT EXISTS idx_nps_content_created_at ON public.nps_generated_content(created_at DESC);

-- Enable RLS
ALTER TABLE public.nps_generated_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own nps_generated_content"
  ON public.nps_generated_content
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nps_generated_content"
  ON public.nps_generated_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nps_generated_content"
  ON public.nps_generated_content
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own nps_generated_content"
  ON public.nps_generated_content
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage all nps_generated_content"
  ON public.nps_generated_content
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_nps_generated_content_updated_at
  BEFORE UPDATE ON public.nps_generated_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();