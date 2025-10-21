import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateBlogHTML } from '@/services/seo/blogHTMLGenerator';
import { useProductBlogsIntegration } from './useProductBlogsIntegration';
import { useSelectedProducts } from './useSelectedProducts';

interface ConsolidatedHTML {
  dentala: string;
  eodonto: string;
  generatedAt: string;
  productBlogsCount: { dentala: number; eodonto: number };
  strategicBlogTitle: { dentala: string; eodonto: string };
}

interface ConsolidatedHTMLMap {
  [landingPageId: string]: ConsolidatedHTML;
}

export const useConsolidatedBlogAutoGenerator = (approvedLandingPages: any[]) => {
  const [consolidatedHTMLs, setConsolidatedHTMLs] = useState<ConsolidatedHTMLMap>({});
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { productBlogsForHTMLByDomain } = useProductBlogsIntegration(approvedLandingPages);
  const { loadProductsByIds } = useSelectedProducts();

  // Detectar mudanças nos blogs publicados para regenerar
  useEffect(() => {
    const channel = supabase
      .channel('consolidated-blog-auto-generator')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'landing_pages',
      }, async (payload) => {
        const updatedPage = payload.new as any;
        
        // Regenerar quando landing page for aprovada E tiver blog gerado
        if (updatedPage.status === 'approved' && updatedPage.blog_generated) {
          console.log('🎯 Landing page aprovada com blog gerado detectada:', updatedPage.id);
          await generateConsolidatedForLandingPage(updatedPage.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blog_posts',
      }, async () => {
        // Quando blogs estratégicos forem atualizados, regenerar tudo
        console.log('📝 Blog estratégico atualizado, regenerando consolidados...');
        await generateAllConsolidated();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products_repository',
      }, async () => {
        // Quando blogs de produtos forem atualizados
        console.log('🔄 Blog de produto atualizado, regenerando consolidados...');
        await generateAllConsolidated();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [approvedLandingPages]);

  // Gerar HTML consolidado para uma landing page específica
  const generateConsolidatedForLandingPage = useCallback(async (landingPageId: string) => {
    if (isGenerating) {
      console.log('⏸️ Geração já em andamento, aguardando...');
      return;
    }

    try {
      setIsGenerating(true);
      console.log(`🚀 Iniciando geração consolidada para LP: ${landingPageId}`);

      // Buscar blog estratégico da landing page
      const { data: blogPosts, error: blogError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(2); // Dentala e Eodonto

      if (blogError) {
        console.error('❌ Erro ao buscar blogs estratégicos:', blogError);
        return;
      }

      if (!blogPosts || blogPosts.length === 0) {
        console.log('⚠️ Nenhum blog estratégico publicado encontrado para LP:', landingPageId);
        return;
      }

      // Identificar qual é Dentala e qual é Eodonto pelos domínios publicados
      const dentalaPost = blogPosts.find(bp => 
        bp.published_domains?.includes('dentala.com.br')
      );
      const eodontoPost = blogPosts.find(bp => 
        bp.published_domains?.includes('eodonto.com.br')
      );

      if (!dentalaPost || !eodontoPost) {
        console.log('⚠️ Blogs estratégicos incompletos (falta Dentala ou Eodonto)');
        return;
      }

      // Buscar produtos da landing page
      const landingPage = approvedLandingPages.find(lp => lp.id === landingPageId);
      const selectedProductIds = landingPage?.selected_product_ids || [];
      
      if (selectedProductIds.length === 0) {
        console.log('⚠️ Nenhum produto selecionado na LP:', landingPageId);
        return;
      }

      const selectedProductsData = await loadProductsByIds(selectedProductIds);

      // Buscar blogs de produtos filtrados por domínio e landing page
      const dentalaBlogsProducts = productBlogsForHTMLByDomain('dentala', landingPageId);
      const eodontoBlogsProducts = productBlogsForHTMLByDomain('eodonto', landingPageId);

      console.log('📊 Blogs encontrados:', {
        landingPageId,
        dentalaProducts: dentalaBlogsProducts.length,
        eodontoProducts: eodontoBlogsProducts.length,
        selectedProducts: selectedProductsData.length
      });

      // Agregar keywords
      const aggregatedKeywords = [
        ...new Set([
          ...(dentalaPost.keywords || []),
          ...(eodontoPost.keywords || []),
          ...selectedProductsData.flatMap(p => [
            ...(p.keywords || []),
            ...(p.market_keywords || []),
            ...(p.search_intent_keywords || [])
          ])
        ])
      ];

      // Gerar HTML para Dentala (Blog Estratégico + Blogs Técnicos)
      const dentalaHTML = await generateBlogHTML({
        blogs: [
          {
            title: dentalaPost.title,
            content: dentalaPost.content,
            meta_description: dentalaPost.meta_description,
            keywords: dentalaPost.keywords || [],
          },
          ...dentalaBlogsProducts.map(pb => ({
            title: pb.title,
            content: pb.content,
            keywords: pb.keywords || [],
          }))
        ],
        domain: 'dentala.com.br',
        canonicalUrl: '',
        finalTitle: dentalaPost.title,
        finalDescription: dentalaPost.meta_description || '',
        selectedProducts: selectedProductsData,
        keywords: aggregatedKeywords,
        preview: true,
        validateSchema: false,
        excludeFooter: true,
      });

      // Gerar HTML para Eodonto (Blog Estratégico + Blogs Comerciais)
      const eodontoHTML = await generateBlogHTML({
        blogs: [
          {
            title: eodontoPost.title,
            content: eodontoPost.content,
            meta_description: eodontoPost.meta_description,
            keywords: eodontoPost.keywords || [],
          },
          ...eodontoBlogsProducts.map(pb => ({
            title: pb.title,
            content: pb.content,
            keywords: pb.keywords || [],
          }))
        ],
        domain: 'eodonto.com.br',
        canonicalUrl: '',
        finalTitle: eodontoPost.title,
        finalDescription: eodontoPost.meta_description || '',
        selectedProducts: selectedProductsData,
        keywords: aggregatedKeywords,
        preview: true,
        validateSchema: false,
        excludeFooter: true,
      });

      // Armazenar no estado
      setConsolidatedHTMLs(prev => ({
        ...prev,
        [landingPageId]: {
          dentala: dentalaHTML,
          eodonto: eodontoHTML,
          generatedAt: new Date().toISOString(),
          productBlogsCount: {
            dentala: dentalaBlogsProducts.length,
            eodonto: eodontoBlogsProducts.length,
          },
          strategicBlogTitle: {
            dentala: dentalaPost.title,
            eodonto: eodontoPost.title,
          }
        }
      }));

      console.log('✅ HTML consolidado gerado com sucesso para LP:', landingPageId);
    } catch (error) {
      console.error('❌ Erro ao gerar HTML consolidado:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [approvedLandingPages, productBlogsForHTMLByDomain, loadProductsByIds, isGenerating]);

  // Gerar consolidados para todas as landing pages aprovadas
  const generateAllConsolidated = useCallback(async () => {
    console.log('🔄 Gerando HTMLs consolidados para todas as landing pages aprovadas...');
    
    const approvedWithBlogs = approvedLandingPages.filter(
      lp => lp.status === 'approved' && lp.blog_generated
    );

    for (const lp of approvedWithBlogs) {
      await generateConsolidatedForLandingPage(lp.id);
    }
  }, [approvedLandingPages, generateConsolidatedForLandingPage]);

  // Gerar automaticamente quando landing pages aprovadas mudarem
  useEffect(() => {
    const approvedWithBlogs = approvedLandingPages.filter(
      lp => lp.status === 'approved' && lp.blog_generated
    );

    if (approvedWithBlogs.length > 0) {
      // Debounce para evitar múltiplas gerações
      const timer = setTimeout(() => {
        generateAllConsolidated();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [approvedLandingPages]);

  return {
    consolidatedHTMLs,
    isGenerating,
    generateConsolidatedForLandingPage,
    generateAllConsolidated,
  };
};
