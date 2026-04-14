import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';

interface CategoryContextType {
  // Data from hooks
  categories: string[];
  subcategories: string[];
  getSubcategoriesForCategory: (category: string) => string[];
  configs: any[];
  loading: boolean;
  
  // Unified data (merging products_repository + categories_config)
  unifiedCategories: string[];
  unifiedSubcategories: string[];
  getUnifiedSubcategoriesForCategory: (category: string) => string[];
  
  // Global refresh functions
  refreshAllCategories: () => Promise<void>;
  refreshProductCategories: () => void;
  refreshCategoryConfigs: () => void;
  
  // Notification system
  notifyCategoryChange: (type: 'rename' | 'delete' | 'create', data?: any) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const productCategories = useProductCategories();
  const categoryConfigs = useCategoryConfig();

  const refreshAllCategories = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refresh both hooks simultaneously
      await Promise.all([
        productCategories.refreshCategories(),
        categoryConfigs.refreshConfigs()
      ]);
    } catch (error) {
      console.error('Error refreshing categories:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [productCategories, categoryConfigs]);

  const refreshProductCategories = useCallback(() => {
    productCategories.refreshCategories();
  }, [productCategories]);

  const refreshCategoryConfigs = useCallback(() => {
    categoryConfigs.refreshConfigs();
  }, [categoryConfigs]);

  const notifyCategoryChange = useCallback(async (type: 'rename' | 'delete' | 'create', data?: any) => {
    console.log(`Category change notification: ${type}`, data);
    
    // Automatically refresh all category data when changes occur
    await refreshAllCategories();
  }, [refreshAllCategories]);

  // Create unified category lists combining both data sources
  const unifiedCategories = useMemo(() => {
    const productCats = productCategories.categories || [];
    const configCategories = (categoryConfigs.configs || []).map(config => config.category);
    return [...new Set([...productCats, ...configCategories])].sort();
  }, [productCategories.categories, categoryConfigs.configs]);

  const unifiedSubcategories = useMemo(() => {
    const productSubcats = productCategories.subcategories || [];
    const configSubcategories = (categoryConfigs.configs || []).map(config => config.subcategory);
    return [...new Set([...productSubcats, ...configSubcategories])].sort();
  }, [productCategories.subcategories, categoryConfigs.configs]);

  const getUnifiedSubcategoriesForCategory = useCallback((category: string) => {
    // Get subcategories from products
    const productSubcats = productCategories.getSubcategoriesForCategory?.(category) || [];
    
    // Get subcategories from configs for this category
    const configSubcats = (categoryConfigs.configs || [])
      .filter(config => config.category === category)
      .map(config => config.subcategory);
    
    // Combine and deduplicate
    return [...new Set([...productSubcats, ...configSubcats])].sort();
  }, [productCategories.getSubcategoriesForCategory, categoryConfigs.configs]);

  const value: CategoryContextType = {
    // Data from hooks
    categories: productCategories.categories || [],
    subcategories: productCategories.subcategories || [],
    getSubcategoriesForCategory: productCategories.getSubcategoriesForCategory || (() => []),
    configs: categoryConfigs.configs || [],
    loading: productCategories.loading || categoryConfigs.loading || isRefreshing,
    
    // Unified data
    unifiedCategories,
    unifiedSubcategories,
    getUnifiedSubcategoriesForCategory,
    
    // Global refresh functions
    refreshAllCategories,
    refreshProductCategories,
    refreshCategoryConfigs,
    
    // Notification system
    notifyCategoryChange
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};

const defaultCategoryContext: CategoryContextType = {
  categories: [],
  subcategories: [],
  getSubcategoriesForCategory: () => [],
  configs: [],
  loading: false,
  unifiedCategories: [],
  unifiedSubcategories: [],
  getUnifiedSubcategoriesForCategory: () => [],
  refreshAllCategories: async () => {},
  refreshProductCategories: () => {},
  refreshCategoryConfigs: () => {},
  notifyCategoryChange: () => {},
};

export const useCategoryContext = () => {
  const context = useContext(CategoryContext);
  return context ?? defaultCategoryContext;
};