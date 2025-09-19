import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CategoryData {
  categories: string[];
  subcategories: string[];
  categorySubcategoryMap: Record<string, string[]>;
}

export const useProductCategories = () => {
  const [categoryData, setCategoryData] = useState<CategoryData>({
    categories: [],
    subcategories: [],
    categorySubcategoryMap: {}
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar todas as categorias e subcategorias distintas
      const { data, error } = await supabase
        .from('products_repository')
        .select('category, subcategory')
        .not('category', 'is', null)
        .order('category');

      if (error) throw error;

      // Processar dados para criar listas únicas
      const categories = [...new Set(
        data
          .map(item => item.category)
          .filter(Boolean)
          .map(cat => cat?.trim())
          .filter(cat => cat && cat.length > 0)
      )].sort();

      const subcategories = [...new Set(
        data
          .map(item => item.subcategory)
          .filter(Boolean)
          .map(subcat => subcat?.trim())
          .filter(subcat => subcat && subcat.length > 0)
      )].sort();

      // Criar mapeamento categoria -> subcategorias
      const categorySubcategoryMap: Record<string, string[]> = {};
      data.forEach(item => {
        if (item.category && item.subcategory) {
          const category = item.category.trim();
          const subcategory = item.subcategory.trim();
          
          if (!categorySubcategoryMap[category]) {
            categorySubcategoryMap[category] = [];
          }
          
          if (!categorySubcategoryMap[category].includes(subcategory)) {
            categorySubcategoryMap[category].push(subcategory);
          }
        }
      });

      // Ordenar subcategorias de cada categoria
      Object.keys(categorySubcategoryMap).forEach(category => {
        categorySubcategoryMap[category].sort();
      });

      setCategoryData({
        categories,
        subcategories,
        categorySubcategoryMap
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getSubcategoriesForCategory = useCallback((category: string) => {
    return categoryData.categorySubcategoryMap[category] || [];
  }, [categoryData.categorySubcategoryMap]);

  const refreshCategories = useCallback(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories: categoryData.categories,
    subcategories: categoryData.subcategories,
    getSubcategoriesForCategory,
    loading,
    refreshCategories
  };
};