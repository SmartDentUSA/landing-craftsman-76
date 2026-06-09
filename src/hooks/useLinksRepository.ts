import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExternalLink {
  id: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  subcategory?: string;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface InternalLink {
  id: string;
  name: string;
  url: string;
  type: 'internal';
}

export interface CentralizedLink {
  id: string;
  name: string;
  url: string;
  category: string;
  type: 'internal' | 'external';
  description?: string;
}

export const useLinksRepository = () => {
  const [externalLinks, setExternalLinks] = useState<ExternalLink[]>([]);
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isNetworkError = (err: any) => {
    const msg = err?.message || String(err || '');
    return err instanceof TypeError || msg.includes('Failed to fetch') || msg.includes('NetworkError');
  };

  const withRetry = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (isNetworkError(err)) {
        await new Promise((r) => setTimeout(r, 1500));
        return await fn();
      }
      throw err;
    }
  };

  const loadExternalLinks = async () => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('external_links')
          .select('*')
          .eq('approved', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true })
      );

      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          console.warn('⚠️ External links: User not authenticated');
          return;
        }
        throw error;
      }
      setExternalLinks(data || []);
    } catch (error: any) {
      console.error('[useLinksRepository] external load failed:', {
        code: error?.code, message: error?.message, details: error?.details, hint: error?.hint,
      });
      if (isNetworkError(error)) {
        toast.error('Falha de conexão ao carregar links externos. Verifique sua internet ou extensões de bloqueio.');
      } else {
        toast.error('Erro ao carregar links externos');
      }
    }
  };

  const loadInternalLinks = async () => {
    try {
      const { data, error } = await withRetry(() =>
        supabase
          .from('landing_pages')
          .select('id, name, data')
          .eq('status', 'published')
          .order('name', { ascending: true })
      );

      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          console.warn('⚠️ Internal links: User not authenticated');
          return;
        }
        throw error;
      }
      
      const formatted = data?.map(page => {
        const pageData = page.data as any;
        return {
          id: page.id,
          name: page.name,
          url: pageData?.seo?.canonical_url || `/${page.id}`,
          type: 'internal' as const
        };
      }) || [];
      
      setInternalLinks(formatted);
    } catch (error: any) {
      console.error('[useLinksRepository] internal load failed:', {
        code: error?.code, message: error?.message, details: error?.details, hint: error?.hint,
      });
      if (isNetworkError(error)) {
        toast.error('Falha de conexão ao carregar links internos. Verifique sua internet ou extensões de bloqueio.');
      } else {
        toast.error('Erro ao carregar links internos');
      }
    }
  };

  const getAllLinks = (): CentralizedLink[] => {
    const external = externalLinks.map(link => ({
      id: link.id,
      name: link.name,
      url: link.url,
      category: link.category,
      type: 'external' as const,
      description: link.description
    }));

    const internal = internalLinks.map(link => ({
      id: link.id,
      name: link.name,
      url: link.url,
      category: 'landing-page',
      type: 'internal' as const
    }));

    return [...internal, ...external];
  };

  const addExternalLink = async (link: Omit<ExternalLink, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('external_links')
        .insert([link])
        .select()
        .single();

      if (error) throw error;
      
      setExternalLinks(prev => [...prev, data]);
      toast.success('Link externo adicionado com sucesso');
      return data;
    } catch (error) {
      console.error('Error adding external link:', error);
      toast.error('Erro ao adicionar link externo');
      throw error;
    }
  };

  const updateExternalLink = async (id: string, updates: Partial<ExternalLink>) => {
    try {
      const { data, error } = await supabase
        .from('external_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setExternalLinks(prev => prev.map(link => link.id === id ? data : link));
      toast.success('Link externo atualizado com sucesso');
      return data;
    } catch (error) {
      console.error('Error updating external link:', error);
      toast.error('Erro ao atualizar link externo');
      throw error;
    }
  };

  const deleteExternalLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('external_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setExternalLinks(prev => prev.filter(link => link.id !== id));
      toast.success('Link externo removido com sucesso');
    } catch (error) {
      console.error('Error deleting external link:', error);
      toast.error('Erro ao remover link externo');
      throw error;
    }
  };

  const syncWithProducts = async () => {
    try {
      setIsLoading(true);
      toast.info('Sincronizando keywords com produtos...');

      const { data: products, error: productsError } = await supabase
        .from('products_repository')
        .select('id, name, product_url, category, subcategory, description, keywords, search_intent_keywords')
        .eq('approved', true);

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        toast.warning('Nenhum produto aprovado encontrado.');
        setIsLoading(false);
        return;
      }

      const upsertPromises: Promise<void>[] = [];
      let keywordsProcessed = 0;

      products.forEach(product => {
        const productKeywords = new Set<string>();
        
        if (product.name) {
          productKeywords.add(product.name.toLowerCase().trim());
        }
        
        if (Array.isArray(product.keywords)) {
          product.keywords.forEach((kw: any) => {
            const keyword = typeof kw === 'string' ? kw : kw?.keyword || kw?.name;
            if (keyword?.trim()) {
              productKeywords.add(keyword.toLowerCase().trim());
            }
          });
        }
        
        if (Array.isArray(product.search_intent_keywords)) {
          product.search_intent_keywords.forEach((kw: any) => {
            const keyword = typeof kw === 'string' ? kw : kw?.keyword || kw?.name;
            if (keyword?.trim()) {
              productKeywords.add(keyword.toLowerCase().trim());
            }
          });
        }

        Array.from(productKeywords).forEach(keyword => {
          keywordsProcessed++;
          
          const destinationUrl = product.product_url || `/produto/${product.id}`;
          const description = `Keyword sincronizada do produto: ${product.name} (${product.category}${product.subcategory ? ` • ${product.subcategory}` : ''})`;
          
          const upsertData = {
            name: keyword,
            url: destinationUrl,
            category: product.category || 'produto',
            subcategory: product.subcategory || null,
            description: description,
            approved: true,
            source_products: [product.id],
            ai_generated: false
          };

          const promise = (async () => {
            await supabase
              .from('external_links')
              .upsert(upsertData, {
                onConflict: 'name',
                ignoreDuplicates: false
              })
              .select();
          })();

          upsertPromises.push(promise);
        });
      });

      await Promise.allSettled(upsertPromises);
      await loadExternalLinks();

      toast.success(`Sincronização concluída! ${keywordsProcessed} keywords processadas.`);

    } catch (error) {
      console.error('Error syncing with products:', error);
      toast.error('Erro ao sincronizar com produtos');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      // Verificar autenticação PRIMEIRO
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('⚠️ useLinksRepository: User not authenticated, skipping load');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await Promise.all([loadExternalLinks(), loadInternalLinks()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return {
    externalLinks,
    internalLinks,
    allLinks: getAllLinks(),
    isLoading,
    addExternalLink,
    updateExternalLink,
    deleteExternalLink,
    syncWithProducts,
    refreshData: () => Promise.all([loadExternalLinks(), loadInternalLinks()])
  };
};