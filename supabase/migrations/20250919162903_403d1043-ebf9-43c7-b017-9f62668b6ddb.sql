-- Add sales_pitch column to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN sales_pitch TEXT;