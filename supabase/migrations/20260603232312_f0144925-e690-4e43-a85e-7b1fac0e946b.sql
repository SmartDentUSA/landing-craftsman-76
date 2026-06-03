DELETE FROM public.company_profile
WHERE id = '6f984e6c-8bec-4dc9-a81e-9d29e9714909'
  AND company_name = 'Nova Empresa';

CREATE UNIQUE INDEX IF NOT EXISTS company_profile_singleton
  ON public.company_profile ((true));