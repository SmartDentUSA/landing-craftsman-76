import { useEffect, useState } from 'react';
import useLandingPages from './useLandingPages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useBlogStatusMonitor = () => {
  const landingPages = useLandingPages((state) => state.landingPages);
  const [publishedBlogs, setPublishedBlogs] = useState<any[]>([]);

  useEffect(() => {
    fetchPublishedBlogs();
  }, []);

  const fetchPublishedBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublishedBlogs(data || []);
    } catch (error) {
      console.error('Error fetching published blogs:', error);
    }
  };

  const getConsolidatedBlogs = () => {
    return landingPages.filter(lp => {
      const hasPublishedBlog = publishedBlogs.some(blog => blog.landing_page_id === lp.id);
      return lp.status === 'approved' && (lp.blogGenerated || hasPublishedBlog);
    });
  };

  const getApprovedBlogsCount = () => {
    return getConsolidatedBlogs().length;
  };

  const getBlogsByLandingPage = (landingPageId: string) => {
    return publishedBlogs.filter(blog => blog.landing_page_id === landingPageId);
  };

  return {
    consolidatedBlogs: getConsolidatedBlogs(),
    approvedBlogsCount: getApprovedBlogsCount(),
    publishedBlogs,
    getBlogsByLandingPage,
    refreshBlogs: fetchPublishedBlogs,
  };
};