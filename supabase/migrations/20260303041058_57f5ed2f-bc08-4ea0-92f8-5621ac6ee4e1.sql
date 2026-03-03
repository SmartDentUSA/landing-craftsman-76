
-- =============================================
-- MEMÓRIA LONGITUDINAL REAL — Dra. L.I.A.
-- 4 tabelas: lia_leads, lia_conversations, lia_messages, lia_lead_events
-- =============================================

-- 1. lia_leads — Identidade unificada do lead
CREATE TABLE public.lia_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  phone TEXT,
  email TEXT,
  name TEXT,
  company_name TEXT,
  role TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_conversations INTEGER NOT NULL DEFAULT 0,
  lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  tags JSONB DEFAULT '[]'::jsonb,
  profile_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lia_leads"
  ON public.lia_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lia_leads_phone ON public.lia_leads(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_lia_leads_email ON public.lia_leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_lia_leads_external_id ON public.lia_leads(external_id) WHERE external_id IS NOT NULL;

CREATE TRIGGER update_lia_leads_updated_at
  BEFORE UPDATE ON public.lia_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. lia_conversations — Sessões com estado
CREATE TABLE public.lia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lia_leads(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  current_state TEXT NOT NULL DEFAULT 'greeting',
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  outcome TEXT,
  cognitive_analysis JSONB,
  channel TEXT DEFAULT 'web',
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lia_conversations"
  ON public.lia_conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lia_conversations_lead_started ON public.lia_conversations(lead_id, started_at DESC);
CREATE INDEX idx_lia_conversations_active ON public.lia_conversations(lead_id) 
  WHERE ended_at IS NULL;

CREATE TRIGGER update_lia_conversations_updated_at
  BEFORE UPDATE ON public.lia_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. lia_messages — Cada mensagem persistida
CREATE TABLE public.lia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.lia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  chunks_used JSONB,
  quality_score DECIMAL(3,2),
  hallucination_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lia_messages"
  ON public.lia_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lia_messages_conversation ON public.lia_messages(conversation_id, created_at);

-- 4. lia_lead_events — Timeline longitudinal
CREATE TABLE public.lia_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.lia_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'lia_chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lia_lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lia_lead_events"
  ON public.lia_lead_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lia_lead_events_lead_time ON public.lia_lead_events(lead_id, created_at DESC);
CREATE INDEX idx_lia_lead_events_type ON public.lia_lead_events(event_type);

-- 5. Auto-close stale conversations (updated_at > 2h)
CREATE OR REPLACE FUNCTION public.auto_close_stale_lia_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE lia_conversations
  SET ended_at = updated_at + interval '2 hours',
      outcome = 'timeout'
  WHERE ended_at IS NULL
    AND updated_at < now() - interval '2 hours';
END;
$$;
