-- Remover política restritiva atual para prompts_configuration
DROP POLICY IF EXISTS "Only admins can manage prompts_configuration" ON prompts_configuration;

-- Criar nova política mais permissiva para usuários autenticados
CREATE POLICY "Authenticated users can manage prompts_configuration" 
ON prompts_configuration 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);