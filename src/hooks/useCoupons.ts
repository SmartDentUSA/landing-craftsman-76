import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProductCoupon {
  id: string;
  product_id: string;
  coupon_code: string;
  discount_percentage: number;
  allow_promotions: boolean;
  created_at: string;
  updated_at: string;
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<ProductCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cupons',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCoupon = async (
    productId: string,
    couponCode: string,
    discountPercentage: number,
    allowPromotions: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('product_coupons')
        .insert({
          product_id: productId,
          coupon_code: couponCode.toUpperCase(),
          discount_percentage: discountPercentage,
          allow_promotions: allowPromotions,
        });

      if (error) throw error;

      toast({
        title: 'Cupom criado',
        description: `Cupom ${couponCode} criado com sucesso`,
      });

      await fetchCoupons();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar cupom',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const updateCoupon = async (
    couponId: string,
    couponCode: string,
    discountPercentage: number,
    allowPromotions: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('product_coupons')
        .update({
          coupon_code: couponCode.toUpperCase(),
          discount_percentage: discountPercentage,
          allow_promotions: allowPromotions,
        })
        .eq('id', couponId);

      if (error) throw error;

      toast({
        title: 'Cupom atualizado',
        description: 'Alterações salvas com sucesso',
      });

      await fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cupom',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      const { error } = await supabase
        .from('product_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast({
        title: 'Cupom removido',
        description: 'Cupom excluído com sucesso',
      });

      await fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover cupom',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const getCouponByProductId = (productId: string): ProductCoupon | undefined => {
    return coupons.find((c) => c.product_id === productId);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  return {
    coupons,
    loading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponByProductId,
    refetch: fetchCoupons,
  };
}
