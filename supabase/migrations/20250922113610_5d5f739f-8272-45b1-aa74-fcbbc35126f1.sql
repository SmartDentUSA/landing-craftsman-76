-- Migrate target_audience from text to jsonb array
-- First, create a temporary column to store the converted data
ALTER TABLE public.products_repository 
ADD COLUMN target_audience_new jsonb DEFAULT '[]'::jsonb;

-- Convert existing text values to jsonb arrays
UPDATE public.products_repository 
SET target_audience_new = 
  CASE 
    WHEN target_audience IS NOT NULL AND trim(target_audience) != '' 
    THEN jsonb_build_array(trim(target_audience))
    ELSE '[]'::jsonb
  END;

-- Drop the old column and rename the new one
ALTER TABLE public.products_repository DROP COLUMN target_audience;
ALTER TABLE public.products_repository RENAME COLUMN target_audience_new TO target_audience;