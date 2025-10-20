-- ETAPA 1: Backup e limpeza de links inválidos
CREATE TABLE IF NOT EXISTS external_links_backup_20250120 AS 
SELECT * FROM external_links WHERE url = '#' OR url IS NULL OR url = '';

DELETE FROM external_links 
WHERE url = '#' OR url IS NULL OR url = '';

-- ETAPA 3: Adicionar constraint UNIQUE para evitar duplicatas
ALTER TABLE external_links 
ADD CONSTRAINT external_links_name_unique 
UNIQUE (name);

CREATE INDEX IF NOT EXISTS idx_external_links_name_lower 
ON external_links (LOWER(name));