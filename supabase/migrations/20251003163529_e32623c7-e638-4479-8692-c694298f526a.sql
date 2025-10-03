-- Criar tabela product_coupons
CREATE TABLE IF NOT EXISTS public.product_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products_repository(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  discount_percentage NUMERIC NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  allow_promotions BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Habilitar RLS
ALTER TABLE public.product_coupons ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem gerenciar cupons
CREATE POLICY "Only admins can manage product_coupons"
  ON public.product_coupons
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: Usuários autenticados podem visualizar cupons liberados para promoção
CREATE POLICY "Authenticated users can view promo coupons"
  ON public.product_coupons
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND allow_promotions = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_product_coupons_updated_at
  BEFORE UPDATE ON public.product_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhorar performance de busca
CREATE INDEX idx_product_coupons_product_id ON public.product_coupons(product_id);
CREATE INDEX idx_product_coupons_allow_promotions ON public.product_coupons(allow_promotions);