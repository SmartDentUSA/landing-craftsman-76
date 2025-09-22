import { useEffect, useState, useMemo } from 'react';
import useLandingPages from './useLandingPages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useBlogStatusMonitor = () => {
  const landingPages = useLandingPages((state) => state.landingPages);
  const [publishedBlogs, setPublishedBlogs] = useState<any[]>([]);

  // Memoize approved landing pages with blog data to detect changes
  const approvedLandingPagesWithBlogs = useMemo(() => {
    return landingPages.filter(lp => lp.status === 'approved');
  }, [landingPages]);

  useEffect(() => {
    fetchPublishedBlogs();
  }, []);

  // React to changes in approved landing pages
  useEffect(() => {
    console.log('🔄 Blog monitor detected landing page changes:', {
      approvedCount: approvedLandingPagesWithBlogs.length,
      withBlogGenerated: approvedLandingPagesWithBlogs.filter(lp => lp.blogGenerated).length
    });
  }, [approvedLandingPagesWithBlogs]);

  const fetchPublishedBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublishedBlogs(data || []);
      console.log('📚 Published blogs fetched:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching published blogs:', error);
    }
  };

  const getConsolidatedBlogs = () => {
    const consolidatedBlogs = landingPages.filter(lp => {
      const hasPublishedBlog = publishedBlogs.some(blog => blog.landing_page_id === lp.id);
      const isApprovedWithBlog = lp.status === 'approved' && (lp.blogGenerated || hasPublishedBlog);
      
      if (isApprovedWithBlog) {
        console.log(`✅ Blog consolidated for LP ${lp.id}:`, {
          blogGenerated: lp.blogGenerated,
          hasPublishedBlog,
          name: lp.name
        });
      }
      
      return isApprovedWithBlog;
    });
    
    console.log('📊 Total consolidated blogs:', consolidatedBlogs.length);
    return consolidatedBlogs;
  };

  const getApprovedBlogsCount = () => {
    const count = getConsolidatedBlogs().length;
    console.log('🔢 Approved blogs count:', count);
    return count;
  };

  const getGeneratedBlogsCount = () => {
    const generatedCount = landingPages.filter(lp => 
      lp.status === 'approved' && lp.blogGenerated
    ).length;
    console.log('🎯 Generated blogs count:', generatedCount);
    return generatedCount;
  };

  const getPublishedBlogsCount = () => {
    const publishedCount = publishedBlogs.length;
    console.log('📤 Published blogs count:', publishedCount);
    return publishedCount;
  };

  const getBlogsByLandingPage = (landingPageId: string) => {
    return publishedBlogs.filter(blog => blog.landing_page_id === landingPageId);
  };

  return {
    consolidatedBlogs: getConsolidatedBlogs(),
    approvedBlogsCount: getApprovedBlogsCount(),
    generatedBlogsCount: getGeneratedBlogsCount(),
    publishedBlogsCount: getPublishedBlogsCount(),
    publishedBlogs,
    getBlogsByLandingPage,
    refreshBlogs: fetchPublishedBlogs,
    approvedLandingPagesWithBlogs,
  };
};