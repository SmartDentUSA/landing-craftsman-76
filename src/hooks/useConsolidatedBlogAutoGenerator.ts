import { useState, useEffect, useCallback, useRef } from 'react';
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
  const lastGenerationAtRef = useRef<Map<string, number>>(new Map());
  
  const { productBlogsForHTMLByDomain } = useProductBlogsIntegration(approvedLandingPages);
  const { loadProductsByIds } = useSelectedProducts();

  // Cooldown helper: impede geração repetida da mesma LP
  const canGenerate = useCallback((lpId: string, cooldownMs = 20000): boolean => {
    const last = lastGenerationAtRef.current.get(lpId) || 0;
    if (Date.now() - last < cooldownMs) {
      console.log(`⏳ [COOLDOWN] Ignorando geração para LP ${lpId} (aguardar ${Math.ceil((cooldownMs - (Date.now() - last)) / 1000)}s)`);
      return false;
    }
    lastGenerationAtRef.current.set(lpId, Date.now());
    return true;
  }, []);

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

  // Detectar mudanças relevantes nos blogs para regenerar (com filtros específicos)
  useEffect(() => {
    // Calcular IDs e mapas relevantes
    const approvedLPIds = approvedLandingPages
      .filter(lp => lp.status === 'approved' && lp.blog_generated)
      .map(lp => lp.id);
    
    const allSelectedProductIds = Array.from(
      new Set(approvedLandingPages.flatMap(lp => lp.selected_product_ids || []))
    );

    // Mapa: productId -> [lpIds que usam esse produto]
    const productIdToLPs = new Map<string, string[]>();
    approvedLandingPages.forEach(lp => {
      (lp.selected_product_ids || []).forEach((productId: string) => {
        const lpsList = productIdToLPs.get(productId) || [];
        lpsList.push(lp.id);
        productIdToLPs.set(productId, lpsList);
      });
    });

    if (approvedLPIds.length === 0) {
      console.log('⚠️ [REALTIME] Nenhuma LP aprovada com blog gerado. Não criando canais.');
      return;
    }

    console.log('🔌 [REALTIME] Configurando canais filtrados:', {
      approvedLPIds: approvedLPIds.length,
      allProductIds: allSelectedProductIds.length,
      productIdToLPs: productIdToLPs.size
    });

    const channel = supabase
      .channel('consolidated-blog-auto-generator')
      // 1️⃣ LANDING PAGES: só LPs aprovadas
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'landing_pages',
        filter: `id=in.(${approvedLPIds.join(',')})`
      }, async (payload) => {
        const old = payload.old as any;
        const updated = payload.new as any;
        
        // Gerar APENAS se: status virou approved OU blog_generated virou true
        const statusChanged = old.status !== 'approved' && updated.status === 'approved';
        const blogGenerated = old.blog_generated !== true && updated.blog_generated === true;

        if (statusChanged || blogGenerated) {
          console.log(`📄 [LP UPDATE] LP ${updated.id} disparou geração:`, { statusChanged, blogGenerated });
          if (canGenerate(updated.id)) {
            await generateConsolidatedForLandingPage(updated.id);
          }
        } else {
          console.log(`📄 [LP UPDATE] LP ${updated.id} ignorado (mudança irrelevante)`);
        }
      })
      // 2️⃣ BLOG POSTS: só blogs das LPs aprovadas
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blog_posts',
        filter: `landing_page_id=in.(${approvedLPIds.join(',')})`
      }, async (payload) => {
        const old = payload.old as any;
        const updated = payload.new as any;

        const statusPublished = old.status !== 'published' && updated.status === 'published';
        const domainsChanged = JSON.stringify(old.published_domains) !== JSON.stringify(updated.published_domains);
        const contentChanged = old.content !== updated.content && updated.status === 'published';

        if (statusPublished || domainsChanged || contentChanged) {
          console.log(`📝 [BLOG UPDATE] Blog ${updated.id} da LP ${updated.landing_page_id}:`, {
            statusPublished,
            domainsChanged,
            contentChanged
          });
          if (canGenerate(updated.landing_page_id)) {
            await generateConsolidatedForLandingPage(updated.landing_page_id);
          }
        } else {
          console.log(`📝 [BLOG UPDATE] Blog ${updated.id} ignorado (mudança irrelevante)`);
        }
      })
      // 3️⃣ PRODUCTS: só produtos selecionados nas LPs
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products_repository',
        filter: allSelectedProductIds.length > 0 ? `id=in.(${allSelectedProductIds.join(',')})` : undefined
      }, async (payload) => {
        const old = payload.old as any;
        const updated = payload.new as any;

        const blogContentChanged = 
          JSON.stringify(old.individual_blog_content) !== JSON.stringify(updated.individual_blog_content);

        if (blogContentChanged) {
          const affectedLPs = productIdToLPs.get(updated.id) || [];
          console.log(`📦 [PRODUCT UPDATE] Produto ${updated.id} alterou blog. LPs afetadas:`, affectedLPs);
          
          for (const lpId of affectedLPs) {
            if (canGenerate(lpId)) {
              await generateConsolidatedForLandingPage(lpId);
            }
          }
        } else {
          console.log(`📦 [PRODUCT UPDATE] Produto ${updated.id} ignorado (blog inalterado)`);
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 [REALTIME] Removendo canais');
      supabase.removeChannel(channel);
    };
  }, [approvedLandingPages, canGenerate, generateConsolidatedForLandingPage]);

  // Gerar automaticamente APENAS LPs que ainda não têm HTML consolidado (inicialização)
  useEffect(() => {
    const approvedWithBlogs = approvedLandingPages.filter(
      lp => lp.status === 'approved' && lp.blog_generated
    );

    console.log('🔍 [INIT] Landing pages aprovadas com blogs:', {
      total: approvedLandingPages.length,
      approved: approvedLandingPages.filter(lp => lp.status === 'approved').length,
      withBlogs: approvedWithBlogs.length
    });

    if (approvedWithBlogs.length > 0) {
      // Apenas gerar LPs que ainda não têm HTML consolidado
      const lpsToGenerate = approvedWithBlogs.filter(lp => !consolidatedHTMLs[lp.id]);
      
      if (lpsToGenerate.length > 0) {
        console.log(`⏰ [INIT] Agendando geração inicial para ${lpsToGenerate.length} LP(s) sem cache`);
        const timer = setTimeout(async () => {
          for (const lp of lpsToGenerate) {
            if (canGenerate(lp.id)) {
              console.log(`🚀 [INIT] Gerando HTML para LP: ${lp.id}`);
              await generateConsolidatedForLandingPage(lp.id);
            }
          }
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        console.log('✅ [INIT] Todas as LPs aprovadas já têm HTML consolidado em cache');
      }
    } else {
      console.log('⚠️ [INIT] Nenhuma landing page aprovada com blog gerado encontrada');
    }
  }, [approvedLandingPages, consolidatedHTMLs, canGenerate, generateConsolidatedForLandingPage]);

  return {
    consolidatedHTMLs,
    isGenerating,
    generateConsolidatedForLandingPage,
    generateAllConsolidated,
  };
};
