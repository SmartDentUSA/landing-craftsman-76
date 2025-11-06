import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 [Transcribe PDF] Recebendo requisição...');

    // Obter a API key do Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Parse do FormData para obter o arquivo PDF
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;

    if (!pdfFile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum arquivo PDF foi enviado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limite de 10MB no servidor também
    if (pdfFile.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'Arquivo excede 10MB' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📎 Arquivo recebido:', {
      name: pdfFile.name,
      size: pdfFile.size,
      type: pdfFile.type
    });

    // Converter PDF para base64 de forma segura sem estourar a stack
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64PDF = b64encode(new Uint8Array(arrayBuffer));

    console.log('🔄 Processando com Lovable AI (Gemini 2.5 Flash)...');

    // Prompt otimizado para extração de dados técnicos
    const EXTRACTION_PROMPT = `Você é um especialista em análise de documentos técnicos de produtos, especialmente equipamentos médicos, odontológicos e industriais.

TAREFA: Analise o documento PDF fornecido e extraia TODAS as informações relevantes do produto de forma estruturada e detalhada.

INSTRUÇÕES DE EXTRAÇÃO:

1. **IDENTIFICAÇÃO DO PRODUTO:**
   - Nome completo do produto
   - Marca/Fabricante
   - Modelo/Código
   - SKU ou código interno

2. **ESPECIFICAÇÕES TÉCNICAS:**
   - Dimensões (altura, largura, profundidade, peso)
   - Materiais de construção
   - Componentes eletrônicos (voltagem, potência, frequência)
   - Capacidades (velocidade, temperatura, pressão, volume, etc.)
   - Conectividade (Bluetooth, Wi-Fi, USB, etc.)
   - Certificações (ISO, CE, FDA, ANVISA, INMETRO, etc.)
   - Normas regulatórias aplicáveis

3. **CARACTERÍSTICAS E FUNCIONALIDADES:**
   - Recursos principais (bullet points)
   - Diferenciais competitivos
   - Tecnologias embarcadas
   - Modos de operação
   - Recursos de segurança

4. **BENEFÍCIOS E APLICAÇÕES:**
   - Benefícios para o usuário final
   - Indicações de uso e aplicações clínicas/industriais
   - Casos de aplicação específicos
   - Público-alvo (profissionais, especialidades)

5. **INFORMAÇÕES COMERCIAIS:**
   - Preço (se mencionado)
   - Garantia
   - País de origem/fabricação
   - Registro ANVISA/FDA (se aplicável)
   - Informações de importação

6. **AVISOS E OBSERVAÇÕES:**
   - Contraindicações
   - Cuidados especiais e precauções
   - Manutenção recomendada
   - Requisitos de instalação

7. **KEYWORDS SEO:**
   - Extraia 15-20 palavras-chave relevantes do documento
   - Inclua termos técnicos, aplicações, benefícios e tecnologias
   - Use plural e singular quando apropriado

8. **TEXTO COMPLETO TRANSCRITO:**
   - Forneça uma transcrição limpa e formatada de todo o conteúdo textual do documento
   - Mantenha a hierarquia de informações (títulos, subtítulos, listas)
   - Preserve números, códigos e unidades de medida exatamente como aparecem

FORMATO DE RESPOSTA:
Retorne apenas o objeto JSON, sem texto adicional antes ou depois.

REGRAS IMPORTANTES:
- Se algum campo não estiver presente no documento, retorne null ou omita
- Preserve números, unidades de medida e códigos EXATAMENTE como aparecem
- Traduza siglas técnicas quando possível (ex: "rpm = rotações por minuto")
- Seja preciso e objetivo - NÃO invente informações
- Mantenha formatação de listas e hierarquias
- Identifique o idioma do documento e mantenha a transcrição no idioma original
- Para especificações técnicas, use arrays de objetos com "label" e "value"`;

    // Fazer requisição para Lovable AI com tool calling para estruturação
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EXTRACTION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_product_data',
              description: 'Extrai dados estruturados de documentos técnicos de produtos',
              parameters: {
                type: 'object',
                properties: {
                  transcribed_text: {
                    type: 'string',
                    description: 'Texto completo transcrito do documento, limpo e formatado'
                  },
                  product_name: { type: 'string', description: 'Nome completo do produto' },
                  brand: { type: 'string', description: 'Marca ou fabricante' },
                  model: { type: 'string', description: 'Modelo ou código do produto' },
                  sku: { type: 'string', description: 'SKU ou código interno' },
                  technical_specs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        value: { type: 'string' }
                      },
                      required: ['label', 'value']
                    },
                    description: 'Especificações técnicas detalhadas'
                  },
                  materials: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Materiais de construção'
                  },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Características e funcionalidades principais'
                  },
                  benefits: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Benefícios para o usuário'
                  },
                  applications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Aplicações e casos de uso'
                  },
                  certifications: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Certificações e normas (ISO, CE, FDA, ANVISA, etc.)'
                  },
                  warnings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Avisos, contraindicações e cuidados especiais'
                  },
                  manufacturer: { type: 'string', description: 'Nome do fabricante' },
                  country_of_origin: { type: 'string', description: 'País de origem' },
                  warranty: { type: 'string', description: 'Informações de garantia' },
                  price_info: { type: 'string', description: 'Informações sobre preço' },
                  keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '15-20 palavras-chave SEO relevantes'
                  }
                },
                required: ['transcribed_text']
              }
            }
          }
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'extract_product_data' }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns instantes.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos no workspace.');
      }
      
      throw new Error(`Erro da API de IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('✅ Resposta da IA recebida');

    // Extrair dados da tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'extract_product_data') {
      throw new Error('Formato de resposta inesperado da IA');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    
    // Garantir que temos o texto transcrito
    if (!extractedData.transcribed_text) {
      throw new Error('Falha ao extrair texto do documento');
    }

    console.log('📊 Dados extraídos:', {
      product_name: extractedData.product_name || 'N/A',
      specs_count: extractedData.technical_specs?.length || 0,
      features_count: extractedData.features?.length || 0,
      keywords_count: extractedData.keywords?.length || 0,
      text_length: extractedData.transcribed_text.length
    });

    // Retornar resultado estruturado
    return new Response(
      JSON.stringify({
        success: true,
        transcription: {
          text: extractedData.transcribed_text,
          model: 'google/gemini-2.5-flash',
          extracted_data: {
            product_name: extractedData.product_name || null,
            brand: extractedData.brand || null,
            model: extractedData.model || null,
            sku: extractedData.sku || null,
            technical_specs: extractedData.technical_specs || [],
            materials: extractedData.materials || [],
            features: extractedData.features || [],
            benefits: extractedData.benefits || [],
            applications: extractedData.applications || [],
            certifications: extractedData.certifications || [],
            warnings: extractedData.warnings || [],
            manufacturer: extractedData.manufacturer || null,
            country_of_origin: extractedData.country_of_origin || null,
            warranty: extractedData.warranty || null,
            price_info: extractedData.price_info || null,
            keywords: extractedData.keywords || []
          }
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ [Transcribe PDF] Erro:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar documento'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
