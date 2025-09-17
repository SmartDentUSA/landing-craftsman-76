-- Add the missing include_offers column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN include_offers BOOLEAN DEFAULT false;