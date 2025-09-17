-- Add intelligent_links field to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN intelligent_links jsonb DEFAULT '{}'::jsonb;