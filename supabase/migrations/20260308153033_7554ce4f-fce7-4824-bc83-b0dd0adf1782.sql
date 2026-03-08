-- Performance indexes for content_jobs worker queries
CREATE INDEX IF NOT EXISTS idx_content_jobs_locked 
ON content_jobs(status, locked_at) 
WHERE locked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_jobs_pending
ON content_jobs(status, priority, scheduled_at)
WHERE status = 'pending';

-- Pipeline audit logs table for 16-step Knowledge Brain pipeline tracking
CREATE TABLE IF NOT EXISTS pipeline_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES content_submissions(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  input_summary jsonb DEFAULT '{}',
  output_summary jsonb DEFAULT '{}',
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pipeline_audit_submission 
ON pipeline_audit_logs(submission_id, step_number);

CREATE INDEX idx_pipeline_audit_status
ON pipeline_audit_logs(status, created_at);

-- RLS
ALTER TABLE pipeline_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read pipeline logs"
ON pipeline_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insert pipeline logs"
ON pipeline_audit_logs FOR INSERT
TO service_role
WITH CHECK (true);