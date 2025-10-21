-- Fix RLS policy for products_repository to allow admin DELETE operations
-- The previous policy only had USING clause, which is insufficient for DELETE

-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Only admins can manage products" ON public.products_repository;

-- Recreate with proper USING and WITH CHECK clauses
CREATE POLICY "Only admins can manage products" 
ON public.products_repository 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Add explanatory comment
COMMENT ON POLICY "Only admins can manage products" ON public.products_repository IS 
'Allows admins full CRUD access. Both USING and WITH CHECK are required for DELETE/UPDATE/INSERT operations.';