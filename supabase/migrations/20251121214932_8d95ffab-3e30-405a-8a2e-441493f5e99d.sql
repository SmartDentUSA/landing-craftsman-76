-- ===================================
-- FASE 4.1: HABILITAR RLS EM TABELAS CRÍTICAS
-- ===================================

-- As tabelas spin_selling_solutions, products_repository e company_profile
-- já têm RLS habilitado e políticas configuradas.
-- Esta migration adiciona políticas faltantes apenas se necessário.

-- Verificar se RLS está habilitado (já está, mas garantindo)
ALTER TABLE spin_selling_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;

-- Adicionar política de leitura autenticada para spin_selling_solutions se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'spin_selling_solutions' 
    AND policyname = 'Authenticated users can view spin_selling_solutions'
  ) THEN
    CREATE POLICY "Authenticated users can view spin_selling_solutions"
      ON spin_selling_solutions
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Nota: products_repository e company_profile já possuem políticas adequadas
-- conforme verificado no schema:
-- - products_repository: "Anyone can view approved products" e "Authenticated users can view approved products"
-- - company_profile: "Users can view own company_profile" e "Only admins can manage company_profile"