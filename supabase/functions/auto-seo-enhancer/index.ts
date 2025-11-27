import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ⚙️ CONFIGURAÇÕES DE BATCHING
const BATCH_SIZE = 10; // Processar no máximo 10 produtos por execução
const MAX_EXECUTION_TIME = 50000; // 50 segundos (margem de segurança)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { productIds, mode = 'auto', batchSize = BATCH_SIZE } = await req.json();
    
    console.log('🤖 Auto SEO Enhancer started:', { 
      mode, 
      productIds: productIds?.length || 'auto', 
      batchSize 
    });

    // Buscar produtos que precisam de otimização SEO (COM LIMITE)
    let query = supabase
      .from('products_repository')
      .select('id, name, description, product_url, category, subcategory, seo_enhanced, seo_title_override, seo_description_override, slug')
      .limit(batchSize); // ✅ LIMITE DE LOTE

    if (productIds && productIds.length > 0) {
      // Limitar aos IDs fornecidos (mas respeitar batch size)
      const limitedIds = productIds.slice(0, batchSize);
      query = query.in('id', limitedIds);
      console.log(`📦 Processando ${limitedIds.length} produtos específicos`);
    } else if (mode === 'auto') {
      // Apenas produtos sem SEO otimizado
      query = query.or('seo_enhanced.is.null,seo_enhanced.eq.false');
      console.log(`🔄 Modo automático: buscando até ${batchSize} produtos não otimizados`);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erro ao buscar produtos: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum produto precisa de otimização', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 ${products.length} produtos para processar`);

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    // Processar cada produto (com controle de timeout)
    for (const product of products) {
      // ⏱️ VERIFICAR TIMEOUT
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        console.warn(`⏱️ Timeout atingido após ${elapsed}ms - parando processamento`);
        results.details.push({
          status: 'timeout',
          message: `Processamento interrompido após ${results.success + results.failed} produtos (tempo limite atingido)`
        });
        break;
      }

      const productResult: any = {
        id: product.id,
        name: product.name,
        actions: [],
        errors: []
      };

      try {
        const updates: any = {};

        // 1. Extrair dados da URL se disponível
        if (product.product_url && !product.seo_enhanced) {
          try {
            console.log(`🔍 Extraindo dados de: ${product.product_url}`);
            const extractResponse = await supabase.functions.invoke('extract-product-data', {
              body: { url: product.product_url }
            });

            if (extractResponse.data?.success) {
              const extracted = extractResponse.data.data;
              
              if (extracted.gtin) updates.gtin = extracted.gtin;
              if (extracted.mpn) updates.mpn = extracted.mpn;
              if (extracted.brand) updates.brand = extracted.brand;
              if (extracted.google_product_category) updates.google_product_category = extracted.google_product_category;
              if (extracted.condition) updates.condition = extracted.condition;
              if (extracted.availability) updates.availability = extracted.availability;
              if (extracted.color) updates.color = extracted.color;
              if (extracted.size) updates.size = extracted.size;
              if (extracted.material) updates.material = extracted.material;
              
              updates.seo_enhanced = true;
              productResult.actions.push('data_extracted');
              console.log(`✅ Dados extraídos com sucesso`);
            }
          } catch (extractError) {
            console.error(`⚠️ Erro na extração (não crítico):`, extractError);
            productResult.errors.push(`Extração: ${extractError.message}`);
          }
        }

        // 2. Gerar SEO Title se não existir
        if (!product.seo_title_override) {
          try {
            console.log(`✍️ Gerando SEO Title...`);
            const titleResponse = await supabase.functions.invoke('ai-seo-generator', {
              body: {
                type: 'seo_title',
                content: {
                  name: product.name,
                  description: product.description,
                  category: product.category,
                  subcategory: product.subcategory
                }
              }
            });

            if (titleResponse.data?.success && titleResponse.data?.content) {
              updates.seo_title_override = titleResponse.data.content;
              productResult.actions.push('seo_title_generated');
              console.log(`✅ SEO Title gerado: ${titleResponse.data.content.substring(0, 50)}...`);
            }
          } catch (titleError) {
            console.error(`⚠️ Erro ao gerar título:`, titleError);
            productResult.errors.push(`Título: ${titleError.message}`);
          }
        }

        // 3. Gerar Meta Description se não existir
        if (!product.seo_description_override) {
          try {
            console.log(`✍️ Gerando Meta Description...`);
            const descResponse = await supabase.functions.invoke('ai-seo-generator', {
              body: {
                type: 'meta_description',
                content: {
                  name: product.name,
                  description: product.description,
                  category: product.category,
                  subcategory: product.subcategory
                }
              }
            });

            if (descResponse.data?.success && descResponse.data?.content) {
              updates.seo_description_override = descResponse.data.content;
              productResult.actions.push('meta_description_generated');
              console.log(`✅ Meta Description gerada: ${descResponse.data.content.substring(0, 50)}...`);
            }
          } catch (descError) {
            console.error(`⚠️ Erro ao gerar descrição:`, descError);
            productResult.errors.push(`Descrição: ${descError.message}`);
          }
        }

        // 4. Gerar Slug se não existir
        if (!product.slug) {
          const slug = product.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
            .trim()
            .replace(/\s+/g, '-') // Substitui espaços por hífens
            .replace(/-+/g, '-'); // Remove hífens duplicados
          
          updates.slug = slug;
          productResult.actions.push('slug_generated');
          console.log(`✅ Slug gerado: ${slug}`);
        }

        // 5. Aplicar atualizações se houver
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('products_repository')
            .update(updates)
            .eq('id', product.id);

          if (updateError) {
            throw new Error(`Erro ao atualizar: ${updateError.message}`);
          }

          results.success++;
          productResult.status = 'success';
          console.log(`✅ Produto atualizado com ${Object.keys(updates).length} campos`);
        } else {
          results.skipped++;
          productResult.status = 'skipped';
          productResult.message = 'Produto já otimizado';
          console.log(`⏭️ Produto pulado (já otimizado)`);
        }

      } catch (error) {
        results.failed++;
        productResult.status = 'failed';
        productResult.errors.push(error.message);
        console.error(`❌ Erro ao processar produto ${product.name}:`, error);
      }

      results.details.push(productResult);
    }

    const executionTime = Date.now() - startTime;
    console.log(`🎉 Automação concluída em ${executionTime}ms:`, {
      total: results.total,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped
    });

    // Verificar se há mais produtos para processar
    const { count: remainingCount } = await supabase
      .from('products_repository')
      .select('id', { count: 'exact', head: true })
      .or('seo_enhanced.is.null,seo_enhanced.eq.false');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processados ${results.total} produtos: ${results.success} otimizados, ${results.failed} falharam, ${results.skipped} pulados`,
        results,
        hasMore: (remainingCount || 0) > 0,
        remaining: remainingCount || 0,
        executionTime: `${executionTime}ms`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral na automação:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
