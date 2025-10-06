-- Criar tabela para credenciais OAuth do Google Business Profile
CREATE TABLE google_business_oauth_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE google_business_oauth_credentials ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem gerenciar suas próprias credenciais
CREATE POLICY "Users can manage own Google Business credentials"
  ON google_business_oauth_credentials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Admins podem visualizar todas as credenciais
CREATE POLICY "Admins can view all Google Business credentials"
  ON google_business_oauth_credentials
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));