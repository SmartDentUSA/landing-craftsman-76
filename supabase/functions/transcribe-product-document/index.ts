import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função de filtragem de dados irrelevantes
function filterIrrelevantData(extractedData: any, productName: string) {
  const CORPORATE_KEYWORDS = [
    'empresa', 'company', 'endereço', 'address', 'telefone', 'phone', 'tel',
    'cnpj', 'cpf', 'email', 'e-mail', 'contato', 'contact', 'sede', 'headquarters',
    'filial', 'branch', 'representante', 'representative', 'distribuidor', 'vendas',
    'missão', 'visão', 'valores', 'mission', 'vision', 'atendimento', 'suporte',
    'site', 'website', 'redes sociais', 'social media', 'whatsapp', 'instagram',
    'facebook', 'linkedin', 'comercial', 'vendedor', 'atendimento ao cliente'
  ];

  const productNameWords = productName.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2); // Palavras > 2 letras

  // Função auxiliar para verificar relevância
  const isRelevant = (text: string): boolean => {
    if (!text || text.trim().length === 0) return false;
    
    const lowerText = text.toLowerCase();
    
    // Rejeitar se contém palavras corporativas
    const hasCorporateKeyword = CORPORATE_KEYWORDS.some(kw => 
      lowerText.includes(kw)
    );
    if (hasCorporateKeyword) {
      console.log('🗑️ Descartado (corporativo):', text.substring(0, 50) + '...');
      return false;
    }
    
    // Aceitar se menciona o nome do produto
    const mentionsProduct = productNameWords.some(word => 
      lowerText.includes(word)
    );
    if (mentionsProduct) {
      return true;
    }
    
    // Aceitar se for especificação técnica (contém números + unidades)
    const hasSpec = /\d+\s*(mm|cm|m|kg|g|mg|v|w|kw|hz|khz|mhz|rpm|°c|°f|bar|psi|l|ml|mpa|a|ma|mah|min|max|±)/i.test(text);
    if (hasSpec) {
      return true;
    }

    // Aceitar se for certificação
    const hasCertification = /(iso|ce|fda|anvisa|inmetro|ul|rohs|fcc|en\s*\d+)/i.test(lowerText);
    if (hasCertification) {
      return true;
    }
    
    // Rejeitar se for muito curto (< 5 caracteres)
    if (text.trim().length < 5) {
      return false;
    }
    
    return true; // Por padrão, manter
  };

  // Filtrar arrays
  if (extractedData.features && Array.isArray(extractedData.features)) {
    const original = extractedData.features.length;
    extractedData.features = extractedData.features.filter(isRelevant);
    console.log(`🧹 Features: ${original} → ${extractedData.features.length}`);
  }

  if (extractedData.benefits && Array.isArray(extractedData.benefits)) {
    const original = extractedData.benefits.length;
    extractedData.benefits = extractedData.benefits.filter(isRelevant);
    console.log(`🧹 Benefits: ${original} → ${extractedData.benefits.length}`);
  }

  if (extractedData.applications && Array.isArray(extractedData.applications)) {
    const original = extractedData.applications.length;
    extractedData.applications = extractedData.applications.filter(isRelevant);
    console.log(`🧹 Applications: ${original} → ${extractedData.applications.length}`);
  }

  if (extractedData.keywords && Array.isArray(extractedData.keywords)) {
    const original = extractedData.keywords.length;
    extractedData.keywords = extractedData.keywords.filter((kw: string) => 
      kw.length > 3 && 
      !CORPORATE_KEYWORDS.some(corp => kw.toLowerCase().includes(corp))
    );
    console.log(`🧹 Keywords: ${original} → ${extractedData.keywords.length}`);
  }

  if (extractedData.technical_specs && Array.isArray(extractedData.technical_specs)) {
    const original = extractedData.technical_specs.length;
    extractedData.technical_specs = extractedData.technical_specs.filter((spec: any) => 
      isRelevant(spec.label + ' ' + spec.value)
    );
    console.log(`🧹 Technical Specs: ${original} → ${extractedData.technical_specs.length}`);
  }

  if (extractedData.materials && Array.isArray(extractedData.materials)) {
    const original = extractedData.materials.length;
    extractedData.materials = extractedData.materials.filter(isRelevant);
    console.log(`🧹 Materials: ${original} → ${extractedData.materials.length}`);
  }

  if (extractedData.certifications && Array.isArray(extractedData.certifications)) {
    const original = extractedData.certifications.length;
    extractedData.certifications = extractedData.certifications.filter(isRelevant);
    console.log(`🧹 Certifications: ${original} → ${extractedData.certifications.length}`);
  }

  if (extractedData.warnings && Array.isArray(extractedData.warnings)) {
    const original = extractedData.warnings.length;
    extractedData.warnings = extractedData.warnings.filter(isRelevant);
    console.log(`🧹 Warnings: ${original} → ${extractedData.warnings.length}`);
  }

  // Novos campos estruturados
  if (extractedData.usage_instructions && Array.isArray(extractedData.usage_instructions)) {
    const original = extractedData.usage_instructions.length;
    extractedData.usage_instructions = extractedData.usage_instructions.filter((instr: any) => 
      isRelevant(instr.instruction)
    );
    console.log(`🧹 Usage Instructions: ${original} → ${extractedData.usage_instructions.length}`);
  }

  if (extractedData.device_settings && Array.isArray(extractedData.device_settings)) {
    const original = extractedData.device_settings.length;
    extractedData.device_settings = extractedData.device_settings.filter((device: any) => 
      isRelevant(device.device_name)
    );
    console.log(`🧹 Device Settings: ${original} → ${extractedData.device_settings.length}`);
  }

  if (extractedData.test_results && Array.isArray(extractedData.test_results)) {
    const original = extractedData.test_results.length;
    extractedData.test_results = extractedData.test_results.filter((test: any) => 
      isRelevant(test.test_name)
    );
    console.log(`🧹 Test Results: ${original} → ${extractedData.test_results.length}`);
  }

  // Validar campos de texto únicos
  if (extractedData.warranty) {
    if (!isRelevant(extractedData.warranty)) {
      console.log('🗑️ Descartado warranty:', extractedData.warranty);
      extractedData.warranty = null;
    }
  }

  if (extractedData.price_info) {
    if (!isRelevant(extractedData.price_info)) {
      console.log('🗑️ Descartado price_info:', extractedData.price_info);
      extractedData.price_info = null;
    }
  }

  return extractedData;
}

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
    const productName = (formData.get('product_name') as string) || 'produto';
    const productId = formData.get('product_id') as string;

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
    console.log('🎯 Produto alvo:', productName, '(ID:', productId, ')');

    // Converter PDF para texto usando pdfjs-serverless
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfData = new Uint8Array(arrayBuffer);

    const pdf = await getDocument({ data: pdfData }).promise;
    const maxPages = Math.min(pdf.numPages, 20); // limita a 20 páginas por performance
    let extractedText = '';

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as any[])
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ');
      extractedText += `\n\n--- Página ${pageNum} ---\n${pageText}`;
    }

    // Limitar tamanho do texto para evitar estouro de tokens
    const MAX_CHARS = 60000;
    const clippedText = extractedText.length > MAX_CHARS
      ? extractedText.slice(0, MAX_CHARS) + '\n\n[Texto truncado]'
      : extractedText;

    console.log('📝 Texto extraído (tamanho):', clippedText.length);

    console.log('🔄 Processando com Lovable AI (Gemini 2.5 Flash)...');

    // Prompt otimizado com filtragem por produto específico
    const EXTRACTION_PROMPT = `Você é um especialista em análise de documentos técnicos de produtos, especialmente equipamentos médicos, odontológicos e industriais.

═══════════════════════════════════════════════════════════
🎯 CONTEXTO CRÍTICO - PRODUTO ALVO
═══════════════════════════════════════════════════════════
PRODUTO: "${productName}"

⚠️ REGRA ABSOLUTA DE FILTRAGEM:
Extraia APENAS informações que se refiram DIRETAMENTE a "${productName}".

IGNORAR COMPLETAMENTE (não extrair):
❌ Dados da empresa (endereços, telefones, CNPJ, logos, sedes, filiais)
❌ Informações de OUTROS produtos que não sejam "${productName}"
❌ Índices, sumários, páginas de contato, rodapés
❌ Avisos legais genéricos da empresa (termos de uso, políticas)
❌ Informações de vendas/marketing não relacionadas ao produto
❌ Dados corporativos (missão, visão, valores da empresa)
❌ Informações de representantes, distribuidores genéricos
❌ Informações comerciais genéricas (tabelas de preços de outros produtos)

EXTRAIR SOMENTE:
✅ Especificações técnicas de "${productName}"
✅ Características e funcionalidades de "${productName}"
✅ Aplicações e benefícios de "${productName}"
✅ Dados técnicos (dimensões, peso, voltagem, materiais) de "${productName}"
✅ Certificações específicas de "${productName}"
✅ Garantia e informações comerciais de "${productName}"
✅ Preço e informações de compra de "${productName}"

INSTRUÇÕES DE EXTRAÇÃO:

1. **IDENTIFICAÇÃO DO PRODUTO:**
   - Nome completo do produto (deve ser "${productName}" ou variação)
   - Marca/Fabricante (apenas se específico deste produto)
   - Modelo/Código específico de "${productName}"
   - SKU ou código interno específico

2. **ESPECIFICAÇÕES TÉCNICAS:**
   - Dimensões (altura, largura, profundidade, peso) de "${productName}"
   - Materiais de construção específicos
   - Componentes eletrônicos (voltagem, potência, frequência)
   - Capacidades (velocidade, temperatura, pressão, volume, etc.)
   - Conectividade (Bluetooth, Wi-Fi, USB, etc.)
   - Certificações específicas de "${productName}"
   - Normas regulatórias aplicáveis a este produto

3. **CARACTERÍSTICAS E FUNCIONALIDADES:**
   - Recursos principais (bullet points) de "${productName}"
   - Diferenciais competitivos específicos
   - Tecnologias embarcadas neste produto
   - Modos de operação específicos
   - Recursos de segurança

4. **BENEFÍCIOS E APLICAÇÕES:**
   - Benefícios para o usuário final de "${productName}"
   - Indicações de uso e aplicações clínicas/industriais específicas
   - Casos de aplicação específicos deste produto
   - Público-alvo (profissionais, especialidades) para este produto

5. **INFORMAÇÕES COMERCIAIS:**
   - Preço (se mencionado) de "${productName}"
   - Garantia específica deste produto
   - País de origem/fabricação
   - Registro ANVISA/FDA específico (se aplicável)

6. **AVISOS E OBSERVAÇÕES:**
   - Contraindicações específicas de "${productName}"
   - Cuidados especiais e precauções
   - Manutenção recomendada
   - Requisitos de instalação

7. **KEYWORDS SEO:**
   - Extraia 15-20 palavras-chave relevantes APENAS relacionadas a "${productName}"
   - Inclua termos técnicos, aplicações, benefícios e tecnologias específicas
   - Use plural e singular quando apropriado
   - EXCLUA termos genéricos da empresa ou de outros produtos

8. **TEXTO COMPLETO TRANSCRITO:**
   - Transcreva APENAS as seções do documento relacionadas a "${productName}"
   - Se for um catálogo, identifique e transcreva APENAS a seção deste produto
   - Mantenha hierarquia de informações (títulos, subtítulos, listas)
   - Preserve números, códigos e unidades de medida exatamente como aparecem

9. **INSTRUÇÕES DE USO (PASSO A PASSO):**
   - Se o documento contém instruções de aplicação/uso, extraia cada etapa como um objeto estruturado
   - Identifique o número da etapa e a instrução clara e detalhada
   - Se houver referências a imagens/diagramas, inclua no campo opcional
   - Exemplos: "1. Limpe a superfície", "2. Aplique o produto uniformemente", "3. Aguarde 5 minutos"
   - Preserve comandos imperativos e detalhes técnicos (tempo, temperatura, quantidade)

10. **CONFIGURAÇÕES DE DISPOSITIVOS:**
    - Se houver tabelas de parâmetros para equipamentos/dispositivos específicos, extraia:
      * Nome do dispositivo/equipamento (ex: "NK-Optik Otoflash", "Lâmpada UV portátil")
      * Modelo (se especificado, ex: "Curie+ Plus", "48W")
      * Parâmetros técnicos: tempo, temperatura, potência, intensidade, comprimento de onda, ciclos, etc.
    - Preserve valores numéricos e unidades EXATAMENTE como aparecem (ex: "5 minutos", "1.000 mW/cm²", "365–410 nm")
    - Para cada parâmetro, especifique claramente o nome do parâmetro e seu valor
    - Se houver observações especiais (ex: "sem nitrogênio", "luz azul ativada"), inclua como parâmetro

11. **RESULTADOS DE TESTES:**
    - Se houver dados de testes técnicos ou laboratoriais (resistência, flexão, tenacidade, dureza, etc.):
      * Nome do teste (ex: "Resistência Flexural", "Módulo Flexural", "Tenacidade à Fratura")
      * Tipo/categoria do teste (ex: "Mecânico", "Químico", "Térmico", "Performance")
      * Metodologia do teste (se mencionada, ex: "ASTM D790", "ISO 178")
      * Resultados comparativos organizados por condição testada
    - Para cada resultado, especifique:
      * Condição testada (ex: "Sem tratamento", "Com Glaze", "Após 1000 ciclos")
      * Valor numérico (ex: "150", "165", "+10,5")
      * Unidade de medida (ex: "MPa", "%", "N/mm²")
    - Preserve aumentos/reduções percentuais e valores de comparação

12. **COMPATIBILIDADE:**
    - Liste materiais/resinas compatíveis (ex: "Todas as resinas Bite Splint", "Resinas flexíveis 3D")
    - Liste dispositivos/equipamentos compatíveis (ex: "Impressoras 3D DLP", "Câmaras de cura UV")
    - Liste aplicações/procedimentos compatíveis (ex: "Placas miorrelaxantes", "Guias cirúrgicos")
    - EXCLUA compatibilidades genéricas ou não relacionadas ao produto específico
    - Se houver restrições de compatibilidade, mencione-as (ex: "Não compatível com resinas rígidas")

13. **ESTRUTURA DO DOCUMENTO:**
    - Identifique seções principais do documento (títulos numerados ou em destaque)
    - Preserve a hierarquia de seções (seção principal > subseção)
    - Capture títulos exatos das seções (ex: "1. DESCRIÇÃO DO PRODUTO", "2. VANTAGENS", "6. PARÂMETROS TÉCNICOS")
    - Se houver numeração, preserve-a (ex: "1.", "2.1", "3.2.1")
    - Útil para navegação e compreensão da estrutura do documento
    - Inclua um resumo breve do conteúdo de cada seção (1-2 linhas)

FORMATO DE RESPOSTA:
Retorne apenas o objeto JSON estruturado, sem texto adicional antes ou depois.

REGRAS IMPORTANTES:
- Se o documento for um catálogo com múltiplos produtos, identifique a seção de "${productName}" e extraia APENAS dessa seção
- Se alguma informação for ambígua ou não claramente relacionada ao produto alvo, DESCARTE
- Se não houver informações sobre "${productName}" no documento, retorne campos vazios/null
- Se algum campo não estiver presente, retorne null ou array vazio []
- Preserve números, unidades de medida e códigos EXATAMENTE como aparecem (não arredonde, não converta)
- Para valores com intervalos, preserve o formato exato (ex: "365–410 nm", "5-10 minutos")
- Seja preciso e objetivo - NÃO invente informações que não estão no documento
- Para especificações técnicas, use arrays de objetos com "label" e "value"
- Para instruções, device_settings e test_results, use objetos estruturados conforme schema`;

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
            role: 'system',
            content: 'Você é um assistente especialista em análise de documentos técnicos de produtos. Responda com precisão e extraia dados estruturados conforme solicitado.'
          },
          {
            role: 'user',
            content: `${EXTRACTION_PROMPT}\n\nDOCUMENTO (texto extraído):\n${clippedText}`
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
                  materials: { type: 'array', items: { type: 'string' } },
                  features: { type: 'array', items: { type: 'string' } },
                  benefits: { type: 'array', items: { type: 'string' } },
                  applications: { type: 'array', items: { type: 'string' } },
                  certifications: { type: 'array', items: { type: 'string' } },
                  warnings: { type: 'array', items: { type: 'string' } },
                  manufacturer: { type: 'string' },
                  country_of_origin: { type: 'string' },
                  warranty: { type: 'string' },
                  price_info: { type: 'string' },
                  keywords: { type: 'array', items: { type: 'string' } },
                  usage_instructions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        step_number: { type: 'number', description: 'Número da etapa (1, 2, 3...)' },
                        instruction: { type: 'string', description: 'Instrução detalhada do passo' },
                        image_reference: { type: 'string', description: 'Referência a imagem/diagrama (opcional)' }
                      },
                      required: ['step_number', 'instruction']
                    },
                    description: 'Instruções de uso passo a passo'
                  },
                  device_settings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        device_name: { type: 'string', description: 'Nome do dispositivo/equipamento' },
                        model: { type: 'string', description: 'Modelo do dispositivo (opcional)' },
                        settings: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              parameter: { type: 'string', description: 'Nome do parâmetro (ex: "Tempo", "Potência", "Comprimento de onda")' },
                              value: { type: 'string', description: 'Valor do parâmetro com unidade (ex: "5 minutos", "1.000 mW/cm²", "365–410 nm")' }
                            },
                            required: ['parameter', 'value']
                          }
                        }
                      },
                      required: ['device_name']
                    },
                    description: 'Configurações recomendadas para dispositivos/equipamentos específicos'
                  },
                  test_results: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        test_name: { type: 'string', description: 'Nome do teste (ex: "Resistência Flexural", "Módulo Flexural")' },
                        test_type: { type: 'string', description: 'Tipo/categoria do teste (ex: "Mecânico", "Químico", "Térmico")' },
                        methodology: { type: 'string', description: 'Metodologia do teste (ex: "ASTM D790", "ISO 178") - opcional' },
                        description: { type: 'string', description: 'Descrição do que o teste mede - opcional' },
                        results: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              condition: { type: 'string', description: 'Condição testada (ex: "Sem tratamento", "Com Glaze", "Aumento percentual")' },
                              value: { type: 'string', description: 'Resultado numérico (ex: "150", "165", "+10,5")' },
                              unit: { type: 'string', description: 'Unidade de medida (ex: "MPa", "%", "N/mm²")' }
                            },
                            required: ['condition', 'value']
                          }
                        }
                      },
                      required: ['test_name']
                    },
                    description: 'Resultados de testes técnicos e de performance'
                  },
                  compatibility: {
                    type: 'object',
                    properties: {
                      compatible_materials: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Materiais/resinas compatíveis com o produto'
                      },
                      compatible_devices: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Equipamentos/dispositivos compatíveis'
                      },
                      compatible_applications: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Aplicações/procedimentos compatíveis'
                      }
                    },
                    description: 'Informações de compatibilidade do produto'
                  },
                  document_sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        section_title: { type: 'string', description: 'Título exato da seção' },
                        section_number: { type: 'string', description: 'Numeração da seção (ex: "1.", "2.1", "3.2.1") - opcional' },
                        content: { type: 'string', description: 'Resumo breve do conteúdo da seção (1-2 linhas)' }
                      },
                      required: ['section_title', 'content']
                    },
                    description: 'Estrutura hierárquica do documento (seções principais identificadas)'
                  }
                },
                required: ['transcribed_text']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_product_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded (429)' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Payment required (402)' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(
        JSON.stringify({ success: false, error: `AI gateway error (${response.status})`, details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('✅ Resposta da IA recebida');

    // Extrair dados da tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'extract_product_data') {
      throw new Error('Formato de resposta inesperado da IA');
    }

    let extractedData = JSON.parse(toolCall.function.arguments);
    
    // Garantir que temos o texto transcrito
    if (!extractedData.transcribed_text) {
      throw new Error('Falha ao extrair texto do documento');
    }

    // Aplicar filtro de relevância pós-extração
    if (productName && productName !== 'produto') {
      console.log('🧹 Aplicando filtro de relevância para:', productName);
      const beforeFilter = JSON.stringify(extractedData).length;
      extractedData = filterIrrelevantData(extractedData, productName);
      const afterFilter = JSON.stringify(extractedData).length;
      console.log(`📊 Tamanho dos dados: ${beforeFilter} → ${afterFilter} bytes (${Math.round((1 - afterFilter/beforeFilter) * 100)}% redução)`);
    }

    console.log('📊 Dados extraídos (pós-filtro):', {
      product_name: extractedData.product_name || 'N/A',
      specs_count: extractedData.technical_specs?.length || 0,
      features_count: extractedData.features?.length || 0,
      benefits_count: extractedData.benefits?.length || 0,
      keywords_count: extractedData.keywords?.length || 0,
      applications_count: extractedData.applications?.length || 0,
      usage_instructions_count: extractedData.usage_instructions?.length || 0,
      device_settings_count: extractedData.device_settings?.length || 0,
      test_results_count: extractedData.test_results?.length || 0,
      compatibility_items: (extractedData.compatibility?.compatible_materials?.length || 0) + 
                          (extractedData.compatibility?.compatible_devices?.length || 0) + 
                          (extractedData.compatibility?.compatible_applications?.length || 0),
      document_sections_count: extractedData.document_sections?.length || 0,
      text_length: extractedData.transcribed_text.length,
      filtering_applied: productName !== 'produto'
    });

    // Retornar resultado estruturado
    return new Response(
      JSON.stringify({
        success: true,
        transcription: {
          text: extractedData.transcribed_text,
          model: 'google/gemini-2.5-flash',
          filtering: {
            applied: productName !== 'produto',
            target_product: productName,
            target_product_id: productId
          },
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
            keywords: extractedData.keywords || [],
            usage_instructions: extractedData.usage_instructions || [],
            device_settings: extractedData.device_settings || [],
            test_results: extractedData.test_results || [],
            compatibility: extractedData.compatibility || {
              compatible_materials: [],
              compatible_devices: [],
              compatible_applications: []
            },
            document_sections: extractedData.document_sections || []
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
