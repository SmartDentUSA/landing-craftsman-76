import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsolidationResult {
  success: boolean;
  stats: {
    keywords_deduplicated: number;
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
    
    // ============================================================
    // FASE 1: Deduplicação de Keywords em external_links
    // ============================================================
    console.log('📋 FASE 1: Deduplicando keywords...');
    
    const { data: allKeywords, error: fetchError } = await supabase
      .from('external_links')
      .select('id, keyword, category, subcategory, url, description, approved, created_at');
    
    if (fetchError) {
      throw new Error(`Erro ao buscar keywords: ${fetchError.message}`);
    }

    // Agrupar keywords duplicadas (case-insensitive)
    const keywordMap = new Map<string, any[]>();
    allKeywords?.forEach(kw => {
      const normalized = kw.keyword.toLowerCase().trim();
      if (!keywordMap.has(normalized)) {
        keywordMap.set(normalized, []);
      }
      keywordMap.get(normalized)!.push(kw);
    });

    let deduplicatedCount = 0;
    const deduplicationLog: any[] = [];

    for (const [normalized, duplicates] of keywordMap.entries()) {
      if (duplicates.length > 1) {
        // Manter o mais antigo/aprovado
        duplicates.sort((a, b) => {
          if (a.approved !== b.approved) return b.approved ? 1 : -1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const keeper = duplicates[0];
        const toDelete = duplicates.slice(1);

        deduplicationLog.push({
          keyword: normalized,
          keeper_id: keeper.id,
          deleted_ids: toDelete.map(d => d.id),
          count: duplicates.length
        });

        if (!dryRun) {
          // Deletar duplicatas
          for (const dup of toDelete) {
            const { error: delError } = await supabase
              .from('external_links')
              .delete()
              .eq('id', dup.id);
            
            if (delError) {
              errors.push(`Erro ao deletar duplicata ${dup.id}: ${delError.message}`);
            }
          }
        }

        deduplicatedCount += toDelete.length;
      }
    }

    console.log(`✅ ${deduplicatedCount} keywords duplicadas removidas`);

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
          .ilike('keyword', kw)
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
              keyword: kw,
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
          .ilike('keyword', kw)
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
            keywords_deduplicated: deduplicatedCount,
            products_synced: productsSynced,
            categories_synced: categoriesSynced,
            total_keyword_ids: totalKeywordIds,
          },
          deduplication_log: deduplicationLog,
          errors: errors.length > 0 ? errors : null
        },
        severity: errors.length > 0 ? 'warning' : 'info',
        tags: ['migration', 'keywords', 'consolidation']
      });
    }

    const result: ConsolidationResult = {
      success: errors.length === 0,
      stats: {
        keywords_deduplicated: deduplicatedCount,
        products_synced: productsSynced,
        categories_synced: categoriesSynced,
        blogs_synced: 0, // TODO: Implementar quando houver blogs com keywords
        total_keyword_ids_created: totalKeywordIds
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎉 Consolidação concluída:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Erro na consolidação:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
