import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateLandingPageHTML } from "./generateHTML.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();

    console.log('🚀 generate-spin-landing-page invoked:', {
      timestamp: new Date().toISOString(),
      solutionId
    });

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar solução SPIN completa
    const { data: solution, error: solutionError } = await supabaseClient
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // Buscar produtos associados
    const { data: products, error: productsError } = await supabaseClient
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids || []);

    if (productsError) {
      throw new Error('Erro ao buscar produtos');
    }

    // Buscar perfil da empresa
    const { data: company, error: companyError } = await supabaseClient
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Empresa não encontrada, usando valores padrão');
    }

    // Gerar HTML da landing page
    const html = generateLandingPageHTML(solution, products || [], company);

    // Salvar no banco
    const { error: updateError } = await supabaseClient
      .from('spin_selling_solutions')
      .update({
        landing_page_html: html,
        landing_page_generated_at: new Date().toISOString()
      })
      .eq('id', solutionId);

    if (updateError) {
      throw new Error('Erro ao salvar landing page');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Landing page gerada com sucesso',
        htmlLength: html.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: any) {
    console.error('❌ generate-spin-landing-page error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
