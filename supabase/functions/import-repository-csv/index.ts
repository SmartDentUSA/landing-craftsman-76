import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductData {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  image_url?: string;
  product_url?: string;
  tags?: string | string[];
  keywords?: string | string[];
  features?: string | string[];
  benefits?: string | string[];
  search_intent_keywords?: string | string[];
  market_keywords?: string | string[];
  target_audience?: string | string[];
  sales_pitch?: string;
  youtube_videos?: string | any[];
  instagram_videos?: string | any[];
  technical_videos?: string | any[];
  testimonial_videos?: string | any[];
  video_captions?: string | object;
  ai_generated_category?: boolean;
  ai_generated_keywords?: boolean;
  ai_generated_benefits?: boolean;
  use_in_ai_generation?: boolean;
  approved?: boolean;
  display_order?: number;
  source_type?: string;
  source_landing_page_id?: string;
  original_data?: string | object;
}

const parseJsonField = (value: any): any => {
  if (!value || value === '') return null;
  
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      // Se não conseguir parsear como JSON, tentar como array simples
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return value;
    }
  }
  
  return value;
};

const sanitizeProduct = (product: ProductData): any => {
  const sanitized: any = {
    name: product.name || 'Produto sem nome',
    description: product.description || null,
    price: product.price ? parseFloat(product.price.toString()) : null,
    currency: product.currency || 'BRL',
    category: product.category || null,
    subcategory: product.subcategory || null,
    image_url: product.image_url || null,
    product_url: product.product_url || null,
    sales_pitch: product.sales_pitch || null,
    ai_generated_category: product.ai_generated_category === true || product.ai_generated_category === 'true',
    ai_generated_keywords: product.ai_generated_keywords === true || product.ai_generated_keywords === 'true',
    ai_generated_benefits: product.ai_generated_benefits === true || product.ai_generated_benefits === 'true',
    use_in_ai_generation: product.use_in_ai_generation !== false && product.use_in_ai_generation !== 'false',
    approved: product.approved !== false && product.approved !== 'false',
    display_order: product.display_order ? parseInt(product.display_order.toString()) : null,
    source_type: product.source_type || 'csv_import',
    source_landing_page_id: product.source_landing_page_id || null,
  };

  // Processar campos JSON
  const jsonFields = [
    'tags', 'keywords', 'features', 'benefits', 
    'search_intent_keywords', 'market_keywords', 'target_audience',
    'youtube_videos', 'instagram_videos', 'technical_videos', 'testimonial_videos'
  ];

  jsonFields.forEach(field => {
    sanitized[field] = parseJsonField(product[field as keyof ProductData]) || [];
  });

  // Campos especiais
  sanitized.video_captions = parseJsonField(product.video_captions) || {};
  sanitized.original_data = parseJsonField(product.original_data) || null;

  // Adicionar ID se fornecido
  if (product.id && product.id.trim() !== '') {
    sanitized.id = product.id;
  }

  return sanitized;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products, type } = await req.json();

    if (!products || !Array.isArray(products)) {
      throw new Error('Array de produtos é obrigatório');
    }

    if (type !== 'products') {
      throw new Error('Tipo não suportado ainda');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Iniciando importação de ${products.length} produtos...`);

    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const product of products) {
      try {
        const sanitizedProduct = sanitizeProduct(product);
        
        if (sanitizedProduct.id) {
          // Tentar atualizar produto existente
          const { error: updateError } = await supabaseClient
            .from('products_repository')
            .update({
              ...sanitizedProduct,
              updated_at: new Date().toISOString()
            })
            .eq('id', sanitizedProduct.id);

          if (updateError) {
            // Se não conseguir atualizar, criar como novo
            const { id, ...newProduct } = sanitizedProduct;
            const { error: insertError } = await supabaseClient
              .from('products_repository')
              .insert(newProduct);

            if (insertError) {
              throw insertError;
            }
            imported++;
          } else {
            updated++;
          }
        } else {
          // Criar novo produto
          const { error: insertError } = await supabaseClient
            .from('products_repository')
            .insert(sanitizedProduct);

          if (insertError) {
            throw insertError;
          }
          imported++;
        }

      } catch (error) {
        console.error('Erro ao processar produto:', product.name, error);
        errors++;
        errorDetails.push(`${product.name || 'Produto sem nome'}: ${error.message}`);
      }
    }

    console.log(`Importação concluída: ${imported} criados, ${updated} atualizados, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: imported,
        updated: updated,
        errors: errors,
        errorDetails: errorDetails.slice(0, 10), // Máximo 10 detalhes de erro
        total: products.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na importação:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});