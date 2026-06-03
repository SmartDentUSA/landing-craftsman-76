import { useEffect, useState, useMemo } from 'react';
import useLandingPages from './useLandingPages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSelectedProducts } from './useSelectedProducts';

export const useBlogStatusMonitor = (supabaseLandingPages?: any[]) => {
  const zustandLandingPages = useLandingPages((state) => state.landingPages);
  // Use Supabase landing pages if provided, otherwise fallback to Zustand
  const landingPages = supabaseLandingPages || zustandLandingPages;
  const [publishedBlogs, setPublishedBlogs] = useState<any[]>([]);
  const [productsWithBlogs, setProductsWithBlogs] = useState<any[]>([]);
  const { loadProductsByIds } = useSelectedProducts();

  // Memoize approved landing pages with blog data to detect changes
  const approvedLandingPagesWithBlogs = useMemo(() => {
    return landingPages.filter(lp => lp.status === 'approved');
  }, [landingPages]);

  useEffect(() => {
    fetchPublishedBlogs();
  }, []);

  // Fetch products with individual blogs only when approved LP set actually changes (stable key)
  const approvedKey = useMemo(
    () => approvedLandingPagesWithBlogs.map(lp => lp.id).sort().join(','),
    [approvedLandingPagesWithBlogs]
  );
  useEffect(() => {
    if (!approvedKey) {
      setProductsWithBlogs([]);
      return;
    }
    fetchProductsWithBlogs();
  }, [approvedKey]);

  // Real-time subscription to blog_posts (lightweight refresh)
  useEffect(() => {
    const channel = supabase
      .channel('blog-posts-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => {
        fetchPublishedBlogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPublishedBlogs = async () => {
    try {
      // Select only the columns we actually use (no select('*'))
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, status, created_at, landing_page_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublishedBlogs(data || []);
    } catch (error) {
      console.error('❌ Error fetching published blogs:', error);
    }
  };

  // Memoize consolidated blogs calculation
  const consolidatedBlogs = useMemo(() => {
    const consolidated = landingPages.filter(lp => {
      const hasPublishedBlog = publishedBlogs.some(blog => blog.landing_page_id === lp.id);
      const blogGenerated = lp.blog_generated ?? lp.blogGenerated ?? false;
      const isApprovedWithBlog = lp.status === 'approved' && (blogGenerated || hasPublishedBlog);
      
      if (isApprovedWithBlog) {
        console.log(`✅ Blog consolidated for LP ${lp.id}:`, {
          blogGenerated,
          hasPublishedBlog,
          name: lp.name
        });
      }
      
      return isApprovedWithBlog;
    });
    
    console.log('📊 Total consolidated blogs:', consolidated.length);
    return consolidated;
  }, [landingPages, publishedBlogs]);

  // Memoize counts for performance
  const approvedBlogsCount = useMemo(() => {
    // Somar blogs de landing pages + blogs de produtos ativos
    const landingPageBlogs = consolidatedBlogs.length;
    const activeProductBlogs = productsWithBlogs.reduce((count, product) => {
      const preferences = JSON.parse(localStorage.getItem('blogConsolidationPreferences') || '{}');
      const productPrefs = preferences[product.id];
      if (productPrefs) {
        count += (productPrefs.useCommercial ? 1 : 0) + (productPrefs.useTechnical ? 1 : 0);
      }
      return count;
    }, 0);
    
    const totalCount = landingPageBlogs + activeProductBlogs;
    console.log('🔢 Approved blogs count:', {
      landingPageBlogs,
      activeProductBlogs,
      totalCount
    });
    return totalCount;
  }, [consolidatedBlogs, productsWithBlogs]);

  const generatedBlogsCount = useMemo(() => {
    const generatedCount = landingPages.filter(lp => 
      lp.status === 'approved' && (lp.blog_generated ?? lp.blogGenerated ?? false)
    ).length;
    console.log('🎯 Generated blogs count:', generatedCount);
    return generatedCount;
  }, [landingPages]);

  const publishedBlogsCount = useMemo(() => {
    const publishedCount = publishedBlogs.length;
    console.log('📤 Published blogs count:', publishedCount);
    return publishedCount;
  }, [publishedBlogs]);

  const fetchProductsWithBlogs = async () => {
    try {
      // Get all selected product IDs from approved landing pages with fallback for property names
      const allSelectedProductIds = approvedLandingPagesWithBlogs
        .filter(lp => {
          const productIds = lp.selected_product_ids ?? lp.selectedProductIds ?? [];
          return productIds.length > 0;
        })
        .flatMap(lp => lp.selected_product_ids ?? lp.selectedProductIds ?? []);
        
      console.log('🔍 Debug: Blog status monitor processing landing pages:', {
        totalPages: approvedLandingPagesWithBlogs.length,
        pagesWithProducts: approvedLandingPagesWithBlogs.filter(lp => (lp.selected_product_ids ?? lp.selectedProductIds ?? []).length > 0).length,
        allSelectedProductIds: allSelectedProductIds.length,
        sourcedFromSupabase: !!supabaseLandingPages
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

  const getBlogsByLandingPage = (landingPageId: string) => {
    return publishedBlogs.filter(blog => blog.landing_page_id === landingPageId);
  };

  return {
    consolidatedBlogs,
    approvedBlogsCount,
    generatedBlogsCount,
    publishedBlogsCount,
    publishedBlogs,
    getBlogsByLandingPage,
    refreshBlogs: fetchPublishedBlogs,
    approvedLandingPagesWithBlogs,
    productsWithBlogs,
    refreshProductsWithBlogs: fetchProductsWithBlogs,
  };
};