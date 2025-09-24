import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BlogVersion {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
}

export interface DualBlogVersions {
  dentala: BlogVersion;
  eodonto: BlogVersion;
}

export interface BlogGeneratorOptions {
  type: 'simple' | 'dual' | 'preview';
  landingPageId: string;
  landingPageData?: any;
  selectedProductIds?: string[];
  authorId?: string;
}

export const useBlogGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<BlogVersion | DualBlogVersions | null>(null);
  const { toast } = useToast();

  const generateBlog = useCallback(async (options: BlogGeneratorOptions) => {
    setGenerating(true);
    setError(null);

    try {
      console.log('🚀 Generating blog with options:', options);

      const requestBody = {
        type: options.type === 'simple' ? 'simple_blog' : 
              options.type === 'dual' ? 'dual_blog' : 'preview_blog',
        landingPageId: options.landingPageId,
        landingPageData: options.landingPageData,
        selectedProductIds: options.selectedProductIds || [],
        authorId: options.authorId
      };

      const { data, error: functionError } = await supabase.functions.invoke('generate-blog-content', {
        body: requestBody
      });

      if (functionError) throw functionError;

      if (!data?.success) {
        throw new Error(data?.error || 'Falha na geração do blog');
      }

      const content = data.content;
      setLastGenerated(content);

      // Save to database if it's not just a preview
      if (options.type !== 'preview') {
        await saveBlogContent(options, content);
      }

      toast({
        title: "Blog Gerado!",
        description: `Blog ${options.type === 'dual' ? 'duplo' : 'simples'} criado com sucesso`,
      });

      return content;

    } catch (err: any) {
      console.error('❌ Error generating blog:', err);
      const errorMessage = err.message || 'Erro ao gerar blog';
      setError(errorMessage);
      
      toast({
        title: "Erro na Geração",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [toast]);

  const saveBlogContent = useCallback(async (options: BlogGeneratorOptions, content: BlogVersion | DualBlogVersions) => {
    try {
      if (options.type === 'dual') {
        const dualContent = content as DualBlogVersions;
        
        // Save Dentala version
        await supabase
          .from('blog_posts')
          .upsert({
            landing_page_id: options.landingPageId,
            title: dualContent.dentala.title,
            content: dualContent.dentala.content,
            meta_description: dualContent.dentala.metaDescription,
            keywords: dualContent.dentala.keywords,
            published_domains: ['dentala.com.br'],
            status: 'generated',
            author_kol_id: options.authorId || null
          }, {
            onConflict: 'landing_page_id,published_domains',
            ignoreDuplicates: false
          });

        // Save Eodonto version
        await supabase
          .from('blog_posts')
          .upsert({
            landing_page_id: options.landingPageId,
            title: dualContent.eodonto.title,
            content: dualContent.eodonto.content,
            meta_description: dualContent.eodonto.metaDescription,
            keywords: dualContent.eodonto.keywords,
            published_domains: ['eodonto.com'],
            status: 'generated',
            author_kol_id: options.authorId || null
          }, {
            onConflict: 'landing_page_id,published_domains',
            ignoreDuplicates: false
          });

      } else {
        const singleContent = content as BlogVersion;
        
        await supabase
          .from('blog_posts')
          .upsert({
            landing_page_id: options.landingPageId,
            title: singleContent.title,
            content: singleContent.content,
            meta_description: singleContent.metaDescription,
            keywords: singleContent.keywords,
            status: 'generated',
            author_kol_id: options.authorId || null
          }, {
            onConflict: 'landing_page_id',
            ignoreDuplicates: false
          });
      }

      console.log('💾 Blog content saved to database');
    } catch (error) {
      console.error('Error saving blog content:', error);
      toast({
        title: "Aviso",
        description: "Blog gerado mas não foi salvo automaticamente",
        variant: "destructive"
      });
    }
  }, [toast]);

  const regenerateBlog = useCallback(async (options: BlogGeneratorOptions) => {
    return generateBlog({ ...options, type: 'simple' });
  }, [generateBlog]);

  const generatePreview = useCallback(async (landingPageId: string, landingPageData?: any) => {
    return generateBlog({
      type: 'preview',
      landingPageId,
      landingPageData
    });
  }, [generateBlog]);

  const generateDualVersion = useCallback(async (landingPageId: string, landingPageData?: any, authorId?: string) => {
    return generateBlog({
      type: 'dual',
      landingPageId,
      landingPageData,
      authorId
    });
  }, [generateBlog]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLastGenerated = useCallback(() => {
    setLastGenerated(null);
  }, []);

  return {
    generating,
    error,
    lastGenerated,
    generateBlog,
    regenerateBlog,
    generatePreview,
    generateDualVersion,
    clearError,
    clearLastGenerated,
  };
};