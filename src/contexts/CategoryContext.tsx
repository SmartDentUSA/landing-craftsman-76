import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useProductCategories } from '@/hooks/useProductCategories';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';

interface CategoryContextType {
  // Data from hooks
  categories: string[];
  subcategories: string[];
  getSubcategoriesForCategory: (category: string) => string[];
  configs: any[];
  loading: boolean;
  
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

  const value: CategoryContextType = {
    // Data from hooks
    categories: productCategories.categories,
    subcategories: productCategories.subcategories,
    getSubcategoriesForCategory: productCategories.getSubcategoriesForCategory,
    configs: categoryConfigs.configs,
    loading: productCategories.loading || categoryConfigs.loading || isRefreshing,
    
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

export const useCategoryContext = () => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategoryContext must be used within a CategoryProvider');
  }
  return context;
};