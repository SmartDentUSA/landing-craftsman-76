-- Add offer_discount_cta field to products_repository table
ALTER TABLE public.products_repository 
ADD COLUMN offer_discount_cta jsonb DEFAULT '{"label": "Comprar com Desconto", "url": "", "visible": false}'::jsonb;