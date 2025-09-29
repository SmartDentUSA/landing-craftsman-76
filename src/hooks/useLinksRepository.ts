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

  const loadExternalLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('external_links')
        .select('*')
        .eq('approved', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setExternalLinks(data || []);
    } catch (error) {
      console.error('Error loading external links:', error);
      toast.error('Erro ao carregar links externos');
    }
  };

  const loadInternalLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('id, name, data')
        .eq('status', 'published')
        .order('name', { ascending: true });

      if (error) throw error;
      
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
    } catch (error) {
      console.error('Error loading internal links:', error);
      toast.error('Erro ao carregar links internos');
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

  useEffect(() => {
    const loadData = async () => {
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
    refreshData: () => Promise.all([loadExternalLinks(), loadInternalLinks()])
  };
};