-- =====================================================
-- MIGRAÇÃO: Campos Enterprise GEO para company_profile
-- =====================================================

-- Campos GEO (Geolocalização)
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Campos Founder (Fundador)
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS founder_name TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS founder_linkedin TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS founder_title TEXT;

-- Campos LocalBusiness
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS price_range TEXT;

-- Campos AreaServed (estruturado)
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS areas_served JSONB DEFAULT '[]'::jsonb;

-- Campos adicionais enterprise
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS duns_number TEXT;
ALTER TABLE public.company_profile ADD COLUMN IF NOT EXISTS number_of_employees TEXT;

-- =====================================================
-- ATUALIZAR DADOS DA SMART DENT
-- =====================================================

UPDATE public.company_profile 
SET 
  -- GEO (São Carlos - SP)
  latitude = -22.0087,
  longitude = -47.8909,
  
  -- Corrigir estado faltante
  state = 'SP',
  postal_code = '13562-291',
  
  -- Founder
  founder_name = 'Fundador Smart Dent',
  founder_title = 'CEO & Fundador',
  
  -- LocalBusiness
  opening_hours = '[
    {"dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "18:00"}
  ]'::jsonb,
  price_range = '$$',
  
  -- Areas Served
  areas_served = '[
    {"type": "Country", "name": "Brasil"},
    {"type": "Country", "name": "Estados Unidos"},
    {"type": "Country", "name": "Portugal"},
    {"type": "State", "name": "São Paulo", "country": "Brasil"},
    {"type": "City", "name": "São Carlos", "state": "São Paulo", "country": "Brasil"}
  ]'::jsonb,
  
  -- Enterprise
  legal_name = 'Smart Dent Equipamentos Odontológicos Ltda',
  number_of_employees = '11-50'
  
WHERE company_name = 'Smart Dent';