-- ═══════════════════════════════════════════════════════════
-- KNOWLEDGE BRAIN: 5 TABLES FOR CONTENT PIPELINE
-- ═══════════════════════════════════════════════════════════

-- 1. CONTENT SUBMISSIONS (Versioned Content Inbox)
CREATE TABLE public.content_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT NOT NULL,
  raw_content TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  origin JSONB DEFAULT '{}',
  extracted_entities JSONB,
  related_products TEXT[],
  processing_status TEXT DEFAULT 'pending',
  editorial_status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  parent_submission_id UUID REFERENCES public.content_submissions(id),
  processing_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_submissions_status ON public.content_submissions(processing_status);
CREATE INDEX idx_content_submissions_editorial ON public.content_submissions(editorial_status);
CREATE INDEX idx_content_submissions_parent ON public.content_submissions(parent_submission_id);
CREATE INDEX idx_content_submissions_source ON public.content_submissions(source_system);
CREATE INDEX idx_content_submissions_type ON public.content_submissions(content_type);

ALTER TABLE public.content_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on content_submissions" ON public.content_submissions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. CONTENT JOBS (Job Queue for Async Processing)
CREATE TABLE public.content_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.content_submissions(id),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  priority INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_jobs_status ON public.content_jobs(status);
CREATE INDEX idx_content_jobs_priority ON public.content_jobs(priority DESC, scheduled_at ASC);
CREATE INDEX idx_content_jobs_submission ON public.content_jobs(submission_id);

ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on content_jobs" ON public.content_jobs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. GENERATED PAGES (Final SEO Pages)
CREATE TABLE public.generated_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  path TEXT,
  html_content TEXT,
  structured_content JSONB,
  entities JSONB,
  knowledge_graph_snapshot JSONB,
  schema_json_ld TEXT,
  tags TEXT[],
  page_type TEXT,
  source_submission_id UUID REFERENCES public.content_submissions(id),
  content_hash TEXT,
  embedding vector(768),
  seo_score INTEGER,
  published BOOLEAN DEFAULT false,
  published_url TEXT,
  published_at TIMESTAMPTZ,
  regeneration_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_generated_page_slug UNIQUE(slug)
);

CREATE INDEX idx_generated_pages_hash ON public.generated_pages(content_hash);
CREATE INDEX idx_generated_pages_embedding ON public.generated_pages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_generated_pages_published ON public.generated_pages(published);
CREATE INDEX idx_generated_pages_type ON public.generated_pages(page_type);
CREATE INDEX idx_generated_pages_path ON public.generated_pages(path);

ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on generated_pages" ON public.generated_pages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read published pages" ON public.generated_pages FOR SELECT USING (published = true);

-- 4. PAGE PUBLICATIONS (Publication History for Rollback)
CREATE TABLE public.page_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  html_snapshot TEXT,
  published_url TEXT,
  published_domain TEXT,
  published_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_page_publications_page ON public.page_publications(page_id);
CREATE INDEX idx_page_publications_version ON public.page_publications(page_id, version DESC);

ALTER TABLE public.page_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on page_publications" ON public.page_publications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. CONTENT ENTITY LINKS (Normalized Entity Relationships)
CREATE TABLE public.content_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  relevance_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_content_entity_links_page ON public.content_entity_links(page_id);
CREATE INDEX idx_content_entity_links_entity ON public.content_entity_links(entity_type, entity_id);
CREATE INDEX idx_content_entity_links_score ON public.content_entity_links(relevance_score DESC);

ALTER TABLE public.content_entity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on content_entity_links" ON public.content_entity_links FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TRIGGERS FOR updated_at
CREATE TRIGGER update_content_submissions_updated_at
  BEFORE UPDATE ON public.content_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_pages_updated_at
  BEFORE UPDATE ON public.generated_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();