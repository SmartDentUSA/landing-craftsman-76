import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateLandingPageHTML } from "./generateHTML.ts";
import { fetchSystemBResourcesForProducts } from "./systemBIntegration.ts";
import { fetchAggregateRating, type AggregateRatingData } from "../_shared/aggregate-rating-helper.ts";
import { fetchLocalBusinessData, generateLocalBusinessSchema, type LocalBusinessData } from "../_shared/local-business-helper.ts";
import { generateHowToSchema, generateMultipleHowToSchemas, type ProductWithWorkflow } from "../_shared/howto-schema-helper.ts";
// ✅ FASE 3: Person Schema para E-E-A-T
import { fetchKOLData, type PersonSchemaData } from "../_shared/person-schema-helper.ts";
// ✅ FASE 10: Authority Data Helper completo
import { 
  fetchAuthorityData, 
  fetchVideoTestimonials,
  type AuthorityData,
  type VideoTestimonial
} from "../_shared/authority-data-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════
// 🎬 COLETOR DE VÍDEOS DOS PRODUTOS VINCULADOS
// ═══════════════════════════════════════════════════════════

interface ProductVideo {
  url: string;
  title: string;
  description?: string;
  type: 'youtube' | 'instagram' | 'tiktok' | 'technical' | 'testimonial';
  productName: string;
  productId: string;
  thumbnail?: string;
}

function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // YouTube Shorts
  if (url.includes('/shorts/')) {
    return url.split('/shorts/')[1]?.split('?')[0] || null;
  }
  
  // youtu.be format
  if (url.includes('youtu.be')) {
    return url.split('/').pop()?.split('?')[0] || null;
  }
  
  // youtube.com/watch?v= format
  if (url.includes('youtube.com/watch')) {
    try {
      return new URL(url).searchParams.get('v');
    } catch {
      return null;
    }
  }
  
  // youtube.com/embed/ format
  if (url.includes('/embed/')) {
    return url.split('/embed/')[1]?.split('?')[0] || null;
  }
  
  return null;
}

function generateYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function collectProductVideos(products: any[]): ProductVideo[] {
  const videos: ProductVideo[] = [];
  
  products.forEach(product => {
    const productName = product.name || 'Produto';
    const productId = product.id || '';
    
    // 1. YouTube Videos
    if (product.youtube_videos && Array.isArray(product.youtube_videos)) {
      product.youtube_videos.forEach((video: any) => {
        const url = typeof video === 'string' ? video : video.url || video.embed_url;
        if (!url) return;
        
        const videoId = extractYouTubeVideoId(url);
        videos.push({
          url,
          title: typeof video === 'object' ? (video.title || video.titulo || `Vídeo de ${productName}`) : `Vídeo de ${productName}`,
          description: typeof video === 'object' ? (video.description || video.descricao) : undefined,
          type: 'youtube',
          productName,
          productId,
          thumbnail: videoId ? generateYouTubeThumbnail(videoId) : undefined
        });
      });
    }
    
    // 2. Technical Videos
    if (product.technical_videos && Array.isArray(product.technical_videos)) {
      product.technical_videos.forEach((video: any) => {
        const url = typeof video === 'string' ? video : video.url || video.embed_url;
        if (!url) return;
        
        const videoId = extractYouTubeVideoId(url);
        videos.push({
          url,
          title: typeof video === 'object' ? (video.title || video.titulo || `Vídeo Técnico - ${productName}`) : `Vídeo Técnico - ${productName}`,
          description: typeof video === 'object' ? (video.description || video.descricao) : undefined,
          type: 'technical',
          productName,
          productId,
          thumbnail: videoId ? generateYouTubeThumbnail(videoId) : undefined
        });
      });
    }
    
    // 3. Testimonial Videos
    if (product.testimonial_videos && Array.isArray(product.testimonial_videos)) {
      product.testimonial_videos.forEach((video: any) => {
        const url = typeof video === 'string' ? video : video.url || video.embed_url;
        if (!url) return;
        
        const videoId = extractYouTubeVideoId(url);
        videos.push({
          url,
          title: typeof video === 'object' ? (video.title || video.titulo || `Depoimento - ${productName}`) : `Depoimento - ${productName}`,
          description: typeof video === 'object' ? (video.description || video.descricao) : undefined,
          type: 'testimonial',
          productName,
          productId,
          thumbnail: videoId ? generateYouTubeThumbnail(videoId) : undefined
        });
      });
    }
    
    // 4. Instagram Videos
    if (product.instagram_videos && Array.isArray(product.instagram_videos)) {
      product.instagram_videos.forEach((video: any) => {
        const url = typeof video === 'string' ? video : video.url;
        if (!url) return;
        
        videos.push({
          url,
          title: typeof video === 'object' ? (video.title || `Instagram - ${productName}`) : `Instagram - ${productName}`,
          description: typeof video === 'object' ? video.description : undefined,
          type: 'instagram',
          productName,
          productId,
          thumbnail: typeof video === 'object' ? video.thumbnail : undefined
        });
      });
    }
    
    // 5. TikTok Videos
    if (product.tiktok_videos && Array.isArray(product.tiktok_videos)) {
      product.tiktok_videos.forEach((video: any) => {
        const url = typeof video === 'string' ? video : video.url;
        if (!url) return;
        
        videos.push({
          url,
          title: typeof video === 'object' ? (video.title || `TikTok - ${productName}`) : `TikTok - ${productName}`,
          description: typeof video === 'object' ? video.description : undefined,
          type: 'tiktok',
          productName,
          productId,
          thumbnail: typeof video === 'object' ? video.thumbnail : undefined
        });
      });
    }
  });
  
  // Remover duplicatas por URL e limitar a 12 vídeos
  const uniqueVideos = videos.filter((video, index, self) => 
    index === self.findIndex(v => v.url === video.url)
  );
  
  return uniqueVideos.slice(0, 12);
}

// ═══════════════════════════════════════════════════════════
// 📰 COLETOR DE PUBLICAÇÕES DOS PRODUTOS VINCULADOS (SISTEMA B)
// ═══════════════════════════════════════════════════════════

interface ProductPublication {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: {
    name: string;
    letter: string;
  };
  url: string;
  image_url: string;
  published_at: string;
  keywords?: string[];
  productRelated?: {
    name: string;
    li_product_id?: string;
  };
}

// Função para buscar publicações do Sistema B filtradas pelos produtos vinculados
async function fetchSystemBPublicationsForProducts(
  products: any[],
  limit: number = 6
): Promise<ProductPublication[]> {
  console.log('📰 [SISTEMA B] Buscando publicações para produtos vinculados...');
  
  // Extrair identificadores dos produtos
  const productLiIds = products
    .map(p => p.original_data?.li_product_id || p.li_product_id)
    .filter(Boolean)
    .map(id => String(id));
  
  const productNames = products.map(p => p.name?.toLowerCase().trim()).filter(Boolean);
  const productKeywords = products.flatMap(p => {
    const kws = p.keywords;
    if (Array.isArray(kws)) {
      return kws.map((k: any) => (typeof k === 'string' ? k : k?.keyword || '').toLowerCase().trim());
    }
    return [];
  }).filter(Boolean);

  console.log('📰 [SISTEMA B] Critérios de filtro:', {
    liIds: productLiIds,
    nomes: productNames.slice(0, 5),
    keywordsCount: productKeywords.length
  });

  if (productLiIds.length === 0 && productNames.length === 0) {
    console.log('⚠️ Nenhum produto para correlacionar publicações');
    return [];
  }

  try {
    const feedUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/knowledge-feed';
    const response = await fetch(`${feedUrl}?format=json&limit=50`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('❌ [SISTEMA B] Erro ao buscar publicações:', response.status);
      return [];
    }

    const data = await response.json();
    const items = data.items || [];
    
    console.log('📦 [SISTEMA B] Total publicações recebidas:', items.length);

    // Filtrar publicações relacionadas aos produtos
    const matchedPublications = items.filter((item: any) => {
      const itemKeywords = (item.keywords || []).map((k: string) => k.toLowerCase());
      const itemTitle = (item.title || '').toLowerCase();
      const itemExcerpt = (item.excerpt || '').toLowerCase();
      
      // Match por keywords
      const keywordMatch = itemKeywords.some((kw: string) => 
        productNames.some(name => kw.includes(name) || name.includes(kw)) ||
        productKeywords.some(pk => kw.includes(pk) || pk.includes(kw))
      );
      
      // Match por título ou excerpt mencionando nome do produto
      const textMatch = productNames.some(name => 
        itemTitle.includes(name) || itemExcerpt.includes(name)
      );
      
      return keywordMatch || textMatch;
    }).slice(0, limit);

    console.log('✅ [SISTEMA B] Publicações filtradas por produtos:', matchedPublications.length);

    return matchedPublications.map((item: any) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || '',
      category: item.category || { name: 'Artigo', letter: 'A' },
      url: item.url,
      image_url: item.image_url,
      published_at: item.published_at,
      keywords: item.keywords || []
    }));

  } catch (error) {
    console.error('❌ [SISTEMA B] Erro ao conectar:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 🤖 GERADOR DE CONTEÚDO AI PARA LANDING PAGE
// ═══════════════════════════════════════════════════════════

interface AIGeneratedContent {
  hero: {
    subtitle: string;
  };
  spinNarrative: string; // Nova narrativa contextual SPIN
  metrics: {
    title: string;
    subtitle: string;
  };
  cta: {
    text: string;
    buttonText: string;
  };
  testimonials: Array<{
    quote: string;
    clientName: string;
  }>;
}

async function generateAllLandingPageContent(
  lovableApiKey: string,
  solution: any,
  products: any[],
  company: any,
  customText: Record<string, string> = {} // ✅ Novo parâmetro para textos customizados
): Promise<AIGeneratedContent> {
  
  // Importar Super-Prompt
  const { SPIN_SYSTEM_PROMPT } = await import('../_shared/spin-system-prompt.ts');

  const productsNames = products.map(p => p.name).join(', ');
  
  const prompt = `Você é um copywriter especialista em neuromarketing e SPIN Selling para odontologia B2B.

🎯 MISSÃO: Gerar TODOS os textos da landing page seguindo a Jornada SPIN (Situação → Problema → Implicação → Necessidade).

═══════════════════════════════════════════════════════════
📋 DADOS DA SOLUÇÃO SPIN
═══════════════════════════════════════════════════════════

🏢 EMPRESA: ${company?.company_name || 'Empresa odontológica'}
🎯 SOLUÇÃO: ${solution.title}
📦 PRODUTOS: ${productsNames}
⚠️ TIPO DE DOR: ${solution.pain_type}
📝 DESCRIÇÃO DA DOR: ${solution.pain_description || 'Não especificada'}

🔥 PITCH DE VENDAS COMPLETO (BASE PRINCIPAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${solution.sales_pitch || 'Não informado'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎖️ CASOS DE SUCESSO: ${solution.success_cases?.length || 0} documentados

═══════════════════════════════════════════════════════════
📝 TAREFA: GERAR 4 SEÇÕES DE TEXTO
═══════════════════════════════════════════════════════════

Gere os textos para as 4 seções principais da landing page:

┌─────────────────────────────────────────────────────────┐
│ 1. HERO SECTION (Banner Principal)                      │
└─────────────────────────────────────────────────────────┘

⚠️ IMPORTANTE: O TÍTULO JÁ ESTÁ DEFINIDO e NÃO deve ser gerado.
Título fixo: "${solution.title}"

GERAR APENAS O SUBTÍTULO (20-30 palavras):
• Expandir o benefício principal do título
• Mencionar produtos específicos: ${productsNames}
• Tom: aspiracional mas realista
• Complementar o título fixo de forma natural
• Focar em transformação e benefícios práticos, não em números
• Exemplo: "Com ${productsNames}, clínicas odontológicas transformam seu fluxo de trabalho, conquistam autonomia operacional e se tornam referência em tecnologia na região"

┌─────────────────────────────────────────────────────────┐
│ 2. SEÇÃO DE RESULTADOS (Título + Subtítulo Persuasivo) │
└─────────────────────────────────────────────────────────┘

🎯 OBJETIVO:
Gerar um TÍTULO curto (3-5 palavras) e um SUBTÍTULO EXPANDIDO de 80-120 palavras usando EXCLUSIVAMENTE a Jornada SPIN (Desejo → Dor → Resultado).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ESTRUTURA NARRATIVA OBRIGATÓRIA (JORNADA SPIN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**FASE 1: DESEJO (15-20 palavras)**
→ Iniciar com "Imagine..." pintando o cenário ideal
→ Focar no estado emocional desejado (controle, previsibilidade, reconhecimento)
→ Usar verbos sensoriais (sentir, visualizar, controlar)

Exemplo:
"Imagine dominar cada etapa do fluxo de trabalho, entregar soluções completas no mesmo dia e ver seus clientes impressionados com a velocidade e qualidade da sua operação."

**FASE 2: DOR EXPANDIDA (40-60 palavras) ⚠️ SEÇÃO CRÍTICA**
→ Dedicar 50-70% do subtítulo para explorar PROFUNDAMENTE as dores
→ Usar a técnica de "amplificação de dor" em 3 camadas:

**Camada 1 - Dor Operacional (o que acontece no dia a dia):**
- Mencionar OBRIGATORIAMENTE o "${solution.pain_type}"
- Descrever situações concretas e frustrantes
- Usar linguagem visceral ("ainda dependem", "sofrem com", "perdem o controle")

**Camada 2 - Dor Financeira (o que está perdendo):**
- Mencionar oportunidades desperdiçadas
- Citar pacientes perdidos ou insatisfeitos
- Falar de custos ocultos (retrabalho, tempo, estresse)

**Camada 3 - Dor Emocional (como isso faz sentir):**
- Frustração profissional
- Sensação de estar "ficando para trás"
- Ansiedade com concorrência tecnológica
- Medo de perder relevância no mercado

Estrutura sugerida:
"Mas a realidade de muitos profissionais ainda é [DOR OPERACIONAL específica relacionada a ${solution.pain_type}]. Isso significa [DOR FINANCEIRA: perda de pacientes/receita]. Pior ainda: [DOR EMOCIONAL: frustração/ansiedade]. Enquanto concorrentes já [CONTRASTE: o que outros já fazem], sua clínica [CONSEQUÊNCIA: fica vulnerável]."

Exemplo expandido:
"Mas a realidade de muitos profissionais ainda é [descrever solution.pain_type aqui], aguardar dias por tarefas que deveriam ser rápidas e lidar com retrabalhos que drenam tempo e recursos. Isso significa perder oportunidades enquanto concorrentes avançam, aceitar margens reduzidas impostas por terceiros e ver demandas urgentes escaparem. Pior ainda: sentir a frustração de não ter controle sobre prazos e qualidade, enquanto a concorrência tecnológica já oferece [vantagem competitiva] e domina o mercado premium."

**FASE 3: RESULTADO TRANSFORMADOR (20-30 palavras)**
→ Começar com "Com [produtos específicos]..."
→ Citar OBRIGATORIAMENTE: ${productsNames}
→ Focar em transformação QUALITATIVA (nunca números)
→ Usar linguagem de "antes vs. depois" implícita
→ Finalizar com status/reconhecimento alcançado

Exemplo:
"Com [Produto A] e [Produto B], profissionais que adotam essa solução eliminam [dor principal], recuperam controle total sobre [aspecto crítico] e se tornam referência regional em [área de especialização] de alto desempenho."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ REGRAS CRÍTICAS PARA O SUBTÍTULO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TAMANHO**: 80-120 palavras (distribuição: 15-20 Desejo + 40-60 Dor + 20-30 Resultado)

**ELEMENTOS OBRIGATÓRIOS**:
✅ Mencionar explicitamente o tipo de dor: "${solution.pain_type}"
✅ Citar TODOS os produtos por nome: ${productsNames}
✅ Usar linguagem e frases do PITCH DE VENDAS
✅ Incluir pelo menos 3 camadas de dor (operacional + financeira + emocional)
✅ Criar contraste com concorrentes que já evoluíram
✅ Finalizar com status/reconhecimento alcançado

**ELEMENTOS PROIBIDOS**:
❌ Mencionar números, percentuais, minutos, valores monetários
❌ Usar a palavra "métricas"
❌ Ser genérico ("resultados incríveis", "melhorias significativas")
❌ Dores superficiais ("alguns desafios", "pequenos atrasos")
❌ Listar benefícios separados (criar narrativa fluida)

**TOM E ESTILO**:
• Usar "você", "sua clínica", "imagine"
• Tom empático mas direto (sem dramatizar excessivamente)
• Linguagem visceral para dores ("ainda dependem", "perdem o controle")
• Linguagem aspiracional para resultado ("eliminam", "se tornam referência")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATENÇÃO CRÍTICA - NÃO COPIAR EXEMPLOS LITERALMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Os exemplos abaixo são APENAS ilustrativos da **estrutura narrativa**.

❌ NÃO copie trechos literalmente
❌ NÃO use produtos mencionados nos exemplos se não estiverem em ${productsNames}
❌ NÃO use termos genéricos como "clínicas parceiras", "profissionais da área"

✅ ADAPTE ao contexto real dos produtos fornecidos
✅ USE os nomes reais dos produtos de ${productsNames}
✅ SUBSTITUA placeholders [entre colchetes] por dados reais
✅ MANTENHA a estrutura SPIN, mas com vocabulário específico da solução

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 EXEMPLO COMPLETO (MODELO EXATO A SEGUIR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Subtítulo gerado (105 palavras):**

"Imagine dominar cada etapa do [processo crítico da solução], entregar [resultados esperados] no mesmo dia e ver seus clientes impressionados com a velocidade e qualidade do seu trabalho. Mas a realidade de muitos profissionais ainda é [descrever solution.pain_type aqui], aguardar dias por tarefas que deveriam ser rápidas e lidar com retrabalhos que drenam tempo e recursos. Isso significa perder oportunidades enquanto concorrentes avançam, aceitar margens reduzidas impostas por terceiros e sentir a frustração de não ter controle sobre prazos nem qualidade. Enquanto a concorrência já domina o mercado com [vantagem competitiva], sua operação fica vulnerável. Com [Produto A] e [Produto B], profissionais que adotam essa solução eliminam [dor principal], recuperam controle total sobre [aspecto crítico] e se tornam referência em [especialização] de alto desempenho."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TÍTULO DA SEÇÃO (3-5 palavras)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Focar em TRANSFORMAÇÃO EMOCIONAL, não em "métricas" ou "resultados"
• Usar linguagem de status/reconhecimento alcançado
• Exemplos aprovados:
  - "Transformação Real em Clínicas"
  - "De Dependente a Referência"
  - "Controle Total, Resultados Reais"
  - "Excelência sem Dependências"
  - "Autonomia que Transforma"

• Evitar: "Métricas de Sucesso", "Números Impressionantes", "Resultados Comprovados"

┌─────────────────────────────────────────────────────────┐
│ 3. NARRATIVA SPIN CONTEXTUAL (Antes dos Cards)         │
└─────────────────────────────────────────────────────────┘

📋 OBJETIVO: Criar um parágrafo narrativo de 150-200 palavras que conecta a jornada SPIN aos benefícios tangíveis da solução, posicionando-se ANTES dos cards numéricos.

📊 DADOS DISPONÍVEIS:
${solution.real_quotes?.length > 0 ? `
Depoimentos reais de clientes:
${solution.real_quotes.map((q: any, i: number) => `
Cliente ${i + 1}:
- Desejo inicial: "${q.desire}"
- Dor enfrentada: "${q.pain}"
- Resultado alcançado: "${q.expected_result}"
`).join('\n')}
` : 'Nenhum depoimento real disponível'}

🎯 ESTRUTURA OBRIGATÓRIA (em um único parágrafo fluido):

1️⃣ **DESEJO** (2-3 frases): Comece descrevendo o desejo comum dos profissionais, usando insights dos depoimentos reais. Fale sobre a transformação que buscam.

2️⃣ **DOR** (2-3 frases): Transição natural para as dores atuais, citando problemas específicos mencionados nos depoimentos. Use conectivos como "Porém", "Mas a realidade", "Contudo".

3️⃣ **RESULTADO** (3-4 frases): Apresente como os produtos resolvem essas dores, focando em benefícios tangíveis e transformação prática. Conecte a solução aos resultados esperados mencionados nos depoimentos.

⚠️ REGRAS CRÍTICAS:
- ✅ Foque em benefícios práticos e transformação
- ✅ Mencione os produtos: ${productsNames}
- ✅ Mantenha tom consultivo e baseado em evidências
- ✅ Use dados reais dos depoimentos quando disponíveis
- ❌ NÃO use bullet points ou listas
- ❌ NÃO repita o subtítulo do hero
- ❌ NÃO use chavões ("revolucionário", "inovador", "único no mercado")

📝 EXEMPLO DE ESTRUTURA (NÃO COPIAR LITERALMENTE):
"Profissionais que buscam [desejo dos depoimentos] frequentemente enfrentam [dor específica dos depoimentos], resultando em [consequência]. Com [Produto A] e [Produto B], clínicas conseguem [resultado tangível], eliminando [problema específico] e conquistando [benefício prático]. Isso significa [transformação alcançada]."

┌─────────────────────────────────────────────────────────┐
│ 4. CTA (Call-to-Action)                                 │
└─────────────────────────────────────────────────────────┘

TEXTO PRINCIPAL (15-25 palavras):
• Usar urgência sutil sem alarmar
• Focar no próximo passo (não na venda)
• Tom: convite, não pressão
• Exemplo: "Descubra como [Benefício Principal] pode transformar sua clínica em uma referência tecnológica na sua região"

TEXTO DO BOTÃO (3-6 palavras):
• Verbo de ação específico
• Benefício claro
• Redutor de fricção
• Exemplos: "Falar com Especialista Agora", "Agendar Demonstração Gratuita", "Solicitar Orçamento Personalizado"

⚠️ IMPORTANTE: NÃO GERAR DEPOIMENTOS. Os depoimentos reais serão buscados do banco de dados.

═══════════════════════════════════════════════════════════
⚙️ REGRAS DE OURO
═══════════════════════════════════════════════════════════

✅ SEMPRE usar a linguagem do PITCH DE VENDAS
✅ SEMPRE focar em benefícios PRÁTICOS e transformação
✅ SEMPRE manter tom profissional mas conversacional
✅ SEMPRE usar exemplos do dia a dia odontológico

❌ NUNCA usar jargões sem explicação
❌ NUNCA fazer promessas fora do pitch
❌ NUNCA usar variáveis técnicas (lab_time → "tempo de laboratório")
❌ NUNCA ser genérico ou vago

═══════════════════════════════════════════════════════════
📤 FORMATO DE SAÍDA (JSON PURO)
═══════════════════════════════════════════════════════════

Retorne APENAS JSON puro, sem markdown:

{
  "hero": {
    "subtitle": "Subtítulo do hero (20-30 palavras)"
  },
  "spinNarrative": "Narrativa SPIN contextual de 150-200 palavras integrando depoimentos e métricas",
  "metrics": {
    "title": "Título da seção de métricas (3-5 palavras)",
    "subtitle": "Subtítulo da seção de métricas (20-30 palavras)"
  },
  "cta": {
    "text": "Texto principal do CTA (15-25 palavras)",
    "buttonText": "Texto do botão (3-6 palavras)"
  },
  "testimonials": [
    {
      "quote": "Depoimento reescrito em formato SPIN narrativo",
      "clientName": "Nome do cliente (manter original)"
    }
  ]
}`;

  console.log('📤 Enviando prompt para Lovable AI...');

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SPIN_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('❌ Erro da Lovable AI:', {
      status: aiResponse.status,
      body: errorText
    });
    throw new Error(`Lovable AI error: ${aiResponse.status} - ${errorText}`);
  }

  const aiData = await aiResponse.json();
  console.log('📥 Resposta completa da API:', JSON.stringify(aiData, null, 2));

  const content = aiData.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Resposta da IA vazia');
  }

  console.log('🤖 Resposta da IA:', content.substring(0, 500));

  // Extrair JSON da resposta (robusto)
  let jsonText = content.trim();

  // 1. Tentar markdown code block
  if (content.includes('```json')) {
    const parts = content.split('```json');
    if (parts[1]) {
      jsonText = parts[1].split('```')[0].trim();
    }
  } else if (content.includes('```')) {
    const parts = content.split('```');
    if (parts[1]) {
      jsonText = parts[1].split('```')[0].trim();
    }
  }

  // 2. Fallback: procurar primeiro objeto JSON válido
  if (!jsonText.startsWith('{')) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      jsonText = match[0];
    }
  }

  console.log('🔍 JSON extraído:', jsonText.substring(0, 200));

  let generatedContent: AIGeneratedContent;
  try {
    generatedContent = JSON.parse(jsonText);
  } catch (parseError: any) {
    console.error('❌ Erro ao fazer parse do JSON:', parseError.message);
    console.error('📄 Conteúdo completo da IA:', content);
    throw new Error(`JSON inválido da IA: ${parseError.message}. Conteúdo: ${content.substring(0, 500)}`);
  }

  // Validação básica
  if (!generatedContent.hero || !generatedContent.metrics || !generatedContent.cta) {
    throw new Error('Conteúdo gerado incompleto');
  }

  // Validar spinNarrative
  if (!generatedContent.spinNarrative || generatedContent.spinNarrative.trim().length < 100) {
    console.warn('⚠️ spinNarrative muito curto ou ausente, gerando fallback');
    generatedContent.spinNarrative = `Profissionais que adotam ${productsNames} transformam ${solution.pain_type} em vantagem competitiva, alcançando resultados mensuráveis em tempo recorde.`;
  }

  console.log('🔄 [AI] Merge com customText:', Object.keys(customText));

  // ✅ MERGE INTELIGENTE: Priorizar textos customizados do usuário
  return {
    hero: {
      subtitle: customText.hero_subtitle || generatedContent.hero.subtitle
    },
    spinNarrative: customText.spin_narrative || generatedContent.spinNarrative,
    metrics: {
      title: customText.metrics_title || generatedContent.metrics.title,
      subtitle: customText.metrics_subtitle || generatedContent.metrics.subtitle
    },
    cta: {
      text: customText.cta_text || generatedContent.cta.text,
      buttonText: customText.cta_button_text || generatedContent.cta.buttonText
    },
    testimonials: [] // ✅ Testimonials não são mais gerados por IA, virão do banco
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();

    console.log('🚀 generate-spin-landing-page invoked:', {
      timestamp: new Date().toISOString(),
      solutionId
    });

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ✅ FASE 1: Buscar AggregateRating dinâmico com fallback seguro
    let aggregateRating: AggregateRatingData;
    try {
      aggregateRating = await fetchAggregateRating(supabaseClient);
      console.log(`✅ [SPIN LP] AggregateRating dinâmico: ${aggregateRating.ratingValue} (${aggregateRating.reviewCount} reviews)`);
    } catch (error) {
      console.error('⚠️ [SPIN LP] Erro ao buscar AggregateRating, usando fallback:', error);
      aggregateRating = {
        ratingValue: "4.8",
        reviewCount: 30,
        bestRating: 5,
        worstRating: 1
      };
    }

    // ✅ FASE 2: Buscar LocalBusiness data para GEO Local SEO
    let localBusinessData: LocalBusinessData;
    try {
      localBusinessData = await fetchLocalBusinessData(supabaseClient);
      console.log(`✅ [SPIN LP] LocalBusiness: ${localBusinessData.company_name} (${localBusinessData.city}/${localBusinessData.state})`);
    } catch (error) {
      console.error('⚠️ [SPIN LP] Erro ao buscar LocalBusiness, usando fallback:', error);
      localBusinessData = {
        company_name: "Smart Dent",
        website_url: "https://smartdent.com.br",
        latitude: -23.5505,
        longitude: -46.6333
      };
    }

    // Buscar solução SPIN completa
    const { data: solutionRecord, error: solutionError } = await supabaseClient
      .from('spin_selling_solutions')
      .select(`
        *,
        selected_video_url,
        selected_video_title
      `)
      .eq('id', solutionId)
      .single();

    if (solutionError || !solutionRecord) {
      throw new Error('Solução SPIN não encontrada');
    }

    let solution = solutionRecord; // ✅ Agora pode reatribuir
    
    console.log('✅ Checkpoint 1: Solução carregada', { 
      title: solution.title, 
      hasFaq: !!solution.faq?.length,
      customTextKeys: Object.keys(solution.landing_page_custom_text || {})
    });

    // Buscar produtos associados
    const { data: products, error: productsError } = await supabaseClient
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids || []);

    if (productsError) {
      throw new Error('Erro ao buscar produtos');
    }

    // ✅ NEW: Extract enriched context from products for AI generation
    const enrichedProductContext = {
      workflowStages: (products || [])
        .filter((p: any) => p.workflow_stages)
        .map((p: any) => ({
          productName: p.name,
          stages: p.workflow_stages,
          relatedProducts: Object.values(p.workflow_stages || {})
            .flatMap((stage: any) => stage.related_products || [])
        })),
      videoCaptions: (products || [])
        .filter((p: any) => p.video_captions?.length)
        .flatMap((p: any) => (p.video_captions || []).map((vc: any) => ({
          productName: p.name,
          title: vc.video_title || vc.title,
          captions: vc.captions || vc.transcription
        }))),
      documentTranscriptions: (products || [])
        .filter((p: any) => p.document_transcriptions?.length)
        .flatMap((p: any) => (p.document_transcriptions || []).map((dt: any) => ({
          productName: p.name,
          documentName: dt.document_name || dt.name,
          content: dt.content || dt.transcription
        }))),
      salesPitches: (products || [])
        .filter((p: any) => p.sales_pitch)
        .map((p: any) => ({ productName: p.name, pitch: p.sales_pitch })),
      competitorComparisons: (products || [])
        .filter((p: any) => p.competitor_comparison)
        .map((p: any) => ({ productName: p.name, comparison: p.competitor_comparison })),
      technicalSpecs: (products || [])
        .filter((p: any) => p.technical_specifications?.length)
        .map((p: any) => ({ productName: p.name, specs: p.technical_specifications }))
    };
    
    console.log('📊 Enriched product context:', {
      workflowStages: enrichedProductContext.workflowStages.length,
      videoCaptions: enrichedProductContext.videoCaptions.length,
      documentTranscriptions: enrichedProductContext.documentTranscriptions.length,
      salesPitches: enrichedProductContext.salesPitches.length,
      competitorComparisons: enrichedProductContext.competitorComparisons.length,
      technicalSpecs: enrichedProductContext.technicalSpecs.length
    });

    // Buscar perfil da empresa (priorizar registro com dados completos)
    let { data: company, error: companyError } = await supabaseClient
      .from('company_profile')
      .select('*')
      .not('website_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fallback: se não encontrou empresa válida ou é "Nova Empresa", buscar outra
    if (companyError || !company || company.company_name === 'Nova Empresa') {
      console.warn('Empresa principal não encontrada ou inválida, buscando fallback...');
      const { data: fallbackCompany } = await supabaseClient
        .from('company_profile')
        .select('*')
        .neq('company_name', 'Nova Empresa')
        .not('company_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (fallbackCompany) {
        company = fallbackCompany;
        console.log('✅ Usando empresa fallback:', company.company_name);
      }
    }

    // ✅ BUSCAR DEPOIMENTOS REAIS DO BANCO DE DADOS
    console.log('📋 Buscando depoimentos reais (video_testimonials)...');
    const { data: videoTestimonials } = await supabaseClient
      .from('video_testimonials')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true });

    // Formatar depoimentos no formato esperado pelo HTML generator
    const realTestimonials = (videoTestimonials || []).map((testimonial: any) => ({
      quote: testimonial.testimonial_text,
      clientName: testimonial.client_name,
      clientPhoto: testimonial.photo_url || null,
      location: testimonial.location || null,
      profession: testimonial.profession || null,
      specialty: testimonial.specialty || null
    }));

    console.log('✅ Depoimentos reais encontrados:', realTestimonials.length);

    // 🔥 Mudança 4 (OPCIONAL): Gerar FAQ por IA se estiver vazia
    if (!solution.faq || solution.faq.length === 0) {
      console.log('🤖 FAQ vazia, gerando automaticamente...');
      
      const { error: faqError } = await supabaseClient.functions.invoke(
        'generate-spin-faqs',
        { body: { solutionId } }
      );
      
      if (faqError) {
        console.warn('⚠️ Erro ao gerar FAQ, continuando sem ela:', faqError);
      } else {
        // Recarregar solução com FAQ gerada
        const { data: updatedSolution } = await supabaseClient
          .from('spin_selling_solutions')
          .select('*')
          .eq('id', solutionId)
          .single();
        
        if (updatedSolution) {
          solution = updatedSolution; // ✅ Agora funciona com let!
          console.log('✅ FAQ gerada com sucesso:', solution.faq?.length, 'perguntas');
        }
      }
    }

    // ✅ VALIDAÇÃO: LOVABLE_API_KEY
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('🤖 Gerando textos da landing page com IA...');

    // ✅ GERAR TODOS OS TEXTOS COM IA (com merge de customText)
    const aiGeneratedContent = await generateAllLandingPageContent(
      LOVABLE_API_KEY,
      solution,
      products || [],
      company,
      solution.landing_page_custom_text || {} // ✅ Passar textos customizados
    );

    console.log('✅ Checkpoint 2: Textos gerados com sucesso:', {
      heroSubtitle: aiGeneratedContent.hero.subtitle.substring(0, 50) + '...',
      metricsTitle: aiGeneratedContent.metrics.title,
      ctaText: aiGeneratedContent.cta.text.substring(0, 50) + '...',
      realTestimonialsCount: realTestimonials.length
    });

    // 🔗 FASE NOVA: Buscar recursos do Sistema B (vídeos e documentos)
    console.log('🔗 Buscando recursos do Sistema B...');
    const systemBResources = await fetchSystemBResourcesForProducts(products || []);
    
    console.log('✅ Checkpoint 2.5: Recursos Sistema B:', {
      videos: systemBResources.totalVideos,
      documents: systemBResources.totalDocuments,
      syncedAt: systemBResources.syncedAt
    });

    // 🎬 FASE NOVA: Coletar vídeos de todos os produtos vinculados
    console.log('🎬 Coletando vídeos dos produtos vinculados...');
    const productVideos = collectProductVideos(products || []);
    console.log('✅ Checkpoint 2.6: Vídeos dos produtos:', productVideos.length);

    // 📰 FASE NOVA: Buscar publicações do Sistema B filtradas pelos produtos vinculados
    console.log('📰 Buscando publicações do Sistema B para produtos vinculados...');
    const productPublications = await fetchSystemBPublicationsForProducts(products || [], 6);
    console.log('✅ Checkpoint 2.7: Publicações do Sistema B:', productPublications.length);

    console.log('🔍 [AI] Campos customizados preservados:', 
      Object.keys(solution.landing_page_custom_text || {})
        .filter(key => solution.landing_page_custom_text[key])
    );

    // ✅ FASE 3: Buscar KOL para autor (se especificado na solução ou landing page)
    let authorKOL: PersonSchemaData | null = null;
    const authorKolId = solution.author_kol_id || solution.landing_page_custom_text?.author_kol_id;
    if (authorKolId) {
      try {
        authorKOL = await fetchKOLData(supabaseClient, authorKolId, {
          name: company?.company_name || 'Smart Dent',
          url: company?.website_url || 'https://smartdent.com.br'
        });
        if (authorKOL) {
          console.log(`✅ [SPIN LP] Author KOL carregado: ${authorKOL.full_name}`);
        }
      } catch (error) {
        console.error('⚠️ [SPIN LP] Erro ao buscar autor KOL:', error);
      }
    }

    // ✅ FASE 10: Buscar Authority Data (videoTestimonials já foi carregado na linha 851)
    const authorityData = await fetchAuthorityData(supabaseClient).catch(err => {
      console.error('⚠️ [SPIN LP] Erro ao buscar Authority Data:', err);
      return null;
    });
    
    if (authorityData) {
      console.log(`✅ [SPIN LP] Authority Data carregado: ${authorityData.partnerships?.length || 0} parceiros, ${videoTestimonials?.length || 0} video testimonials`);
    }

    // ✅ MERGE: Adicionar depoimentos reais + recursos Sistema B + vídeos + publicações + KOL ao aiContent
    const finalAiContent = {
      ...aiGeneratedContent,
      testimonials: realTestimonials,
      systemBResources, // 🆕 Adicionar recursos do Sistema B
      productVideos, // 🎬 Adicionar vídeos dos produtos vinculados
      productPublications, // 📰 Adicionar publicações dos produtos
      authorKOL, // ✅ FASE 3: Adicionar dados do KOL para Person Schema
      productComparisonTables: enrichedProductContext.competitorComparisons // 🆕 Tabelas de comparação dos produtos
    };

    // ✅ MERGE CORRETO: Passar separadamente IA e customText
    // O template HTML faz a priorização interna (customText > aiContent > defaults)
    const html = generateLandingPageHTML(
      solution, 
      products || [], 
      company, 
      finalAiContent, // ✅ Passar AI + depoimentos reais + Sistema B
      false, // ✅ preview = false (produção - com tracking)
      authorityData, // ✅ FASE 10: Authority Data completo
      videoTestimonials, // ✅ FASE 10: Video Testimonials
      aggregateRating // ✅ CORREÇÃO: Passar aggregateRating para schemas
    );

    console.log('✅ Checkpoint 4: HTML gerado:', html.length, 'caracteres');
    
    // Verificar tamanho do HTML (limite de 10MB para segurança)
    const htmlSizeKB = Math.round(html.length / 1024);
    const htmlSizeMB = (html.length / (1024 * 1024)).toFixed(2);
    console.log(`📏 Tamanho do HTML: ${htmlSizeKB} KB (${htmlSizeMB} MB)`);
    
    if (html.length > 10 * 1024 * 1024) {
      throw new Error(`HTML muito grande: ${htmlSizeMB} MB (limite: 10MB)`);
    }

    // Salvar HTML grande via Storage + referência no banco
    console.log('💾 Salvando landing page no banco...');
    console.log(`📦 Payload size: ${htmlSizeKB} KB`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Para payloads grandes (>500KB), usar Storage
    if (html.length > 500 * 1024) {
      console.log('📦 HTML grande detectado, usando Storage...');
      
      const storagePath = `spin-lps/${solutionId}.html`;
      const htmlBlob = new Blob([html], { type: 'text/html; charset=utf-8' });
      
      const { error: storageError } = await serviceClient.storage
        .from('landing-pages-html')
        .upload(storagePath, htmlBlob, {
          contentType: 'text/html; charset=utf-8',
          upsert: true,
        });

      if (storageError) {
        console.error('❌ Erro ao salvar HTML no Storage:', storageError);
        throw new Error(`Erro ao salvar HTML no Storage: ${storageError.message}`);
      }

      console.log('✅ HTML salvo no Storage:', storagePath);

      // Salvar referência no banco (payload pequeno)
      const { error: updateError } = await serviceClient
        .from('spin_selling_solutions')
        .update({
          landing_page_html: `__storage__:${storagePath}`,
          landing_page_generated_at: new Date().toISOString()
        })
        .eq('id', solutionId);

      if (updateError) {
        console.error('❌ Erro ao atualizar referência:', updateError);
        throw new Error(`Erro ao atualizar referência: ${JSON.stringify(updateError)}`);
      }
    } else {
      // Payload pequeno: salvar direto no banco
      const { error: updateError } = await serviceClient
        .from('spin_selling_solutions')
        .update({
          landing_page_html: html,
          landing_page_generated_at: new Date().toISOString()
        })
        .eq('id', solutionId);

      if (updateError) {
        console.error('❌ Erro ao salvar landing page:', updateError);
        throw new Error(`Erro ao salvar landing page: ${JSON.stringify(updateError)}`);
      }
    }
    
    console.log('✅ Landing page salva com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Landing page gerada com sucesso',
        htmlLength: html.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: any) {
    console.error('❌ generate-spin-landing-page error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
