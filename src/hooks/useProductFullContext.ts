/**
 * Hook centralizado para obter contexto COMPLETO de produtos
 * Garante que 100% dos campos do products_repository estejam disponíveis
 * para qualquer geração de conteúdo (SEO, IA, GEO)
 */

import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { toast } from 'sonner';

export interface ProductFullContext {
  // Dados básicos
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  
  // Preços e disponibilidade
  price: number | null;
  promo_price: number | null;
  currency: string | null;
  availability: string | null;
  stock_quantity: number | null;
  condition: string | null;
  
  // SEO
  seo_title_override: string | null;
  seo_description_override: string | null;
  slug: string | null;
  canonical_url: string | null;
  product_url: string | null;
  
  // Keywords (todos os tipos)
  keywords: any[] | null;
  market_keywords: any[] | null;
  search_intent_keywords: any[] | null;
  bot_trigger_words: any[] | null;
  tags: any[] | null;
  
  // Público e aplicações
  target_audience: any[] | null;
  applications: string | null;
  
  // Conteúdo AI
  benefits: any[] | null;
  features: any[] | null;
  faq: any[] | null;
  sales_pitch: string | null;
  
  // Imagens
  image_url: string | null;
  images_gallery: any[] | null;
  
  // Vídeos
  youtube_videos: any[] | null;
  instagram_videos: any[] | null;
  technical_videos: any[] | null;
  testimonial_videos: any[] | null;
  tiktok_videos: any[] | null;
  video_captions: any[] | null;
  
  // Documentos técnicos
  technical_specifications: any[] | null;
  technical_documents: any[] | null;
  document_transcriptions: any[] | null;
  
  // Workflow (com related_products) - usando any para compatibilidade com Json do Supabase
  workflow_stages: any | null;
  
  // Competição
  competitor_comparison: any | null;
  
  // CTAs e Recursos
  resource_cta1: any | null;
  resource_cta2: any | null;
  resource_cta3: any | null;
  resource_descriptions: any | null;
  tutorial_resources: any[] | null;
  offer_discount_cta: any | null;
  
  // E-commerce/Merchant
  gtin: string | null;
  mpn: string | null;
  ean: string | null;
  google_product_category: string | null;
  variations: any[] | null;
  
  // Atributos físicos
  color: string | null;
  size: string | null;
  material: string | null;
  weight: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  
  // Conteúdo social já gerado
  instagram_copies: any | null;
  youtube_descriptions: any | null;
  tiktok_content: any | null;
  whatsapp_messages: any | null;
  whatsapp_sequences: any | null;
  
  // Blog individual
  individual_blog_content: any | null;
  ecommerce_html: any | null;
  
  // Metadados
  approved: boolean | null;
  active: boolean | null;
  featured: boolean | null;
  showcase: boolean | null;
  created_at: string;
  updated_at: string;
  
  // Campos calculados
  _completeness: {
    score: number;
    missingCritical: string[];
    missingOptional: string[];
  };
}

// Campos críticos para geração de conteúdo
const CRITICAL_FIELDS = [
  'name', 'description', 'price', 'image_url', 'category',
  'keywords', 'target_audience', 'benefits', 'features'
];

// Campos importantes mas opcionais
const IMPORTANT_FIELDS = [
  'sales_pitch', 'faq', 'technical_specifications', 'workflow_stages',
  'video_captions', 'document_transcriptions', 'competitor_comparison',
  'market_keywords', 'search_intent_keywords'
];

function calculateCompleteness(product: any): ProductFullContext['_completeness'] {
  const missingCritical: string[] = [];
  const missingOptional: string[] = [];
  
  CRITICAL_FIELDS.forEach(field => {
    const value = product[field];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingCritical.push(field);
    }
  });
  
  IMPORTANT_FIELDS.forEach(field => {
    const value = product[field];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      missingOptional.push(field);
    }
  });
  
  // Score: críticos valem 10 pontos, opcionais valem 5
  const criticalScore = ((CRITICAL_FIELDS.length - missingCritical.length) / CRITICAL_FIELDS.length) * 60;
  const optionalScore = ((IMPORTANT_FIELDS.length - missingOptional.length) / IMPORTANT_FIELDS.length) * 40;
  
  return {
    score: Math.round(criticalScore + optionalScore),
    missingCritical,
    missingOptional
  };
}

export function useProductFullContext() {
  /**
   * Carrega contexto COMPLETO de um produto pelo ID
   */
  const getFullProductContext = useCallback(async (productId: string): Promise<ProductFullContext | null> => {
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      if (!data) return null;
      
      const completeness = calculateCompleteness(data);
      
      return {
        ...data,
        _completeness: completeness
      } as unknown as ProductFullContext;
    } catch (error) {
      console.error('❌ Error loading full product context:', error);
      toast.error('Erro ao carregar contexto do produto');
      return null;
    }
  }, []);
  
  /**
   * Carrega contexto COMPLETO de múltiplos produtos
   */
  const getMultipleProductsContext = useCallback(async (productIds: string[]): Promise<ProductFullContext[]> => {
    if (!productIds.length) return [];
    
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', productIds);
      
      if (error) throw error;
      if (!data) return [];
      
      return data.map(product => ({
        ...product,
        _completeness: calculateCompleteness(product)
      })) as unknown as ProductFullContext[];
    } catch (error) {
      console.error('❌ Error loading multiple products context:', error);
      toast.error('Erro ao carregar contexto dos produtos');
      return [];
    }
  }, []);
  
  /**
   * Gera contexto consolidado para IA (texto formatado)
   */
  const getAIFormattedContext = useCallback(async (productIds: string[]): Promise<string> => {
    const products = await getMultipleProductsContext(productIds);
    
    if (!products.length) return '';
    
    let context = `## CONTEXTO COMPLETO DOS PRODUTOS (${products.length})\n\n`;
    
    products.forEach((product, index) => {
      context += `### ${index + 1}. ${product.name}\n`;
      context += `**Completude:** ${product._completeness.score}%\n\n`;
      
      // Dados básicos
      if (product.description) context += `**Descrição:** ${product.description}\n`;
      if (product.category) context += `**Categoria:** ${product.category}${product.subcategory ? ` > ${product.subcategory}` : ''}\n`;
      if (product.brand) context += `**Marca:** ${product.brand}\n`;
      if (product.price) context += `**Preço:** R$ ${product.price}${product.promo_price ? ` (Promo: R$ ${product.promo_price})` : ''}\n`;
      
      // SEO/URLs
      if (product.product_url) context += `**URL:** ${product.product_url}\n`;
      if (product.seo_title_override) context += `**SEO Title:** ${product.seo_title_override}\n`;
      if (product.seo_description_override) context += `**SEO Description:** ${product.seo_description_override}\n`;
      
      // Sales Pitch
      if (product.sales_pitch) context += `\n**Pitch de Vendas:**\n${product.sales_pitch}\n`;
      
      // Keywords
      if (product.keywords?.length) context += `**Keywords:** ${(product.keywords as any[]).join(', ')}\n`;
      if (product.market_keywords?.length) context += `**Market Keywords:** ${(product.market_keywords as any[]).join(', ')}\n`;
      if (product.search_intent_keywords?.length) context += `**Search Intent:** ${(product.search_intent_keywords as any[]).join(', ')}\n`;
      
      // Público
      if (product.target_audience?.length) context += `**Público-Alvo:** ${(product.target_audience as any[]).join(', ')}\n`;
      if (product.applications) context += `**Aplicações:** ${product.applications}\n`;
      
      // Benefits/Features
      if (product.benefits?.length) context += `**Benefícios:** ${(product.benefits as any[]).join('; ')}\n`;
      if (product.features?.length) context += `**Features:** ${(product.features as any[]).join('; ')}\n`;
      
      // Technical Specs
      if (product.technical_specifications?.length) {
        context += `\n**Especificações Técnicas:**\n`;
        (product.technical_specifications as any[]).forEach(spec => {
          if (typeof spec === 'object' && spec.key && spec.value) {
            context += `- ${spec.key}: ${spec.value}\n`;
          } else if (typeof spec === 'string') {
            context += `- ${spec}\n`;
          }
        });
      }
      
      // Workflow Stages with Related Products
      if (product.workflow_stages) {
        context += `\n**Etapas do Workflow:**\n`;
        Object.entries(product.workflow_stages as Record<string, any>).forEach(([stage, data]: [string, any]) => {
          if (data.applicable) {
            context += `- **${stage}:** ${data.description || 'Aplicável'}\n`;
            if (data.competitive_advantages?.length) {
              context += `  - Vantagens: ${data.competitive_advantages.join(', ')}\n`;
            }
            if (data.related_products?.length) {
              context += `  - Produtos Relacionados: ${data.related_products.map((rp: any) => `${rp.product_name} (${rp.role})`).join(', ')}\n`;
            }
          }
        });
      }
      
      // Video Captions
      if (product.video_captions?.length) {
        context += `\n**Transcrições de Vídeo (${(product.video_captions as any[]).length}):**\n`;
        (product.video_captions as any[]).slice(0, 3).forEach(vc => {
          const captions = vc.captions || vc.transcription || '';
          context += `- ${vc.video_title || 'Vídeo'}: ${captions.substring(0, 200)}...\n`;
        });
      }
      
      // Document Transcriptions
      if (product.document_transcriptions?.length) {
        context += `\n**Transcrições de Documentos (${(product.document_transcriptions as any[]).length}):**\n`;
        (product.document_transcriptions as any[]).slice(0, 2).forEach(dt => {
          const content = dt.content || dt.transcription || '';
          context += `- ${dt.document_name || 'Documento'}: ${content.substring(0, 200)}...\n`;
        });
      }
      
      // Competitor Comparison
      if (product.competitor_comparison) {
        context += `\n**Comparação com Concorrentes:**\n`;
        if (typeof product.competitor_comparison === 'object') {
          context += JSON.stringify(product.competitor_comparison, null, 2).substring(0, 500) + '...\n';
        }
      }
      
      // FAQ
      if (product.faq?.length) {
        context += `\n**FAQ (${(product.faq as any[]).length} perguntas):**\n`;
        (product.faq as any[]).slice(0, 5).forEach(faq => {
          context += `- Q: ${faq.question || faq.pergunta}\n  A: ${(faq.answer || faq.resposta || '').substring(0, 150)}...\n`;
        });
      }
      
      context += `\n---\n\n`;
    });
    
    return context;
  }, [getMultipleProductsContext]);
  
  /**
   * Verifica quais campos estão faltando para geração otimizada
   */
  const getMissingFieldsReport = useCallback(async (productIds: string[]): Promise<{
    totalProducts: number;
    averageCompleteness: number;
    commonMissingCritical: string[];
    commonMissingOptional: string[];
  }> => {
    const products = await getMultipleProductsContext(productIds);
    
    if (!products.length) {
      return {
        totalProducts: 0,
        averageCompleteness: 0,
        commonMissingCritical: [],
        commonMissingOptional: []
      };
    }
    
    const avgScore = products.reduce((sum, p) => sum + p._completeness.score, 0) / products.length;
    
    // Contar frequência de campos faltantes
    const criticalCount: Record<string, number> = {};
    const optionalCount: Record<string, number> = {};
    
    products.forEach(p => {
      p._completeness.missingCritical.forEach(field => {
        criticalCount[field] = (criticalCount[field] || 0) + 1;
      });
      p._completeness.missingOptional.forEach(field => {
        optionalCount[field] = (optionalCount[field] || 0) + 1;
      });
    });
    
    // Ordenar por frequência
    const sortByCount = (obj: Record<string, number>) => 
      Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .map(([field]) => field);
    
    return {
      totalProducts: products.length,
      averageCompleteness: Math.round(avgScore),
      commonMissingCritical: sortByCount(criticalCount),
      commonMissingOptional: sortByCount(optionalCount)
    };
  }, [getMultipleProductsContext]);
  
  return {
    getFullProductContext,
    getMultipleProductsContext,
    getAIFormattedContext,
    getMissingFieldsReport,
    CRITICAL_FIELDS,
    IMPORTANT_FIELDS
  };
}
