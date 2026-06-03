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
  images_gallery?: Array<{
    url: string;
    alt?: string;
    description?: string;
    width?: number;
    height?: number;
    is_main?: boolean;
  }>;
  product_url?: string;
  target_audience?: string[];
  youtube_videos?: any[];
  instagram_videos?: any[];
  testimonial_videos?: any[];
  technical_videos?: any[];
  tiktok_videos?: any[];
  tutorial_resources?: {
    tutorials: Array<{
      id: string;
      course_name: string;
      course_url: string;
      created_at: string;
    }>;
  };
  offer_discount_cta?: { label: string; url: string; visible: boolean };
  // Physical specifications
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
  // Blog content gerado por IA
  individual_blog_content?: {
    commercial?: string | null;
    technical?: string | null;
    generated_at?: string | null;
  };
  // Metadados técnicos (não exibir na UI)
  original_data?: {
    li_product_id?: string;
    [key: string]: any;
  };
}


export const useSelectedProducts = () => {
  const { toast } = useToast();

  const loadProductsByIds = useCallback(async (productIds: string[], forceRefresh = false): Promise<Product[]> => {
    if (productIds.length === 0) return [];

    try {
      // Explicit column list — never use select('*') on products_repository (causes DB timeouts)
      const COLUMNS = [
        'id', 'name', 'description', 'sales_pitch', 'benefits', 'features',
        'keywords', 'market_keywords', 'search_intent_keywords',
        'price', 'currency', 'category', 'image_url', 'images_gallery',
        'product_url', 'target_audience',
        'youtube_videos', 'instagram_videos', 'testimonial_videos',
        'technical_videos', 'tiktok_videos',
        'offer_discount_cta', 'individual_blog_content', 'original_data',
      ].join(', ');

      const { data, error } = await supabase
        .from('products_repository')
        .select(COLUMNS)
        .in('id', productIds);

      if (error) throw error;

      // Order products according to productIds order and format for template
      const rows = (data as any[]) || [];
      const orderedProducts = productIds
        .map(id => rows.find((p: any) => p.id === id))
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
          images_gallery: (product.images_gallery as any) || [],
          product_url: product.product_url || '',
          target_audience: (product.target_audience as unknown as string[]) || [],
          youtube_videos: (product.youtube_videos as unknown as any[]) || [],
          instagram_videos: (product.instagram_videos as unknown as any[]) || [],
          testimonial_videos: (product.testimonial_videos as unknown as any[]) || [],
          technical_videos: (product.technical_videos as unknown as any[]) || [],
          tiktok_videos: (product.tiktok_videos as unknown as any[]) || [],
          offer_discount_cta: (product as any).offer_discount_cta || { label: 'Comprar com Desconto', url: '', visible: false },
          // Incluir blog content para curadoria
          individual_blog_content: (product.individual_blog_content as any) || { commercial: null, technical: null, generated_at: null },
          // ✅ Preservar metadados técnicos (para IAs, não para UI)
          original_data: (product as any).original_data || {},
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
    
    // Convert to template format (offers) with full SEO data
    return products.map(product => ({
      id: product.id,
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
      target_audience: product.target_audience,
      offer_discount_cta: product.offer_discount_cta,
      category: product.category,
      individual_blog_content: product.individual_blog_content,
      youtube_videos: product.youtube_videos,
      instagram_videos: product.instagram_videos,
      testimonial_videos: product.testimonial_videos,
      technical_videos: product.technical_videos,
      tiktok_videos: product.tiktok_videos,
      tutorial_resources: product.tutorial_resources,
      images_gallery: product.images_gallery || [],
      sourceType: 'repository' as const,
      lastUpdated: new Date().toISOString(),
      selected: true,
      // ✅ Preservar metadados técnicos para edge functions
      original_data: product.original_data,
    }));
  }, [loadProductsByIds]);

  return {
    loadProductsByIds,
    getProductsForTemplate,
  };
};