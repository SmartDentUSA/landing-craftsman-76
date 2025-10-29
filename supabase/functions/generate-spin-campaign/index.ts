import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { GoogleAdsCSVBuilder } from '../../../src/lib/google-ads/csv-builder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { solutionId, contentType } = await req.json();

    if (!solutionId || !contentType) {
      throw new Error('solutionId e contentType são obrigatórios');
    }

    // 1. Buscar solução SPIN completa
    const { data: solution, error: solutionError } = await supabase
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // 2. Buscar produtos da solução
    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids);

    if (productsError || !products || products.length === 0) {
      throw new Error('Produtos não encontrados');
    }

    // 3. Buscar company profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    // 4. Determinar URL final (custom_url ou product_url)
    const finalUrl = solution.custom_url?.enabled && solution.custom_url?.url
      ? solution.custom_url.url
      : products[0]?.product_url || company?.website_url || '';

    const ctaLabel = solution.custom_url?.label || 'Saiba Mais';

    // 5. GERAR GOOGLE ADS CSV
    if (contentType === 'google_ads') {
      const allKeywords: string[] = [];
      
      // Coletar keywords de todos os produtos
      products.forEach(product => {
        if (product.keywords) {
          const keywords = Array.isArray(product.keywords) 
            ? product.keywords 
            : typeof product.keywords === 'string'
              ? JSON.parse(product.keywords)
              : [];
          allKeywords.push(...keywords);
        }
      });

      // Criar grupos de anúncios baseados em produtos
      const adGroups = products.map((product, index) => {
        const productKeywords = Array.isArray(product.keywords) 
          ? product.keywords 
          : typeof product.keywords === 'string'
            ? JSON.parse(product.keywords)
            : [];

        return {
          name: `Grupo ${index + 1} - ${product.name?.substring(0, 30) || 'Produto'}`,
          keywords: productKeywords.slice(0, 10).map((kw: string) => ({
            text: kw,
            match_type: 'Phrase'
          }))
        };
      });

      // Headlines e descriptions baseados nos produtos
      const headlines = products.flatMap(p => [
        p.name?.substring(0, 30) || '',
        p.seo_title_override?.substring(0, 30) || '',
        solution.title.substring(0, 30)
      ]).filter(h => h).slice(0, 10);

      const descriptions = products.flatMap(p => [
        p.description?.substring(0, 90) || '',
        p.seo_description_override?.substring(0, 90) || ''
      ]).filter(d => d).slice(0, 4);

      const csvConfig = {
        campaignName: `SPIN - ${solution.title}`,
        config: {
          daily_budget_brl: 50,
          languages: ['pt-BR'],
          locations: ['Brasil'],
          bidding: { strategy: 'Maximize clicks' },
          negatives: ['grátis', 'barato', 'usado'],
          utm: {
            source: 'google',
            medium: 'cpc',
            campaign: solution.title.toLowerCase().replace(/\s+/g, '_')
          }
        },
        adGroups,
        adCopies: {
          headlines,
          descriptions,
          paths: ['produtos', 'spin']
        },
        sitelinks: [],
        videos: [],
        finalUrl
      };

      const csv = GoogleAdsCSVBuilder.buildFullCSV(csvConfig);

      const campaign = {
        csv,
        config: csvConfig,
        keywords: allKeywords,
        warnings: [],
        generated_at: new Date().toISOString()
      };

      // Salvar no banco
      await supabase
        .from('spin_selling_solutions')
        .update({ google_ads_campaign: campaign })
        .eq('id', solutionId);

      return new Response(
        JSON.stringify({ csv, campaign }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. GERAR WHATSAPP MESSAGE
    if (contentType === 'whatsapp') {
      const successCases = solution.success_cases || [];
      const realQuotes = solution.real_quotes || [];
      
      if (successCases.length === 0) {
        throw new Error('Adicione pelo menos 1 caso de sucesso antes de gerar a mensagem');
      }

      const firstCase = successCases[0];
      const firstQuote = realQuotes[0];

      // Gerar storytelling automático usando sales_pitch dos produtos
      const salesPitches = products
        .map(p => p.sales_pitch)
        .filter(sp => sp)
        .join(' ');

      const storytelling = `${solution.title}: ${salesPitches.substring(0, 200)}...`;

      // Construir mensagem WhatsApp
      let message = `*🎯 ${solution.title.toUpperCase()}*\n\n`;

      // Storytelling
      message += `*📖 História de Transformação:*\n${storytelling}\n\n`;

      // Caso Real
      message += `*✅ CASO REAL: ${firstCase.client_name}*\n`;
      message += `📍 ${firstCase.city}/${firstCase.state}\n`;
      message += `🎯 ${firstCase.specialty} - ${firstCase.area}\n`;
      if (firstCase.instagram) {
        message += `📱 Instagram: ${firstCase.instagram}\n`;
      }
      message += `\n*Resultados Alcançados:*\n${firstCase.results_achieved}\n\n`;

      // Jornada SPIN (se existir)
      if (firstQuote) {
        message += `*💬 Jornada do Cliente:*\n`;
        message += `🎯 *Desejo:* ${firstQuote.desire}\n`;
        message += `⚠️ *Dor:* ${firstQuote.pain}\n`;
        message += `✅ *Resultado Esperado:* ${firstQuote.expected_result}\n\n`;
      }

      // Métricas
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        message += `*📊 Métricas de Impacto:*\n`;
        Object.entries(solution.pain_metrics).forEach(([key, value]) => {
          message += `• ${key}: ${value}\n`;
        });
        message += `\n`;
      }

      // CTA
      message += `*🚀 ${ctaLabel.toUpperCase()}:*\n${finalUrl}\n\n`;
      message += `*💬 Quer saber como implementar essa solução?*\nResponda esta mensagem!`;

      // Salvar no banco
      await supabase
        .from('spin_selling_solutions')
        .update({ 
          whatsapp_complete_message: message,
          storytelling_auto_generated: storytelling
        })
        .eq('id', solutionId);

      return new Response(
        JSON.stringify({ message, storytelling }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('contentType inválido. Use "google_ads" ou "whatsapp"');

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
