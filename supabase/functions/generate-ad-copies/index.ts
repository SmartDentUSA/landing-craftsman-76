import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  seoTitle: string;
  seoDescription: string;
  primaryKeyword: string;
  targetAudience?: string;
}

interface AdCopies {
  headlines: string[];
  descriptions: string[];
  paths: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { seoTitle, seoDescription, primaryKeyword, targetAudience = 'profissionais de odontologia' }: GenerateRequest = await req.json();

    console.log('🎯 Gerando cópias para Google Ads:', { seoTitle, primaryKeyword });

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY não configurada');
    }

    // Verificar se há prompt customizado com campos selecionados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: promptConfig } = await supabase
      .from('prompts_configuration')
      .select('custom_prompt, selected_fields, selected_data_sources')
      .eq('edge_function_id', 'generate-ad-copies')
      .eq('prompt_name', 'Cópias Google Ads')
      .single();

    let prompt = '';

    if (promptConfig?.custom_prompt) {
      // Usar prompt customizado com seleção de campos
      const { extractSelectedData, processPromptWithSelectedData } = await import('../_shared/prompt-processor.ts');
      
      // Buscar dados da empresa para contexto adicional
      const { data: companyProfile } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .single();
      
      const mockProduct = { 
        name: seoTitle, 
        description: seoDescription,
        applications: '',
        keywords: [primaryKeyword],
        market_keywords: [],
        target_audience: [targetAudience]
      };
      
      const selectedData = extractSelectedData(mockProduct, companyProfile, {
        selectedFields: promptConfig.selected_fields || {},
        selectedDataSources: promptConfig.selected_data_sources || []
      });
      
      prompt = processPromptWithSelectedData(promptConfig.custom_prompt, selectedData);
    } else {
      // Usar prompt padrão
      prompt = `Você é um especialista em copywriting para Google Ads com foco em campanhas para ${targetAudience}, PRIORIZANDO CATEGORIAS E SUBCATEGORIAS.

Gere cópias para um Responsive Search Ad (RSA) baseadas nas seguintes informações:
- SEO Title: ${seoTitle}
- SEO Description: ${seoDescription}
- Keyword Principal: ${primaryKeyword}
- Público-alvo: ${targetAudience}

INSTRUÇÕES CRÍTICAS PARA CATEGORIAS:
1. **PRIORIZE categoria e subcategoria nos títulos quando identificáveis**
2. **Use categorias para criar paths relevantes**
3. **Incorpore taxonomia de categorias nas descrições**

REGRAS OBRIGATÓRIAS:
1. Headlines: 6-10 variações, máximo 30 caracteres cada
2. Descriptions: 2-4 variações, máximo 90 caracteres cada
3. Paths: 2 caminhos, máximo 15 caracteres cada (use categorias se possível)
4. Linguagem: português brasileiro
5. Tom: profissional, confiável, sem sensacionalismo
6. Incluir keyword principal em pelo menos 2 headlines
7. Se categoria/subcategoria identificáveis no conteúdo, use nos headlines
8. EVITAR: alegações médicas proibidas, CAPSLOCK, termos como "cura", "milagre", "garantido"
9. INCLUIR: benefícios claros, chamadas para ação sutis

Retorne APENAS um JSON válido no formato:
{
  "headlines": ["headline1", "headline2", ...],
  "descriptions": ["desc1", "desc2", ...],
  "paths": ["path1", "path2"]
}`;
    }

    // Função para processar variáveis nos prompts customizados
    function processPromptVariables(prompt: string, data: any): string {
      let processedPrompt = prompt;
      
      processedPrompt = processedPrompt.replace(/{seoTitle}/g, data.seoTitle || '');
      processedPrompt = processedPrompt.replace(/{seoDescription}/g, data.seoDescription || '');
      processedPrompt = processedPrompt.replace(/{primaryKeyword}/g, data.primaryKeyword || '');
      processedPrompt = processedPrompt.replace(/{targetAudience}/g, data.targetAudience || '');
      
      return processedPrompt;
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um copywriter especialista em Google Ads. Sempre retorne JSON válido e siga rigorosamente os limites de caracteres.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API DeepSeek:', response.status, errorText);
      throw new Error(`Erro na API DeepSeek: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices[0].message.content;

    console.log('🤖 Resposta da IA:', generatedText);

    // Parse and validate the AI response
    let adCopies: AdCopies;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }
      
      adCopies = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta da IA:', parseError);
      
      // Fallback: generate basic copies
      adCopies = {
        headlines: [
          primaryKeyword.substring(0, 25),
          'Atendimento Especializado',
          'Agende sua Consulta',
          'Resultado de Qualidade',
          'Tecnologia Avançada',
          'Profissionais Experientes'
        ],
        descriptions: [
          'Atendimento personalizado com tecnologia de ponta.',
          'Agende sua consulta e descubra a diferença.',
        ],
        paths: ['consulta', 'qualidade']
      };
    }

    // Validate and clean the copies
    adCopies = validateAndCleanCopies(adCopies);

    console.log('✅ Cópias geradas e validadas:', adCopies);

    return new Response(JSON.stringify(adCopies), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na função generate-ad-copies:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateAndCleanCopies(copies: AdCopies): AdCopies {
  // Validate and truncate headlines
  const headlines = copies.headlines
    .filter(h => h && h.trim().length > 0)
    .map(h => h.length > 30 ? h.substring(0, 27) + '...' : h)
    .slice(0, 10);

  // Validate and truncate descriptions
  const descriptions = copies.descriptions
    .filter(d => d && d.trim().length > 0)
    .map(d => d.length > 90 ? d.substring(0, 87) + '...' : d)
    .slice(0, 4);

  // Validate and clean paths
  const paths = copies.paths
    .filter(p => p && p.trim().length > 0)
    .map(p => p.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .map(p => p.length > 15 ? p.substring(0, 15) : p)
    .slice(0, 2);

  // Ensure minimum requirements
  if (headlines.length < 3) {
    headlines.push('Atendimento', 'Qualidade', 'Consulta');
  }
  
  if (descriptions.length < 2) {
    descriptions.push('Atendimento especializado', 'Agende sua consulta');
  }
  
  if (paths.length < 2) {
    paths.push('atendimento', 'consulta');
  }

  return { headlines, descriptions, paths };
}