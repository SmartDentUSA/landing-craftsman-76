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
      console.log(`🎯 [INÍCIO] Gerando HTML consolidado para LP: ${landingPageId}`);

      // Buscar blog estratégico da landing page
      console.log('📚 [PASSO 1] Buscando blogs estratégicos para LP:', landingPageId);
      const { data: blogPosts, error: blogError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(2); // Dentala e Eodonto

      if (blogError) {
        console.error('❌ [ERRO] Falha ao buscar blogs estratégicos:', blogError);
        return;
      }

      console.log('✅ [PASSO 1] Blogs estratégicos encontrados:', {
        total: blogPosts?.length || 0,
        blogs: blogPosts?.map(b => ({ 
          id: b.id,
          title: b.title, 
          status: b.status,
          published_domains: b.published_domains 
        }))
      });

      if (!blogPosts || blogPosts.length === 0) {
        console.error('❌ [ERRO] Nenhum blog estratégico publicado encontrado para LP:', landingPageId);
        return;
      }

      // Identificar qual é Dentala e qual é Eodonto pelos domínios publicados
      const dentalaPost = blogPosts.find(bp => 
        bp.published_domains?.includes('dentala.com.br')
      );
      const eodontoPost = blogPosts.find(bp => 
        bp.published_domains?.includes('eodonto.com.br')
      );

      console.log('🔍 [PASSO 2] Verificando blogs por domínio:', {
        dentalaPost: dentalaPost ? dentalaPost.title : 'NÃO ENCONTRADO',
        eodontoPost: eodontoPost ? eodontoPost.title : 'NÃO ENCONTRADO'
      });

      if (!dentalaPost || !eodontoPost) {
        console.error('❌ [ERRO] Blogs estratégicos incompletos:', { 
          dentalaBlog: !!dentalaPost, 
          eodontoBlog: !!eodontoPost,
          message: 'Ambos os domínios (dentala + eodonto) devem ter blogs publicados'
        });
        return;
      }

      console.log('✅ [PASSO 2] Blogs estratégicos completos');

      // Buscar produtos da landing page
      console.log('🔍 [PASSO 3] Buscando produtos selecionados da LP');
      const landingPage = approvedLandingPages.find(lp => lp.id === landingPageId);
      const selectedProductIds = landingPage?.selected_product_ids || [];
      
      console.log('✅ [PASSO 3] Produtos vinculados à LP:', { 
        count: selectedProductIds.length, 
        productIds: selectedProductIds 
      });

      if (selectedProductIds.length === 0) {
        console.warn('⚠️ Nenhum produto selecionado na LP:', landingPageId);
        return;
      }

      const selectedProductsData = await loadProductsByIds(selectedProductIds);

      // Buscar blogs de produtos filtrados por domínio e landing page
      console.log('📦 [PASSO 4] Buscando blogs de produtos por domínio');
      const dentalaBlogsProducts = productBlogsForHTMLByDomain('dentala', landingPageId);
      const eodontoBlogsProducts = productBlogsForHTMLByDomain('eodonto', landingPageId);

      console.log('✅ [PASSO 4] Blogs de produtos encontrados:', {
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
      console.log('🎨 [PASSO 5] Gerando HTML consolidado para Dentala');
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

      console.log('✅ [PASSO 5] HTML Dentala gerado com sucesso');

      // Gerar HTML para Eodonto (Blog Estratégico + Blogs Comerciais)
      console.log('🎨 [PASSO 6] Gerando HTML consolidado para Eodonto');
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

      console.log('✅ [PASSO 6] HTML Eodonto gerado com sucesso');

      // Armazenar no estado
      console.log('💾 [PASSO 7] Armazenando HTMLs consolidados no estado');
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

      console.log('✅ [SUCESSO] HTML consolidado gerado e armazenado para LP:', landingPageId);
    } catch (error) {
      console.error('❌ [ERRO FATAL] Falha ao gerar HTML consolidado:', {
        landingPageId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
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

    console.log('🔍 Landing pages aprovadas com blogs:', {
      total: approvedLandingPages.length,
      approved: approvedLandingPages.filter(lp => lp.status === 'approved').length,
      withBlogs: approvedWithBlogs.length,
      landingPages: approvedWithBlogs.map(lp => ({
        id: lp.id,
        name: lp.name,
        status: lp.status,
        blog_generated: lp.blog_generated
      }))
    });

    if (approvedWithBlogs.length > 0) {
      console.log('⏰ Agendando geração consolidada em 1 segundo...');
      // Debounce para evitar múltiplas gerações
      const timer = setTimeout(() => {
        console.log('🚀 Iniciando geração consolidada para todas as LPs aprovadas');
        generateAllConsolidated();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      console.log('⚠️ Nenhuma landing page aprovada com blog gerado encontrada');
    }
  }, [approvedLandingPages]);

  return {
    consolidatedHTMLs,
    isGenerating,
    generateConsolidatedForLandingPage,
    generateAllConsolidated,
  };
};
