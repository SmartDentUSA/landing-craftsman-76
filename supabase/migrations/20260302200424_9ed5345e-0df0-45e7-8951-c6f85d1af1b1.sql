
CREATE TABLE ai_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_function_id text NOT NULL,
  action_name text NOT NULL,
  model text DEFAULT 'google/gemini-2.5-flash',
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  cost_brl numeric DEFAULT 0,
  product_name text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_token_usage" ON ai_token_usage FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view ai_token_usage" ON ai_token_usage FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_ai_token_usage_created ON ai_token_usage(created_at);
CREATE INDEX idx_ai_token_usage_function ON ai_token_usage(edge_function_id);
