import { useState, useEffect, useMemo } from 'react';
import { useSelectedProducts } from './useSelectedProducts';
import { STORAGE_KEYS } from '@/constants/storage-keys';

interface BlogConsolidationPreferences {
  [productId: string]: {
    useCommercial: boolean;
    useTechnical: boolean;
  };
}

interface ProductBlog {
  id: string;
  title: string;
  content: string;
  type: 'commercial' | 'technical';
  productId: string;
  productName: string;
  created_at: string;
}

export const useProductBlogsIntegration = (approvedLandingPages: any[]) => {
  const [productsWithBlogs, setProductsWithBlogs] = useState<any[]>([]);
  const { loadProductsByIds } = useSelectedProducts();

  // Load products with individual blogs when approved landing pages change
  useEffect(() => {
    fetchProductsWithBlogs();
  }, [approvedLandingPages]);

  const fetchProductsWithBlogs = async () => {
    try {
      // Get all selected product IDs from approved landing pages
      const allSelectedProductIds = approvedLandingPages
        .filter(lp => {
          const productIds = lp.selected_product_ids || [];
          return productIds.length > 0;
        })
        .flatMap(lp => lp.selected_product_ids || []);
        
      console.log('🔍 Debug: Processing approved landing pages for blogs:', {
        totalPages: approvedLandingPages.length,
        pagesWithProducts: approvedLandingPages.filter(lp => (lp.selected_product_ids || []).length > 0).length,
        allSelectedProductIds: allSelectedProductIds.length
      });

      if (allSelectedProductIds.length === 0) {
        setProductsWithBlogs([]);
        return;
      }

      const products = await loadProductsByIds(allSelectedProductIds);
      
      // Filter only products that have generated individual blogs
      const productsWithBlogContent = products.filter(product => 
        product.individual_blog_content?.commercial || product.individual_blog_content?.technical
      );

      setProductsWithBlogs(productsWithBlogContent);
      console.log('🎯 Products with individual blogs loaded:', productsWithBlogContent.length);
    } catch (error) {
      console.error('❌ Error fetching products with blogs:', error);
    }
  };

  // Extract title from markdown content
  const extractTitleFromMarkdown = (content: string): string | null => {
    const titleMatch = content.match(/^# (.+)$/m);
    return titleMatch ? titleMatch[1].trim() : null;
  };

  // Initialize default preferences for products with blogs
  useEffect(() => {
    if (productsWithBlogs.length > 0) {
      const savedPreferences = localStorage.getItem(STORAGE_KEYS.BLOG_CONSOLIDATION_PREFERENCES);
      const preferences = savedPreferences ? JSON.parse(savedPreferences) : {};
      
      let hasChanges = false;
      const defaultPreferences: BlogConsolidationPreferences = { ...preferences };
      
      productsWithBlogs.forEach(product => {
        if (!preferences[product.id]) {
          defaultPreferences[product.id] = {
            useCommercial: !!product.individual_blog_content?.commercial,
            useTechnical: !!product.individual_blog_content?.technical
          };
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem(STORAGE_KEYS.BLOG_CONSOLIDATION_PREFERENCES, JSON.stringify(defaultPreferences));
        console.log('📝 Initialized default blog preferences for products:', 
          productsWithBlogs.map(p => ({ 
            id: p.id, 
            name: p.name,
            hasCommercial: !!p.individual_blog_content?.commercial,
            hasTechnical: !!p.individual_blog_content?.technical
          }))
        );
      }
    }
  }, [productsWithBlogs]);

  // Get blog consolidation preferences from localStorage
  const getBlogPreferences = (): BlogConsolidationPreferences => {
    const savedPreferences = localStorage.getItem(STORAGE_KEYS.BLOG_CONSOLIDATION_PREFERENCES);
    return savedPreferences ? JSON.parse(savedPreferences) : {};
  };

  // Create blog entries for HTML generation based on preferences
  const getProductBlogsForHTML = useMemo((): ProductBlog[] => {
    const preferences = getBlogPreferences();
    const productBlogs: ProductBlog[] = [];

    console.log('🔍 Debug: Creating blogs for HTML generation:', {
      productsWithBlogs: productsWithBlogs.length,
      preferences: Object.keys(preferences).length,
      preferenceDetails: preferences
    });

    productsWithBlogs.forEach(product => {
      const productPrefs = preferences[product.id];
      
      console.log(`🔍 Debug: Processing product ${product.name}:`, {
        productId: product.id,
        hasPrefs: !!productPrefs,
        useCommercial: productPrefs?.useCommercial,
        useTechnical: productPrefs?.useTechnical,
        hasCommercialContent: !!product.individual_blog_content?.commercial,
        hasTechnicalContent: !!product.individual_blog_content?.technical
      });
      
      if (productPrefs?.useCommercial && product.individual_blog_content?.commercial) {
        const extractedTitle = extractTitleFromMarkdown(product.individual_blog_content.commercial);
        productBlogs.push({
          id: `${product.id}-commercial`,
          title: extractedTitle || `${product.name} - Análise Comercial`,
          content: product.individual_blog_content.commercial,
          type: 'commercial',
          productId: product.id,
          productName: product.name,
          created_at: product.individual_blog_content.generated_at || new Date().toISOString()
        });
      }
      
      if (productPrefs?.useTechnical && product.individual_blog_content?.technical) {
        const extractedTitle = extractTitleFromMarkdown(product.individual_blog_content.technical);
        productBlogs.push({
          id: `${product.id}-technical`,
          title: extractedTitle || `${product.name} - Análise Técnica`,
          content: product.individual_blog_content.technical,
          type: 'technical',
          productId: product.id,
          productName: product.name,
          created_at: product.individual_blog_content.generated_at || new Date().toISOString()
        });
      }
    });

    console.log('📊 Debug: Generated blogs summary:', {
      totalBlogs: productBlogs.length,
      commercialBlogs: productBlogs.filter(b => b.type === 'commercial').length,
      technicalBlogs: productBlogs.filter(b => b.type === 'technical').length
    });

    return productBlogs;
  }, [productsWithBlogs]);

  // Create blog entries filtered by domain
  const getProductBlogsForHTMLByDomain = useMemo(() => {
    return (domain: string): ProductBlog[] => {
      const preferences = getBlogPreferences();
      const productBlogs: ProductBlog[] = [];

      console.log(`🔍 Debug: Creating blogs for domain "${domain}":`, {
        productsWithBlogs: productsWithBlogs.length,
        preferences: Object.keys(preferences).length
      });

      productsWithBlogs.forEach(product => {
        const productPrefs = preferences[product.id];
        
        console.log(`🔍 Debug: Processing product ${product.name} for domain ${domain}:`, {
          productId: product.id,
          hasPrefs: !!productPrefs,
          useCommercial: productPrefs?.useCommercial,
          useTechnical: productPrefs?.useTechnical,
          hasCommercialContent: !!product.individual_blog_content?.commercial,
          hasTechnicalContent: !!product.individual_blog_content?.technical
        });
        
        // For Eodonto: only commercial blogs
        if (domain === 'eodonto' && productPrefs?.useCommercial && product.individual_blog_content?.commercial) {
          const extractedTitle = extractTitleFromMarkdown(product.individual_blog_content.commercial);
          productBlogs.push({
            id: `${product.id}-commercial`,
            title: extractedTitle || `${product.name} - Análise Comercial`,
            content: product.individual_blog_content.commercial,
            type: 'commercial',
            productId: product.id,
            productName: product.name,
            created_at: product.individual_blog_content.generated_at || new Date().toISOString()
          });
          console.log(`✅ Added commercial blog for ${product.name} to Eodonto`);
        }
        
        // For Dentala: only technical blogs
        if (domain === 'dentala' && productPrefs?.useTechnical && product.individual_blog_content?.technical) {
          const extractedTitle = extractTitleFromMarkdown(product.individual_blog_content.technical);
          productBlogs.push({
            id: `${product.id}-technical`,
            title: extractedTitle || `${product.name} - Análise Técnica`,
            content: product.individual_blog_content.technical,
            type: 'technical',
            productId: product.id,
            productName: product.name,
            created_at: product.individual_blog_content.generated_at || new Date().toISOString()
          });
          console.log(`✅ Added technical blog for ${product.name} to Dentala`);
        }
      });

      console.log(`📊 Debug: Generated ${productBlogs.length} blogs for domain "${domain}"`);
      return productBlogs;
    };
  }, [productsWithBlogs]);

  // Count active product blogs based on preferences
  const getActiveProductBlogsCount = useMemo((): number => {
    return getProductBlogsForHTML.length;
  }, [getProductBlogsForHTML]);

  // Count active product blogs by domain
  const getActiveProductBlogsCountByDomain = useMemo(() => {
    return (domain: string): number => {
      return getProductBlogsForHTMLByDomain(domain).length;
    };
  }, [getProductBlogsForHTMLByDomain]);

  return {
    productsWithBlogs,
    productBlogsForHTML: getProductBlogsForHTML,
    productBlogsForHTMLByDomain: getProductBlogsForHTMLByDomain,
    activeProductBlogsCount: getActiveProductBlogsCount,
    activeProductBlogsCountByDomain: getActiveProductBlogsCountByDomain,
    refreshProductsWithBlogs: fetchProductsWithBlogs,
  };
};