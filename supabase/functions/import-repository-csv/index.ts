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
  if (value === undefined || value === null || value === '' || value === '[object Object]') return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // Try common list delimiters
      if (!trimmed.startsWith('[') && (trimmed.includes(';') || trimmed.includes(','))) {
        const delimiter = trimmed.includes(';') ? ';' : ',';
        return trimmed
          .split(delimiter)
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
      return trimmed;
    }
  }

  return value;
};

const sanitizeProduct = (product: ProductData): any => {
  // Normalize booleans including pt-BR strings
  const toBool = (v: any, defaultTrue = false) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const val = v.trim().toLowerCase();
      if (['true', 'sim', 'yes', '1'].includes(val)) return true;
      if (['false', 'nao', 'não', 'no', '0'].includes(val)) return false;
    }
    return defaultTrue;
  };

  let image_url = product.image_url || null;
  let product_url = product.product_url || null;

  // URL swap heuristics: if product_url looks like an image and image_url doesn't, swap
  const looksLikeImage = (url?: string | null) => !!url && /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  const looksLikeHttp = (url?: string | null) => !!url && /^https?:\/\//i.test(url);

  if (looksLikeImage(product_url) || (!looksLikeHttp(image_url) && looksLikeHttp(product_url))) {
    const tmp = image_url;
    image_url = product_url;
    product_url = tmp;
  }

  const sanitized: any = {
    name: product.name || 'Produto sem nome',
    description: product.description || null,
    price: product.price ? parseFloat(product.price.toString()) : null,
    currency: product.currency || 'BRL',
    category: product.category || null,
    subcategory: product.subcategory || null,
    image_url,
    product_url,
    sales_pitch: product.sales_pitch || null,
    ai_generated_category: toBool(product.ai_generated_category, false),
    ai_generated_keywords: toBool(product.ai_generated_keywords, false),
    ai_generated_benefits: toBool(product.ai_generated_benefits, false),
    use_in_ai_generation: toBool(product.use_in_ai_generation, true),
    approved: toBool(product.approved, true),
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
    sanitized[field] = parseJsonField((product as any)[field]) || [];
  });

  // Processar video_captions (objeto JSON, não array)
  if (product.video_captions) {
    try {
      if (typeof product.video_captions === 'string') {
        sanitized.video_captions = product.video_captions === '{}' ? {} : JSON.parse(product.video_captions);
      } else {
        sanitized.video_captions = product.video_captions;
      }
    } catch {
      sanitized.video_captions = {};
    }
  } else {
    sanitized.video_captions = {};
  }

  // Processar original_data
  if (product.original_data) {
    sanitized.original_data = parseJsonField(product.original_data);
  }

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
    const logs: Array<{ name: string; id?: string; action: 'insert' | 'update'; status: 'success' | 'error'; error?: string; matched_by?: string }> = [];

    for (const product of products) {
      try {
        console.log('🔄 Processando produto:', product.name);
        const sanitizedProduct = sanitizeProduct(product);
        console.log('✨ Produto sanitizado:', sanitizedProduct);
        
        let matchedBy: string | undefined;
        let productId: string | undefined;

        if (sanitizedProduct.id) {
          console.log(`📝 Tentando atualizar produto com ID: ${sanitizedProduct.id}`);
          
          // Tentar atualizar produto existente por ID
          const { data: updateData, error: updateError } = await supabaseClient
            .from('products_repository')
            .update({
              ...sanitizedProduct,
              updated_at: new Date().toISOString()
            })
            .eq('id', sanitizedProduct.id)
            .select();

          console.log('📊 Resultado da atualização por ID:', { updateData, updateError, rowsAffected: updateData?.length });

          if (updateError) {
            console.log('⚠️ Erro na atualização por ID:', updateError.message);
            throw updateError;
          }
          
          if (updateData && updateData.length > 0) {
            updated++;
            productId = updateData[0].id;
            matchedBy = 'id';
            logs.push({ 
              name: sanitizedProduct.name, 
              id: productId, 
              action: 'update', 
              status: 'success',
              matched_by: matchedBy
            });
            console.log('✅ Produto atualizado com sucesso por ID');
          } else {
            console.log('⚠️ ID não encontrado, tentando outras estratégias...');
            // Remover ID para tentar outras estratégias
            const { id, ...productWithoutId } = sanitizedProduct;
            
            // Tentar encontrar por product_url
            let existingProduct = null;
            if (productWithoutId.product_url) {
              console.log(`🔍 Procurando por product_url: ${productWithoutId.product_url}`);
              const { data: foundByUrl } = await supabaseClient
                .from('products_repository')
                .select('id')
                .eq('product_url', productWithoutId.product_url)
                .limit(1);
              
              if (foundByUrl && foundByUrl.length > 0) {
                existingProduct = foundByUrl[0];
                matchedBy = 'product_url';
                console.log(`✅ Produto encontrado por URL: ${existingProduct.id}`);
              }
            }
            
            // Se não encontrou por URL, tentar por nome
            if (!existingProduct && productWithoutId.name) {
              console.log(`🔍 Procurando por nome: ${productWithoutId.name}`);
              const { data: foundByName } = await supabaseClient
                .from('products_repository')
                .select('id')
                .ilike('name', productWithoutId.name)
                .limit(1);
              
              if (foundByName && foundByName.length > 0) {
                existingProduct = foundByName[0];
                matchedBy = 'name';
                console.log(`✅ Produto encontrado por nome: ${existingProduct.id}`);
              }
            }
            
            if (existingProduct) {
              // Atualizar produto encontrado
              const { data: updateExistingData, error: updateExistingError } = await supabaseClient
                .from('products_repository')
                .update({
                  ...productWithoutId,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingProduct.id)
                .select();

              if (updateExistingError) {
                throw updateExistingError;
              }
              
              updated++;
              productId = existingProduct.id;
              logs.push({ 
                name: sanitizedProduct.name, 
                id: productId, 
                action: 'update', 
                status: 'success',
                matched_by: matchedBy
              });
              console.log(`✅ Produto atualizado com sucesso por ${matchedBy}`);
            } else {
              // Criar novo produto
              const { data: insertData, error: insertError } = await supabaseClient
                .from('products_repository')
                .insert(productWithoutId)
                .select();

              if (insertError) {
                throw insertError;
              }
              
              imported++;
              productId = insertData?.[0]?.id;
              logs.push({ 
                name: sanitizedProduct.name, 
                id: productId, 
                action: 'insert', 
                status: 'success'
              });
              console.log('✅ Produto criado com sucesso (ID original não encontrado)');
            }
          }
        } else {
          console.log('➕ Produto sem ID fornecido');
          
          // Tentar encontrar produto existente por product_url
          let existingProduct = null;
          if (sanitizedProduct.product_url) {
            console.log(`🔍 Procurando por product_url: ${sanitizedProduct.product_url}`);
            const { data: foundByUrl } = await supabaseClient
              .from('products_repository')
              .select('id')
              .eq('product_url', sanitizedProduct.product_url)
              .limit(1);
            
            if (foundByUrl && foundByUrl.length > 0) {
              existingProduct = foundByUrl[0];
              matchedBy = 'product_url';
              console.log(`✅ Produto encontrado por URL: ${existingProduct.id}`);
            }
          }
          
          // Se não encontrou por URL, tentar por nome
          if (!existingProduct && sanitizedProduct.name) {
            console.log(`🔍 Procurando por nome: ${sanitizedProduct.name}`);
            const { data: foundByName } = await supabaseClient
              .from('products_repository')
              .select('id')
              .ilike('name', sanitizedProduct.name)
              .limit(1);
            
            if (foundByName && foundByName.length > 0) {
              existingProduct = foundByName[0];
              matchedBy = 'name';
              console.log(`✅ Produto encontrado por nome: ${existingProduct.id}`);
            }
          }
          
          if (existingProduct) {
            // Atualizar produto encontrado
            const { data: updateData, error: updateError } = await supabaseClient
              .from('products_repository')
              .update({
                ...sanitizedProduct,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingProduct.id)
              .select();

            if (updateError) {
              throw updateError;
            }
            
            updated++;
            productId = existingProduct.id;
            logs.push({ 
              name: sanitizedProduct.name, 
              id: productId, 
              action: 'update', 
              status: 'success',
              matched_by: matchedBy
            });
            console.log(`✅ Produto atualizado com sucesso por ${matchedBy}`);
          } else {
            // Criar novo produto
            const { data: insertData, error: insertError } = await supabaseClient
              .from('products_repository')
              .insert(sanitizedProduct)
              .select();

            if (insertError) {
              throw insertError;
            }
            
            imported++;
            productId = insertData?.[0]?.id;
            logs.push({ 
              name: sanitizedProduct.name, 
              id: productId, 
              action: 'insert', 
              status: 'success'
            });
            console.log('✅ Produto criado com sucesso');
          }
        }

      } catch (error) {
        console.error('❌ Erro ao processar produto:', product.name, error);
        errors++;
        const errorMsg = (error as any).message || (error as any).toString();
        
        // Mensagens de erro mais específicas
        let friendlyError = errorMsg;
        if (errorMsg.includes('permission denied') || errorMsg.includes('RLS')) {
          friendlyError = 'Permissão negada - verifique se está logado como admin';
        } else if (errorMsg.includes('duplicate key')) {
          friendlyError = 'Produto duplicado';
        } else if (errorMsg.includes('violates check constraint')) {
          friendlyError = 'Dados inválidos (verifique preço, categoria, etc.)';
        }
        
        errorDetails.push(`${product.name || 'Produto sem nome'}: ${friendlyError}`);
        logs.push({ name: product.name || 'Produto sem nome', id: product.id, action: product.id ? 'update' : 'insert', status: 'error', error: friendlyError });
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
        total: products.length,
        logs
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