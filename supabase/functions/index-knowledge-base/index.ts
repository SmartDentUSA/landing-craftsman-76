import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

// Dividir produto em chunks lógicos
function chunkProduct(product: any): ProductChunk[] {
  const chunks: ProductChunk[] = [];
  const productId = product.id;
  const productName = product.name || 'Produto sem nome';

  // Chunk 1: Descrição principal
  if (product.description) {
    chunks.push({
      product_id: productId,
      product_name: productName,
      chunk_type: 'description',
      content: `Produto: ${productName}\n\nDescrição: ${product.description}`,
      metadata: { category: product.category, subcategory: product.subcategory }
    });
  }

  // Chunk 2: Especificações técnicas
  if (product.technical_specifications && product.technical_specifications.length > 0) {
    const specs = product.technical_specifications
      .map((s: any) => `${s.label || s.name}: ${s.value}`)
      .join('\n');
    chunks.push({
      product_id: productId,
      product_name: productName,
      chunk_type: 'tech_spec',
      content: `Especificações Técnicas de ${productName}:\n${specs}`,
      metadata: { spec_count: product.technical_specifications.length }
    });
  }

  // Chunk 3: Regras anti-alucinação (CRÍTICO para segurança)
  if (product.anti_hallucination) {
    const rules = product.anti_hallucination;
    const rulesText = [
      rules.never_claim?.length ? `NUNCA AFIRME: ${rules.never_claim.join(', ')}` : '',
      rules.always_require?.length ? `SEMPRE REQUER: ${rules.always_require.join(', ')}` : '',
      rules.never_mix_with?.length ? `NUNCA MISTURE COM: ${rules.never_mix_with.join(', ')}` : '',
      rules.always_explain?.length ? `SEMPRE EXPLIQUE: ${rules.always_explain.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    
    if (rulesText) {
      chunks.push({
        product_id: productId,
        product_name: productName,
        chunk_type: 'anti_hallucination',
        content: `REGRAS DE SEGURANÇA para ${productName}:\n${rulesText}`,
        metadata: { is_safety_rule: true }
      });
    }
  }

  // Chunk 4: Benefícios e características
  const benefits = product.benefits || [];
  const features = product.features || [];
  if (benefits.length > 0 || features.length > 0) {
    const benefitsText = benefits.map((b: any) => 
      typeof b === 'string' ? b : `${b.title}: ${b.description}`
    ).join('\n');
    const featuresText = features.map((f: any) => 
      typeof f === 'string' ? f : `${f.title}: ${f.description}`
    ).join('\n');
    
    chunks.push({
      product_id: productId,
      product_name: productName,
      chunk_type: 'features_benefits',
      content: `Benefícios e Características de ${productName}:\n\nBenefícios:\n${benefitsText}\n\nCaracterísticas:\n${featuresText}`,
      metadata: { benefits_count: benefits.length, features_count: features.length }
    });
  }

  // Chunk 5: FAQ (cada pergunta é um chunk separado para melhor retrieval)
  if (product.faq && product.faq.length > 0) {
    product.faq.forEach((item: any, index: number) => {
      chunks.push({
        product_id: productId,
        product_name: productName,
        chunk_type: 'faq',
        content: `FAQ sobre ${productName}:\nPergunta: ${item.question}\nResposta: ${item.answer}`,
        metadata: { faq_index: index }
      });
    });
  }

  // Chunk 6: Informações comerciais (preço, disponibilidade)
  if (product.price || product.availability) {
    chunks.push({
      product_id: productId,
      product_name: productName,
      chunk_type: 'commercial',
      content: `Informações Comerciais de ${productName}:\nPreço: ${product.price ? `R$ ${product.price}` : 'Consulte'}\nPreço Promocional: ${product.promo_price ? `R$ ${product.promo_price}` : 'N/A'}\nDisponibilidade: ${product.availability || 'Consulte'}\nCategoria: ${product.category || 'Geral'}`,
      metadata: { price: product.price, has_promo: !!product.promo_price }
    });
  }

  // Chunk 7: Produtos relacionados (required/forbidden)
  if (product.required_products?.length || product.forbidden_products?.length) {
    const required = product.required_products?.map((p: any) => p.name || p).join(', ') || 'Nenhum';
    const forbidden = product.forbidden_products?.map((p: any) => p.name || p).join(', ') || 'Nenhum';
    
    chunks.push({
      product_id: productId,
      product_name: productName,
      chunk_type: 'related_products',
      content: `Produtos Relacionados a ${productName}:\nRequer: ${required}\nIncompatível com: ${forbidden}`,
      metadata: { 
        required_count: product.required_products?.length || 0,
        forbidden_count: product.forbidden_products?.length || 0 
      }
    });
  }

  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting knowledge base indexing...');

    // Criar cliente Supabase com service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse opções - supports batch_size and offset for incremental processing
    const { clear_existing = false, product_ids = null, batch_size = 5, offset = 0 } = await req.json().catch(() => ({}));

    // 1. Fetch products directly from DB (more efficient, avoids knowledge-base function overhead)
    let query = supabase
      .from('products_repository')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: true })
      .range(offset, offset + batch_size - 1);

    if (product_ids && product_ids.length > 0) {
      query = query.in('id', product_ids);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    console.log(`📦 Batch: ${products?.length || 0} products (offset: ${offset}, batch_size: ${batch_size})`);

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No more products to index',
          stats: { products_processed: 0, total_chunks: 0, success_count: 0, error_count: 0, done: true }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Clear existing embeddings for these specific products
    if (clear_existing || product_ids) {
      const idsToDelete = products.map((p: any) => p.id);
      console.log(`🗑️ Clearing embeddings for ${idsToDelete.length} products...`);
      await supabase
        .from('knowledge_vectors')
        .delete()
        .in('product_id', idsToDelete);
    }

    // 3. Process each product
    let totalChunks = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const chunks = chunkProduct(product);
        totalChunks += chunks.length;

        console.log(`📝 Processing ${product.name}: ${chunks.length} chunks`);

        for (const chunk of chunks) {
          try {
            const embedding = await generateEmbedding(chunk.content);

            const { error: insertError } = await supabase
              .from('knowledge_vectors')
              .insert({
                product_id: chunk.product_id,
                product_name: chunk.product_name,
                chunk_type: chunk.chunk_type,
                content: chunk.content,
                embedding: embedding,
                metadata: chunk.metadata
              });

            if (insertError) throw insertError;
            successCount++;
          } catch (chunkError) {
            errorCount++;
            errors.push(`Chunk ${chunk.chunk_type} for ${chunk.product_name}: ${chunkError.message}`);
            console.error(`❌ Error processing chunk:`, chunkError);
          }
        }
      } catch (productError) {
        errorCount++;
        errors.push(`Product ${product.name}: ${productError.message}`);
        console.error(`❌ Error processing product:`, productError);
      }
    }

    const nextOffset = offset + batch_size;
    const hasMore = products.length === batch_size;

    console.log(`✅ Batch complete: ${successCount}/${totalChunks} chunks indexed. Has more: ${hasMore}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch indexed: ${successCount} chunks from ${products.length} products`,
        stats: {
          products_processed: products.length,
          total_chunks: totalChunks,
          success_count: successCount,
          error_count: errorCount,
          errors: errors.slice(0, 10),
          next_offset: hasMore ? nextOffset : null,
          done: !hasMore
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Indexing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});