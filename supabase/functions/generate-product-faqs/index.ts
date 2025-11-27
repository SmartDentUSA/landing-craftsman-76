import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, productId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    let fullProduct = product;

    // Se productId for fornecido, buscar produto completo do DB
    if (productId) {
      console.log('[generate-product-faqs] Buscando produto completo do DB:', productId);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products_repository?id=eq.${productId}&select=*`, {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar produto do banco de dados');
      }

      const products = await response.json();
      if (!products || products.length === 0) {
        throw new Error('Produto não encontrado');
      }

      fullProduct = products[0];
      console.log('[generate-product-faqs] Produto carregado com sucesso:', fullProduct.name);
    }

    console.log('[generate-product-faqs] Iniciando geração de FAQs para:', fullProduct.name);

    // 🔍 Validação
    if (!fullProduct.name || !fullProduct.description) {
      throw new Error('Nome e descrição são obrigatórios para gerar FAQs');
    }

    // Validar quantidade mínima de dados
    const hasMinimumData = (
      fullProduct.description?.length > 20 ||
      (fullProduct.benefits && fullProduct.benefits.length > 0) ||
      (fullProduct.features && fullProduct.features.length > 0) ||
      (fullProduct.keywords && fullProduct.keywords.length > 0) ||
      (fullProduct.technical_specifications && fullProduct.technical_specifications.length > 0)
    );

    if (!hasMinimumData) {
      throw new Error('Dados insuficientes para gerar FAQs. Adicione mais informações ao produto.');
    }

    console.log('[generate-product-faqs] Dados disponíveis:', {
      description: fullProduct.description ? 'SIM' : 'NÃO',
      benefits: fullProduct.benefits?.length || 0,
      features: fullProduct.features?.length || 0,
      keywords: fullProduct.keywords?.length || 0,
      technical_specifications: fullProduct.technical_specifications?.length || 0,
      sales_pitch: fullProduct.sales_pitch ? 'SIM' : 'NÃO'
    });

    // FASE 2: Prompt OTIMIZADO para FAQs que IAs realmente fazem
    const specsText = fullProduct.technical_specifications ? 
      (Array.isArray(fullProduct.technical_specifications) ? 
        fullProduct.technical_specifications.map((s: any) => 
          typeof s === 'object' && s.label && s.value ? `${s.label}: ${s.value}` : 
          typeof s === 'object' && s.name && s.value ? `${s.name}: ${s.value}` : 
          String(s)
        ).join('\n') : 
        String(fullProduct.technical_specifications)
      ) : 'N/A';

    const prompt = `Você é um especialista em produtos e FAQ. Gere EXATAMENTE 10 perguntas frequentes (FAQs) sobre o produto abaixo.

**PRODUTO:**
- Nome: ${fullProduct.name}
- URL da Loja: ${fullProduct.product_url || 'N/A'}
- Marca: ${fullProduct.brand || 'N/A'}
- GTIN/EAN: ${fullProduct.gtin || 'N/A'}
- MPN: ${fullProduct.mpn || 'N/A'}
- Descrição: ${fullProduct.description}
- Pitch de Vendas: ${fullProduct.sales_pitch || 'N/A'}
- Keywords: ${fullProduct.keywords?.join(', ') || 'N/A'}
- Benefícios: ${fullProduct.benefits?.join(', ') || 'N/A'}
- Recursos: ${fullProduct.features?.join(', ') || 'N/A'}
- Aplicações: ${fullProduct.applications || 'N/A'}
- Especificações Técnicas:
${specsText}
- Garantia: ${fullProduct.warranty_info || 'N/A'}
- Categoria: ${fullProduct.category || 'N/A'}
- Subcategoria: ${fullProduct.subcategory || 'N/A'}
- Público-alvo: ${fullProduct.target_audience ? JSON.stringify(fullProduct.target_audience) : 'N/A'}

**ATENÇÃO - RESTRIÇÃO DE DADOS:**
Os dados acima são TUDO que você tem. Se algum campo mostra "N/A", significa que essa informação NÃO EXISTE.

═══════════════════════════════════════════════════════════
🎯 BANCO DE PERGUNTAS QUE IAs REALMENTE FAZEM (PRIORIZE ESTAS)
═══════════════════════════════════════════════════════════

**CATEGORIA 1: Compatibilidade Técnica** (SEMPRE incluir 2-3 FAQs deste tipo)
- "Este produto é compatível com [software/sistema X]?"
- "Quais são os requisitos mínimos de hardware/software?"
- "Funciona com [marca/modelo específico]?"
- "Tem integração nativa com [tecnologia Y]?"

**CATEGORIA 2: Comparação com Alternativas** (SEMPRE incluir 1-2 FAQs)
- "Qual a diferença entre [este produto] e [concorrente/alternativa]?"
- "Por que escolher [este produto] ao invés de [método tradicional]?"
- "Como este produto se compara em termos de [custo/tempo/qualidade]?"

**CATEGORIA 3: ROI e Justificativa Financeira** (SEMPRE incluir 1 FAQ)
- "Qual é o retorno sobre investimento (ROI) esperado?"
- "Em quanto tempo o investimento se paga?"
- "Quais custos operacionais este produto elimina?"

**CATEGORIA 4: Certificações e Conformidade** (SE disponível nos dados)
- "Este produto possui certificação ANVISA/FDA/CE?"
- "Atende às normas [regulamentação específica do setor]?"
- "Tem garantia? Qual é a cobertura?"

**CATEGORIA 5: Implementação Prática** (SEMPRE incluir 1-2 FAQs)
- "Quanto tempo leva para implementar/instalar?"
- "É necessário treinamento? Qual a duração?"
- "Que tipo de suporte está incluído?"

**CATEGORIA 6: Casos de Uso Específicos** (SEMPRE incluir 1-2 FAQs)
- "Este produto funciona para [aplicação específica X]?"
- "Posso usar em [cenário/ambiente Y]?"
- "É adequado para [perfil de cliente Z]?"

═══════════════════════════════════════════════════════════
⚙️ INSTRUÇÕES DE GERAÇÃO (FASE 2)
═══════════════════════════════════════════════════════════

**PRIORIDADE DE DISTRIBUIÇÃO**:
- 3 FAQs de Compatibilidade Técnica
- 2 FAQs de Comparação com Alternativas
- 1 FAQ de ROI/Financeiro
- 1 FAQ de Certificações (se disponível nos dados)
- 2 FAQs de Implementação Prática
- 1 FAQ de Caso de Uso Específico

**FORMATO DE RESPOSTA OBRIGATÓRIO**:
1. Primeira frase = resposta direta (Sim/Não + dado específico)
2. Segunda frase = contexto técnico com specs
3. Terceira frase = benefício prático
4. Incluir dados numéricos sempre que possível
5. Incluir termos técnicos (software, protocolos, padrões)
6. Mencionar GTIN/MPN quando relevante

**EXEMPLO DE FAQ PERFEITA**:
Q: "O ${fullProduct.name} é compatível com Exocad e 3Shape?"
A: "Sim, o ${fullProduct.name} (GTIN: ${fullProduct.gtin || 'N/A'}) possui integração nativa com Exocad 3.0+ e 3Shape Dental System 2021+ via protocolo STL/PLY. A conexão é plug-and-play via USB 3.0, sem necessidade de instalação de drivers adicionais. Isso permite exportar capturas diretamente para o workflow CAD/CAM em menos de 5 segundos após o escaneamento."

**INSTRUÇÕES CRÍTICAS - ANTI-ALUCINAÇÃO:**
1. Use APENAS as informações fornecidas acima - NÃO invente dados externos
2. SE não houver dados sobre certificações → NÃO mencionar
3. SE não houver specs técnicas → NÃO inventar números
4. SE não houver comparativos → usar termos genéricos ("alternativas tradicionais")
5. SEMPRE validar cada afirmação contra os dados fornecidos

**REGRA CRÍTICA - DIVERSIDADE DE ARGUMENTOS:**
Cada FAQ DEVE ter um argumento central DIFERENTE. Não repita o mesmo dado técnico, benefício ou certificação como foco principal em mais de UMA FAQ.

Exemplo ERRADO (repetição):
- FAQ 1: "Qual a precisão da impressora?" → "Precisão de 50 mícrons..."
- FAQ 2: "A impressora é precisa?" → "Sim, com 50 mícrons de precisão..."
- FAQ 3: "Como funciona a precisão?" → "Através de tecnologia de 50 mícrons..."

Exemplo CORRETO (diversidade):
- FAQ 1: "Qual a precisão da impressora?" → "Precisão de 50 mícrons..."
- FAQ 2: "Qual o tempo de impressão?" → "5 horas para modelo completo..."
- FAQ 3: "É compatível com Exocad?" → "Sim, integração nativa via STL..."

VERIFIQUE: Antes de gerar a FAQ, releia as 9 anteriores e garanta que o argumento central seja NOVO.

    **INSTRUÇÕES DE FORMATAÇÃO:**
    1. Gere EXATAMENTE 10 FAQs práticos e relevantes
    2. Perguntas devem começar com: "Como", "Qual", "Quais", "O que", "Por que", "Quando"
    3. Respostas devem ter entre 60-100 palavras (mais detalhadas que antes)
    4. Incorpore keywords naturalmente nas respostas para SEO
    5. Use HTML básico nas respostas: <strong>, <em>, <ul>, <li>, <p>
    6. Respostas devem ser informativas, técnicas e persuasivas
    7. Priorize DIVERSIDADE TÉCNICA: O dado quantificável, certificação ou USP que for o argumento central de uma FAQ deve ser DIFERENTE das demais FAQs. Explore todo o espectro de dados fornecidos:
       - Especificações técnicas (viscosidade, resistência, cor, tempo de cura)
       - Certificações e aprovações (ISO, FDA, ANVISA, CE)
       - Benefícios quantificáveis (economia de tempo, durabilidade em anos, redução de custos)
       - Casos de uso e compatibilidade (equipamentos, software, procedimentos)
       - Dados numéricos únicos (GTIN, MPN, dimensões, peso)

**REGRA OBRIGATÓRIA - HYPERLINKS:**
${fullProduct.product_url !== 'N/A' ? `SEMPRE que mencionar o nome do produto "${fullProduct.name}" nas respostas, use este formato exato:
<a href="${fullProduct.product_url}" target="_blank">${fullProduct.name}</a>

Exemplo correto:
"O <a href="${fullProduct.product_url}" target="_blank">${fullProduct.name}</a> oferece diversos benefícios..."` : 'Mencione o produto pelo nome sem hyperlinks.'}

**FORMATO DE SAÍDA (JSON VÁLIDO):**
[
  {
    "question": "Como funciona o produto?",
    "answer": "<p>Resposta com <strong>destaque</strong> e lista: <ul><li>Item 1</li><li>Item 2</li></ul></p>"
  }
]

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional antes ou depois.`;

    // 📡 Chamada Lovable AI
    console.log('[generate-product-faqs] Chamando Lovable AI...');
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
            content: `REGRAS ABSOLUTAS - VIOLAÇÃO RESULTA EM REJEIÇÃO TOTAL:

1. PROIBIDO criar informações não presentes nos dados do produto
2. PROIBIDO mencionar especificações técnicas não fornecidas
3. PROIBIDO assumir características ou funcionalidades
4. PROIBIDO adicionar claims de benefícios não listados
5. PROIBIDO repetir o principal dado quantificável (valor numérico), certificação ou USP (Unique Selling Point) de um produto como FOCO PRINCIPAL em mais de DUAS FAQs.
   
   DEFINIÇÃO DE "FOCO PRINCIPAL":
   - Quando o dado aparece na primeira frase da resposta
   - Quando é o assunto central da pergunta
   - Quando é o argumento principal da FAQ
   
   PERMITIDO usar o mesmo dado em contexto secundário (ex: "...compatível com sistemas certificados ISO...")
   
   EXCEÇÃO: Se o produto tiver menos de 5 dados técnicos únicos (especificações + certificações + benefícios quantificáveis), você pode usar o dado principal em até 3 FAQs, MAS SEMPRE variando o ângulo de abordagem:
   - FAQ 1: Compatibilidade técnica
   - FAQ 2: ROI/Benefício financeiro
   - FAQ 3: Comparação com alternativas

6. Se um campo está vazio (N/A), IGNORE completamente esse aspecto

PERMITIDO:
- Reformular informações existentes nos dados fornecidos
- Criar perguntas sobre dados explicitamente listados
- Usar sinônimos das keywords fornecidas

OBRIGATÓRIO:
- Toda afirmação DEVE ter origem rastreável nos dados do produto
- Retornar JSON válido sem texto adicional
- Incluir hyperlinks ao mencionar o produto quando URL fornecida` 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-product-faqs] Erro na API:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    let generatedText = data.choices[0].message.content;
    console.log('[generate-product-faqs] Resposta bruta da IA:', generatedText.substring(0, 200) + '...');

    // 🧹 Limpar JSON (remover markdown)
    generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let faqs;
    try {
      faqs = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('[generate-product-faqs] Erro ao parsear JSON:', parseError);
      console.error('[generate-product-faqs] Texto recebido:', generatedText);
      throw new Error('IA retornou JSON inválido. Tente novamente.');
    }

    // ✅ Validação final
    if (!Array.isArray(faqs)) {
      throw new Error('IA não retornou um array de FAQs');
    }

    if (faqs.length !== 10) {
      console.warn(`[generate-product-faqs] IA retornou ${faqs.length} FAQs ao invés de 10`);
    }

    // Validar estrutura de cada FAQ
    const validFaqs = faqs.filter(faq => faq.question && faq.answer);
    if (validFaqs.length === 0) {
      throw new Error('Nenhum FAQ válido foi gerado');
    }

    // Validar que FAQs não contêm termos proibidos (alucinação comum)
    const forbiddenTerms = [
      'certificado', 'aprovado pela', 'testado clinicamente',
      'garantia', 'anos de garantia', 'recomendado por',
      'prêmio', 'reconhecido internacionalmente'
    ];

    const checkForHallucinations = (text: string): boolean => {
      const lowerText = text.toLowerCase();
      
      return forbiddenTerms.some(term => {
        // 1. O termo proibido está no FAQ gerado?
        if (!lowerText.includes(term)) {
          return false; // Se não tem o termo, não é alucinação
        }

        // 2. O termo é justificado por QUALQUER campo de dado estruturado?
        const isJustifiedIn = {
          description: fullProduct.description?.toLowerCase().includes(term) || false,
          sales_pitch: fullProduct.sales_pitch?.toLowerCase().includes(term) || false,
          warranty: fullProduct.warranty_info?.toLowerCase().includes(term) || false,
          benefits: (fullProduct.benefits || []).some((b: string) => b.toLowerCase().includes(term)),
          features: (fullProduct.features || []).some((f: string) => f.toLowerCase().includes(term)),
          technical_specs: Array.isArray(fullProduct.technical_specifications) 
            ? fullProduct.technical_specifications.some((spec: any) => {
                const specValue = typeof spec === 'object' ? spec.value : spec;
                return specValue?.toString().toLowerCase().includes(term);
              })
            : (fullProduct.technical_specifications?.toString().toLowerCase().includes(term) || false)
        };

        const isJustified = Object.values(isJustifiedIn).some(v => v === true);

        // 3. Se o termo está no FAQ, mas não em nenhum campo de dados = ALUCINAÇÃO
        if (!isJustified) {
          console.warn(`[FAQ Validation] Termo "${term}" encontrado no FAQ, mas não rastreável nos dados do produto`);
          return true; // É alucinação
        }

        return false; // Termo justificado, não é alucinação
      });
    };

    // 🔍 Função para calcular similaridade entre duas strings
    const calculateSimilarity = (text1: string, text2: string): number => {
      const words1 = text1.toLowerCase().replace(/<[^>]*>/g, '').split(/\s+/);
      const words2 = text2.toLowerCase().replace(/<[^>]*>/g, '').split(/\s+/);
      
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      return intersection.size / union.size; // Jaccard similarity
    };

    // 🔍 Detectar FAQs duplicadas ou muito similares
    const removeDuplicates = (faqs: Array<{question: string; answer: string}>) => {
      const uniqueFaqs: Array<{question: string; answer: string}> = [];
      const SIMILARITY_THRESHOLD = 0.65; // 65% de similaridade = duplicado
      
      // ✅ CORRIGIDO: Função para extrair números SIGNIFICATIVOS únicos (excluindo números genéricos 0-5)
      const extractSignificantNumbers = (text: string): Set<string> => {
        const allNumbers = text.match(/\d+(\.\d+)?/g) || [];
        // Filtrar números muito pequenos/genéricos (0-5) que aparecem em muitos contextos
        const significantNumbers = allNumbers.filter(n => {
          const numValue = parseFloat(n);
          return numValue > 5 || n.includes('.'); // Mantém decimais e números > 5
        });
        return new Set(significantNumbers);
      };

      // Função auxiliar para extrair termos técnicos
      const extractKeyTerms = (text: string) => {
        const terms = text.toLowerCase().match(/\b(iso|gtin|mpn|certificad|compatív|precis|velocidad|garant|anvisa|fda|ce)\w*/g) || [];
        return new Set(terms);
      };

      // ✅ NOVO: Categorizar perguntas para validar contextos diferentes
      const getQuestionCategory = (question: string): string => {
        const lower = question.toLowerCase();
        if (lower.includes('compatível') || lower.includes('integra')) return 'compatibilidade';
        if (lower.includes('garanti') || lower.includes('suporte')) return 'garantia';
        if (lower.includes('preço') || lower.includes('custo') || lower.includes('roi')) return 'financeiro';
        if (lower.includes('como') && lower.includes('funciona')) return 'funcionamento';
        if (lower.includes('especific') || lower.includes('técnic')) return 'specs';
        if (lower.includes('diferenç') || lower.includes('compar')) return 'comparacao';
        if (lower.includes('tempo') || lower.includes('quanto') && lower.includes('leva')) return 'implementacao';
        if (lower.includes('certificaç') || lower.includes('aprovad') || lower.includes('norm')) return 'certificacao';
        return 'geral';
      };
      
      for (const faq of faqs) {
        let isDuplicate = false;
        
        for (const existingFaq of uniqueFaqs) {
          // Comparar similaridade das RESPOSTAS (mais importante que perguntas)
          const answerSimilarity = calculateSimilarity(faq.answer, existingFaq.answer);
          
          // Comparar similaridade das PERGUNTAS
          const questionSimilarity = calculateSimilarity(faq.question, existingFaq.question);
          
          // ✅ CORRIGIDO: Usar Sets para números únicos e significativos
          const numbers1 = extractSignificantNumbers(faq.answer);
          const numbers2 = extractSignificantNumbers(existingFaq.answer);
          const commonNumbers = [...numbers1].filter(n => numbers2.has(n));

          const terms1 = extractKeyTerms(faq.answer);
          const terms2 = extractKeyTerms(existingFaq.answer);
          const commonTerms = [...terms1].filter(t => terms2.has(t));
          
          // ✅ NOVO: Validar se perguntas são da mesma categoria
          const category1 = getQuestionCategory(faq.question);
          const category2 = getQuestionCategory(existingFaq.question);
          const sameCategory = category1 === category2;
          
          // Se resposta OU pergunta for muito similar = duplicado
          if (answerSimilarity > SIMILARITY_THRESHOLD || questionSimilarity > 0.75) {
            console.warn(`[FAQ Deduplication] FAQ removida (${Math.round(answerSimilarity * 100)}% similar):`, 
              faq.question.substring(0, 60) + '...');
            isDuplicate = true;
            break;
          }
          
          // ✅ CORRIGIDO: Threshold aumentado para 3 números E validação de categoria
          // Só marca como duplicado se for mesma categoria E compartilhar muitos dados técnicos
          if (sameCategory && (commonNumbers.length >= 3 || commonTerms.length >= 4)) {
            console.warn(`[FAQ Deduplication] FAQ removida (mesma categoria "${category1}" + dados técnicos repetidos):`, 
              `Números: ${commonNumbers.join(', ')} | Termos: ${commonTerms.join(', ')}`);
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          uniqueFaqs.push(faq);
        }
      }
      
      return uniqueFaqs;
    };

    // Filtrar FAQs suspeitos
    const cleanedFaqs = validFaqs.filter(faq => {
      const hasHallucination = 
        checkForHallucinations(faq.question) || 
        checkForHallucinations(faq.answer);
      
      if (hasHallucination) {
        console.warn('[generate-product-faqs] FAQ suspeito removido:', faq.question);
      }
      
      return !hasHallucination;
    });

    if (cleanedFaqs.length === 0) {
      throw new Error('Todos os FAQs gerados continham informações não verificáveis. Adicione mais dados ao produto.');
    }

    console.log(`[generate-product-faqs] FAQs validados (sem alucinações): ${cleanedFaqs.length}/${validFaqs.length}`);

    // 🔄 Aplicar deduplicação
    const uniqueFaqs = removeDuplicates(cleanedFaqs);
    console.log(`[generate-product-faqs] FAQs únicos (sem duplicações): ${uniqueFaqs.length}/${cleanedFaqs.length}`);

    // ⚠️ Validar se sobraram FAQs suficientes
    if (uniqueFaqs.length < 5) {
      console.warn(`[generate-product-faqs] Apenas ${uniqueFaqs.length} FAQs únicos restaram após deduplicação. Produto pode ter dados insuficientes.`);
    }

    return new Response(JSON.stringify({ 
      faqs: uniqueFaqs,
      metadata: {
        total_generated: faqs.length,
        after_validation: cleanedFaqs.length,
        after_deduplication: uniqueFaqs.length,
        removed_duplicates: cleanedFaqs.length - uniqueFaqs.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-product-faqs] Erro:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro desconhecido ao gerar FAQs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
