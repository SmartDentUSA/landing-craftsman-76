ALTER TABLE cloned_landing_pages ADD COLUMN source_landing_page_id text;

CREATE INDEX idx_cloned_lp_source ON cloned_landing_pages(source_landing_page_id) WHERE source_landing_page_id IS NOT NULL;