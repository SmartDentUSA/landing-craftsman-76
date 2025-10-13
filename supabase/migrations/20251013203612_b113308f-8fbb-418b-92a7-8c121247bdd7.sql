-- ==========================================
-- PRÉ-MIGRAÇÃO: Limpeza de Duplicatas
-- ==========================================

-- 1. Criar backup ANTES de remover duplicatas
CREATE TABLE IF NOT EXISTS external_links_backup_20251013 AS 
SELECT * FROM external_links;

-- 2. Log de duplicatas encontradas
INSERT INTO system_monitoring (event_type, component_name, event_data, severity, tags)
VALUES (
  'keyword_duplicates_cleanup',
  'external_links',
  jsonb_build_object(
    'timestamp', now(),
    'duplicates', (
      SELECT jsonb_agg(jsonb_build_object('keyword', keyword, 'count', cnt))
      FROM (
        SELECT LOWER(TRIM(name)) as keyword, COUNT(*) as cnt
        FROM external_links
        GROUP BY LOWER(TRIM(name))
        HAVING COUNT(*) > 1
      ) dups
    )
  ),
  'warning',
  '["migration", "cleanup", "duplicates"]'::jsonb
);

-- 3. Remover duplicatas mantendo a mais antiga E aprovada
-- Lógica: Para cada grupo de duplicatas, manter:
-- - Se existe uma aprovada: manter a aprovada mais antiga
-- - Se nenhuma aprovada: manter a mais antiga
WITH duplicates AS (
  SELECT 
    id,
    name,
    LOWER(TRIM(name)) as normalized_name,
    approved,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(name)) 
      ORDER BY approved DESC, created_at ASC
    ) as rn
  FROM external_links
),
to_delete AS (
  SELECT id, name 
  FROM duplicates 
  WHERE rn > 1
)
DELETE FROM external_links
WHERE id IN (SELECT id FROM to_delete);

-- 4. Log pós-limpeza
INSERT INTO system_monitoring (event_type, component_name, event_data, severity, tags)
VALUES (
  'keyword_duplicates_cleaned',
  'external_links',
  jsonb_build_object(
    'timestamp', now(),
    'removed_count', (
      SELECT COUNT(*) FROM external_links_backup_20251013
    ) - (SELECT COUNT(*) FROM external_links),
    'remaining_keywords', (SELECT COUNT(*) FROM external_links)
  ),
  'info',
  '["migration", "cleanup", "success"]'::jsonb
);