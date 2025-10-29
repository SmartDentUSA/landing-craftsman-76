import { useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProductData {
  id?: string;
  name?: string;
  description?: string;
  sales_pitch?: string;
  applications?: string;
  category?: string;
  subcategory?: string;
  price?: number;
  keywords?: any[];
  benefits?: any[];
  features?: any[];
  target_audience?: any[];
  gtin?: string;
  mpn?: string;
  brand?: string;
  color?: string;
  size?: string;
  material?: string;
  age_group?: string;
  gender?: string;
  [key: string]: any;
}

export const useProductAutoSave = (productId?: string) => {
  const lastSaveRef = useRef<Date>();
  const isAutoSavingRef = useRef(false);

  const debouncedAutoSave = useDebounce(async (updatedData: Partial<ProductData>) => {
    if (!productId || isAutoSavingRef.current) return;
    
    isAutoSavingRef.current = true;
    console.log('💾 [AUTO-SAVE] Salvando produto...', { 
      productId,
      fields: Object.keys(updatedData),
      timestamp: new Date().toISOString()
    });
    
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({
          ...updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      lastSaveRef.current = new Date();
      console.log('✅ [AUTO-SAVE] Produto salvo com sucesso');
      
      toast({
        title: "💾 Salvo automaticamente",
        duration: 2000,
        className: "opacity-80"
      });
    } catch (error) {
      console.error('❌ [AUTO-SAVE] Erro ao salvar produto:', error);
      toast({
        title: "⚠️ Erro ao salvar automaticamente",
        description: "Clique em 'Atualizar' para salvar manualmente",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      isAutoSavingRef.current = false;
    }
  }, 2000);

  const autoSave = useCallback((updatedData: Partial<ProductData>) => {
    if (!productId) {
      console.log('⏭️ [AUTO-SAVE] Pulando auto-save (produto novo)');
      return;
    }
    
    console.log('🔄 [AUTO-SAVE] Agendando auto-save...');
    debouncedAutoSave(updatedData);
  }, [productId, debouncedAutoSave]);

  return {
    autoSave,
    lastSave: lastSaveRef.current,
    isAutoSaving: isAutoSavingRef.current
  };
};
