-- FASE 1: Adicionar coluna promo_price na tabela products_repository
ALTER TABLE public.products_repository 
ADD COLUMN IF NOT EXISTS promo_price numeric;