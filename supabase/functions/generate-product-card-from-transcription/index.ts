import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, product_name } = await req.json();
    
    if (!product_id || !product_name) {
      throw new Error('product_id e product_name são obrigatórios');
    }

    console.log('🎯 Gerando card para produto:', product_name, '(ID:', product_id, ')');

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar produto com suas transcrições
    const { data: product, error: productError } = await supabase
      .from('products_repository')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      throw new Error('Produto não encontrado');
    }

    const transcriptions = product.document_transcriptions || [];
    
    if (transcriptions.length === 0) {
      throw new Error('Nenhuma transcrição encontrada para este produto. Faça upload de um documento técnico primeiro.');
    }

    console.log('📄 Transcrições encontradas:', transcriptions.length);

    // Filtrar transcrição mais relevante para o produto
    const productNameWords = product_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    let bestTranscription = transcriptions[0];
    let bestScore = 0;

    for (const transcription of transcriptions) {
      const extractedData = transcription.extracted_data || {};
      const transcribedText = transcription.transcribed_text || '';
      
      // Calcular score de relevância
      let score = 0;
      const textLower = transcribedText.toLowerCase();
      
      // +1 para cada palavra do nome do produto que aparece
      productNameWords.forEach(word => {
        const occurrences = (textLower.match(new RegExp(word, 'g')) || []).length;
        score += occurrences;
      });
      
      // Bonus se extracted_data.product_name é similar
      if (extractedData.product_name) {
        const extractedNameLower = extractedData.product_name.toLowerCase();
        productNameWords.forEach(word => {
          if (extractedNameLower.includes(word)) score += 5;
        });
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestTranscription = transcription;
      }
    }

    console.log('✅ Transcrição selecionada:', bestTranscription.filename, '(score:', bestScore, ')');

    const extractedData = bestTranscription.extracted_data || {};
    
    // Preparar INPUT JSON para o prompt
    const inputJson = {
      product_name: extractedData.product_name || product_name,
      brand: extractedData.brand,
      model: extractedData.model,
      sku: extractedData.sku,
      technical_specs: extractedData.technical_specs || [],
      materials: extractedData.materials || [],
      features: extractedData.features || [],
      benefits: extractedData.benefits || [],
      applications: extractedData.applications || [],
      certifications: extractedData.certifications || [],
      warnings: extractedData.warnings || [],
      usage_instructions: extractedData.usage_instructions || [],
      device_settings: extractedData.device_settings || [],
      test_results: extractedData.test_results || [],
      compatibility: extractedData.compatibility,
      manufacturer: extractedData.manufacturer,
      country_of_origin: extractedData.country_of_origin,
      warranty: extractedData.warranty,
      price_info: extractedData.price_info,
      keywords: extractedData.keywords || [],
    };

    console.log('📋 INPUT preparado:', JSON.stringify(inputJson).substring(0, 200), '...');

    // Prompt do usuário para geração do card
    const systemPrompt = `Você é um Copywriter Sênior especializado em produtos médicos e odontológicos, com foco em conversão e SEO.

Sua tarefa é gerar conteúdo otimizado para um card de produto baseado SOMENTE nos dados fornecidos no INPUT JSON.

REGRAS CRÍTICAS:
- Use APENAS os dados fornecidos no INPUT
- NÃO invente informações
- Se um campo não tiver dados suficientes, retorne null
- Seja objetivo e persuasivo
- Foque em benefícios e aplicações práticas
- Otimize para SEO com keywords relevantes`;

    const userPrompt = `**INPUT DE DADOS BRUTOS:**
\`\`\`json
${JSON.stringify(inputJson, null, 2)}
\`\`\`

**TAREFAS DE GERAÇÃO:**
Usando **SOMENTE** os dados do INPUT fornecido, gere os seguintes 13 itens:

1. **Descrição para E-commerce (300-400 palavras):** Texto amigável, focado em solução, destacando **Benefícios** e **Aplicações** (do input benefits[] e applications[]).

2. **Discurso Comercial / Pitch de Vendas (Para SPIN):** Três parágrafos curtos e persuasivos focados em **Diferenciais** (do input features[]) para iniciar uma conversa de vendas.

3. **Aplicações do Produto (em Lista):** Lista objetiva (applications[] do JSON).

4. **SEO & URL Amigável (máx. 60 caracteres):** Use o Nome do Produto + Principal Benefício.

5. **Descrição SEO (máx. 160 caracteres):** Use a principal Keyword, o Nome do Produto e um Call to Action (CTA) sutil.

6. **Público-Alvo (em Lista):** Liste os tipos de profissionais ou ambientes (baseado em applications[] e warnings[]).

7. **Keywords:** Use as palavras-chave técnicas de keywords[] e complemente com as do Nome do Produto.

8. **Keywords de Mercado:** 5-7 termos de busca mais genéricos e de alto volume (ex: "resina composta dental").

9. **Keywords de Intenção de Busca:** 5-7 termos com alta intenção de compra ou pesquisa (ex: "comprar resina Atos DA1", "melhor resina dentista").

10. **Benefícios (separados):** 5-7 frases de impacto com base em benefits[].

11. **Recursos:** 5-7 frases descritivas das tecnologias ou diferenciais (baseado em features[]).

12. **10 FAQs:** Crie 10 perguntas e respostas curtas, usando as **instruções de uso**, **avisos** e **especificações técnicas** (do input usage_instructions[], warnings[], technical_specs[]) para otimizar SEO e responder dúvidas humanas.

13. **Especificações Técnicas (technical_specifications):** Extraia 8-15 especificações técnicas CRÍTICAS do produto, usando os dados de technical_specs[], test_results[], materials[], device_settings[].
    
    **FORMATO OBRIGATÓRIO:** Array de objetos [{ label: "string", value: "string" }]
    
    **✅ EXEMPLOS CORRETOS:**
    - { "label": "Resistência à Flexão", "value": "147 MPa" }
    - { "label": "Rugosidade Superficial", "value": "1.5 μm" }
    - { "label": "Composição de Carga", "value": "79,0±2% (peso)" }
    - { "label": "Grau de Conversão", "value": "~53%" }
    - { "label": "Tempo de Polimerização (Dentina)", "value": "30-40s" }
    - { "label": "Radiopacidade", "value": "Conforme ISO 4049" }
    - { "label": "Certificação", "value": "ISO 10993 completa" }
    
    **⚠️ REGRAS:**
    - Priorize dados QUANTIFICÁVEIS (números, unidades, certificações)
    - Use unidades padrão (MPa, μm, %, mm, s)
    - Evite descrições longas no "value" (máx. 50 chars)
    - Se houver range, use formato "30-40" ou "~53"

**FORMATO DE SAÍDA:** 
Retorne um JSON estruturado com os 13 campos. Use este schema exato:
{
  "description": "string (descrição e-commerce 300-400 palavras)",
  "sales_pitch": "string (pitch de vendas 3 parágrafos)",
  "applications": ["string array (lista de aplicações)"],
  "slug": "string (URL amigável max 60 chars)",
  "seo_description": "string (meta description max 160 chars)",
  "target_audience": ["string array (público-alvo)"],
  "keywords": ["string array (keywords técnicas)"],
  "market_keywords": ["string array (5-7 keywords de mercado)"],
  "search_intent_keywords": ["string array (5-7 keywords de intenção)"],
  "benefits": ["string array (5-7 benefícios)"],
  "features": ["string array (5-7 recursos)"],
  "faq": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "technical_specifications": [
    {
      "label": "string (nome da especificação)",
      "value": "string (valor ou dado quantificável)"
    }
  ]
}`;

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🤖 Chamando Lovable AI para gerar conteúdo...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_product_card',
              description: 'Gera todos os campos do card do produto',
              parameters: {
                type: 'object',
                properties: {
                  description: { 
                    type: 'string',
                    description: 'Descrição e-commerce 300-400 palavras'
                  },
                  sales_pitch: { 
                    type: 'string',
                    description: 'Pitch de vendas 3 parágrafos'
                  },
                  applications: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de aplicações do produto'
                  },
                  slug: { 
                    type: 'string',
                    description: 'URL amigável max 60 chars'
                  },
                  seo_description: { 
                    type: 'string',
                    description: 'Meta description max 160 chars'
                  },
                  target_audience: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Público-alvo em lista'
                  },
                  keywords: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Keywords técnicas'
                  },
                  market_keywords: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-7 keywords de mercado'
                  },
                  search_intent_keywords: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-7 keywords de intenção de busca'
                  },
                  benefits: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-7 benefícios'
                  },
                  features: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-7 recursos/características'
                  },
                  faq: { 
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        answer: { type: 'string' }
                      },
                      required: ['question', 'answer']
                    },
                    description: '10 perguntas e respostas'
                  },
                  technical_specifications: { 
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string', description: 'Nome da especificação técnica' },
                        value: { type: 'string', description: 'Valor ou dado quantificável' }
                      },
                      required: ['label', 'value']
                    },
                    description: '8-15 especificações técnicas estruturadas em formato { label, value }'
                  }
                },
                required: [
                  'description',
                  'sales_pitch',
                  'applications',
                  'slug',
                  'seo_description',
                  'target_audience',
                  'keywords',
                  'market_keywords',
                  'search_intent_keywords',
                  'benefits',
                  'features',
                  'faq',
                  'technical_specifications'
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_product_card' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API:', aiResponse.status, errorText);
      throw new Error(`Erro na API Lovable AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('🎉 Resposta da IA recebida');

    // Extrair dados do tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('IA não retornou dados estruturados');
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    
    console.log('✅ Card gerado com sucesso!');
    console.log('📊 Campos gerados:', Object.keys(generatedData).join(', '));

    return new Response(
      JSON.stringify({
        success: true,
        data: generatedData,
        source_transcription: {
          filename: bestTranscription.filename,
          transcribed_at: bestTranscription.transcribed_at
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
