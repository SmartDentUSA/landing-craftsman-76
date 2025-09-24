import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description?: string;
  sales_pitch?: string;
  benefits?: string[];
  features?: string[];
  keywords?: string[];
  market_keywords?: string[];
  search_intent_keywords?: string[];
  price?: number;
  currency?: string;
  category?: string;
  image_url?: string;
  product_url?: string;
  target_audience?: string[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  testimonial_videos?: any[];
  technical_videos?: any[];
  offer_discount_cta?: { label: string; url: string; visible: boolean };
}


export const useSelectedProducts = () => {
  const { toast } = useToast();

  const loadProductsByIds = useCallback(async (productIds: string[]): Promise<Product[]> => {
    if (productIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', productIds);

      if (error) throw error;

      // Order products according to productIds order and format for template
      const orderedProducts = productIds
        .map(id => data?.find(p => p.id === id))
        .filter(Boolean)
        .map(product => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          sales_pitch: (product as any).sales_pitch || '',
          benefits: (product as any).benefits || [],
          features: (product as any).features || [],
          keywords: (product as any).keywords || [],
          market_keywords: (product as any).market_keywords || [],
          search_intent_keywords: (product as any).search_intent_keywords || [],
          price: product.price || undefined,
          currency: product.currency || 'BRL',
          category: product.category || '',
          image_url: product.image_url || '',
          product_url: product.product_url || '',
      target_audience: (product.target_audience as unknown as string[]) || [],
      youtube_videos: (product.youtube_videos as unknown as any[]) || [],
      instagram_videos: (product.instagram_videos as unknown as any[]) || [],
      testimonial_videos: (product.testimonial_videos as unknown as any[]) || [],
      technical_videos: (product.technical_videos as unknown as any[]) || [],
      offer_discount_cta: (product as any).offer_discount_cta || { label: 'Comprar com Desconto', url: '', visible: false },
        })) as Product[];

      return orderedProducts;

    } catch (error) {
      console.error('Error loading products by IDs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos selecionados",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const getProductsForTemplate = useCallback(async (productIds: string[]) => {
    const products = await loadProductsByIds(productIds);
    
    // Convert to template format (offers)
    return products.map(product => ({
      name: product.name,
      description: product.description,
      price: product.price === 0 ? 'Pedir orçamento' : (product.price?.toString() || ''),
      currency: 'BRL',
      availability: 'InStock',
      valid_through: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      productUrl: product.product_url,
      image: product.image_url,
      sales_pitch: product.sales_pitch,
      benefits: product.benefits,
      features: product.features,
      keywords: product.keywords,
      market_keywords: product.market_keywords,
      search_intent_keywords: product.search_intent_keywords,
      offer_discount_cta: product.offer_discount_cta,
      sourceType: 'repository' as const,
      lastUpdated: new Date().toISOString(),
      selected: true,
    }));
  }, [loadProductsByIds]);

  return {
    loadProductsByIds,
    getProductsForTemplate,
  };
};