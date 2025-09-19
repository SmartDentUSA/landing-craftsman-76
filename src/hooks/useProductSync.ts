import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Video {
  url: string;
  description: string;
}

interface ProductOffer {
  name: string;
  description: string;
  price: string;
  image?: string;
  link?: string;
  // Coleções de vídeos movidas para company_profile
  youtube_videos?: Video[];
  instagram_videos?: Video[];
  testimonial_videos?: Video[];
  technical_videos?: Video[];
}

export const useProductSync = () => {
  const { toast } = useToast();

  const syncOffersToRepository = useCallback(async (landingPageId: string, offers: ProductOffer[]) => {
    try {
      // First, get existing products for this landing page
      const { data: existingProducts } = await supabase
        .from('products_repository')
        .select('id, name, product_url')
        .eq('source_landing_page_id', landingPageId);

      // Track which products should remain
      const processedNames = new Set<string>();

      for (const offer of offers) {
        if (!offer.name?.trim()) continue;

        processedNames.add(offer.name);

        // Check if product already exists
        const existingProduct = existingProducts?.find(p => 
          p.name === offer.name || p.product_url === offer.link
        );

        const productData = {
          name: offer.name,
          description: offer.description || '',
          price: offer.price ? parseFloat(offer.price.replace(/[^\d.,]/g, '').replace(',', '.')) : null,
          currency: 'BRL',
          image_url: offer.image || null,
          product_url: offer.link || null,
          source_type: 'landing_page_offer',
          source_landing_page_id: landingPageId,
          use_in_ai_generation: true,
          approved: true,
        };

        if (existingProduct) {
          // Update existing product
          await supabase
            .from('products_repository')
            .update(productData)
            .eq('id', existingProduct.id);
        } else {
          // Insert new product
          await supabase
            .from('products_repository')
            .insert(productData);
        }
      }

      // Remove products that are no longer in offers
      if (existingProducts) {
        const productsToRemove = existingProducts.filter(p => !processedNames.has(p.name));
        if (productsToRemove.length > 0) {
          await supabase
            .from('products_repository')
            .delete()
            .in('id', productsToRemove.map(p => p.id));
        }
      }

      toast({
        title: "Produtos sincronizados",
        description: `${offers.length} produtos foram sincronizados com o repositório.`,
      });

    } catch (error) {
      console.error('Error syncing offers to repository:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os produtos.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadProductsFromRepository = useCallback(async (landingPageId: string) => {
    try {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .eq('source_landing_page_id', landingPageId)
        .eq('use_in_ai_generation', true)
        .order('display_order', { ascending: true });

      return products?.map(product => ({
        name: product.name,
        description: product.description || '',
        price: product.price ? product.price.toString() : '',
        image: product.image_url || '',
        link: product.product_url || '',
        // Vídeos agora são da empresa, não por produto
        youtube_videos: [],
        instagram_videos: [],
        testimonial_videos: [],
        technical_videos: [],
      })) || [];

    } catch (error) {
      console.error('Error loading products from repository:', error);
      return [];
    }
  }, []);

  const migrateExistingOffers = useCallback(async (landingPageId: string) => {
    try {
      // Call the migration function
      const { data, error } = await supabase.functions.invoke('migrate-products-to-repository', {
        body: { landingPageId, dryRun: false }
      });

      if (error) throw error;

      toast({
        title: "Migração concluída",
        description: `${data?.summary?.totalMigrated || 0} produtos foram migrados para o repositório.`,
      });

      return data;
    } catch (error) {
      console.error('Error migrating offers:', error);
      toast({
        title: "Erro na migração",
        description: "Não foi possível migrar os produtos existentes.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const loadApprovedProductsForAI = useCallback(async () => {
    try {
      const { data: products } = await supabase
        .from('products_repository')
        .select('*')
        .eq('approved', true)
        .eq('use_in_ai_generation', true)
        .order('display_order', { ascending: true });

      return products?.map(product => ({
        name: product.name,
        description: product.description || '',
        price: product.price ? product.price.toString() : '',
        image: product.image_url || '',
        link: product.product_url || '',
        // Vídeos agora são da empresa, não por produto
        youtube_videos: [],
        instagram_videos: [],
        testimonial_videos: [],
        technical_videos: [],
      })) || [];

    } catch (error) {
      console.error('Error loading approved products for AI:', error);
      return [];
    }
  }, []);

  return {
    syncOffersToRepository,
    loadProductsFromRepository,
    migrateExistingOffers,
    loadApprovedProductsForAI,
  };
};