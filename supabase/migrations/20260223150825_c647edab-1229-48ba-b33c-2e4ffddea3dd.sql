-- Create storage bucket for large landing page HTML files
INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-pages-html', 'landing-pages-html', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to manage files (edge functions use service role)
CREATE POLICY "Service role can manage landing page HTML"
ON storage.objects
FOR ALL
USING (bucket_id = 'landing-pages-html')
WITH CHECK (bucket_id = 'landing-pages-html');
