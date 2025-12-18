import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para escapar caracteres especiais de regex
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        const escapedWord = escapeRegex(word);
        const occurrences = (textLower.match(new RegExp(escapedWord, 'gi')) || []).length;
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
    // Extrair variante específica do nome (ex: "DA1" de "Atos - DA1")
    const variantMatch = product_name.match(/[-\s]([A-Z0-9]+)$/);
    const variant_code = variantMatch ? variantMatch[1] : null;

    const inputJson = {
      product_name: product_name, // SEMPRE usa o nome exato do card, não o genérico do PDF
      product_line: extractedData.product_name || extractedData.brand, // Nome genérico da linha/família
      variant_code: variant_code, // Ex: "DA1", "DA2", etc.
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

    // ========== FASE 2: VALIDAÇÃO DE QUALIDADE DOS DADOS ==========
    const dataQualityScore = {
      technical_specs: (inputJson.technical_specs?.length || 0),
      test_results: (inputJson.test_results?.length || 0),
      materials: (inputJson.materials?.length || 0),
      device_settings: (inputJson.device_settings?.length || 0)
    };

    const totalDataPoints = Object.values(dataQualityScore).reduce((a, b) => a + b, 0);

    console.log('🔬 [VALIDAÇÃO] Qualidade dos dados de entrada:', {
      ...dataQualityScore,
      total: totalDataPoints,
      qualidade: totalDataPoints >= 10 ? 'ALTA' : totalDataPoints >= 5 ? 'MÉDIA' : 'BAIXA'
    });

    if (totalDataPoints === 0) {
      console.warn('⚠️ [VALIDAÇÃO] Nenhum dado técnico disponível! Não será possível gerar especificações.');
    }

    // Prompt do usuário para geração do card
    const systemPrompt = `Você é um Copywriter Sênior especializado em produtos médicos e odontológicos, com foco em conversão e SEO.

Sua tarefa é gerar conteúdo otimizado para um card de produto baseado SOMENTE nos dados fornecidos no INPUT JSON.

CONTEXTO DO PRODUTO:
- PRODUTO ESPECÍFICO: "${product_name}"
${variant_code ? `- VARIANTE/CÓDIGO: "${variant_code}"` : ''}
${inputJson.product_line ? `- LINHA/FAMÍLIA: "${inputJson.product_line}"` : ''}

⚠️ REGRA DE ESPECIFICIDADE:
Este card é para o produto INDIVIDUAL "${product_name}", NÃO para a linha/família genérica.
- Se o documento menciona múltiplos produtos, foque APENAS no "${product_name}"
- Se houver características específicas desta variante (cor, tonalidade, viscosidade, aplicação específica), destaque-as
- Diferencie este produto dos demais da mesma linha quando aplicável
- Use o nome completo "${product_name}" na primeira menção da descrição

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

1. **Descrição para E-commerce (300-400 palavras):** 
   - PRIMEIRA FRASE: Comece mencionando o nome completo "${product_name}" e sua principal aplicação
   - Foque nas características ESPECÍFICAS deste produto (não genéricas da linha)
   - Se houver variante (ex: cor DA1, viscosidade específica), mencione no primeiro parágrafo
   - Destaque o que torna ESTE produto único dentro da linha
   - Texto amigável, focado em solução, destacando **Benefícios** e **Aplicações** (do input benefits[] e applications[])

2. **Discurso Comercial / Pitch de Vendas (Para SPIN):** 
   - Foque nos diferenciais ESPECÍFICOS do "${product_name}"
   - Se houver dados técnicos exclusivos desta variante, use-os como argumento
   - Abordagem consultiva: "Por que escolher ${product_name} e não outro da linha?"
   - Três parágrafos curtos e persuasivos focados em **Diferenciais** (do input features[]) para iniciar uma conversa de vendas

3. **Aplicações do Produto (em Lista):** Lista objetiva (applications[] do JSON).

4. **SEO & URL Amigável (máx. 60 caracteres):** Use o Nome do Produto + Principal Benefício.

5. **Descrição SEO (máx. 160 caracteres):** Use a principal Keyword, o Nome do Produto e um Call to Action (CTA) sutil.

6. **Público-Alvo (em Lista):** Liste os tipos de profissionais ou ambientes (baseado em applications[] e warnings[]).

7. **Keywords:** Use as palavras-chave técnicas de keywords[] e complemente com as do Nome do Produto.

8. **Keywords de Mercado:** 5-7 termos de busca mais genéricos e de alto volume (ex: "resina composta dental").

9. **Keywords de Intenção de Busca:** 5-7 termos com alta intenção de compra ou pesquisa (ex: "comprar resina Atos DA1", "melhor resina dentista").

10. **Benefícios (separados):** 5-7 frases de impacto com base em benefits[].

11. **Recursos:** 5-7 frases descritivas das tecnologias ou diferenciais (baseado em features[]).

12. **10 FAQs Otimizadas para IAs de Busca:** 
    ⚠️ CAMPO CRÍTICO PARA SEO E IAs (Google Gemini, ChatGPT, Perplexity)
    ⚠️ IMPORTANTE: Use as especificações técnicas (technical_specifications) que você gerou como FONTE DE DADOS primária para criar estas FAQs.
    
    **FONTES DE DADOS OBRIGATÓRIAS (USE TODAS):**
    1. ✅ **technical_specifications** (que você acabou de gerar) → Dados quantificáveis principais
    2. ✅ **technical_specs[]** → Especificações complementares
    3. ✅ **test_results[]** → Resultados de testes clínicos
    4. ✅ **materials[]** → Composição, certificações
    5. ✅ **device_settings[]** → Protocolos de uso
    6. ✅ **certifications[]** → ISO, FDA, ANVISA, CE
    7. ✅ **usage_instructions[]** → Passo a passo
    8. ✅ **warnings[]** → Contraindicações
    9. ✅ **compatibility[]** → Equipamentos compatíveis
    10. ✅ **applications[]** → Casos de uso
    
    **DISTRIBUIÇÃO OBRIGATÓRIA (10 FAQs):**
    - 3 FAQs: **Compatibilidade Técnica** (equipamentos, protocolos, integração)
    - 2 FAQs: **Especificações e Dados Técnicos** (resistência, composição, medidas)
    - 2 FAQs: **Certificações e Segurança** (ISO, ANVISA, biocompatibilidade)
    - 1 FAQ: **ROI e Custo-Benefício** (tempo de uso, durabilidade, payback)
    - 1 FAQ: **Implementação Prática** (treinamento, instalação)
    - 1 FAQ: **Caso de Uso Real** (aplicação específica, protocolo clínico)
    
    **FORMATO DE RESPOSTA OBRIGATÓRIO (60-100 palavras):**
    
    **Estrutura de 3 Sentenças:**
    1. **Sentença 1 (Resposta Direta):** Responda com DADO NUMÉRICO ou CERTIFICAÇÃO
       - Exemplo: "Sim, possui <strong>certificação ISO 10993 completa</strong> com resistência de <strong>148 MPa</strong>."
    
    2. **Sentença 2 (Contexto Técnico):** Adicione 2-3 especificações complementares
       - Exemplo: "A composição de <strong>59% de carga em peso</strong> foi testada por <strong>5 anos</strong> em <em>estudos clínicos longitudinais</em>."
    
    3. **Sentença 3 (Benefício Prático):** Traduza dados em benefício real
       - Exemplo: "Isso garante <em>durabilidade superior a 5 anos</em> em restaurações classe III e IV com taxa de sucesso de 98%."
    
    **FORMATAÇÃO HTML OBRIGATÓRIA:**
    - Use <strong> para: números, unidades, certificações, normas
    - Use <em> para: termos técnicos importantes, benefícios clínicos
    - Use <ul><li> para: listas de compatibilidade, requisitos
    
    **EXEMPLOS DE FAQs PERFEITAS:**
    
    **Exemplo 1 - Certificação:**
    Q: "O ${product_name} possui certificação de biocompatibilidade para uso intraoral?"
    A: "Sim, o <strong>${product_name}</strong> possui <strong>certificação ISO 10993 completa</strong>, validando todos os testes de citotoxicidade, sensibilização e irritação cutânea. A composição com <strong>59% de carga em peso</strong> foi testada clinicamente por <strong>5 anos consecutivos</strong> com taxa de aprovação de <em>98% em restaurações diretas</em>. Isso garante segurança biológica para uso intraoral em pacientes com histórico de alergias a materiais odontológicos." (89 palavras)
    
    **Exemplo 2 - Protocolo Técnico:**
    Q: "Qual o protocolo de pós-cura recomendado para o ${product_name} usando equipamento Otoflash?"
    A: "O protocolo validado é <strong>Otoflash G171 com 5000 flashes</strong>, garantindo <strong>resistência à flexão de 148 MPa</strong> e módulo de elasticidade de <strong>7,4 GPa</strong>. Este protocolo foi clinicamente comprovado em <em>estudos longitudinais de 60 meses</em> com taxa de sucesso superior a 95%. A configuração otimizada evita degradação prematura e garante <em>estabilidade de cor por 3+ anos</em> em ambiente oral." (72 palavras)
    
    **⚠️ REGRAS ANTI-ALUCINAÇÃO:**
    - ❌ NUNCA invente dados não presentes no INPUT
    - ❌ SE não houver certificações[] → NÃO mencionar certificações específicas
    - ❌ SE não houver test_results[] → NÃO citar estudos clínicos
    - ❌ SE não houver device_settings[] → NÃO criar protocolos fictícios
    - ✅ SE faltar dados, use linguagem genérica
    - ✅ SEMPRE prefira silêncio à invenção
    
    **⚠️ REGRA DE DIVERSIDADE (CRÍTICA):**
    Cada FAQ deve ter um **ARGUMENTO CENTRAL ÚNICO**. NUNCA repita o mesmo dado como foco principal em 2+ FAQs.
    
    **ESTRATÉGIA:**
    1. Leia TODOS os campos do INPUT
    2. Identifique os 10 dados mais importantes/únicos
    3. Crie 1 FAQ focada em cada dado
    4. Enriqueça com 2-3 dados secundários
    5. Adicione benefício prático

13. **Especificações Técnicas (technical_specifications):** 
    ⚠️ CAMPO CRÍTICO - NUNCA RETORNE ARRAY VAZIO
    
    Extraia 8-15 especificações técnicas CRÍTICAS do produto usando ESTAS FONTES NA ORDEM DE PRIORIDADE:
    1. technical_specs[] (PRIORIDADE MÁXIMA - dados quantificáveis)
    2. test_results[] (se houver valores numéricos de testes)
    3. materials[] (se houver composição quantificada)
    4. device_settings[] (se houver parâmetros técnicos mensuráveis)
    
    **FORMATO OBRIGATÓRIO:** [{ label: "string", value: "string" }]
    
    **✅ EXEMPLOS CORRETOS:**
    - { "label": "Resistência à Flexão", "value": "147 MPa" }
    - { "label": "Rugosidade Superficial", "value": "1.5 μm" }
    - { "label": "Composição de Carga", "value": "79,0±2% (peso)" }
    - { "label": "Grau de Conversão", "value": "~53%" }
    - { "label": "Tempo de Polimerização (Dentina)", "value": "30-40s" }
    - { "label": "Radiopacidade", "value": "Conforme ISO 4049" }
    - { "label": "Certificação", "value": "ISO 10993 completa" }
    
    **⚠️ REGRAS OBRIGATÓRIAS:**
    - NUNCA retorne array vazio []
    - NUNCA invente dados não presentes no INPUT
    - Priorize dados QUANTIFICÁVEIS (números, unidades, certificações)
    - Use unidades padrão (MPa, μm, %, mm, s)
    - Evite descrições longas no "value" (máx. 50 chars)
    - Se houver range, use formato "30-40" ou "~53"
    
    **SE NÃO HOUVER DADOS TÉCNICOS SUFICIENTES:**
    - Retorne pelo menos 3-5 especificações baseadas em device_settings[] ou materials[]
    - Exemplo: { "label": "Tipo de Material", "value": "Resina Composta" }
    - Exemplo: { "label": "Equipamento", "value": "Otoflash G171" }

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
    
    // ========== FASE 1: LOGS DE DEBUG DETALHADOS ==========
    console.log('📊 [DEBUG] Resposta completa da IA:', JSON.stringify(toolCall.function.arguments, null, 2).substring(0, 500), '...');

    const techSpecs = generatedData.technical_specifications;
    console.log('📋 [DEBUG] Technical Specifications retornadas pela IA:', techSpecs);
    console.log('📏 [DEBUG] Quantidade de specs:', techSpecs?.length || 0);

    if (!techSpecs || techSpecs.length === 0) {
      console.warn('⚠️ [DEBUG] IA retornou array vazio de technical_specifications!');
      console.log('🔬 [DEBUG] Dados disponíveis no input eram:', {
        technical_specs: inputJson.technical_specs?.length || 0,
        test_results: inputJson.test_results?.length || 0,
        materials: inputJson.materials?.length || 0,
        device_settings: inputJson.device_settings?.length || 0
      });

      // ========== FASE 5: SISTEMA DE FALLBACK INTELIGENTE ==========
      console.warn('⚠️ Aplicando fallback: gerando especificações manualmente do input...');
      
      const fallbackSpecs = [];
      
      // Extrair de device_settings
      if (inputJson.device_settings && inputJson.device_settings.length > 0) {
        inputJson.device_settings.forEach(device => {
          if (device.settings && device.settings.length > 0) {
            device.settings.slice(0, 3).forEach(setting => {
              fallbackSpecs.push({
                label: setting.parameter || 'Configuração',
                value: setting.value || 'N/A'
              });
            });
          }
        });
      }
      
      // Extrair de technical_specs
      if (inputJson.technical_specs && inputJson.technical_specs.length > 0) {
        inputJson.technical_specs.slice(0, 5).forEach(spec => {
          fallbackSpecs.push({
            label: spec.property || spec.name || 'Especificação',
            value: spec.value || 'N/A'
          });
        });
      }
      
      // Extrair de materials
      if (inputJson.materials && inputJson.materials.length > 0) {
        inputJson.materials.slice(0, 3).forEach(material => {
          fallbackSpecs.push({
            label: material.name || 'Material',
            value: material.percentage || material.composition || 'N/A'
          });
        });
      }
      
      if (fallbackSpecs.length > 0) {
        console.log('✅ Fallback gerou', fallbackSpecs.length, 'especificações');
        generatedData.technical_specifications = fallbackSpecs;
      } else {
        console.error('❌ Fallback falhou: não foi possível gerar especificações');
      }
    }
    
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
