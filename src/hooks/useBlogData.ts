import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useLandingPages from '@/hooks/useLandingPages';

export interface BlogData {
  id?: string;
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
  status: 'draft' | 'generated' | 'published';
  publishedDomains: string[];
  landingPageId: string;
  authorKolId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogDataState {
  currentBlog: BlogData | null;
  publishedBlogs: BlogData[];
  loading: boolean;
  error: string | null;
  syncStatus: {
    isOutOfSync: boolean;
    lastCheck: Date | null;
  };
}

export const useBlogData = (landingPageId?: string) => {
  const [state, setState] = useState<BlogDataState>({
    currentBlog: null,
    publishedBlogs: [],
    loading: false,
    error: null,
    syncStatus: {
      isOutOfSync: false,
      lastCheck: null
    }
  });

  const landingPages = useLandingPages((state) => state.landingPages);

  // Memoize landing page data
  const landingPageData = useMemo(() => {
    return landingPageId ? landingPages.find(lp => lp.id === landingPageId) : null;
  }, [landingPageId, landingPages]);

  // Load blog data when landing page ID changes
  useEffect(() => {
    if (landingPageId) {
      loadBlogData(landingPageId);
    }
  }, [landingPageId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!landingPageId) return;

    const channel = supabase
      .channel(`blog-data-${landingPageId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'blog_posts',
        filter: `landing_page_id=eq.${landingPageId}`
      }, () => {
        console.log('📢 Blog data changed, reloading...');
        loadBlogData(landingPageId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [landingPageId]);

  const loadBlogData = useCallback(async (lpId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Load all blogs for this landing page
      const { data: blogs, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', lpId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const blogData = blogs?.map(blog => ({
        id: blog.id,
        title: blog.title,
        content: blog.content,
        metaDescription: blog.meta_description || '',
        keywords: blog.keywords || [],
        status: blog.status as BlogData['status'],
        publishedDomains: blog.published_domains || [],
        landingPageId: blog.landing_page_id,
        authorKolId: blog.author_kol_id,
        createdAt: blog.created_at,
        updatedAt: blog.updated_at
      })) || [];

      // Set current blog (most recent or first published)
      const currentBlog = blogData.find(blog => blog.status === 'published') || blogData[0] || null;
      const publishedBlogs = blogData.filter(blog => blog.status === 'published');

      setState(prev => ({
        ...prev,
        currentBlog,
        publishedBlogs,
        loading: false,
        syncStatus: {
          ...prev.syncStatus,
          lastCheck: new Date()
        }
      }));

      // Check sync status if we have landing page data
      if (landingPageData && currentBlog) {
        checkSyncStatus(landingPageData, currentBlog);
      }

    } catch (err: any) {
      console.error('❌ Error loading blog data:', err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.message 
      }));
    }
  }, [landingPageData]);

  const checkSyncStatus = useCallback((lpData: any, blog: BlogData) => {
    // Check if blog content is out of sync with landing page data
    const isOutOfSync = (
      lpData.title !== blog.title ||
      (lpData.subtitle && !blog.content.includes(lpData.subtitle)) ||
      (lpData.updated_at && new Date(lpData.updated_at) > new Date(blog.updatedAt || ''))
    );

    setState(prev => ({
      ...prev,
      syncStatus: {
        isOutOfSync,
        lastCheck: new Date()
      }
    }));
  }, []);

  const saveBlogDraft = useCallback(async (blogData: Partial<BlogData>) => {
    if (!landingPageId) throw new Error('Landing page ID is required');

    try {
      const dataToSave = {
        landing_page_id: landingPageId,
        title: blogData.title || '',
        content: blogData.content || '',
        meta_description: blogData.metaDescription || '',
        keywords: blogData.keywords || [],
        status: 'draft',
        published_domains: blogData.publishedDomains || [],
        author_kol_id: blogData.authorKolId || null
      };

      let result;
      if (state.currentBlog?.id) {
        // Update existing
        result = await supabase
          .from('blog_posts')
          .update(dataToSave)
          .eq('id', state.currentBlog.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from('blog_posts')
          .insert(dataToSave)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const savedBlog: BlogData = {
        id: result.data.id,
        title: result.data.title,
        content: result.data.content,
        metaDescription: result.data.meta_description,
        keywords: result.data.keywords,
        status: result.data.status,
        publishedDomains: result.data.published_domains,
        landingPageId: result.data.landing_page_id,
        authorKolId: result.data.author_kol_id,
        createdAt: result.data.created_at,
        updatedAt: result.data.updated_at
      };

      setState(prev => ({
        ...prev,
        currentBlog: savedBlog
      }));

      return savedBlog;
    } catch (error) {
      console.error('Error saving blog draft:', error);
      throw error;
    }
  }, [landingPageId, state.currentBlog?.id]);

  const publishBlog = useCallback(async (domains: string[] = []) => {
    if (!state.currentBlog?.id) throw new Error('No blog to publish');

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_domains: domains.length > 0 ? domains : ['default']
        })
        .eq('id', state.currentBlog.id)
        .select()
        .single();

      if (error) throw error;

      // Reload data to get updated state
      await loadBlogData(landingPageId!);

      return data;
    } catch (error) {
      console.error('Error publishing blog:', error);
      throw error;
    }
  }, [state.currentBlog?.id, landingPageId, loadBlogData]);

  const deleteBlog = useCallback(async (blogId: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', blogId);

      if (error) throw error;

      // Reload data
      if (landingPageId) {
        await loadBlogData(landingPageId);
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      throw error;
    }
  }, [landingPageId, loadBlogData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshData = useCallback(() => {
    if (landingPageId) {
      loadBlogData(landingPageId);
    }
  }, [landingPageId, loadBlogData]);

  return {
    ...state,
    landingPageData,
    saveBlogDraft,
    publishBlog,
    deleteBlog,
    clearError,
    refreshData,
    loadBlogData,
  };
};