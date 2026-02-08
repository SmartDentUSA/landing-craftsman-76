import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 [Transcribe LP PDF] Recebendo requisição...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    const landingPageName = (formData.get('landing_page_name') as string) || 'Landing Page';

    if (!pdfFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum arquivo PDF foi enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pdfFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'Arquivo excede 10MB' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📎 Arquivo recebido:', { name: pdfFile.name, size: pdfFile.size });
    console.log('🎯 Landing Page:', landingPageName);

    // Extract text from PDF
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);
    const pdf = await getDocument({ data: pdfData }).promise;
    const maxPages = Math.min(pdf.numPages, 30);
    let extractedText = '';

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ');
      extractedText += `\n\n--- Página ${pageNum} ---\n${pageText}`;
    }

    const MAX_CHARS = 80000;
    const clippedText = extractedText.length > MAX_CHARS
      ? extractedText.slice(0, MAX_CHARS) + '\n\n[Texto truncado]'
      : extractedText;

    console.log('📝 Texto extraído (tamanho):', clippedText.length);

    const SYSTEM_PROMPT = `Você é um assistente especialista em análise de documentos para criação de landing pages.
Sua tarefa é:
1. Transcrever fielmente o texto do PDF preservando hierarquia e formatação
2. Identificar e extrair TODAS as tabelas presentes no documento, preservando cabeçalhos e dados EXATAMENTE como escritos
3. Gerar sugestões inteligentes para preencher os campos de uma landing page

REGRAS CRÍTICAS PARA TABELAS:
- Preserve cabeçalhos EXATAMENTE como escritos no documento (maiúsculas, acentos, unidades)
- Preserve valores de cada célula FIELMENTE (números, unidades, símbolos)
- Cada linha da tabela deve ser um objeto com chaves iguais aos headers
- Dê um título descritivo para cada tabela baseado no contexto do documento
- REGRA DE CONSOLIDAÇÃO: Se o documento contiver seções em páginas diferentes que comparam os MESMOS itens/produtos/colunas (ex: mesmos scanners, mesmas marcas, mesmos modelos), consolide TODAS as linhas em UMA ÚNICA tabela. Use os nomes das colunas da primeira ocorrência como cabeçalho padrão
- Sub-títulos de páginas diferentes (ex: "Software base", "Relatórios clínicos") devem virar linhas separadoras dentro da mesma tabela, NÃO tabelas separadas
- Ao consolidar, adicione uma linha com o sub-título da seção como separador (ex: {"Característica": "--- Software ---", demais colunas vazias ""})
- SOMENTE retorne tabelas REALMENTE separadas (que comparam itens DIFERENTES) como entradas distintas no array extracted_tables

REGRAS PARA SUGESTÕES:
- Baseie-se EXCLUSIVAMENTE no conteúdo do PDF
- Não invente dados, certificações ou números que não estão no documento
- Seja conciso e persuasivo nos textos sugeridos
- O banner_title deve ser impactante e curto (máx 60 caracteres)
- O seo_description deve ter no máximo 160 caracteres`;

    const USER_PROMPT = `Analise o seguinte documento PDF da landing page "${landingPageName}" e extraia os dados usando a função fornecida.

DOCUMENTO (texto extraído):
${clippedText}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_landing_page_data',
              description: 'Extrai texto transcrito, tabelas e sugestões de campos para landing page a partir de um PDF',
              parameters: {
                type: 'object',
                properties: {
                  transcribed_text: {
                    type: 'string',
                    description: 'Texto completo transcrito fielmente do PDF, preservando hierarquia e formatação'
                  },
                  suggestions: {
                    type: 'object',
                    properties: {
                      seo_title: { type: 'string', description: 'Título SEO (máx 60 caracteres)' },
                      seo_description: { type: 'string', description: 'Meta description SEO (máx 160 caracteres)' },
                      banner_title: { type: 'string', description: 'Título principal do banner (impactante, curto)' },
                      banner_subtitle: { type: 'string', description: 'Subtítulo do banner' },
                      banner_badge_text: { type: 'string', description: 'Texto do badge/destaque do banner' },
                      solutions_title: { type: 'string', description: 'Título da seção de soluções' },
                      advisory_title: { type: 'string', description: 'Título da seção de consultoria/informações' },
                      advisory_paragraph: { type: 'string', description: 'Parágrafo descritivo da consultoria' },
                      cta_final_title: { type: 'string', description: 'Título do CTA final' },
                      cta_final_paragraph: { type: 'string', description: 'Parágrafo do CTA final' },
                      desktop_info_title: { type: 'string', description: 'Título das informações desktop' },
                      desktop_info_text: { type: 'string', description: 'Texto das informações desktop' }
                    },
                    required: ['seo_title', 'seo_description', 'banner_title', 'banner_subtitle', 'solutions_title', 'advisory_title', 'advisory_paragraph', 'cta_final_title', 'cta_final_paragraph', 'desktop_info_title', 'desktop_info_text'],
                    additionalProperties: false
                  },
                  extracted_tables: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Título/contexto da tabela' },
                        headers: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Cabeçalhos das colunas, exatamente como no PDF'
                        },
                        rows: {
                          type: 'array',
                          items: {
                            type: 'object',
                            additionalProperties: { type: 'string' }
                          },
                          description: 'Linhas da tabela, cada uma com chaves iguais aos headers'
                        }
                      },
                      required: ['title', 'headers', 'rows'],
                      additionalProperties: false
                    },
                    description: 'TODAS as tabelas encontradas no PDF'
                  }
                },
                required: ['transcribed_text', 'suggestions', 'extracted_tables'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_landing_page_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('❌ AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log('✅ AI response received');

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI não retornou dados estruturados');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('📊 Dados extraídos:', {
      textLength: extractedData.transcribed_text?.length || 0,
      suggestionsKeys: Object.keys(extractedData.suggestions || {}),
      tablesCount: extractedData.extracted_tables?.length || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
