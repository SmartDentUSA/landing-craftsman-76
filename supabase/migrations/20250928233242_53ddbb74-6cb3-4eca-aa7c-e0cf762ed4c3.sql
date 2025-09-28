-- Add institutional_links field to company_profile table
ALTER TABLE public.company_profile 
ADD COLUMN institutional_links jsonb DEFAULT '[]'::jsonb;