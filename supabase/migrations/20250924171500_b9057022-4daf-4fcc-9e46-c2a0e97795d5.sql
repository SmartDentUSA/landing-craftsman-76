-- Recriar as landing pages perdidas com os dados originais
INSERT INTO public.landing_pages (
  id, 
  name, 
  status, 
  last_modified, 
  version, 
  template,
  embed,
  user_id,
  created_at,
  updated_at
) VALUES 
(
  'lp_1758075930044',
  'Smart Dent Campanha Q1',
  'approved',
  '2024-01-15T00:00:00Z',
  3,
  'Smart Dent Base v1',
  '{"mode": "default", "namespace": "sd"}',
  (SELECT auth.uid()),
  now(),
  now()
),
(
  'lp_1758075930045',
  'Promoção Implantes Março',
  'draft',
  '2024-01-14T00:00:00Z',
  1,
  'Smart Dent Base v1',
  '{"mode": "default", "namespace": "sd"}',
  (SELECT auth.uid()),
  now(),
  now()
),
(
  'lp_1758075930046',
  'Landing Ortodontia Premium',
  'approved',
  '2024-01-10T00:00:00Z',
  2,
  'Smart Dent Base v1',
  '{"mode": "default", "namespace": "sd"}',
  (SELECT auth.uid()),
  now(),
  now()
);