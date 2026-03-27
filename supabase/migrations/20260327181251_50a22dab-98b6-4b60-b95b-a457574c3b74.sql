
-- ============================================
-- WIKIDATA WRITE-MODE HARDENED INFRASTRUCTURE
-- ============================================

-- 1. Entity Map (core persistence)
CREATE TABLE public.wikidata_entity_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'product')),
  internal_id TEXT NOT NULL,
  wikidata_qid TEXT CHECK (wikidata_qid IS NULL OR wikidata_qid ~ '^Q[0-9]+$'),
  payload_hash TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    sync_status IN ('pending', 'processing', 'synced', 'failed', 'collision', 'skipped')
  ),
  lock_version INTEGER NOT NULL DEFAULT 0,
  resolution_source TEXT CHECK (
    resolution_source IS NULL OR 
    resolution_source IN ('created', 'matched_existing', 'manual_link', 'merged')
  ),
  resolution_score NUMERIC,
  resolution_decision TEXT CHECK (
    resolution_decision IS NULL OR 
    resolution_decision IN ('link', 'create', 'collision', 'manual')
  ),
  collision_candidates JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entity_map_entity UNIQUE (entity_type, internal_id)
);

-- Idempotência forte (evita reprocessamento do mesmo hash)
CREATE UNIQUE INDEX uq_entity_map_hash
ON public.wikidata_entity_map(entity_type, internal_id, payload_hash)
WHERE payload_hash IS NOT NULL;

-- Processing protection (partial index)
CREATE INDEX idx_entity_map_processing
ON public.wikidata_entity_map(entity_type, internal_id)
WHERE sync_status = 'processing';

-- Lookup otimizado
CREATE INDEX idx_entity_map_lookup_hash
ON public.wikidata_entity_map(entity_type, internal_id, payload_hash);

-- Status index
CREATE INDEX idx_entity_map_status ON public.wikidata_entity_map(sync_status);

-- 2. Sync Logs (audit trail)
CREATE TABLE public.wikidata_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_map_id UUID REFERENCES public.wikidata_entity_map(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'product')),
  internal_id TEXT,
  wikidata_qid TEXT CHECK (wikidata_qid IS NULL OR wikidata_qid ~ '^Q[0-9]+$'),
  payload_hash TEXT,
  write_decision TEXT CHECK (
    write_decision IS NULL OR 
    write_decision IN ('create', 'update', 'skip', 'abort')
  ),
  success BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  error_context JSONB,
  semantic_grade TEXT CHECK (
    semantic_grade IS NULL OR semantic_grade IN ('A', 'B', 'C', 'D')
  ),
  semantic_score NUMERIC,
  duration_ms INTEGER,
  request_payload JSONB CHECK (
    request_payload IS NULL OR jsonb_typeof(request_payload) = 'object'
  ),
  response_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Performance index for log queries
CREATE INDEX idx_sync_logs_success_created ON public.wikidata_sync_logs(success, created_at DESC);
CREATE INDEX idx_sync_logs_entity ON public.wikidata_sync_logs(entity_type, internal_id);
CREATE INDEX idx_sync_logs_expires ON public.wikidata_sync_logs(expires_at) WHERE expires_at IS NOT NULL;

-- 3. System Flags (circuit breaker)
CREATE TABLE public.system_flags (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_system_flags_key ON public.system_flags(key);

-- Insert circuit breaker (disabled by default)
INSERT INTO public.system_flags (key, value)
VALUES ('WIKIDATA_WRITE_ENABLED', '{"enabled": false}'::jsonb);

-- 4. RLS
ALTER TABLE public.wikidata_entity_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wikidata_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

-- Entity Map: admin full, authenticated read
CREATE POLICY "Admin full access on entity_map"
ON public.wikidata_entity_map FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read entity_map"
ON public.wikidata_entity_map FOR SELECT TO authenticated
USING (true);

-- Sync Logs: admin full, authenticated read
CREATE POLICY "Admin full access on sync_logs"
ON public.wikidata_sync_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read sync_logs"
ON public.wikidata_sync_logs FOR SELECT TO authenticated
USING (true);

-- System Flags: admin manage, authenticated read
CREATE POLICY "Admin manage system_flags"
ON public.system_flags FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read system_flags"
ON public.system_flags FOR SELECT TO authenticated
USING (true);

-- 5. Updated_at trigger for entity_map
CREATE TRIGGER update_entity_map_updated_at
  BEFORE UPDATE ON public.wikidata_entity_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
