import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpinSellingSolution } from './useSpinSellingSolutions';

export function useSpinSolutionsByProducts(productIds: string[]) {
  return useQuery({
    queryKey: ['spin-solutions-by-products', productIds],
    queryFn: async () => {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      // Buscar soluções SPIN que contenham qualquer um dos produtos selecionados
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      
      // Filtrar soluções que contêm pelo menos um dos produtos
      const filtered = (data || []).filter((solution: any) => {
        const spinProductIds = solution.product_ids || [];
        return spinProductIds.some((id: string) => productIds.includes(id));
      });
      
      console.log('🎯 [useSpinSolutionsByProducts] Soluções SPIN encontradas:', {
        productIds,
        totalSolutions: data?.length || 0,
        filteredSolutions: filtered.length,
        solutions: filtered.map(s => ({ id: s.id, title: s.title }))
      });
      
      return filtered as unknown as SpinSellingSolution[];
    },
    enabled: productIds && productIds.length > 0,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}
