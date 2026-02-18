-- Agendar importação automática mensal de KOLs do Sistema B
-- Executa no 1º dia de cada mês às 03:00 UTC
SELECT cron.schedule(
  'import-systemb-authors-monthly',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/import-systemb-authors',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmdyaXB1YW51d3dvbG10a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDkxNzMsImV4cCI6MjA3MTcyNTE3M30.ibYoIlzxAFoXjFCAy7WrKKixiDcG318dxEm8gqGKOjk"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);