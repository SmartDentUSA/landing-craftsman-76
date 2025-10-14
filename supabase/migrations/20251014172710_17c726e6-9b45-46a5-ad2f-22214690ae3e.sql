-- Add caption_data field to video_testimonials table
ALTER TABLE video_testimonials
ADD COLUMN IF NOT EXISTS caption_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN video_testimonials.caption_data IS 'Stores extracted captions and AI analysis for video testimonials';

-- Add caption_data field to company_profile for company videos
-- Update company_videos structure to support captions
COMMENT ON COLUMN company_profile.company_videos IS 'Company videos organized by type with captions support: {youtube_videos: [], instagram_videos: [], testimonial_videos: [], technical_videos: [], captions: {youtube_videos: [], instagram_videos: [], testimonial_videos: [], technical_videos: []}}';
