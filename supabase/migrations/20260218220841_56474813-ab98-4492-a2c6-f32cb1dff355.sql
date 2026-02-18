-- Habilitar extensão pg_net se ainda não estiver (necessária para net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
