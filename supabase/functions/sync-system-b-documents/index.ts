import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TechnicalDocument {
  id: string;
  origem: 'resin_documents' | 'catalog_documents';
  nome: string;
  descricao?: string;
  nome_arquivo: string;
  url_download: string;
  tamanho_bytes: number;
  ordem_exibicao?: number;
  ativo: boolean;
  metadata_sistema_b: {
    resina_slug?: string;
    resina_id?: string;
    catalog_id?: string;
    product_external_id?: string;
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

    // 🚀 IDENTIFICADOR DE VERSÃO - FORÇAR NOVO DEPLOY
    console.log('🚀 VERSÃO DA FUNÇÃO: v3.0-CAMINHOS-CORRIGIDOS');
    console.log('📅 Deploy timestamp:', new Date().toISOString());
    console.log('✅ Correção aplicada: payload.produtos.resinas e payload.produtos.documentos_tecnicos');
    
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

    // 2. Buscar dados do Sistema B
    const systemBUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready';
    
    console.log('🌐 Buscando dados do Sistema B...');
    const systemBResponse = await fetch(systemBUrl);
    
    if (!systemBResponse.ok) {
      throw new Error(`Erro ao buscar Sistema B: ${systemBResponse.status}`);
    }

    const raw = await systemBResponse.json();
    
    // Normalizar payload (pode vir direto ou em .data)
    const payload = raw?.data ?? raw;
    
    console.log('📦 Estrutura COMPLETA do payload Sistema B:', {
      // Estrutura atual (manter)
      temProdutos: !!payload?.produtos,
      temResinas: !!payload?.produtos?.resinas,
      temDocumentos: !!payload?.produtos?.documentos_tecnicos,
      temCatalogDocs: !!payload?.catalog_documents,
      totalResinas: payload?.produtos?.resinas?.length || 0,
      totalDocumentos: payload?.produtos?.documentos_tecnicos?.length || 0,
      totalCatalogDocs: payload?.catalog_documents?.length || 0,
      
      // 🆕 NOVOS LOGS DIAGNÓSTICOS
      chavesRaiz: Object.keys(payload || {}),
      temCatalogDocsEmProdutos: !!(payload?.produtos?.catalog_documents),
      temCatalogDocsEmData: !!(payload?.data?.catalog_documents),
      totalCatalogDocsRaiz: (payload?.catalog_documents || []).length,
      totalCatalogDocsProdutos: (payload?.produtos?.catalog_documents || []).length,
      totalCatalogDocsData: (payload?.data?.catalog_documents || []).length,
      
      // Estrutura dos primeiros 3 catalog_documents
      primeirosCatalogDocs: (
        payload?.catalog_documents || 
        payload?.produtos?.catalog_documents || 
        payload?.data?.catalog_documents ||
        []
      ).slice(0, 3).map((doc: any) => ({
        id: doc?.id,
        nome: doc?.document_name,
        product_external_id: doc?.product_external_id,
        product_external_id_tipo: typeof doc?.product_external_id,
        active: doc?.active,
        file_url: doc?.file_url ? 'presente' : 'ausente'
      }))
    });

    // ✅ CAMPOS CORRETOS DO SISTEMA B (caminhos corrigidos conforme estrutura real)
    const resinas = payload?.produtos?.resinas || [];
    const documentosTecnicos = payload?.produtos?.documentos_tecnicos || [];
    const catalogDocuments = payload?.documentos_catalogo || [];
    
    // 🆕 AVALIAÇÕES DO GOOGLE
    const avaliacoesGoogle = payload?.avaliacoes_google || [];
    const reputacaoGoogle = payload?.perfil_empresa?.reputacao_google || {};

    // 📦 LOG DE CONFIRMAÇÃO
    console.log('📦 Documentos extraídos do payload (caminhos corretos):', {
      'produtos.resinas': resinas.length,
      'documentos_catalogo': catalogDocuments.length,
      'produtos.documentos_tecnicos': documentosTecnicos.length,
      primeiroDocCatalogo: catalogDocuments[0]?.document_name || 'nenhum',
      primeiraResina: resinas[0]?.nome || 'nenhuma',
      primeiroDocTecnico: documentosTecnicos[0]?.documento?.nome || 'nenhum'
    });

    // 📊 LOG DE AVALIAÇÕES DO GOOGLE
    console.log('📊 Avaliações Google do Sistema B:', {
      total_avaliacoes: avaliacoesGoogle.length,
      nota_media: reputacaoGoogle?.nota_media,
      total_avaliacoes_google: reputacaoGoogle?.total_avaliacoes,
      place_id: reputacaoGoogle?.place_id
    });

    // 🔍 ESTRUTURA DO PAYLOAD SISTEMA B (caminhos atualizados)
    console.log('🔍 Estrutura do payload Sistema B:', {
      temProdutosResinas: !!payload?.produtos?.resinas,
      temDocumentosCatalogo: !!payload?.documentos_catalogo,
      temProdutosDocsTecnicos: !!payload?.produtos?.documentos_tecnicos,
      temVideosProdutos: !!payload?.videos_produtos,
      temVideosResinas: !!payload?.videos_resinas,
      totalDocsCatalogo: catalogDocuments.length,
      totalResinas: resinas.length,
      totalDocsTecnicos: documentosTecnicos.length
    });

    // 3. FASE 2: Criar mapa de resinas por loja_integrada_id
    const resinasByLojaId: { [key: string]: any } = {};
    
    for (const resina of resinas) {
      const lojaId = String(resina?.correlacao?.loja_integrada_id || '').trim();
      if (lojaId) {
        resinasByLojaId[lojaId] = resina;
      }
    }

    console.log('🔑 Resinas mapeadas por loja_integrada_id:', {
      totalResinas: Object.keys(resinasByLojaId).length,
      idsExemplo: Object.keys(resinasByLojaId).slice(0, 10)
    });

    // 4. FASE 3: Mapear documentos por loja_integrada_id
    const documentsByLojaId: { [key: string]: TechnicalDocument[] } = {};

    for (const docTecnico of documentosTecnicos) {
      const resinaId = docTecnico?.resina?.id;
      if (!resinaId) {
        console.log('⚠️ Documento técnico sem resina.id:', docTecnico?.id);
        continue;
      }

      // Encontrar a resina correspondente
      const resina = resinas.find((r: any) => r.id === resinaId);
      if (!resina) {
        console.log('⚠️ Resina não encontrada para documento:', resinaId);
        continue;
      }

      const lojaId = String(resina?.correlacao?.loja_integrada_id || '').trim();
      if (!lojaId) {
        console.log('⚠️ Resina sem loja_integrada_id:', resina?.id);
        continue;
      }

      if (!documentsByLojaId[lojaId]) {
        documentsByLojaId[lojaId] = [];
      }

      // Processar cada documento dentro de documentos_tecnicos
      const documento = docTecnico?.documento;
      if (!documento) continue;

      documentsByLojaId[lojaId].push({
        id: docTecnico.id,
        origem: 'resin_documents',
        nome: documento.nome || documento.nome_arquivo || 'Documento sem nome',
        descricao: documento.descricao,
        nome_arquivo: documento.nome_arquivo,
        url_download: documento.url_download,
        tamanho_bytes: documento.tamanho_bytes || 0,
        ordem_exibicao: docTecnico.ordem_exibicao,
        ativo: docTecnico.ativo !== false,
        metadata_sistema_b: {
          resina_slug: resina.slug,
          resina_id: resina.id,
          url_pagina: resina.url_pagina
        },
        sincronizado_em: new Date().toISOString()
      });
    }

    // Processar catalog_documents (vinculados diretamente ao produto)
    console.log('📄 Processando catalog_documents...');
    
    // 🔬 LOG DIAGNÓSTICO: Estrutura aninhada do Sistema B
    if (catalogDocuments.length > 0) {
      console.log('🔬 PRIMEIROS 3 DOCUMENTOS DE CATÁLOGO (estrutura aninhada):', 
        catalogDocuments.slice(0, 3).map((doc: any) => ({
          id: doc?.id,
          produto_external_id: doc?.produto?.external_id,
          produto_nome: doc?.produto?.nome,
          documento_nome: doc?.documento?.nome,
          documento_arquivo: doc?.documento?.nome_arquivo,
          documento_url: doc?.documento?.url_download,
          ativo: doc?.ativo
        }))
      );
    }
    
    for (const catalogDoc of catalogDocuments) {
      // ✅ CORREÇÃO: Usar estrutura aninhada produto.external_id
      const externalId = String(catalogDoc?.produto?.external_id || '').trim();
      
      // ✅ VALIDAÇÃO: Só ignora se não tiver external_id ou se ativo for explicitamente false
      if (!externalId || catalogDoc.ativo === false) {
        console.log('⚠️ Catalog document ignorado:', {
          id: catalogDoc.id,
          produto_nome: catalogDoc?.produto?.nome,
          documento_nome: catalogDoc?.documento?.nome,
          external_id: externalId,
          ativo: catalogDoc.ativo
        });
        continue;
      }

      if (!documentsByLojaId[externalId]) {
        documentsByLojaId[externalId] = [];
      }

      // ✅ MAPEAMENTO COM ESTRUTURA ANINHADA CORRETA
      documentsByLojaId[externalId].push({
        id: `catalog_${catalogDoc.id}`,
        origem: 'catalog_documents',
        nome: catalogDoc.documento?.nome || 'Documento Técnico',
        descricao: catalogDoc.documento?.descricao || '',
        nome_arquivo: catalogDoc.documento?.nome_arquivo || 'documento.pdf',
        url_download: catalogDoc.documento?.url_download || '',
        tamanho_bytes: catalogDoc.documento?.tamanho_bytes || 0,
        ordem_exibicao: catalogDoc.ordem_exibicao || 0,
        ativo: catalogDoc.ativo !== false,
        metadata_sistema_b: {
          catalog_id: catalogDoc.id,
          product_external_id: catalogDoc.produto?.external_id,
          url_pagina: catalogDoc.produto?.url_pagina,
          produto_nome: catalogDoc.produto?.nome,
          produto_slug: catalogDoc.produto?.slug
        },
        sincronizado_em: new Date().toISOString()
      });
    }

    console.log('📄 Documentos de catálogo mapeados:', {
      totalIds: Object.keys(documentsByLojaId).filter(id => 
        documentsByLojaId[id].some(d => d.origem === 'catalog_documents')
      ).length,
      produtosComCatalogDocs: Object.entries(documentsByLojaId)
        .filter(([_, docs]) => docs.some(d => d.origem === 'catalog_documents'))
        .map(([id, docs]) => ({
          external_id: id,
          totalDocs: docs.filter(d => d.origem === 'catalog_documents').length
        }))
        .slice(0, 5)
    });

    console.log('📚 Documentos mapeados por loja_integrada_id:', {
      totalProdutosComDocs: Object.keys(documentsByLojaId).length,
      idsExemplo: Object.keys(documentsByLojaId).slice(0, 10),
      docsExemplo: Object.entries(documentsByLojaId).slice(0, 3).map(([id, docs]) => ({
        lojaId: id,
        totalDocs: docs.length,
        primeiroDoc: docs[0]?.nome
      }))
    });

    // 5. FASE 4: Atualizar produtos no repositório
    let produtosAtualizados = 0;
    let documentosSincronizados = 0;

    for (const product of products) {
      const liProductId = String(product.original_data?.li_product_id || '').trim();
      if (!liProductId) continue;

      const docs = documentsByLojaId[liProductId] || [];
      
      // 🆕 DEBUG ESPECÍFICO PARA PRODUTO 373844367
      if (liProductId === '373844367') {
        const catalogDocsParaEsseProduto = catalogDocuments.filter((d: any) => 
          String(d?.product_external_id) === liProductId
        );
        
        console.log('🔍 DEBUG DETALHADO PRODUTO 373844367:', {
          liProductId,
          totalCatalogDocsGlobal: catalogDocuments.length,
          catalogDocsMatchingEsseProduto: catalogDocsParaEsseProduto.length,
          catalogDocsMatchingExemplos: catalogDocsParaEsseProduto.map((d: any) => ({
            id: d?.id,
            nome: d?.document_name,
            external_id: d?.product_external_id,
            active: d?.active
          })),
          exemploIds10Primeiros: catalogDocuments.slice(0, 10).map((d: any) => ({
            id: d?.id,
            external_id: d?.product_external_id,
            external_id_tipo: typeof d?.product_external_id,
            match: String(d?.product_external_id) === liProductId
          })),
          docsEncontradosNoMap: docs.length,
          docsNoMapOrigem: docs.map(d => d.origem)
        });
      }
      
      if (docs.length === 0) {
        const temCatalogDocs = !!catalogDocuments.find(d => String(d.product_external_id) === liProductId);
        console.log(`⚠️ [NO MATCH] ${product.name}`, {
          li_product_id: liProductId,
          tem_catalog_docs: temCatalogDocs,
          total_docs: 0
        });
        continue;
      }

      // Ordenar documentos por ordem_exibicao
      const sortedDocs = docs.sort((a, b) => {
        const orderA = a.ordem_exibicao ?? 999;
        const orderB = b.ordem_exibicao ?? 999;
        return orderA - orderB;
      });

      console.log(`✅ [MATCH] ${product.name} → li_product_id="${liProductId}" → ${sortedDocs.length} docs`);

      const { error: updateError } = await supabase
        .from('products_repository')
        .update({ technical_documents: sortedDocs })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Erro ao atualizar produto ${product.name}:`, updateError.message);
        continue;
      }

      produtosAtualizados++;
      documentosSincronizados += sortedDocs.length;
    }

    // 🆕 FASE 5: Sincronizar avaliações do Google
    let avaliacoesSincronizadas = 0;
    let reputacaoAtualizada = false;

    if (avaliacoesGoogle.length > 0) {
      console.log('🔄 Sincronizando avaliações do Google...');
      
      for (const review of avaliacoesGoogle) {
        try {
          const { error: reviewError } = await supabase.from('raw_reviews').upsert({
            place_id: reputacaoGoogle?.place_id || 'sistema_b_import',
            author_name: review.autor || review.author_name,
            rating: review.nota || review.rating,
            review_text: review.texto || review.review_text,
            review_date: review.data || review.review_date,
            profile_photo_url: review.foto_url || review.profile_photo_url,
            is_local_guide: review.is_local_guide || false,
            extracted_at: new Date().toISOString()
          }, { 
            onConflict: 'place_id,author_name',
            ignoreDuplicates: false
          });

          if (!reviewError) {
            avaliacoesSincronizadas++;
          } else {
            console.error('❌ Erro ao sincronizar avaliação:', reviewError.message);
          }
        } catch (err) {
          console.error('❌ Erro ao processar avaliação:', err);
        }
      }

      console.log(`✅ ${avaliacoesSincronizadas} avaliações sincronizadas`);
    }

    // Atualizar company_profile com reputação do Google
    if (reputacaoGoogle?.nota_media) {
      console.log('🔄 Atualizando reputação do Google no company_profile...');
      
      try {
        // Buscar company_reviews atual para preservar manual_reviews
        const { data: currentProfile } = await supabase
          .from('company_profile')
          .select('company_reviews')
          .limit(1)
          .single();

        const currentReviews = currentProfile?.company_reviews || {};
        const manualReviews = currentReviews.manual_reviews || [];

        const { error: profileError } = await supabase
          .from('company_profile')
          .update({
            company_reviews: {
              google_place_id: reputacaoGoogle.place_id,
              google_reviews_imported: true,
              last_google_sync: new Date().toISOString(),
              manual_reviews: manualReviews // Preservar avaliações manuais
            }
          })
          .not('id', 'is', null);

        if (!profileError) {
          reputacaoAtualizada = true;
          console.log('✅ Reputação do Google atualizada no company_profile');
        } else {
          console.error('❌ Erro ao atualizar reputação:', profileError.message);
        }
      } catch (err) {
        console.error('❌ Erro ao atualizar company_profile:', err);
      }
    }

    // 6. FASE 6: Retornar summary correto
    const totalCatalogDocs = Object.values(documentsByLojaId)
      .flat()
      .filter(d => d.origem === 'catalog_documents').length;

    const totalResinDocs = Object.values(documentsByLojaId)
      .flat()
      .filter(d => d.origem === 'resin_documents').length;

    const summary = {
      produtos_verificados: products.length,
      produtos_atualizados: produtosAtualizados,
      documentos_sincronizados: documentosSincronizados,
      documentos_por_origem: {
        catalog_documents: totalCatalogDocs,
        resin_documents: totalResinDocs
      },
      avaliacoes_google_sincronizadas: avaliacoesSincronizadas,
      reputacao_atualizada: reputacaoAtualizada,
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
