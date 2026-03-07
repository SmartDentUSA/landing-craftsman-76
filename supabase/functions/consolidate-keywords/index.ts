import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsolidationResult {
  success: boolean;
  stats: {
    keywords_deduplicated: number;
    keywords_classified: number;
    products_synced: number;
    categories_synced: number;
    blogs_synced: number;
    total_keyword_ids_created: number;
  };
  errors?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🚀 Iniciando consolidação de keywords...');
    
    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));
    const errors: string[] = [];
    let keywordsClassified = 0;
    
    // ============================================================
    // FASE 1: Classificar Keywords Existentes
    // ============================================================
    console.log('📋 FASE 1: Classificando keywords...');
    
    const { data: allKeywords, error: fetchError } = await supabase
      .from('external_links')
      .select('id, name, category, subcategory, url, description, approved, created_at, keyword_type, search_intent');
    
    if (fetchError) {
      throw new Error(`Erro ao buscar keywords: ${fetchError.message}`);
    }

    // Classificar keywords que ainda não têm tipo/intenção
    for (const keyword of allKeywords || []) {
      if (keyword.keyword_type && keyword.search_intent) continue; // Já classificada
      
      const name = keyword.name.toLowerCase();
      let keyword_type = 'primary';
      let search_intent = 'informational';

      // Classificar por categoria
      if (keyword.category === 'produto') {
        keyword_type = 'primary';
        search_intent = 'commercial';
      } else if (keyword.category === 'mercado') {
        keyword_type = 'secondary';
        search_intent = 'informational';
      }

      // Detectar long-tail (>4 palavras)
      if (name.split(' ').length > 4) {
        keyword_type = 'long_tail';
      }

      // Inferir search_intent por padrões
      if (name.match(/como|o que é|tutorial|guia/)) {
        search_intent = 'informational';
      } else if (name.match(/melhor|comparar|versus|vs/)) {
        search_intent = 'commercial';
      } else if (name.match(/comprar|preço|custo|orçamento/)) {
        search_intent = 'transactional';
      } else if (name.match(/marca|fabricante/) || keyword.category === 'produto') {
        search_intent = 'navigational';
      }

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('external_links')
          .update({ keyword_type, search_intent })
          .eq('id', keyword.id);

        if (updateError) {
          errors.push(`Erro ao classificar ${keyword.name}: ${updateError.message}`);
        } else {
          keywordsClassified++;
        }
      } else {
        keywordsClassified++;
      }
    }

    console.log(`✅ ${keywordsClassified} keywords classificadas`);


    // ============================================================
    // FASE 2: Sincronizar produtos → keyword_ids
    // ============================================================
    console.log('📦 FASE 2: Sincronizando produtos...');
    
    const { data: products, error: prodError } = await supabase
      .from('products_repository')
      .select('id, keywords, market_keywords, search_intent_keywords, features, benefits')
      .eq('approved', true);

    if (prodError) {
      throw new Error(`Erro ao buscar produtos: ${prodError.message}`);
    }

    let productsSynced = 0;
    let totalKeywordIds = 0;

    for (const product of products || []) {
      const allProductKeywords = new Set<string>();
      
      // Coletar todas as keywords do produto
      [
        ...(product.keywords || []),
        ...(product.market_keywords || []),
        ...(product.search_intent_keywords || []),
      ].forEach(kw => allProductKeywords.add(kw.toLowerCase().trim()));

      // Extrair keywords de features/benefits (primeiras 3 palavras)
      [...(product.features || []), ...(product.benefits || [])].forEach(text => {
        if (typeof text === 'string') {
          const words = text.toLowerCase().split(' ').slice(0, 3).join(' ');
          if (words.length > 3) allProductKeywords.add(words);
        }
      });

      if (allProductKeywords.size === 0) continue;

      // Buscar IDs correspondentes em external_links
      const keywordIds: string[] = [];
      const newKeywordsToCreate: string[] = [];

      for (const kw of allProductKeywords) {
        const { data: existing } = await supabase
          .from('external_links')
          .select('id')
          .ilike('name', kw)
          .limit(1)
          .single();

        if (existing) {
          keywordIds.push(existing.id);
        } else {
          newKeywordsToCreate.push(kw);
        }
      }

      // Criar keywords que não existem
      if (newKeywordsToCreate.length > 0 && !dryRun) {
        const { data: created, error: createError } = await supabase
          .from('external_links')
          .insert(
            newKeywordsToCreate.map(kw => ({
              name: kw,
              url: '#',
              category: 'keyword-auto',
              approved: true,
              ai_generated: true,
              source_products: [product.id]
            }))
          )
          .select('id');

        if (createError) {
          errors.push(`Erro ao criar keywords para produto ${product.id}: ${createError.message}`);
        } else {
          keywordIds.push(...(created?.map(k => k.id) || []));
        }
      }

      // Atualizar produto com keyword_ids
      if (keywordIds.length > 0 && !dryRun) {
        const { error: updateError } = await supabase
          .from('products_repository')
          .update({
            keyword_ids: keywordIds,
            keywords_synced_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (updateError) {
          errors.push(`Erro ao atualizar produto ${product.id}: ${updateError.message}`);
        }
      }

      productsSynced++;
      totalKeywordIds += keywordIds.length;
    }

    console.log(`✅ ${productsSynced} produtos sincronizados`);

    // ============================================================
    // FASE 3: Sincronizar categorias → keyword_ids
    // ============================================================
    console.log('📁 FASE 3: Sincronizando categorias...');
    
    const { data: categories, error: catError } = await supabase
      .from('categories_config')
      .select('id, keywords, market_keywords, search_intent_keywords');

    if (catError) {
      throw new Error(`Erro ao buscar categorias: ${catError.message}`);
    }

    let categoriesSynced = 0;

    for (const category of categories || []) {
      const allCatKeywords = new Set<string>();
      
      [
        ...(category.keywords || []),
        ...(category.market_keywords || []),
        ...(category.search_intent_keywords || []),
      ].forEach((kw: any) => {
        const kwText = typeof kw === 'string' ? kw : kw?.keyword || kw?.text;
        if (kwText) allCatKeywords.add(kwText.toLowerCase().trim());
      });

      if (allCatKeywords.size === 0) continue;

      const keywordIds: string[] = [];

      for (const kw of allCatKeywords) {
        const { data: existing } = await supabase
          .from('external_links')
          .select('id')
          .ilike('name', kw)
          .limit(1)
          .single();

        if (existing) {
          keywordIds.push(existing.id);
        }
      }

      if (keywordIds.length > 0 && !dryRun) {
        const { error: updateError } = await supabase
          .from('categories_config')
          .update({
            keyword_ids: keywordIds,
            keywords_synced_at: new Date().toISOString()
          })
          .eq('id', category.id);

        if (updateError) {
          errors.push(`Erro ao atualizar categoria ${category.id}: ${updateError.message}`);
        }
      }

      categoriesSynced++;
    }

    console.log(`✅ ${categoriesSynced} categorias sincronizadas`);

    // ============================================================
    // FASE 4: Logging final
    // ============================================================
    if (!dryRun) {
      await supabase.from('system_monitoring').insert({
        event_type: 'keyword_consolidation_complete',
        component_name: 'consolidate-keywords',
        event_data: {
          timestamp: new Date().toISOString(),
          stats: {
            keywords_classified: keywordsClassified,
            products_synced: productsSynced,
            categories_synced: categoriesSynced,
            total_keyword_ids: totalKeywordIds,
          },
          errors: errors.length > 0 ? errors : null
        },
        severity: errors.length > 0 ? 'warning' : 'info',
        tags: ['migration', 'keywords', 'consolidation']
      });
    }

    const result: ConsolidationResult = {
      success: errors.length === 0,
      stats: {
        keywords_deduplicated: 0, // Já foram removidas na migração anterior
        keywords_classified: keywordsClassified,
        products_synced: productsSynced,
        categories_synced: categoriesSynced,
        blogs_synced: 0,
        total_keyword_ids_created: totalKeywordIds
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎉 Consolidação concluída:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: unknown) {
    console.error('❌ Erro na consolidação:', error);
    const errObj = error instanceof Error ? error : new Error(String(error));
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errObj.message,
        stack: errObj.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
