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
    const { product } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log('[generate-product-faqs] Iniciando geração de FAQs para:', product.name);

    // 🔍 Validação
    if (!product.name || !product.description) {
      throw new Error('Nome e descrição são obrigatórios para gerar FAQs');
    }

    // Validar quantidade mínima de dados
    const hasMinimumData = (
      product.description?.length > 20 ||
      (product.benefits && product.benefits.length > 0) ||
      (product.features && product.features.length > 0) ||
      (product.keywords && product.keywords.length > 0)
    );

    if (!hasMinimumData) {
      throw new Error('Dados insuficientes para gerar FAQs. Adicione mais informações ao produto (descrição, benefícios, recursos ou keywords).');
    }

    console.log('[generate-product-faqs] Dados disponíveis:', {
      description: product.description ? 'SIM' : 'NÃO',
      benefits: product.benefits?.length || 0,
      features: product.features?.length || 0,
      keywords: product.keywords?.length || 0,
      sales_pitch: product.sales_pitch ? 'SIM' : 'NÃO'
    });

    // FASE 2: Prompt OTIMIZADO para FAQs que IAs realmente fazem
    const prompt = `Você é um especialista em produtos e FAQ. Gere EXATAMENTE 10 perguntas frequentes (FAQs) sobre o produto abaixo.

**PRODUTO:**
- Nome: ${product.name}
- URL da Loja: ${product.product_url || 'N/A'}
- Marca: ${product.brand || 'N/A'}
- GTIN/EAN: ${product.gtin || 'N/A'}
- MPN: ${product.mpn || 'N/A'}
- Descrição: ${product.description}
- Pitch de Vendas: ${product.sales_pitch || 'N/A'}
- Keywords: ${product.keywords?.join(', ') || 'N/A'}
- Benefícios: ${product.benefits?.join(', ') || 'N/A'}
- Recursos: ${product.features?.join(', ') || 'N/A'}
- Especificações Técnicas: ${product.technical_specifications ? 
    (typeof product.technical_specifications === 'string' ? product.technical_specifications :
     Array.isArray(product.technical_specifications) ? product.technical_specifications.map((s: any) => 
       typeof s === 'object' ? `${s.name}: ${s.value}` : s
     ).join(', ') : 'N/A') : 'N/A'}
- Garantia: ${product.warranty_info || 'N/A'}
- Categoria: ${product.category || 'N/A'}
- Subcategoria: ${product.subcategory || 'N/A'}

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
Q: "O ${product.name} é compatível com Exocad e 3Shape?"
A: "Sim, o ${product.name} (GTIN: ${product.gtin || 'N/A'}) possui integração nativa com Exocad 3.0+ e 3Shape Dental System 2021+ via protocolo STL/PLY. A conexão é plug-and-play via USB 3.0, sem necessidade de instalação de drivers adicionais. Isso permite exportar capturas diretamente para o workflow CAD/CAM em menos de 5 segundos após o escaneamento."

**INSTRUÇÕES CRÍTICAS - ANTI-ALUCINAÇÃO:**
1. Use APENAS as informações fornecidas acima - NÃO invente dados externos
2. SE não houver dados sobre certificações → NÃO mencionar
3. SE não houver specs técnicas → NÃO inventar números
4. SE não houver comparativos → usar termos genéricos ("alternativas tradicionais")
5. SEMPRE validar cada afirmação contra os dados fornecidos

**INSTRUÇÕES DE FORMATAÇÃO:**
1. Gere EXATAMENTE 10 FAQs práticos e relevantes
2. Perguntas devem começar com: "Como", "Qual", "Quais", "O que", "Por que", "Quando"
3. Respostas devem ter entre 60-100 palavras (mais detalhadas que antes)
4. Incorpore keywords naturalmente nas respostas para SEO
5. Use HTML básico nas respostas: <strong>, <em>, <ul>, <li>, <p>
6. Respostas devem ser informativas, técnicas e persuasivas
7. Evite repetir informações entre FAQs

**REGRA OBRIGATÓRIA - HYPERLINKS:**
${product.product_url !== 'N/A' ? `SEMPRE que mencionar o nome do produto "${product.name}" nas respostas, use este formato exato:
<a href="${product.product_url}" target="_blank">${product.name}</a>

Exemplo correto:
"O <a href="${product.product_url}" target="_blank">${product.name}</a> oferece diversos benefícios..."` : 'Mencione o produto pelo nome sem hyperlinks.'}

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
5. Se um campo está vazio (N/A), IGNORE completamente esse aspecto

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
      return forbiddenTerms.some(term => 
        lowerText.includes(term) && 
        !product.description?.toLowerCase().includes(term) &&
        !product.sales_pitch?.toLowerCase().includes(term)
      );
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

    console.log(`[generate-product-faqs] FAQs validados: ${cleanedFaqs.length}/${validFaqs.length}`);

    return new Response(JSON.stringify({ faqs: cleanedFaqs }), {
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
