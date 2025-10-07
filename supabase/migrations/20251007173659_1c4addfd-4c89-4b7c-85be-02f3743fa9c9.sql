-- Configurar OAuth Client Configs para YouTube e Google Business
-- Inserir/atualizar credenciais OAuth para ambos os providers

-- YouTube Provider
INSERT INTO oauth_client_configs (
  provider, 
  client_id, 
  client_secret, 
  owner_user_id
)
SELECT
  'youtube',
  '754767751313-vgded23kc11a4u24hj5ss6gstfg8e5i7.apps.googleusercontent.com',
  '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',
  id
FROM auth.users 
WHERE email = 'danilohen@gmail.com'
ON CONFLICT (provider, owner_user_id) 
DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  client_secret = EXCLUDED.client_secret,
  updated_at = now();

-- Google Business Provider
INSERT INTO oauth_client_configs (
  provider, 
  client_id, 
  client_secret, 
  owner_user_id
)
SELECT
  'googleBusiness',
  '754767751313-vgded23kc11a4u24hj5ss6gstfg8e5i7.apps.googleusercontent.com',
  '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',
  id
FROM auth.users 
WHERE email = 'danilohen@gmail.com'
ON CONFLICT (provider, owner_user_id) 
DO UPDATE SET 
  client_id = EXCLUDED.client_id,
  client_secret = EXCLUDED.client_secret,
  updated_at = now();