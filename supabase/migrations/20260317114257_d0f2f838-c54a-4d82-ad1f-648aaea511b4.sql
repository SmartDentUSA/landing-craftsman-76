-- Seed approved_reviews with existing raw_reviews for LP #1 Institucional
-- Using only the first batch (unique by newer created_at) - 15 reviews
INSERT INTO approved_reviews (raw_review_id, landing_page_id, display_order, approved_by, notes)
VALUES
  ('ee20c833-fe3d-4eac-97c7-73980d886e08', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 1, 'manual', 'Auto-aprovado - seed inicial'),
  ('3d0cd19c-1b73-4a03-911f-57c0f22d37bd', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 2, 'manual', 'Auto-aprovado - seed inicial'),
  ('e2582900-fe45-4688-9a4a-edcea286ed21', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 3, 'manual', 'Auto-aprovado - seed inicial'),
  ('6ec3d171-4ec7-4b13-9b40-3598b7fce8bf', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 4, 'manual', 'Auto-aprovado - seed inicial'),
  ('23ddc79e-7fd3-413d-9042-bedf671880b7', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 5, 'manual', 'Auto-aprovado - seed inicial'),
  ('03277dc1-b08f-4f98-bd30-cb53a2ed5e45', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 6, 'manual', 'Auto-aprovado - seed inicial'),
  ('f86f0b18-7067-479a-9c75-cc8cc72f9f72', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 7, 'manual', 'Auto-aprovado - seed inicial'),
  ('9c747fb1-3d5e-47c6-8c43-6e3875e87efb', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 8, 'manual', 'Auto-aprovado - seed inicial'),
  ('20a5bd15-643c-4e39-a5ea-c15f8c343922', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 9, 'manual', 'Auto-aprovado - seed inicial'),
  ('fc822f9b-1f30-45db-b7ac-781dc647605b', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 10, 'manual', 'Auto-aprovado - seed inicial'),
  ('270f962f-c959-4743-8ae1-680dc2331eb6', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 11, 'manual', 'Auto-aprovado - seed inicial'),
  ('48cbaeee-9cd6-4308-b216-981a537d3d57', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 12, 'manual', 'Auto-aprovado - seed inicial'),
  ('20519c4c-5869-4d47-ae83-b6d4b6f23f5c', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 13, 'manual', 'Auto-aprovado - seed inicial'),
  ('469ba993-d062-4dfc-ac09-f2995bfcbdb9', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 14, 'manual', 'Auto-aprovado - seed inicial'),
  ('35877542-5299-4c9f-9e90-b2d4fba1b6b5', '5f7bea68-ae2e-4e6f-a725-61f0c1908bba', 15, 'manual', 'Auto-aprovado - seed inicial')
ON CONFLICT DO NOTHING;

-- Update LP google_reviews status to synced
UPDATE landing_pages 
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{schema,google_reviews}',
  '{"status":"synced","auto_extract":true,"place_id":"14424783289422732200","reviews":[]}'::jsonb
)
WHERE id = '5f7bea68-ae2e-4e6f-a725-61f0c1908bba';