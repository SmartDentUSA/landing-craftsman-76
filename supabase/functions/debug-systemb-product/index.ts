import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { li_product_id } = await req.json();

    if (!li_product_id) {
      return new Response(
        JSON.stringify({ error: 'li_product_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const liProductId = String(li_product_id).trim();
    console.log(`🔍 Buscando documentos para li_product_id: ${liProductId}`);

    // Buscar dados do Sistema B
    const systemBUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready';
    const systemBResponse = await fetch(systemBUrl);

    if (!systemBResponse.ok) {
      throw new Error(`Erro ao buscar Sistema B: ${systemBResponse.status}`);
    }

    const raw = await systemBResponse.json();
    const payload = raw?.data ?? raw;

    // Buscar em catalog_documents
    const catalogDocs = (payload?.catalog_documents || [])
      .filter((doc: any) => String(doc.product_external_id) === liProductId);

    // Buscar em documentos_tecnicos (via resinas)
    const resina = (payload?.produtos?.resinas || [])
      .find((r: any) => String(r.correlacao?.loja_integrada_id) === liProductId);

    const resinDocs = resina 
      ? (payload?.produtos?.documentos_tecnicos || [])
          .filter((doc: any) => doc.resina?.id === resina.id)
      : [];

    console.log('📊 Resultado:', {
      li_product_id: liProductId,
      found_in_catalog: catalogDocs.length > 0,
      found_in_resins: !!resina,
      total_catalog_docs: catalogDocs.length,
      total_resin_docs: resinDocs.length
    });

    return new Response(
      JSON.stringify({
        li_product_id: liProductId,
        found_in_catalog: catalogDocs.length > 0,
        found_in_resins: !!resina,
        total_catalog_docs: catalogDocs.length,
        total_resin_docs: resinDocs.length,
        catalog_examples: catalogDocs.slice(0, 5).map((d: any) => ({
          id: d.id,
          nome: d.document_name,
          url: d.file_url,
          tamanho: d.file_size
        })),
        resin_examples: resinDocs.slice(0, 5).map((d: any) => ({
          id: d.id,
          nome: d.documentos?.[0]?.nome,
          url: d.documentos?.[0]?.url_download,
          tamanho: d.documentos?.[0]?.tamanho_bytes
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
