import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TechnicalDocument {
  id: string;
  origem: 'catalog_documents' | 'resin_documents';
  nome: string;
  descricao?: string;
  nome_arquivo: string;
  url_download: string;
  tamanho_bytes: number;
  ordem_exibicao?: number;
  ativo: boolean;
  metadata_sistema_b: {
    produto_slug?: string;
    resina_slug?: string;
    url_pagina?: string;
  };
  sincronizado_em: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Iniciando sincronização de documentos do Sistema B...');

    // 1. Buscar produtos com li_product_id
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('id, name, original_data')
      .not('original_data->li_product_id', 'is', null);

    if (productsError) {
      throw new Error(`Erro ao buscar produtos: ${productsError.message}`);
    }

    console.log(`📦 ${products.length} produtos encontrados com li_product_id`);

    // 2. Buscar documentos do Sistema B
    const systemBUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?' +
      'format=ai_ready&include_resin_documents=true&include_catalog_documents=true';

    console.log('🌐 Buscando documentos do Sistema B...');
    const systemBResponse = await fetch(systemBUrl);
    
    if (!systemBResponse.ok) {
      throw new Error(`Erro ao buscar Sistema B: ${systemBResponse.status}`);
    }

    const systemBData = await systemBResponse.json();
    console.log('✅ Dados do Sistema B recebidos');

    // 3. Mapear documentos por external_id
    const documentsByExternalId: { [key: string]: TechnicalDocument[] } = {};
    
    // Processar documentos de catálogo
    if (systemBData.produtos?.documentos_catalogo) {
      for (const doc of systemBData.produtos.documentos_catalogo) {
        const externalId = doc.produto.external_id;
        if (!externalId) continue;

        if (!documentsByExternalId[externalId]) {
          documentsByExternalId[externalId] = [];
        }

        documentsByExternalId[externalId].push({
          id: doc.id,
          origem: 'catalog_documents',
          nome: doc.documento.nome,
          descricao: doc.documento.descricao,
          nome_arquivo: doc.documento.nome_arquivo,
          url_download: doc.documento.url_download,
          tamanho_bytes: doc.documento.tamanho_bytes,
          ordem_exibicao: doc.ordem_exibicao,
          ativo: doc.ativo,
          metadata_sistema_b: {
            produto_slug: doc.produto.slug,
            url_pagina: doc.produto.url_pagina
          },
          sincronizado_em: new Date().toISOString()
        });
      }
    }

    // Processar documentos de resinas
    if (systemBData.resinas?.documentos_resinas) {
      for (const doc of systemBData.resinas.documentos_resinas) {
        // Resinas também têm external_id através do produto relacionado
        const externalId = doc.resina?.produto?.external_id;
        if (!externalId) continue;

        if (!documentsByExternalId[externalId]) {
          documentsByExternalId[externalId] = [];
        }

        documentsByExternalId[externalId].push({
          id: doc.id,
          origem: 'resin_documents',
          nome: doc.documento.nome,
          descricao: doc.documento.descricao,
          nome_arquivo: doc.documento.nome_arquivo,
          url_download: doc.documento.url_download,
          tamanho_bytes: doc.documento.tamanho_bytes,
          ordem_exibicao: doc.ordem_exibicao,
          ativo: doc.ativo,
          metadata_sistema_b: {
            resina_slug: doc.resina.slug,
            produto_slug: doc.resina?.produto?.slug,
            url_pagina: doc.resina?.produto?.url_pagina
          },
          sincronizado_em: new Date().toISOString()
        });
      }
    }

    console.log(`📚 ${Object.keys(documentsByExternalId).length} produtos do Sistema B com documentos`);

    // 4. Atualizar produtos
    let produtosAtualizados = 0;
    let documentosSincronizados = 0;
    const documentosPorOrigemCount = {
      catalog_documents: 0,
      resin_documents: 0
    };

    for (const product of products) {
      const liProductId = product.original_data?.li_product_id;
      if (!liProductId) continue;

      const docs = documentsByExternalId[liProductId] || [];
      
      if (docs.length === 0) continue;

      // Contar documentos por origem
      docs.forEach(doc => {
        documentosPorOrigemCount[doc.origem]++;
      });

      const { error: updateError } = await supabase
        .from('products_repository')
        .update({ technical_documents: docs })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar produto ${product.name}:`, updateError.message);
        continue;
      }

      produtosAtualizados++;
      documentosSincronizados += docs.length;
      console.log(`✅ ${product.name}: ${docs.length} documentos sincronizados`);
    }

    const summary = {
      produtos_verificados: products.length,
      produtos_atualizados: produtosAtualizados,
      documentos_sincronizados: documentosSincronizados,
      documentos_por_origem: documentosPorOrigemCount,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Sincronização completa:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
