// ============================================================================
// Hook: useProductCategories v3.0
// Busca categorias de categories_config com campos Clinical Brain
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AntiHallucinationRules } from '@/components/ClinicalBrain/types';

export interface CategoryConfigItem {
  id: string;
  category: string;
  subcategory: string;
  clinical_tone: string | null;
  criticality_percent: number;
  anti_hallucination_rules: AntiHallucinationRules | null;
  icon_name: string;
  target_audience: string[] | null;
  is_active: boolean;
}

interface CategoryData {
  categories: string[];
  subcategories: string[];
  categorySubcategoryMap: Record<string, string[]>;
  configItems: CategoryConfigItem[];
  configByProductType: Record<string, CategoryConfigItem>;
}

export const useProductCategories = (enabled = true) => {
  const [categoryData, setCategoryData] = useState<CategoryData>({
    categories: [],
    subcategories: [],
    categorySubcategoryMap: {},
    configItems: [],
    configByProductType: {}
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar de categories_config (fonte correta com dados Clinical Brain)
      const { data, error } = await supabase
        .from('categories_config')
        .select(`
          id,
          category,
          subcategory,
          clinical_tone,
          criticality_percent,
          anti_hallucination_rules,
          icon_name,
          target_audience,
          is_active
        `)
        .eq('is_active', true)
        .order('category')
        .order('subcategory');

      if (error) throw error;

      // Processar dados
      const configItems: CategoryConfigItem[] = (data || []).map(item => ({
        id: item.id,
        category: (item.category as string)?.trim() || '',
        subcategory: (item.subcategory as string)?.trim() || '',
        clinical_tone: item.clinical_tone as string | null,
        criticality_percent: (item.criticality_percent as number) || 0,
        anti_hallucination_rules: item.anti_hallucination_rules as unknown as AntiHallucinationRules | null,
        icon_name: (item.icon_name as string) || 'Package',
        target_audience: Array.isArray(item.target_audience) ? (item.target_audience as string[]) : null,
        is_active: (item.is_active as boolean) ?? true
      }));

      // Extrair categorias únicas
      const categories = [...new Set(
        configItems.map(item => item.category).filter(Boolean)
      )].sort();

      // Extrair subcategorias únicas
      const subcategories = [...new Set(
        configItems.map(item => item.subcategory).filter(Boolean)
      )].sort();

      // Criar mapeamento categoria -> subcategorias
      const categorySubcategoryMap: Record<string, string[]> = {};
      configItems.forEach(item => {
        if (item.category && item.subcategory) {
          if (!categorySubcategoryMap[item.category]) {
            categorySubcategoryMap[item.category] = [];
          }
          if (!categorySubcategoryMap[item.category].includes(item.subcategory)) {
            categorySubcategoryMap[item.category].push(item.subcategory);
          }
        }
      });

      // Ordenar subcategorias
      Object.keys(categorySubcategoryMap).forEach(category => {
        categorySubcategoryMap[category].sort();
      });

      // Criar mapeamento por product_type (CATEGORIA ou CATEGORIA > SUBCATEGORIA)
      const configByProductType: Record<string, CategoryConfigItem> = {};
      configItems.forEach(item => {
        // Mapear por "CATEGORIA > SUBCATEGORIA"
        const fullKey = `${item.category} > ${item.subcategory}`;
        configByProductType[fullKey] = item;
        
        // Também mapear só pela categoria (para fallback)
        if (!configByProductType[item.category]) {
          configByProductType[item.category] = item;
        }
      });

      setCategoryData({
        categories,
        subcategories,
        categorySubcategoryMap,
        configItems,
        configByProductType
      });

    } catch (error) {
      console.error('Error fetching categories from categories_config:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias do Clinical Brain",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (enabled) {
      fetchCategories();
    }
  }, [fetchCategories, enabled]);

  const getSubcategoriesForCategory = useCallback((category: string) => {
    return categoryData.categorySubcategoryMap[category] || [];
  }, [categoryData.categorySubcategoryMap]);

  const getConfigForProductType = useCallback((productType: string | null | undefined): CategoryConfigItem | null => {
    if (!productType) return null;
    
    // Tentar match exato primeiro
    if (categoryData.configByProductType[productType]) {
      return categoryData.configByProductType[productType];
    }
    
    // Extrair categoria se for formato "CATEGORIA > SUBCATEGORIA"
    const category = productType.split('>')[0]?.trim();
    if (category && categoryData.configByProductType[category]) {
      return categoryData.configByProductType[category];
    }
    
    return null;
  }, [categoryData.configByProductType]);

  const getConfigItemsForCategory = useCallback((category: string): CategoryConfigItem[] => {
    return categoryData.configItems.filter(item => item.category === category);
  }, [categoryData.configItems]);

  const refreshCategories = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories: categoryData.categories,
    subcategories: categoryData.subcategories,
    getSubcategoriesForCategory,
    getConfigForProductType,
    getConfigItemsForCategory,
    configItems: categoryData.configItems,
    loading,
    refreshCategories
  };
};
