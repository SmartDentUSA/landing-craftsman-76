import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { deepMerge } from '@/lib/deepMerge';

export interface LandingPage {
  id: string;
  name: string;
  status: string;
  last_modified: Date;
  version: number;
  template: string;
  data?: any;
  embed?: string;
  selected_product_ids?: string[];
  blog_generated?: boolean;
  blog_generated_at?: Date;
  user_id?: string;
}

export const useLandingPagesSupabase = () => {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Carregar landing pages do Supabase
  const loadLandingPages = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const pages = data?.map(page => ({
        ...page,
        last_modified: new Date(page.last_modified),
        blog_generated_at: page.blog_generated_at ? new Date(page.blog_generated_at) : undefined,
      })) || [];

      setLandingPages(pages);
    } catch (error) {
      console.error('Erro ao carregar landing pages:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar landing pages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Migrar dados do localStorage para Supabase
  const migrateFromLocalStorage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const localData = localStorage.getItem('landingPages');
      if (!localData) return;

      const localPages = JSON.parse(localData);
      if (!Array.isArray(localPages) || localPages.length === 0) return;

      // Verificar se já existem dados no Supabase
      const { data: existingPages } = await supabase
        .from('landing_pages')
        .select('id')
        .limit(1);

      if (existingPages && existingPages.length > 0) return; // Já migrado

      // Preparar dados para inserção
      const pagesToInsert = localPages.map(page => ({
        id: page.id,
        name: page.name,
        status: page.status || 'draft',
        last_modified: new Date(page.lastModified || Date.now()).toISOString(),
        version: page.version || 1,
        template: page.template || 'modern',
        data: page.data,
        embed: page.embed,
        selected_product_ids: page.selectedProductIds || [],
        blog_generated: page.blogGenerated || false,
        blog_generated_at: page.blogGeneratedAt ? new Date(page.blogGeneratedAt).toISOString() : null,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('landing_pages')
        .insert(pagesToInsert);

      if (error) throw error;

      // Limpar localStorage após migração bem-sucedida
      localStorage.removeItem('landingPages');
      
      toast({
        title: "Migração concluída",
        description: `${pagesToInsert.length} landing pages migradas com sucesso`,
      });

      await loadLandingPages();
    } catch (error) {
      console.error('Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: "Falha ao migrar dados do localStorage",
        variant: "destructive"
      });
    }
  };

  // Adicionar nova landing page
  const addLandingPage = useCallback(async (landingPage: Omit<LandingPage, 'id' | 'last_modified' | 'version' | 'user_id'>): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const newPage = {
        id: crypto.randomUUID(),
        name: landingPage.name,
        status: landingPage.status,
        template: landingPage.template,
        data: landingPage.data,
        embed: landingPage.embed,
        selected_product_ids: landingPage.selected_product_ids,
        blog_generated: landingPage.blog_generated,
        blog_generated_at: landingPage.blog_generated_at?.toISOString(),
        last_modified: new Date().toISOString(),
        version: 1,
        user_id: user.id
      };

      const { error } = await supabase
        .from('landing_pages')
        .insert([newPage]);

      if (error) throw error;

      await loadLandingPages();
      return newPage.id;
    } catch (error) {
      console.error('Erro ao adicionar landing page:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar landing page",
        variant: "destructive"
      });
      return '';
    }
  }, [loadLandingPages, toast]);

  // Atualizar landing page
  const updateLandingPage = useCallback(async (id: string, updates: Partial<LandingPage>): Promise<boolean> => {
    try {
      console.log('🔄 [Update LP] Iniciando update para LP:', id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ [Update LP] Usuário não autenticado');
        return false;
      }

      // Whitelist de colunas permitidas no banco
      const allowedTopLevel = new Set([
        'name', 'status', 'template', 'data', 'embed',
        'selected_product_ids', 'blog_generated', 'blog_generated_at'
      ]);

      // Buscar dados atuais da landing page
      const { data: currentLP, error: fetchError } = await supabase
        .from('landing_pages')
        .select('data')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ [Update LP] Erro ao buscar LP atual:', fetchError);
        return false;
      }

      // Preparar updates apenas com colunas permitidas
      const supabaseUpdates: any = {};

      // Se updates.data existe, fazer deep merge com dados existentes
      if (updates.data) {
        const existingData = typeof currentLP?.data === 'object' && currentLP.data !== null
          ? currentLP.data as any
          : {};

        console.log('🔀 [Update LP] Fazendo deep merge:', {
          existingKeys: Object.keys(existingData),
          updateKeys: Object.keys(updates.data)
        });

        supabaseUpdates.data = deepMerge(existingData, updates.data);

        console.log('✅ [Update LP] Merge concluído:', {
          resultKeys: Object.keys(supabaseUpdates.data)
        });
      }

      // Copiar apenas campos permitidos do topo
      for (const key of Object.keys(updates)) {
        if (allowedTopLevel.has(key) && key !== 'data') {
          if (key === 'blog_generated_at' && updates.blog_generated_at instanceof Date) {
            supabaseUpdates[key] = updates.blog_generated_at.toISOString();
          } else {
            supabaseUpdates[key] = (updates as any)[key];
          }
        }
      }

      console.log('📤 [Update LP] RPC payload keys:', Object.keys(supabaseUpdates));

      const { data: ok, error: rpcError } = await supabase.rpc('admin_update_landing_page', {
        _id: id,
        _user_id: user.id,
        _name: supabaseUpdates.name ?? null,
        _status: supabaseUpdates.status ?? null,
        _template: supabaseUpdates.template ?? null,
        _data: supabaseUpdates.data ?? null,
        _selected_product_ids: supabaseUpdates.selected_product_ids ?? null,
        _embed: supabaseUpdates.embed ?? null,
        _blog_generated: typeof supabaseUpdates.blog_generated === 'boolean' ? supabaseUpdates.blog_generated : null,
        _blog_generated_at: supabaseUpdates.blog_generated_at ?? null
      });

      if (rpcError) {
        console.error('❌ [Update LP] RPC erro:', rpcError);
        toast({
          title: 'Erro ao salvar (RPC)',
          description: `${rpcError.message}${rpcError.code ? ' | Código: ' + rpcError.code : ''}${rpcError.hint ? ' | Hint: ' + rpcError.hint : ''}`,
          variant: 'destructive'
        });
      } else if (ok === true) {
        console.log('✅ [Update LP] RPC ok');
        await loadLandingPages();
        return true;
      } else {
        console.warn('⚠️ [Update LP] RPC retornou falso (sem permissão ou ID inválido)');
        toast({
          title: 'Sem permissão para salvar',
          description: 'Você não possui permissão ou o ID é inválido.',
          variant: 'destructive'
        });
      }

      // Fallback: tentar update direto respeitando RLS (caso RPC indisponível)
      const { data: updatedRow, error } = await supabase
        .from('landing_pages')
        .update({
          ...('name' in supabaseUpdates ? { name: supabaseUpdates.name } : {}),
          ...('status' in supabaseUpdates ? { status: supabaseUpdates.status } : {}),
          ...('template' in supabaseUpdates ? { template: supabaseUpdates.template } : {}),
          ...('data' in supabaseUpdates ? { data: supabaseUpdates.data } : {}),
          ...('selected_product_ids' in supabaseUpdates ? { selected_product_ids: supabaseUpdates.selected_product_ids } : {}),
          ...('embed' in supabaseUpdates ? { embed: supabaseUpdates.embed } : {}),
          ...('blog_generated' in supabaseUpdates ? { blog_generated: supabaseUpdates.blog_generated } : {}),
          ...('blog_generated_at' in supabaseUpdates ? { blog_generated_at: supabaseUpdates.blog_generated_at } : {}),
          last_modified: new Date().toISOString()
        })
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error || !updatedRow) {
        console.error('❌ [Update LP] Fallback update falhou:', error);
        toast({
          title: 'Erro ao salvar (fallback)',
          description: error ? `${error.message}${error.code ? ' | Código: ' + error.code : ''}${error.hint ? ' | Hint: ' + error.hint : ''}` : 'Falha desconhecida ao salvar',
          variant: 'destructive'
        });
        return false;
      }

      console.log('✅ [Update LP] Fallback update bem-sucedido');
      await loadLandingPages();
      return true;
    } catch (error) {
      console.error('❌ [Update LP] Exceção capturada:', error);
      return false;
    }
  }, [loadLandingPages]);

  // Deletar landing page
  const deleteLandingPage = useCallback(async (id: string) => {
    try {
      // ✅ 1. Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({
          title: "❌ Não autenticado",
          description: "Faça login para deletar landing pages",
          variant: "destructive"
        });
        return;
      }

      // ✅ 2. Verificar permissão de admin
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (roleError) {
        console.error('❌ Erro ao verificar role:', roleError);
        toast({
          title: "❌ Erro de permissão",
          description: `Falha ao verificar permissões: ${roleError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!isAdmin) {
        toast({
          title: "🚫 Sem permissão",
          description: "Apenas administradores podem deletar landing pages",
          variant: "destructive"
        });
        return;
      }

      // ✅ 3. Tentar deletar
      const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao deletar:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        throw error;
      }

      // ✅ 4. Sucesso
      toast({
        title: "✅ Landing page excluída",
        description: "A landing page foi removida com sucesso",
      });

      await loadLandingPages();
    } catch (error: any) {
      console.error('❌ Erro ao deletar landing page:', error);
      toast({
        title: "❌ Erro ao deletar",
        description: error.message || "Falha ao deletar landing page. Verifique permissões.",
        variant: "destructive"
      });
    }
  }, [loadLandingPages, toast]);

  // Obter landing page específica por ID
  const getLandingPage = useMemo(() => {
    return (id: string): LandingPage | undefined => {
      return landingPages.find(page => page.id === id);
    };
  }, [landingPages]);

  useEffect(() => {
    const initializeData = async () => {
      await migrateFromLocalStorage();
      await loadLandingPages();
    };

    initializeData();

    // Setup realtime subscription
    const subscription = supabase
      .channel('landing_pages_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'landing_pages' 
        }, 
        () => {
          loadLandingPages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadLandingPages]);

  return {
    landingPages,
    isLoading,
    addLandingPage,
    updateLandingPage,
    deleteLandingPage,
    getLandingPage,
    loadLandingPages,
  };
};

export default useLandingPagesSupabase;