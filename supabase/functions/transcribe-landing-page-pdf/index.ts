import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Convert positional row arrays to objects keyed by headers.
 * Pads missing columns with empty string, trims extra columns.
 */
function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  if (!headers?.length || !rows?.length) return [];

  return rows.slice(0, 100).map(row => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (row && row[i]) ? String(row[i]) : '';
    }
    return obj;
  });
}

/**
 * Post-processing: merge tables with identical or highly overlapping headers.
 */
function consolidateTables(tables: any[]): any[] {
  if (!Array.isArray(tables) || tables.length <= 1) return tables;

  const normalizeHeader = (h: string) => h.trim().toLowerCase();

  const getOverlapRatio = (headersA: string[], headersB: string[]): number => {
    if (!headersA?.length || !headersB?.length) return 0;
    const setA = new Set(headersA.map(normalizeHeader));
    const setB = new Set(headersB.map(normalizeHeader));
    let overlap = 0;
    for (const h of setB) {
      if (setA.has(h)) overlap++;
    }
    return overlap / Math.max(setA.size, setB.size);
  };

  const merged: any[] = [];
  const used = new Set<number>();

  for (let i = 0; i < tables.length; i++) {
    if (used.has(i)) continue;

    const base = { ...tables[i], rows: [...(tables[i].rows || [])] };
    used.add(i);

    for (let j = i + 1; j < tables.length; j++) {
      if (used.has(j)) continue;

      const overlap = getOverlapRatio(base.headers, tables[j].headers);
      if (overlap >= 0.8) {
        // Add separator row
        const separatorRow: Record<string, string> = {};
        for (const h of base.headers) {
          separatorRow[h] = '';
        }
        if (base.headers.length > 0) {
          separatorRow[base.headers[0]] = `--- ${tables[j].title || 'Seção'} ---`;
        }
        base.rows.push(separatorRow);

        // Append rows, mapping headers
        for (const row of (tables[j].rows || [])) {
          const mappedRow: Record<string, string> = {};
          for (const h of base.headers) {
            const normalizedH = normalizeHeader(h);
            const matchingKey = Object.keys(row).find(k => normalizeHeader(k) === normalizedH);
            mappedRow[h] = matchingKey ? row[matchingKey] : (row[h] || '');
          }
          base.rows.push(mappedRow);
        }

        used.add(j);
        console.log(`🔗 Tabelas consolidadas: "${base.title}" + "${tables[j].title}" (overlap: ${(overlap * 100).toFixed(0)}%)`);
      }
    }

    merged.push(base);
  }

  return merged;
}

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
2. Identificar e extrair tabelas presentes no documento
3. Gerar sugestões inteligentes para preencher os campos de uma landing page

REGRAS CRÍTICAS PARA TABELAS:
- Preserve cabeçalhos EXATAMENTE como escritos no documento (maiúsculas, acentos, unidades)
- Cada linha da tabela deve ser um ARRAY DE STRINGS na MESMA ORDEM dos headers
- Se a tabela tem 6 colunas, cada row DEVE ter exatamente 6 elementos
- NÃO use objetos com chaves para representar linhas - use ARRAYS POSICIONAIS
- Dê um título descritivo para cada tabela baseado no contexto do documento

Exemplo correto:
  headers: ["Característica", "Produto A", "Produto B"]
  rows: [
    ["Peso", "1.2 kg", "0.8 kg"],
    ["Velocidade", "20 FPS", "30 FPS"]
  ]

Exemplo ERRADO (NÃO faça isso):
  rows: [
    {"Característica": "Peso", "Produto A": "1.2 kg"},
    {"col1": "Velocidade", "col2": "20 FPS"}
  ]

⚠️ REGRA OBRIGATÓRIA DE CONSOLIDAÇÃO DE TABELAS (PRIORIDADE MÁXIMA):
Muitos PDFs contêm UMA ÚNICA tabela comparativa que se ESTENDE por várias páginas.
Você DEVE identificar isso e retornar como UMA ÚNICA entrada no array extracted_tables.

Como identificar tabela multi-página:
- As colunas/headers são os MESMOS (ou muito similares) em páginas consecutivas
- Os itens comparados são os MESMOS (ex: mesmos produtos, mesmos scanners, mesmas marcas)
- Apenas as LINHAS/características mudam entre as páginas

Quando detectar tabela multi-página:
- CONSOLIDE todas as linhas em UMA ÚNICA tabela
- Use os headers da PRIMEIRA ocorrência
- Adicione linhas separadoras para cada seção: ["--- Nome da Seção ---", "", "", ...] (string no primeiro elemento, strings vazias nos demais)
- O título da tabela consolidada deve refletir o tema geral

SOMENTE retorne tabelas como entradas SEPARADAS no array se elas compararem itens/colunas COMPLETAMENTE DIFERENTES.

REGRAS PARA SUGESTÕES:
- Baseie-se EXCLUSIVAMENTE no conteúdo do PDF
- Não invente dados, certificações ou números que não estão no documento
- Seja conciso e persuasivo nos textos sugeridos
- O banner_title deve ser impactante e curto (máx 60 caracteres)
- O seo_description deve ter no máximo 160 caracteres`;

    const USER_PROMPT = `Analise o seguinte documento PDF da landing page "${landingPageName}" e extraia os dados usando a função fornecida.

IMPORTANTE: Este documento pode conter UMA tabela comparativa que se estende por várias páginas.
Se as colunas/headers forem iguais ou muito similares em diferentes páginas, você DEVE consolidar tudo em UMA ÚNICA tabela no array extracted_tables.
NÃO separe em múltiplas tabelas se os headers forem os mesmos.

LEMBRE-SE: Cada row é um ARRAY DE STRINGS (ex: ["valor1", "valor2", "valor3"]), NÃO um objeto.

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
              description: 'Extrai texto transcrito, tabelas consolidadas e sugestões de campos para landing page a partir de um PDF',
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
                            type: 'array',
                            items: { type: 'string' }
                          },
                          description: 'Linhas da tabela. Cada linha é um ARRAY de strings na MESMA ORDEM dos headers. Ex: ["valor1", "valor2", "valor3"]'
                        }
                      },
                      required: ['title', 'headers', 'rows'],
                      additionalProperties: false
                    },
                    description: 'Tabelas JÁ CONSOLIDADAS do PDF. Se páginas diferentes comparam os MESMOS itens/colunas, retorne como UMA ÚNICA tabela com linhas separadoras para cada seção. Cada row é um array de strings posicionais.'
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
    await trackFromResponse(aiResult, 'transcribe-landing-page-pdf', 'Transcrição PDF');
    console.log('✅ AI response received');

    // Extract tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('AI não retornou dados estruturados');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    // Post-processing: convert positional arrays to objects keyed by headers
    if (extractedData.extracted_tables?.length) {
      for (const table of extractedData.extracted_tables) {
        if (table.rows?.length && Array.isArray(table.rows[0])) {
          // Rows are positional arrays — convert to objects
          console.log(`🔄 Convertendo ${table.rows.length} rows posicionais para objetos (tabela: "${table.title}")`);
          table.rows = rowsToObjects(table.headers, table.rows);
        } else if (table.rows?.length && typeof table.rows[0] === 'object' && !Array.isArray(table.rows[0])) {
          // AI returned objects anyway — validate keys match headers
          console.log(`⚠️ AI retornou objetos em vez de arrays para "${table.title}". Remapeando...`);
          const remapped = [];
          for (const row of table.rows) {
            const keys = Object.keys(row);
            if (keys.length === 0) continue; // skip empty objects
            const obj: Record<string, string> = {};
            for (let i = 0; i < table.headers.length; i++) {
              const header = table.headers[i];
              // Try exact match first, then case-insensitive, then positional
              if (row[header] !== undefined) {
                obj[header] = String(row[header]);
              } else {
                const normalizedHeader = header.trim().toLowerCase();
                const matchKey = keys.find(k => k.trim().toLowerCase() === normalizedHeader);
                if (matchKey) {
                  obj[header] = String(row[matchKey]);
                } else if (keys[i] !== undefined) {
                  obj[header] = String(row[keys[i]]);
                } else {
                  obj[header] = '';
                }
              }
            }
            remapped.push(obj);
          }
          table.rows = remapped;
        }
      }
    }

    // Post-processing: force consolidation of tables with same headers
    if (extractedData.extracted_tables?.length > 1) {
      console.log(`⚠️ IA retornou ${extractedData.extracted_tables.length} tabelas. Executando post-processing de consolidação...`);
      extractedData.extracted_tables = consolidateTables(extractedData.extracted_tables);
      console.log(`✅ Após consolidação: ${extractedData.extracted_tables.length} tabela(s)`);
    }

    console.log('📊 Dados extraídos:', {
      textLength: extractedData.transcribed_text?.length || 0,
      suggestionsKeys: Object.keys(extractedData.suggestions || {}),
      tablesCount: extractedData.extracted_tables?.length || 0,
      firstTableRows: extractedData.extracted_tables?.[0]?.rows?.length || 0,
      firstRowSample: extractedData.extracted_tables?.[0]?.rows?.[0] || null
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
