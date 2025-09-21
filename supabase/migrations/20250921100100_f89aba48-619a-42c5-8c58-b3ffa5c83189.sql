-- Update existing blog posts to published status for approved landing pages
UPDATE blog_posts 
SET status = 'published', 
    published_at = CASE 
        WHEN published_at IS NULL THEN now() 
        ELSE published_at 
    END,
    updated_at = now()
WHERE status = 'draft' 
  AND landing_page_id IS NOT NULL;