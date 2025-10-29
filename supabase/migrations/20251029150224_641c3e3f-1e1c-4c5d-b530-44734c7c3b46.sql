-- Adicionar campos para landing pages geradas no SPIN Selling
ALTER TABLE spin_selling_solutions
ADD COLUMN IF NOT EXISTS landing_page_html TEXT,
ADD COLUMN IF NOT EXISTS landing_page_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_generated_images JSONB DEFAULT '{}'::jsonb;