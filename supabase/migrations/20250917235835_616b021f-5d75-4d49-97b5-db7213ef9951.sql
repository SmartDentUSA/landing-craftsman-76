-- Create a default company profile for the current user if none exists
INSERT INTO company_profile (user_id, company_name, company_description, business_sector, contact_email, location, founded_year, main_products_services)
VALUES (
  '0666d79e-61cb-4caf-a778-62d30b6418ea',
  'Smart Dent',
  'Empresa especializada em soluções odontológicas e materiais dentários de alta qualidade para profissionais da área odontológica.',
  'Odontologia',
  'contato@smartdent.com',
  'Brasil',
  2020,
  'Resinas 3D para impressão odontológica, materiais para restaurações dentárias, equipamentos especializados'
)
ON CONFLICT (user_id) 
DO UPDATE SET
  company_name = EXCLUDED.company_name,
  company_description = EXCLUDED.company_description,
  business_sector = EXCLUDED.business_sector,
  contact_email = EXCLUDED.contact_email,
  location = EXCLUDED.location,
  founded_year = EXCLUDED.founded_year,
  main_products_services = EXCLUDED.main_products_services,
  updated_at = now();