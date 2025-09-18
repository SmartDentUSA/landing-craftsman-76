import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'DeepSeek API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, content, pageData, title, landingPageData, speed = 'detailed', contentType, fullLandingPageContent, intelligent_links = {} } = await req.json();

    if (!type || !content) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: type e content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🤖 Gerando SEO com IA - Tipo: ${type}, Modo: ${speed}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'meta_description':
        systemPrompt = 'Você é um especialista em SEO. Gere uma meta description otimizada, persuasiva e que incentive cliques. Máximo 160 caracteres.';
        userPrompt = `Baseado no conteúdo da página: "${content}"\n\nGere uma meta description atrativa que:\n1. Destaque o principal benefício\n2. Inclua palavras-chave relevantes\n3. Tenha call-to-action implícito\n4. Seja única e persuasiva\n\nResponda APENAS com a meta description, sem aspas ou explicações.`;
        break;

      case 'seo_title':
        systemPrompt = 'Você é um especialista em SEO. Gere títulos otimizados para CTR e posicionamento. Máximo 60 caracteres.';
        userPrompt = `Baseado no conteúdo: "${content}"\n\nGere um título SEO que:\n1. Seja clicável e persuasivo\n2. Inclua palavra-chave principal\n3. Transmita valor/benefício\n4. Seja único e relevante\n\nResponda APENAS com o título, sem aspas ou explicações.`;
        break;

      case 'keywords':
        systemPrompt = `Você é um especialista em SEO. Analise EXCLUSIVAMENTE o conteúdo do produto fornecido e gere palavras-chave relevantes organizadas em categorias.

RESTRIÇÃO CRÍTICA: Use APENAS as informações fornecidas no conteúdo do produto. NÃO adicione conhecimento externo, dados não mencionados, ou inferências sobre mercado/categoria/uso que não estejam explicitamente descritos.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem explicações, sem markdown, sem \`\`\`json, sem texto adicional.

Formato EXATO:
{
  "primary": ["palavra1", "palavra2"],
  "secondary": ["palavra3", "palavra4"], 
  "lsi": ["palavra5", "palavra6"],
  "long_tail": ["frase longa 1", "frase longa 2"]
}`;
        userPrompt = `Analise EXCLUSIVAMENTE este conteúdo do produto e gere palavras-chave baseadas SOMENTE nas informações fornecidas:

${content}

INSTRUÇÕES RESTRITIVAS:
- Gere APENAS palavras-chave derivadas do texto fornecido (nome, descrição, benefícios, recursos)
- NÃO adicione palavras relacionadas ao mercado/categoria/uso que não estão mencionadas
- NÃO use conhecimento externo sobre o produto ou setor
- Se o produto for "Resina 3D", use apenas "resina", "3D" e termos dos benefícios/recursos listados
- Foque exclusivamente no que está escrito nos campos do produto

Gere: 3-5 primárias, 4-6 secundárias, 4-6 LSI, 3-5 long-tail baseadas SOMENTE no conteúdo fornecido.`;
        break;

      case 'hidden_content':
        systemPrompt = 'Você é um especialista em SEO técnico. Gere conteúdo contextual que ajude mecanismos de busca a entender melhor a página.';
        userPrompt = `Baseado no conteúdo: "${content}"\n\nGere um texto contextual (50-100 palavras) que:\n1. Descreva o nicho/categoria da página\n2. Inclua termos semânticos relacionados\n3. Forneça contexto sobre o produto/serviço\n4. Use linguagem natural e relevante\n\nEste texto será usado apenas para SEO (invisível ao usuário). Responda APENAS com o texto contextual.`;
        break;

      case 'faq_keywords':
        systemPrompt = 'Você é um especialista em SEO focado em intenção de busca. Analise FAQs para gerar keywords altamente relevantes baseadas nas dúvidas reais dos usuários.';
        userPrompt = `Analise este FAQ e gere 8-12 palavras-chave que respondam às dúvidas dos usuários:

FAQ CONTENT:
${content}

INSTRUÇÕES:
1. Identifique as principais dúvidas (como, onde, quando, por que, quanto)
2. Gere keywords long-tail baseadas nas perguntas
3. Inclua variações das perguntas que pessoas fazem no Google
4. Foque em keywords com intenção comercial e informacional
5. Priorize termos que levam à conversão

FORMATO: Responda APENAS com as keywords separadas por vírgula, sem numeração ou explicações.

EXEMPLO: "como funciona [produto], melhor [categoria] para [necessidade], [produto] vale a pena, onde comprar [produto]"`;
        break;

      case 'video_testimonial_analysis':
        systemPrompt = `Você é um especialista em SEO e análise de depoimentos. Analise depoimentos em vídeo para extrair máximo valor SEO.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem explicações, sem markdown, sem \`\`\`json, sem texto adicional.

Formato EXATO:
{
  "keywords": ["palavra1", "palavra2", "palavra3"],
  "benefits": ["benefício1", "benefício2", "benefício3"],
  "sentiment_score": 0.95
}`;
        userPrompt = `Analise este depoimento e extraia informações SEO relevantes:

DEPOIMENTO: ${content}

Extraia:
1. KEYWORDS: termos que potenciais clientes buscariam (produtos, serviços, benefícios, localização)
2. BENEFITS: principais benefícios mencionados pelo cliente
3. SENTIMENT_SCORE: nível de satisfação de 0 a 1 (0=negativo, 1=muito positivo)

Retorne no formato JSON especificado.`;
        break;

      case 'blog_content':
        // Construir estratégia de link building baseada nos links inteligentes fornecidos
        const hasIntelligentLinks = Object.keys(intelligent_links).length > 0;
        
        let linkBuildingStrategy = '';
        if (hasIntelligentLinks) {
          linkBuildingStrategy = `
LINK BUILDING INTELIGENTE PERSONALIZADO:
${Object.entries(intelligent_links).map(([keyword, url]) => {
  const fullUrl = url.startsWith('http') ? url : `https://smartdent.com.br${url}`;
  return `• "${keyword}" → <a href="${fullUrl}" target="_blank">${keyword}</a>`;
}).join('\n')}

INSTRUÇÕES DE USO DOS LINKS:
• Use APENAS os links fornecidos acima
• Insira-os naturalmente quando as palavras-chave aparecem no contexto
• Varie os anchor texts relacionados (sinônimos, variações da palavra-chave)
• Distribua 3-5 links ao longo do artigo de forma estratégica
• Priorize links que fazem sentido contextual no parágrafo
• Não force links onde não se encaixam naturalmente`;
        } else {
          linkBuildingStrategy = `
LINK BUILDING ESTRATÉGICO PADRÃO SMARTDENT:
• "scanner intraoral", "BLZ Scanner", "scanner" → <a href="https://smartdent.com.br/scanners" target="_blank">scanner intraoral</a>
• "fluxo digital", "odontologia digital" → <a href="https://smartdent.com.br/fluxo-digital" target="_blank">fluxo digital</a>
• "Smartdent" → <a href="https://smartdent.com.br" target="_blank">Smartdent</a>
• "treinamento", "capacitação", "curso" → <a href="https://smartdent.com.br/treinamentos" target="_blank">treinamento</a>
• "implantodontia digital" → <a href="https://smartdent.com.br/implantes" target="_blank">implantodontia digital</a>
• "prótese digital" → <a href="https://smartdent.com.br/proteses" target="_blank">prótese digital</a>
• "tecnologia odontológica" → <a href="https://smartdent.com.br/tecnologia" target="_blank">tecnologia odontológica</a>`;
        }

        systemPrompt = `Você é um especialista em criação de conteúdo para blogs que utiliza todo o conteúdo da landing page para criar artigos ricos e envolventes.

${linkBuildingStrategy}

IMPORTANTE: Use 3-5 links por artigo de forma natural. Varie os anchor texts para SEO.`;
        
        if (speed === 'fast') {
          userPrompt = `Com base no conteúdo completo da landing page abaixo, crie um blog post conciso e direto de 400-600 palavras com LINKS ESTRATÉGICOS para smartdent.com.br:

DADOS DA LANDING PAGE:
Banner: ${fullLandingPageContent?.banner?.title || ''} - ${fullLandingPageContent?.banner?.subtitle || ''}

Soluções: ${fullLandingPageContent?.solutions?.title || ''}
${fullLandingPageContent?.solutions?.items?.map((s, i) => `${i + 1}. ${s.text}`).join('\n') || ''}

FAQ: ${fullLandingPageContent?.faq?.title || ''}
${fullLandingPageContent?.faq?.items?.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n') || ''}

Conteúdo SEO: ${fullLandingPageContent?.seo?.hidden_content || fullLandingPageContent?.seo?.description || ''}

INSTRUÇÕES:
1. Use a Solução 1 como tema para uma imagem de capa (inserir <!-- IMAGEM_CAPA -->)
2. Distribua as outras soluções ao longo do conteúdo (inserir <!-- IMAGEM_SOLUCAO_2 -->, <!-- IMAGEM_SOLUCAO_3 -->, etc.)
3. Transforme o FAQ em uma seção natural do blog
4. Crie introdução baseada no banner
5. Estrutura: Intro → Seções por Solução → FAQ → CTA

Retorne APENAS o conteúdo HTML do artigo, sem tags <html>, <head> ou <body>.`;
        } else {
         userPrompt = `Com base no conteúdo completo da landing page abaixo, crie um blog post abrangente e COMPLETO de 1200-1500 palavras com LINKS ESTRATÉGICOS para smartdent.com.br:

DADOS DA LANDING PAGE:
Banner: ${fullLandingPageContent?.banner?.title || ''} - ${fullLandingPageContent?.banner?.subtitle || ''}

Soluções: ${fullLandingPageContent?.solutions?.title || ''}
${fullLandingPageContent?.solutions?.items?.map((s, i) => `${i + 1}. ${s.text}`).join('\n') || ''}

FAQ: ${fullLandingPageContent?.faq?.title || ''}
${fullLandingPageContent?.faq?.items?.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n') || ''}

Conteúdo SEO: ${fullLandingPageContent?.seo?.hidden_content || fullLandingPageContent?.seo?.description || ''}

INSTRUÇÕES DETALHADAS:
1. Introdução envolvente baseada no banner (3-4 parágrafos desenvolvidos)
2. Imagem de capa: <!-- IMAGEM_CAPA --> (baseada na Solução 1)
3. Crie uma seção robusta para cada solução com subtítulo H2 (2-3 parágrafos por seção)
4. Insira imagens ao longo do conteúdo: <!-- IMAGEM_SOLUCAO_2 -->, <!-- IMAGEM_SOLUCAO_3 -->, <!-- IMAGEM_SOLUCAO_4 -->, <!-- IMAGEM_SOLUCAO_5 -->
5. Transforme o FAQ em seção "Perguntas Frequentes" com H2 (manter todas as perguntas)
6. Conclusão extensa que reforce os benefícios das soluções (2-3 parágrafos)
7. Call-to-action bem desenvolvido conectando com a landing page

FORMATAÇÃO:
- Use H2 para seções principais, H3 para subseções
- Listas bullet points para benefícios
- Parágrafos bem estruturados e desenvolvidos
- Tom profissional mas acessível
- SEO otimizado com palavras-chave naturais
- IMPORTANTE: NÃO TRUNCAR O CONTEÚDO - Escreva artigo completo sem cortes

CRÍTICO: Retorne APENAS o conteúdo HTML do artigo, sem tags <html>, <head> ou <body>. NÃO use markdown (##, **, etc.) - use apenas HTML puro (<h2>, <strong>, <p>, etc.).`;
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Tipo inválido. Use: meta_description, seo_title, keywords, hidden_content, blog_content, video_testimonial_analysis, faq_keywords' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Define token limits based on type and speed
    let maxTokens = 200;
    let timeoutMs = 35000; // 35 segundos por padrão
    
    if (type === 'blog_content') {
      maxTokens = speed === 'fast' ? 1200 : 2400; // Aumentado para evitar truncamento
      timeoutMs = speed === 'fast' ? 50000 : 85000; // Mais tempo para conteúdo completo
    } else if (type === 'keywords') {
      maxTokens = 500;
    }
    
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erro na API DeepSeek:', errorData);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      let generatedContent = data.choices[0].message.content.trim();

    // Parse JSON para keywords e video testimonial analysis com limpeza robusta
    if (type === 'keywords' || type === 'video_testimonial_analysis') {
      try {
        // Limpar possível markdown e extrair JSON
        let cleanContent = generatedContent.trim();
        
        // Remover cercas de markdown se existirem
        cleanContent = cleanContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        
        // Extrair apenas o conteúdo entre o primeiro { e último }
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        }
        
        // Normalizar aspas se necessário
        cleanContent = cleanContent.replace(/[""]/g, '"').replace(/['']/g, "'");
        
        const parsedContent = JSON.parse(cleanContent);
        
        // Validar estrutura mínima baseada no tipo
        if (type === 'keywords') {
          generatedContent = {
            primary: Array.isArray(parsedContent.primary) ? parsedContent.primary : [],
            secondary: Array.isArray(parsedContent.secondary) ? parsedContent.secondary : [],
            lsi: Array.isArray(parsedContent.lsi) ? parsedContent.lsi : [],
            long_tail: Array.isArray(parsedContent.long_tail) ? parsedContent.long_tail : []
          };
        } else if (type === 'video_testimonial_analysis') {
          generatedContent = {
            keywords: Array.isArray(parsedContent.keywords) ? parsedContent.keywords : [],
            benefits: Array.isArray(parsedContent.benefits) ? parsedContent.benefits : [],
            sentiment_score: typeof parsedContent.sentiment_score === 'number' ? parsedContent.sentiment_score : 0.8
          };
        }
        
      } catch (e) {
        console.error('❌ Erro ao parsear JSON:', e);
        console.error('Conteúdo bruto recebido:', generatedContent);
        
        // Retornar estrutura vazia com warning baseada no tipo
        if (type === 'keywords') {
          generatedContent = {
            primary: [],
            secondary: [],
            lsi: [],
            long_tail: [],
            warning: 'IA retornou formato inválido, tente novamente'
          };
        } else if (type === 'video_testimonial_analysis') {
          generatedContent = {
            keywords: [],
            benefits: [],
            sentiment_score: 0.8,
            warning: 'IA retornou formato inválido, tente novamente'
          };
        }
      }
    }

      console.log(`✅ SEO gerado com sucesso - Tipo: ${type}, Modo: ${speed}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          type,
          content: generatedContent,
          generated_at: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      if (timeoutError.name === 'AbortError') {
        console.error('Timeout na API DeepSeek');
        return new Response(
          JSON.stringify({ error: 'Request timeout - try fast mode' }),
          { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('❌ Erro na função ai-seo-generator:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});