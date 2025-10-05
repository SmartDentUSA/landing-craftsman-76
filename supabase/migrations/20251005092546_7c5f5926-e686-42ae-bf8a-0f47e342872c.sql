-- Add tutorial_resources column to products_repository
ALTER TABLE products_repository
ADD COLUMN IF NOT EXISTS tutorial_resources jsonb
DEFAULT '{"tutorials": []}'::jsonb;

COMMENT ON COLUMN products_repository.tutorial_resources IS 
'Tutoriais do produto: [{ id, course_name, course_url, created_at }]';