import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateBlogHTML } from '@/services/seo/blogHTMLGenerator';
import { useProductBlogsIntegration } from './useProductBlogsIntegration';
import { useSelectedProducts } from './useSelectedProducts';

interface ExtractedBlog {
  id: string;
  title: string;
  type: 'strategic' | 'technical' | 'commercial';
  htmlContent: string;
  order: number;
  productName?: string;
  productId?: string;
}

interface ConsolidatedHTML {
  dentala: string;
  eodonto: string;
  generatedAt: string;
  productBlogsCount: { dentala: number; eodonto: number };
  strategicBlogTitle: { dentala: string; eodonto: string };
  dentalaBlogs: ExtractedBlog[];
  eodontoBlogs: ExtractedBlog[];
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

  // ✅ CACHE-FIRST: Carregar do banco (universal) e localStorage (fallback) na inicialização
  useEffect(() => {
    const loadCache = async () => {
      try {
        // 1️⃣ Tentar carregar do banco primeiro (cache universal)
        const approvedLPIds = approvedLandingPages
          .filter(lp => lp.status === 'approved' && lp.blog_generated)
          .map(lp => lp.id);

        if (approvedLPIds.length > 0) {
          const { data: lpsWithCache } = await supabase
            .from('landing_pages')
            .select('id, consolidated_html_cache, consolidated_generated_at')
            .in('id', approvedLPIds)
            .not('consolidated_html_cache', 'is', null);

          if (lpsWithCache && lpsWithCache.length > 0) {
            const dbCache: ConsolidatedHTMLMap = {};
            lpsWithCache.forEach(lp => {
              if (lp.consolidated_html_cache) {
                dbCache[lp.id] = lp.consolidated_html_cache as any as ConsolidatedHTML;
              }
            });
            
            if (Object.keys(dbCache).length > 0) {
              setConsolidatedHTMLs(dbCache);
              console.log('✅ [CACHE DB] HTMLs consolidados carregados do Supabase:', Object.keys(dbCache).length, 'LPs');
              return; // Retornar aqui evita fallback para localStorage
            }
          }
        }

        // 2️⃣ Fallback: localStorage (se não houver nada no banco)
        const localCached = localStorage.getItem('consolidatedHTMLs_v2');
        if (localCached) {
          const parsed = JSON.parse(localCached);
          setConsolidatedHTMLs(parsed);
          console.log('✅ [CACHE LOCAL] HTMLs consolidados carregados do localStorage (fallback):', Object.keys(parsed).length, 'LPs');
        }
      } catch (error) {
        console.error('❌ [CACHE] Erro ao carregar cache:', error);
      }
    };

    loadCache();
  }, [approvedLandingPages]);

  // ✅ CACHE-FIRST: Salvar no localStorage quando mudar
  useEffect(() => {
    if (Object.keys(consolidatedHTMLs).length > 0) {
      try {
        localStorage.setItem('consolidatedHTMLs_v2', JSON.stringify(consolidatedHTMLs));
        console.log('💾 [CACHE] HTMLs consolidados salvos no localStorage:', Object.keys(consolidatedHTMLs).length, 'LPs');
      } catch (error) {
        console.error('❌ [CACHE] Erro ao salvar cache (quota excedida?):', error);
        // Limpar cache antigo se quota excedida
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          localStorage.removeItem('consolidatedHTMLs_v1');
          localStorage.removeItem('consolidatedHTMLs_v2');
        }
      }
    }
  }, [consolidatedHTMLs]);

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

  // Extrair blogs individuais do HTML consolidado usando markers
  const extractIndividualBlogs = useCallback((
    consolidatedHTML: string,
    domain: 'dentala' | 'eodonto',
    productBlogs: any[]
  ): ExtractedBlog[] => {
    const blogs: ExtractedBlog[] = [];
    
    // Regex para encontrar markers
    const markerRegex = /<!-- BLOG_START:([^>]+) -->([\s\S]*?)<!-- BLOG_END:\1 -->/g;
    let match;
    let index = 0;

    console.log(`🔍 [EXTRACTION] Extraindo blogs de ${domain}...`);

    while ((match = markerRegex.exec(consolidatedHTML)) !== null) {
      const blogId = match[1];
      const blogContent = match[2];
      
      // Extrair título do data-attribute
      const titleMatch = blogContent.match(/data-blog-title="([^"]*)"/);
      const title = titleMatch 
        ? titleMatch[1].replace(/&quot;/g, '"')
        : `Blog ${index + 1}`;
      
      // Extrair tipo do data-attribute
      const typeMatch = blogContent.match(/data-blog-type="([^"]*)"/);
      const type = (typeMatch ? typeMatch[1] : 'strategic') as 'strategic' | 'technical' | 'commercial';
      
      // Associar com produto (se não for estratégico)
      let productName: string | undefined;
      let productId: string | undefined;

      if (index > 0 && productBlogs[index - 1]) {
        const productBlog = productBlogs[index - 1];
        productName = productBlog.productName;
        productId = productBlog.productId;
      }

      // Reconstruir HTML completo individual preservando estilos
      const headMatch = consolidatedHTML.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      const head = headMatch ? headMatch[0] : '';
      
      const individualHTML = `<!DOCTYPE html>
<html lang="pt-BR">
${head}
<body>
  <div class="container" role="main">
    <main>
      ${blogContent}
    </main>
  </div>
</body>
</html>`;

      blogs.push({
        id: blogId,
        title,
        type,
        htmlContent: individualHTML,
        order: index,
        productName,
        productId
      });

      index++;
    }

    console.log(`✅ [EXTRACTION] ${blogs.length} blogs extraídos de ${domain}:`, 
      blogs.map(b => ({ title: b.title, type: b.type }))
    );

    return blogs;
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

      // ✅ EXTRAIR BLOGS INDIVIDUAIS
      console.log('🔍 [PASSO 7] Extraindo blogs individuais...');
      const dentalaBlogs = extractIndividualBlogs(
        dentalaHTML,
        'dentala',
        dentalaBlogsProducts
      );

      const eodontoBlogs = extractIndividualBlogs(
        eodontoHTML,
        'eodonto',
        eodontoBlogsProducts
      );

      console.log(`📦 [PASSO 7] Blogs extraídos:`, {
        dentala: dentalaBlogs.length,
        eodonto: eodontoBlogs.length
      });

      // Armazenar no estado
      console.log('💾 [PASSO 8] Armazenando HTMLs consolidados no estado');
      const consolidatedData: ConsolidatedHTML = {
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
        },
        dentalaBlogs,
        eodontoBlogs
      };

      setConsolidatedHTMLs(prev => ({
        ...prev,
        [landingPageId]: consolidatedData
      }));

      // ✅ PERSISTIR NO BANCO (cache universal)
      console.log('💾 [PASSO 9] Salvando no banco (Supabase)...');
      const { error: updateError } = await supabase
        .from('landing_pages')
        .update({
          consolidated_html_cache: consolidatedData as any,
          consolidated_generated_at: new Date().toISOString()
        })
        .eq('id', landingPageId);

      if (updateError) {
        console.error('❌ [ERRO] Falha ao salvar cache no banco:', updateError);
      } else {
        console.log('✅ [SUCESSO] Cache salvo no banco (Supabase)');
      }

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

  // ⚠️ REALTIME DESATIVADO: Cache-First significa ZERO geração automática
  // Regeneração ocorre APENAS por ação manual do usuário (botão "Gerar HTML Consolidado")
  // Se quiser reativar Realtime condicionalmente, use uma feature flag
  useEffect(() => {
    console.log('⚠️ [REALTIME] Subscrições Realtime desativadas (Cache-First ativo)');
    console.log('💡 [INFO] Para regenerar HTMLs, use o botão manual no Editor');
    // Código Realtime comentado para evitar gerações automáticas:
    /*
    const approvedLPIds = approvedLandingPages
      .filter(lp => lp.status === 'approved' && lp.blog_generated)
      .map(lp => lp.id);
    
    if (approvedLPIds.length === 0) return;

    const channel = supabase
      .channel('consolidated-blog-auto-generator')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'landing_pages',
        filter: `id=in.(${approvedLPIds.join(',')})`
      }, async (payload) => {
        const updated = payload.new as any;
        if (!consolidatedHTMLs[updated.id] && canGenerate(updated.id)) {
          await generateConsolidatedForLandingPage(updated.id);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    */
  }, []);

  // ✅ REMOVIDO: Geração automática na inicialização
  // Agora o usuário deve clicar manualmente em "Gerar HTML Consolidado" no Editor
  // Cache persiste no localStorage entre sessões

  return {
    consolidatedHTMLs,
    isGenerating,
    generateConsolidatedForLandingPage,
    generateAllConsolidated,
  };
};
