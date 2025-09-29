import { useState, useEffect, useMemo } from 'react';
import { useSelectedProducts } from './useSelectedProducts';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { supabase } from '@/integrations/supabase/client';

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

// Função para sanitizar conteúdo do blog removendo CTAs genéricos
const sanitizeBlogContent = (content: string): string => {
  if (!content) return '';
  
  let sanitized = content;
  
  // Remove CTAs genéricos específicos
  sanitized = sanitized.replace(/\[Solicite uma Demonstração[^\]]*\]/gi, '');
  sanitized = sanitized.replace(/\[Fale com Nossos Especialistas\]/gi, '');
  sanitized = sanitized.replace(/\[Baixe o Catálogo Completo\]/gi, '');
  
  // Remove frases específicas sobre futuro da odontologia
  sanitized = sanitized.replace(/O futuro da odontologia digital é simples[^.]*\./gi, '');
  
  // Remove rodapé Smart Dent completo
  sanitized = sanitized.replace(/---\s*\*?Smart Dent[^]*$/gi, '');
  
  // Remove informações de contato genérico
  sanitized = sanitized.replace(/Telefone:\s*\(XX\)[^]*$/gi, '');
  sanitized = sanitized.replace(/WhatsApp:\s*\(XX\)[^]*$/gi, '');
  sanitized = sanitized.replace(/Horário de Atendimento:[^]*$/gi, '');
  
  // Remove seções de CTA com heading
  sanitized = sanitized.replace(/###?\s*\[Solicite[^\]]*\][^]*?(?=###?|$)/gi, '');
  sanitized = sanitized.replace(/###?\s*\[Fale com[^\]]*\][^]*?(?=###?|$)/gi, '');
  sanitized = sanitized.replace(/###?\s*\[Baixe[^\]]*\][^]*?(?=###?|$)/gi, '');
  
  // Remove linhas vazias excessivas
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  return sanitized.trim();
};

export const useProductBlogsIntegration = (approvedLandingPages: any[]) => {
  const [productsWithBlogs, setProductsWithBlogs] = useState<any[]>([]);
  const { loadProductsByIds } = useSelectedProducts();

  // Load products with individual blogs when approved landing pages change
  useEffect(() => {
    fetchProductsWithBlogs();
  }, [approvedLandingPages]);

  // Realtime subscription para mudanças na tabela products_repository
  useEffect(() => {
    // Get all selected product IDs from approved landing pages
    const allSelectedProductIds = approvedLandingPages
      .filter(lp => {
        const productIds = lp.selected_product_ids ?? lp.selectedProductIds ?? [];
        return productIds.length > 0;
      })
      .flatMap(lp => lp.selected_product_ids ?? lp.selectedProductIds ?? []);

    if (allSelectedProductIds.length === 0) return;

    const channel = supabase
      .channel('products-blog-integration-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products_repository',
          filter: `id=in.(${allSelectedProductIds.join(',')})`,
        },
        (payload) => {
          console.log('🔄 Product blog content updated (integration):', payload);
          // Recarregar produtos quando houver mudanças no individual_blog_content
          fetchProductsWithBlogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [approvedLandingPages]);

  const fetchProductsWithBlogs = async () => {
    try {
      // Get all selected product IDs from approved landing pages with fallback for property names
      const allSelectedProductIds = approvedLandingPages
        .filter(lp => {
          const productIds = lp.selected_product_ids ?? lp.selectedProductIds ?? [];
          return productIds.length > 0;
        })
        .flatMap(lp => lp.selected_product_ids ?? lp.selectedProductIds ?? []);
        
      console.log('🔍 Debug: Processing approved landing pages for blogs:', {
        totalPages: approvedLandingPages.length,
        pagesWithProducts: approvedLandingPages.filter(lp => (lp.selected_product_ids ?? lp.selectedProductIds ?? []).length > 0).length,
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

  // Extract title from markdown content with improved patterns
  const extractTitleFromMarkdown = (content: string): string | null => {
    // Try different title patterns
    const h1Match = content.match(/^# (.+)$/m);
    if (h1Match) return h1Match[1].trim();
    
    const h2Match = content.match(/^## (.+)$/m);
    if (h2Match) return h2Match[1].trim();
    
    // Try to find title-like patterns at the beginning
    const firstLineMatch = content.match(/^(.{10,80}[.!?]?)\s*\n/);
    if (firstLineMatch && !firstLineMatch[1].toLowerCase().includes('análise')) {
      return firstLineMatch[1].trim();
    }
    
    return null;
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
      
      // Usar valores padrão quando não há preferências salvas
      const useCommercial = productPrefs ? productPrefs.useCommercial : !!product.individual_blog_content?.commercial;
      const useTechnical = productPrefs ? productPrefs.useTechnical : !!product.individual_blog_content?.technical;
      
      console.log(`🔍 Debug: Processing product ${product.name}:`, {
        productId: product.id,
        hasPrefs: !!productPrefs,
        useCommercial,
        useTechnical,
        hasCommercialContent: !!product.individual_blog_content?.commercial,
        hasTechnicalContent: !!product.individual_blog_content?.technical
      });
      
      if (useCommercial && product.individual_blog_content?.commercial) {
        const sanitizedCommercialContent = sanitizeBlogContent(product.individual_blog_content.commercial);
        const extractedTitle = extractTitleFromMarkdown(sanitizedCommercialContent);
        productBlogs.push({
          id: `${product.id}-commercial`,
          title: extractedTitle || `Descubra o ${product.name}`,
          content: sanitizedCommercialContent,
          type: 'commercial',
          productId: product.id,
          productName: product.name,
          created_at: product.individual_blog_content.generated_at || new Date().toISOString()
        });
      }
      
      if (useTechnical && product.individual_blog_content?.technical) {
        const sanitizedTechnicalContent = sanitizeBlogContent(product.individual_blog_content.technical);
        const extractedTitle = extractTitleFromMarkdown(sanitizedTechnicalContent);
        productBlogs.push({
          id: `${product.id}-technical`,
          title: extractedTitle || `Especificações do ${product.name}`,
          content: sanitizedTechnicalContent,
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
        
        // Usar valores padrão quando não há preferências salvas
        const useCommercial = productPrefs ? productPrefs.useCommercial : !!product.individual_blog_content?.commercial;
        const useTechnical = productPrefs ? productPrefs.useTechnical : !!product.individual_blog_content?.technical;
        
        console.log(`🔍 Debug: Processing product ${product.name} for domain ${domain}:`, {
          productId: product.id,
          hasPrefs: !!productPrefs,
          useCommercial,
          useTechnical,
          hasCommercialContent: !!product.individual_blog_content?.commercial,
          hasTechnicalContent: !!product.individual_blog_content?.technical
        });
        
        // For Eodonto: only commercial blogs
        if (domain === 'eodonto' && useCommercial && product.individual_blog_content?.commercial) {
          const sanitizedCommercialContent = sanitizeBlogContent(product.individual_blog_content.commercial);
          const extractedTitle = extractTitleFromMarkdown(sanitizedCommercialContent);
          productBlogs.push({
            id: `${product.id}-commercial`,
            title: extractedTitle || `Por que escolher o ${product.name}`,
            content: sanitizedCommercialContent,
            type: 'commercial',
            productId: product.id,
            productName: product.name,
            created_at: product.individual_blog_content.generated_at || new Date().toISOString()
          });
          console.log(`✅ Added commercial blog for ${product.name} to Eodonto`);
        }
        
        // For Dentala: only technical blogs
        if (domain === 'dentala' && useTechnical && product.individual_blog_content?.technical) {
          const sanitizedTechnicalContent = sanitizeBlogContent(product.individual_blog_content.technical);
          const extractedTitle = extractTitleFromMarkdown(sanitizedTechnicalContent);
          productBlogs.push({
            id: `${product.id}-technical`,
            title: extractedTitle || `Como funciona o ${product.name}`,
            content: sanitizedTechnicalContent,
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