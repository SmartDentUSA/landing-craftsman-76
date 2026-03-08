-- ═══════════════════════════════════════════════════════════
-- FIX AUDIT: Add Missing Columns and Indexes
-- ═══════════════════════════════════════════════════════════

-- 1. content_submissions: Add processed_by and rejection_reason
ALTER TABLE content_submissions 
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. content_jobs: Add locked_by and locked_at for distributed locking
ALTER TABLE content_jobs
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Index for job locking queries
CREATE INDEX IF NOT EXISTS idx_content_jobs_locked 
ON content_jobs(locked_by, locked_at) 
WHERE locked_by IS NOT NULL;

-- 3. generated_pages: Add content_status and canonical_url (SEO critical)
ALTER TABLE generated_pages
ADD COLUMN IF NOT EXISTS content_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Index for tags (GIN for array search)
CREATE INDEX IF NOT EXISTS idx_generated_pages_tags 
ON generated_pages USING GIN(tags);

-- 4. content_entity_links: Add entity_slug
ALTER TABLE content_entity_links
ADD COLUMN IF NOT EXISTS entity_slug TEXT;

-- Index for entity_slug lookups
CREATE INDEX IF NOT EXISTS idx_content_entity_links_slug 
ON content_entity_links(entity_slug) 
WHERE entity_slug IS NOT NULL;