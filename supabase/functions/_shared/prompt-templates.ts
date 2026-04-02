/**
 * Prompt Templates Centralizados — Smart Dent Content Intelligence Platform
 * Versão 2.0 | Abril 2026
 * 
 * Todos os templates usam o contexto do produto injetado via buildFullPrompt().
 * O bloco CLINICAL_BRAIN_GUARD e BASE PRODUTO são adicionados automaticamente.
 */

export const PROMPTS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KEYWORDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  keywords: {
    primary: `
TAREFA: Gerar 15 keywords primárias para SEO e Google Ads.

Para cada keyword, retorne:
- keyword: a keyword exata
- intent: "informational" | "commercial" | "transactional" | "navigational"
- relevance_score: 1-10 (relevância para o produto)
- rationale: explicação curta de por que esta keyword é relevante

REGRAS:
1. Incluir o nome do produto em pelo menos 5 keywords
2. Incluir a categoria em pelo menos 3 keywords
3. Mesclar termos técnicos e termos de busca do consumidor
4. Priorizar keywords com intenção transacional e comercial
5. Incluir variações com "comprar", "preço", "onde encontrar"
6. NUNCA inventar termos técnicos que não existam no contexto

Retorne APENAS um JSON array:
[
  {
    "keyword": "string",
    "intent": "string",
    "relevance_score": number,
    "rationale": "string"
  }
]
`,

    long_tail: `
TAREFA: Gerar 20 keywords long tail para SEO e conteúdo.

Para cada keyword, retorne:
- keyword: a keyword long tail (3-6 palavras)
- search_context: cenário de busca do usuário
- intent: "informational" | "commercial" | "transactional"
- difficulty: "low" | "medium" | "high"

REGRAS:
1. Focar em perguntas que dentistas fazem sobre este tipo de produto
2. Incluir variações com "como usar", "indicações", "vantagens"
3. Incluir comparações de categoria (sem nomear concorrentes)
4. Incluir termos regionais (Brasil)
5. NUNCA inventar indicações clínicas que não estejam no contexto
6. Priorizar termos com baixa dificuldade e alta relevância

Retorne APENAS um JSON array:
[
  {
    "keyword": "string",
    "search_context": "string",
    "intent": "string",
    "difficulty": "string"
  }
]
`,

    negative: `
TAREFA: Gerar 25 keywords negativas para campanhas Google Ads.

Objetivo: Evitar cliques irrelevantes e desperdício de orçamento.

Categorias obrigatórias:
1. Termos de concorrentes (marcas que NÃO são Smart Dent)
2. Buscas educacionais sem intenção de compra ("o que é", "definição")
3. Termos de outras especialidades médicas não relevantes
4. Buscas por vagas de emprego ("vaga", "emprego", "salário")
5. Termos de produtos completamente diferentes da categoria

REGRAS:
1. NUNCA incluir o nome do produto ou da empresa como negativa
2. Focar em termos que geram cliques sem conversão
3. Incluir variações com erros ortográficos comuns

Retorne APENAS um JSON array:
[
  {
    "keyword": "string",
    "category": "competitor" | "educational" | "irrelevant" | "job" | "other_product",
    "reason": "string"
  }
]
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GOOGLE ADS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  google_ads: {
    rsa_headlines: `
TAREFA: Gerar 15 headlines para Responsive Search Ad (RSA) do Google Ads.

ESTRUTURA DE PINNING (ordem obrigatória):

POSIÇÃO 1 (H1-H3): PRODUTO/CATEGORIA — Máxima relevância com a busca
- H1: Nome do produto/marca principal
- H2: Categoria do produto
- H3: Variação do nome ou segmento

POSIÇÃO 2 (H4-H6): DIFERENCIAIS TÉCNICOS
- H4: Característica técnica principal
- H5: Benefício técnico
- H6: Qualidade/Certificação

POSIÇÃO 3 (H7-H10): BENEFÍCIOS E RESULTADOS
- Benefícios para o cliente
- Resultados esperados
- Diferenciais competitivos

POSIÇÃO 3 (H11-H15): AUTORIDADE + CTAs + OFERTAS
- H11: Autoridade técnica
- H12: Prova social/Confiança
- H13: CTA direto
- H14: Oferta específica
- H15: Urgência sutil

REGRAS OBRIGATÓRIAS:
1. Máximo 30 caracteres cada (EXATO, contar antes de retornar)
2. Incluir keyword principal em pelo menos 3 headlines
3. Linguagem: português brasileiro
4. Tom: profissional, confiável, SEM sensacionalismo
5. PROIBIDO: "Cansado de...", CAPSLOCK, "cura", "milagre", "garantido"
6. PROIBIDO headlines genéricos: "Garanta Já a Sua", "Clique Aqui", "A Melhor Opção"
7. NUNCA truncar no meio de uma palavra
8. Usar specs REAIS do contexto — NUNCA inventar

Retorne APENAS um JSON:
{ "headlines": ["h1", "h2", ..., "h15"] }
`,

    rsa_descriptions: `
TAREFA: Gerar 4 descrições para Responsive Search Ad (RSA) do Google Ads.

REGRAS:
1. Máximo 90 caracteres cada (EXATO, contar antes de retornar)
2. Pelo menos 2 descrições devem conter números específicos
3. Frases completas com início, meio e fim DENTRO de 90 chars
4. Usar verbos de ação + benefício claro
5. Incluir: garantia, parcelamento, entrega, experiência (se no contexto)
6. Tom profissional, sem sensacionalismo
7. NUNCA inventar dados numéricos — usar apenas do contexto

Retorne APENAS um JSON:
{ "descriptions": ["d1", "d2", "d3", "d4"] }
`,

    ad_groups: `
TAREFA: Criar estrutura de 3 Ad Groups para campanha Google Ads.

Para cada Ad Group:
- name: nome do grupo
- theme: tema central
- keywords: lista de 8-10 keywords com match types
- negative_keywords: 3-5 negativas específicas do grupo

Match types obrigatórios:
- Exact: [keyword] — pelo menos 3 por grupo
- Phrase: "keyword" — pelo menos 3 por grupo  
- Broad Modified: +keyword — pelo menos 2 por grupo

REGRAS:
1. Grupo 1: Produto/Marca (keywords com nome do produto)
2. Grupo 2: Categoria/Solução (keywords genéricas da categoria)
3. Grupo 3: Comparação/Alternativa (keywords de quem busca opções)
4. NUNCA incluir nomes de concorrentes nas keywords
5. Usar termos reais do contexto do produto

Retorne APENAS um JSON:
{
  "ad_groups": [
    {
      "name": "string",
      "theme": "string",
      "keywords": [{"term": "string", "match_type": "exact|phrase|broad"}],
      "negative_keywords": ["string"]
    }
  ]
}
`,

    pmax_assets: `
TAREFA: Gerar assets para campanha Performance Max do Google Ads.

Assets necessários:
1. short_headlines: 5 títulos curtos (máx 30 chars)
2. long_headlines: 5 títulos longos (máx 90 chars)
3. descriptions: 5 descrições (máx 90 chars)
4. call_to_actions: 3 CTAs (máx 15 chars)
5. business_name: nome do negócio (máx 25 chars)
6. sitelinks: 4 sitelinks com título (máx 25 chars) e descrição (máx 35 chars)

REGRAS:
1. Respeitar TODOS os limites de caracteres
2. Usar dados reais do produto — NUNCA inventar specs
3. Tom profissional e direto
4. Incluir keyword principal em pelo menos 2 short_headlines
5. Variar os ângulos: técnico, benefício, social proof, urgência

Retorne APENAS um JSON com a estrutura acima.
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INSTAGRAM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  instagram: {
    feed_storytelling: `
TAREFA: Criar copy de Instagram Feed no formato storytelling.

ESTRUTURA:
1. GANCHO (1ª linha): Frase de impacto que interrompe o scroll. Máx 10 palavras.
   PROIBIDO: "Cansado de...", "Você sabia que...", "Revolucionário"
2. DESENVOLVIMENTO (3-4 linhas): História real ou cenário clínico com o produto
3. VIRADA: Momento em que o produto resolve o problema
4. CTA: Chamada para ação natural, sem "clique no link"
5. HASHTAGS: 15-20 hashtags relevantes (mix de volume alto e nicho)

REGRAS:
- Máx 2200 caracteres total (incluindo hashtags)
- Tom: profissional mas acessível
- Usar emojis com moderação (máx 5)
- Incluir specs REAIS do produto na narrativa
- NUNCA inventar casos clínicos ou resultados

Retorne APENAS um JSON:
{
  "caption": "texto completo da copy",
  "hashtags": ["#tag1", "#tag2"],
  "hook_line": "primeira linha isolada"
}
`,

    feed_benefits: `
TAREFA: Criar copy de Instagram Feed com gancho numérico/benefícios.

ESTRUTURA:
1. GANCHO: "X motivos para...", "X benefícios de...", ou dado numérico real
2. LISTA: 3-5 benefícios numerados, cada um com 1-2 linhas
3. PROVA: Spec técnica ou métrica real que comprova
4. CTA: Direcionamento para ação
5. HASHTAGS: 15-20 hashtags

REGRAS:
- Números devem vir do contexto do produto (specs, métricas)
- NUNCA inventar estatísticas como "95% dos dentistas..."
- Se não houver número real disponível, usar formato qualitativo
- Máx 2200 caracteres total
- Tom técnico-acessível

Retorne APENAS um JSON:
{
  "caption": "texto completo",
  "hashtags": ["#tag1", "#tag2"],
  "hook_line": "primeira linha"
}
`,

    feed_problem_solution: `
TAREFA: Criar copy de Instagram Feed no formato problema-solução.

ESTRUTURA:
1. PROBLEMA: Dor real do dentista/clínica (1-2 linhas)
2. AGRAVANTE: Consequência de não resolver (1 linha)
3. SOLUÇÃO: Como o produto resolve — com specs reais (2-3 linhas)
4. RESULTADO: Benefício tangível (1 linha)
5. CTA + HASHTAGS

REGRAS:
- PROIBIDO problemas inventados ou exagerados
- O problema deve ser relevante para o público-alvo do contexto
- A solução deve usar características REAIS do produto
- Máx 2200 caracteres
- NUNCA prometer "cura" ou resultados médicos garantidos

Retorne APENAS um JSON:
{
  "caption": "texto completo",
  "hashtags": ["#tag1", "#tag2"],
  "hook_line": "primeira linha"
}
`,

    feed_urgency: `
TAREFA: Criar copy de Instagram Feed com ângulo de perda financeira/oportunidade.

ESTRUTURA:
1. GANCHO: Custo de NÃO usar o produto (tempo perdido, retrabalho, etc.)
2. CÁLCULO: Se possível, mostrar impacto financeiro real com specs do produto
3. SOLUÇÃO: Como o produto elimina esse custo
4. PROVA: Spec ou métrica real
5. CTA urgente mas profissional

REGRAS:
- Cálculos devem ser baseados em specs REAIS do contexto
- NUNCA inventar valores financeiros
- Se não houver dados para cálculo, usar abordagem qualitativa
- Tom: consultivo, não alarmista
- Máx 2200 caracteres

Retorne APENAS um JSON:
{
  "caption": "texto completo",
  "hashtags": ["#tag1", "#tag2"],
  "hook_line": "primeira linha"
}
`,

    carousel: `
TAREFA: Criar ROTEIRO COMPLETO de carrossel de 6 slides para Instagram Feed.

SLIDE 1 — CAPA (GANCHO):
- Título: frase de impacto, máx 6 palavras. Interrompe o scroll.
  PROIBIDO: "Cansado de...", "Você sabia que...", "Revolucionário"
- Subtítulo: complementa sem revelar tudo. Máx 10 palavras.
- Orientação visual: cena real com o produto ou demo clínica.

SLIDE 2 — PROBLEMA/DOR:
- Título: identifica a dor do público
- Texto: 2-3 linhas contextualizando o problema real
- Orientação visual: cenário "antes" ou obstáculo visual

SLIDE 3 — SOLUÇÃO:
- Título: como o produto resolve
- Texto: 2-3 benefícios técnicos REAIS (das specs do contexto)
- Orientação visual: produto em uso ou demonstração

SLIDE 4 — PROVA TÉCNICA:
- Título: dado ou spec real que comprova
- Texto: especificação técnica + resultado esperado
- Orientação visual: close-up, teste, resultado

SLIDE 5 — AUTORIDADE:
- Título: credencial da marca ou do produto
- Texto: anos de mercado, certificações, base de clientes
- Orientação visual: logo, certificado, depoimento

SLIDE 6 — CTA:
- Título: chamada para ação clara
- Texto: próximo passo + canais de contato
- CTA label: botão/ação principal

REGRAS GLOBAIS:
- Cada slide deve funcionar sozinho
- Progressão: dor → solução → prova → autoridade → ação
- Máx 40 palavras por slide no corpo
- NUNCA repetir informação entre slides
- Usar APENAS dados reais do contexto

Retorne APENAS um JSON array de 6 slides:
[
  {
    "position": 1,
    "title": "título do slide",
    "text": "corpo do slide",
    "image_suggestion": "orientação visual específica e real",
    "cta_label": null
  }
]
O último slide deve ter cta_label preenchido.
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // REELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reels: {
    script: `
TAREFA: Criar roteiro de Reels para Instagram (30-45 segundos).

ESTRUTURA COM MARCAÇÕES DE TEMPO:

[00:00-00:03] HOOK — Frase de impacto visual + texto overlay
  PROIBIDO: "Cansado de...", perguntas retóricas genéricas

[00:03-00:10] PROBLEMA — Mostrar a dor/desafio do dentista
  Orientação visual específica

[00:10-00:25] SOLUÇÃO — Demonstração do produto com specs reais
  2-3 pontos técnicos do contexto
  Orientação visual de uso real

[00:25-00:35] PROVA — Resultado ou spec impressionante
  Dado real do contexto

[00:35-00:45] CTA — Chamada para ação
  Texto overlay + narração

REGRAS:
- Narração natural, não robótica
- Specs devem vir do contexto — NUNCA inventar
- Incluir sugestões de trilha/som
- Formato vertical 9:16

Retorne APENAS um JSON:
{
  "title": "título do reel",
  "duration_seconds": 30-45,
  "segments": [
    {
      "timestamp": "00:00-00:03",
      "type": "hook|problem|solution|proof|cta",
      "narration": "texto da narração",
      "text_overlay": "texto na tela",
      "visual_direction": "orientação visual"
    }
  ],
  "caption": "legenda do post",
  "hashtags": ["#tag1"],
  "audio_suggestion": "sugestão de áudio/trilha"
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIKTOK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tiktok: {
    script: `
TAREFA: Criar roteiro de TikTok (20-30 segundos) no formato descoberta.

ESTRUTURA:

[00:00-00:02] HOOK VISUAL — Ação imediata que prende atenção
  Formato: "POV:", "Testando...", movimento rápido
  PROIBIDO: falar direto pra câmera sem ação

[00:02-00:08] CONTEXTO — Mostrar o cenário/problema rapidamente
  Visual dinâmico, sem explicação longa

[00:08-00:20] DEMONSTRAÇÃO — Produto em ação
  2 specs reais do contexto mostradas visualmente
  Transições rápidas

[00:20-00:28] RESULTADO — Antes/depois ou resultado visual
  Spec impressionante como texto overlay

[00:28-00:30] CTA — Rápido e direto
  "Link na bio" ou "Segue pra mais"

REGRAS:
- Linguagem informal mas técnica
- Ritmo rápido, cortes a cada 2-3 segundos
- Specs do contexto — NUNCA inventar
- Formato vertical 9:16
- Sugerir trending audio se relevante

Retorne APENAS um JSON:
{
  "title": "título do tiktok",
  "duration_seconds": 20-30,
  "segments": [
    {
      "timestamp": "00:00-00:02",
      "type": "hook|context|demo|result|cta",
      "action": "o que acontece na tela",
      "text_overlay": "texto na tela",
      "narration": "texto falado (se houver)"
    }
  ],
  "caption": "legenda",
  "hashtags": ["#tag1"],
  "audio_suggestion": "sugestão de áudio trending"
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // YOUTUBE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  youtube: {
    title: `
TAREFA: Gerar título otimizado para vídeo do YouTube.

REGRAS:
1. Máximo 60 caracteres
2. Keyword principal nos primeiros 30 caracteres
3. Incluir o nome do produto
4. Formato: "[Keyword] — [Benefício/Contexto] | Smart Dent"
5. PROIBIDO: CAPSLOCK total, clickbait, "INCRÍVEL", "VOCÊ NÃO VAI ACREDITAR"
6. Usar termos de busca reais da odontologia
7. Se o vídeo é tutorial, incluir "Como usar" ou "Tutorial"

Retorne APENAS um JSON:
{ "title": "título do vídeo" }
`,

    description: `
TAREFA: Gerar descrição otimizada para vídeo do YouTube.

ESTRUTURA (1800-2500 caracteres):
1. PARÁGRAFO 1 (2-3 linhas): Resumo do vídeo com keyword principal
2. PARÁGRAFO 2 (3-4 linhas): Detalhes técnicos do produto (specs reais)
3. PARÁGRAFO 3 (2-3 linhas): Para quem é este vídeo (público-alvo)
4. LINKS ÚTEIS: Links reais da Smart Dent (site, instagram, whatsapp)
5. SOBRE A SMART DENT: Breve parágrafo institucional

REGRAS:
1. Incluir keyword principal nas primeiras 150 caracteres
2. Timestamps: incluir SOMENTE se o conteúdo do vídeo for conhecido
3. NUNCA inventar timestamps de um vídeo que não existe
4. Specs técnicas devem vir do contexto — NUNCA inventar
5. Links: usar apenas URLs reais do contexto da empresa
6. Incluir 3-5 hashtags no final

Retorne APENAS um JSON:
{
  "description": "descrição completa",
  "timestamps": [] 
}
`,

    tags: `
TAREFA: Gerar 20 tags otimizadas para vídeo do YouTube.

DISTRIBUIÇÃO:
- 5 tags com nome do produto (variações)
- 3 tags com categoria
- 4 tags com termos técnicos da odontologia
- 3 tags com "como usar", "tutorial", "review"
- 3 tags com termos de busca em português
- 2 tags com a marca "Smart Dent"

REGRAS:
1. Cada tag entre 2-5 palavras
2. Sem caracteres especiais (apenas letras, números, espaços)
3. Termos reais de busca — NUNCA inventar termos odontológicos
4. Mix de tags amplas e específicas
5. Incluir variações com e sem acento

Retorne APENAS um JSON:
{ "tags": ["tag1", "tag2", ...] }
`,

    chapters: `
TAREFA: Gerar capítulos (timestamps) para vídeo do YouTube.

IMPORTANTE: Capítulos devem ser gerados SOMENTE quando o conteúdo do vídeo é conhecido.

Se o vídeo já existe e tem roteiro/script conhecido, gerar capítulos baseados no conteúdo real.
Se NÃO há informação suficiente sobre o conteúdo do vídeo, retornar string vazia.

REGRAS:
1. Primeiro capítulo DEVE começar em 00:00
2. Mínimo 3 capítulos, máximo 10
3. Cada capítulo deve ter título descritivo (máx 50 chars)
4. Intervalos mínimos de 30 segundos entre capítulos
5. NUNCA inventar conteúdo de vídeo que não existe

Retorne APENAS um JSON:
{
  "chapters": "00:00 Introdução\\n01:30 Características..." 
}

Se não houver dados suficientes:
{ "chapters": "" }
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WHATSAPP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  whatsapp: {
    product_message: `
TAREFA: Criar mensagem de WhatsApp para divulgação de produto.

ESTRUTURA:
1. SAUDAÇÃO: Cumprimento breve e profissional
2. PRODUTO: Nome + 1 linha de descrição
3. DESTAQUES: 3-4 specs técnicas REAIS em formato de lista com emoji
4. BENEFÍCIO: 1 frase de benefício principal
5. CTA: Pergunta que convida resposta ("Posso enviar mais detalhes?")
6. LINK: URL do produto (se disponível no contexto)

REGRAS:
- Máximo 500 caracteres (limite WhatsApp Business)
- Tom: consultivo, profissional, não vendedor
- Emojis: máx 5, relevantes (✅ 📋 🔬 💡 📞)
- NUNCA interpolação de objetos — cada spec deve ser string formatada
- Specs devem vir EXCLUSIVAMENTE do contexto
- NUNCA inventar preços, porcentagens ou specs

Retorne APENAS um JSON:
{ "message": "texto completo da mensagem" }
`,

    video_message: `
TAREFA: Criar mensagem de WhatsApp para divulgar um vídeo do produto.

ESTRUTURA:
1. CONTEXTO: O que o vídeo mostra (1 linha)
2. DESTAQUE: Principal aprendizado do vídeo (1 linha com emoji)
3. LINK: URL do vídeo
4. CTA: "Vale a pena assistir!" ou similar

REGRAS:
- Máximo 300 caracteres
- Tom: compartilhamento entre profissionais
- NUNCA inventar conteúdo do vídeo
- Se não houver URL do vídeo, usar placeholder "[URL do vídeo]"

Retorne APENAS um JSON:
{ "message": "texto completo" }
`,

    sequence_d0: `
TAREFA: Criar mensagem D0 (primeiro contato) de sequência WhatsApp.

CONTEXTO: Primeiro contato após lead demonstrar interesse no produto.

ESTRUTURA:
1. Saudação personalizada
2. Referência ao interesse demonstrado
3. 1-2 specs mais impactantes do produto
4. Pergunta aberta para qualificar

REGRAS:
- Máximo 400 caracteres
- Tom: consultivo, não insistente
- NUNCA pressionar para compra imediata
- Specs reais do contexto

Retorne APENAS um JSON:
{ "message": "texto completo", "timing": "imediato após interesse" }
`,

    sequence_d2: `
TAREFA: Criar mensagem D+2 (follow-up técnico) de sequência WhatsApp.

CONTEXTO: Segundo contato, 2 dias após o primeiro. Lead não respondeu ou respondeu parcialmente.

ESTRUTURA:
1. Referência casual ao contato anterior
2. Informação técnica nova e relevante (spec não mencionada no D0)
3. Material complementar (link para vídeo, blog, PDF)
4. Pergunta específica sobre necessidade

REGRAS:
- Máximo 450 caracteres
- Tom: técnico-educativo, não vendedor
- Agregar valor com informação nova
- Specs reais do contexto

Retorne APENAS um JSON:
{ "message": "texto completo", "timing": "2 dias após D0" }
`,

    sequence_d5: `
TAREFA: Criar mensagem D+5 (último follow-up) de sequência WhatsApp.

CONTEXTO: Terceiro e último contato. Fechar ou dar espaço.

ESTRUTURA:
1. Menção breve ao interesse anterior
2. Oferta de ajuda sem pressão
3. Canal alternativo (email, site)
4. Despedida profissional

REGRAS:
- Máximo 350 caracteres
- Tom: respeitoso, sem insistência
- PROIBIDO: urgência falsa, "última chance", pressão
- Deixar porta aberta para futuro contato

Retorne APENAS um JSON:
{ "message": "texto completo", "timing": "5 dias após D0" }
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GOOGLE BUSINESS PROFILE (GBP)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  gbp: {
    post: `
TAREFA: Criar post para Google Business Profile.

REGRAS:
1. Máximo 1500 caracteres (limite GBP)
2. Primeira linha: gancho que aparece no snippet (máx 80 chars)
3. Corpo: 3-4 parágrafos curtos com benefícios e specs reais
4. CTA: ação clara (agendar, ligar, visitar site)
5. Incluir keyword principal naturalmente
6. Tom: profissional, local, confiável
7. NUNCA inventar promoções, descontos ou dados
8. Incluir nome da empresa e localização se no contexto

ESTRUTURA SUGERIDA:
- Linha 1: Gancho/Novidade
- Parágrafo 1: O que é o produto/serviço
- Parágrafo 2: Specs/benefícios reais
- Parágrafo 3: Para quem é
- CTA: Ação + contato

Retorne APENAS um JSON:
{
  "title": "título do post (máx 58 chars)",
  "summary": "texto completo do post",
  "cta_type": "LEARN_MORE" | "BOOK" | "CALL" | "SHOP",
  "cta_url": "URL relevante do contexto"
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LINKEDIN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  linkedin: {
    post: `
TAREFA: Criar post para LinkedIn (800-1200 caracteres).

ESTRUTURA:
1. GANCHO (1ª linha): Insight profissional ou dado impactante
   PROIBIDO: "Concordam?", "Quem mais...", clichês de LinkedIn
2. CONTEXTO (2-3 linhas): Problema do mercado ou tendência
3. INSIGHT (3-4 linhas): Como o produto/tecnologia resolve
4. DADOS: Spec técnica ou métrica real que comprova
5. REFLEXÃO: 1-2 linhas de perspectiva do setor
6. CTA: Convite para discussão profissional

REGRAS:
- 800-1200 caracteres (sweet spot LinkedIn)
- Tom: thought leadership técnico
- PROIBIDO: emojis excessivos, hashtags no meio do texto
- Hashtags: 3-5, apenas no final
- NUNCA inventar tendências de mercado ou dados de pesquisa
- Focar em inovação e impacto na odontologia

Retorne APENAS um JSON:
{
  "post": "texto completo",
  "hashtags": ["#tag1", "#tag2"]
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOG
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blog: {
    video_intro: `
TAREFA: Criar introdução de blog post para acompanhar um vídeo (200-300 palavras).

ESTRUTURA:
1. TÍTULO SEO: Com keyword principal nos primeiros 30 chars
2. META DESCRIPTION: 150-160 chars com keyword
3. INTRODUÇÃO: 2-3 parágrafos que contextualizam o vídeo
4. O QUE VOCÊ VAI APRENDER: 3-4 bullet points
5. TRANSIÇÃO: Frase que convida a assistir o vídeo

REGRAS:
- SEO-first: keyword no título, H1, primeira frase
- Tom: educativo e profissional
- NUNCA inventar conteúdo do vídeo
- Usar specs reais do produto no contexto
- Incluir links internos sugeridos

Retorne APENAS um JSON:
{
  "title": "título SEO",
  "meta_description": "meta description",
  "content": "HTML do conteúdo",
  "suggested_internal_links": ["keyword para link"]
}
`,

    commercial: `
TAREFA: Criar artigo de blog comercial (1200-1600 palavras).

ESTRUTURA:
1. TÍTULO: SEO-optimized, keyword nos primeiros 30 chars
2. META: Description 150-160 chars
3. INTRODUÇÃO (150 palavras): Problema → relevância → preview da solução
4. SEÇÃO 1 — O Problema (200 palavras): Dor real do público
5. SEÇÃO 2 — A Solução (300 palavras): Produto com specs reais
6. SEÇÃO 3 — Benefícios (250 palavras): Lista detalhada com specs
7. SEÇÃO 4 — Como Funciona (200 palavras): Processo prático
8. SEÇÃO 5 — Para Quem (150 palavras): Público ideal
9. CONCLUSÃO (150 palavras): Resumo + CTA

REGRAS:
- 1200-1600 palavras EXATAS
- Keyword density: 1-2% natural
- H2 para cada seção, H3 para subtópicos
- Specs e benefícios do contexto — NUNCA inventar
- Incluir FAQ schema se relevante (3-5 perguntas)
- Links sugeridos para páginas internas
- Tom: profissional-educativo, não publicitário

Retorne APENAS um JSON:
{
  "title": "título",
  "meta_description": "meta",
  "content": "HTML completo com tags h2, h3, p, ul, li",
  "faq": [{"question": "?", "answer": "resposta"}],
  "word_count": number,
  "suggested_internal_links": ["keyword"]
}
`,

    technical: `
TAREFA: Criar artigo técnico de blog (1400-1800 palavras).

ESTRUTURA:
1. TÍTULO: Técnico, com keyword e termo especializado
2. META: 150-160 chars
3. ABSTRACT (100 palavras): Resumo técnico do conteúdo
4. INTRODUÇÃO (200 palavras): Contexto científico/técnico
5. FUNDAMENTAÇÃO (300 palavras): Base teórica e estado da arte
6. PRODUTO/TECNOLOGIA (400 palavras): Análise técnica detalhada com specs REAIS
7. APLICAÇÕES CLÍNICAS (300 palavras): Casos de uso e indicações do contexto
8. RESULTADOS ESPERADOS (200 palavras): Baseados em specs, sem promessas
9. CONCLUSÃO (200 palavras): Síntese técnica + perspectivas

REGRAS:
- 1400-1800 palavras
- Tom: acadêmico-técnico, E-E-A-T compliant
- NUNCA citar estudos sem fonte no contexto
- NUNCA inventar resultados clínicos
- Specs devem corresponder EXATAMENTE ao contexto do produto
- Referências: apenas se fornecidas no contexto
- Incluir schema Article com author
- Tabelas de specs quando relevante

Retorne APENAS um JSON:
{
  "title": "título",
  "meta_description": "meta",
  "content": "HTML completo técnico",
  "word_count": number,
  "references": [],
  "suggested_internal_links": ["keyword"]
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SPIN SELLING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  spin: {
    campaign: `
TAREFA: Criar campanha SPIN Selling completa para o produto.

ESTRUTURA SPIN:

1. SITUAÇÃO (3-4 perguntas):
   - Perguntas para entender o cenário atual do prospect
   - Focar em: volume de trabalho, ferramentas atuais, processos

2. PROBLEMA (3-4 perguntas):
   - Perguntas que revelam dores e insatisfações
   - Focar em: limitações, frustrações, perdas

3. IMPLICAÇÃO (3-4 perguntas):
   - Perguntas que amplificam o impacto do problema
   - Focar em: custos ocultos, tempo perdido, oportunidades perdidas

4. NECESSIDADE DE SOLUÇÃO (3-4 perguntas):
   - Perguntas que direcionam para a solução
   - Focar em: benefícios desejados, valor percebido

5. PITCH (1 parágrafo):
   - Apresentação do produto conectando às respostas SPIN
   - Specs reais + benefícios tangíveis

6. OBJEÇÕES (5 objeções comuns + respostas):
   - Preço, concorrência, mudança, tempo, complexidade

REGRAS:
- Perguntas abertas que geram reflexão
- NUNCA inventar problemas que o produto não resolve
- Benefícios devem corresponder a specs reais
- Tom: consultivo, empático, profissional
- Adaptar ao público-alvo do contexto

Retorne APENAS um JSON:
{
  "situation_questions": ["q1", "q2", "q3"],
  "problem_questions": ["q1", "q2", "q3"],
  "implication_questions": ["q1", "q2", "q3"],
  "need_payoff_questions": ["q1", "q2", "q3"],
  "pitch": "texto do pitch",
  "objections": [
    {"objection": "texto", "response": "resposta"}
  ],
  "email_followup": "email de follow-up sugerido"
}
`
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // E-COMMERCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ecommerce: {
    specs_block: `
TAREFA: Gerar bloco de especificações técnicas para página de e-commerce.

COMPONENTES:
1. TABELA DE SPECS: Todas as especificações técnicas em formato tabela HTML
2. JSON-LD Product: Schema markup completo
3. META TAGS: Title (60 chars) + Description (160 chars) otimizados
4. DESCRIÇÃO CURTA: 2-3 frases para snippet (máx 300 chars)
5. BULLET POINTS: 5-7 benefícios principais para listing

REGRAS:
1. Specs EXATAMENTE como no contexto — NUNCA inventar
2. JSON-LD deve incluir: name, description, brand, category, offers
3. Se preço disponível, incluir em offers; senão, omitir offers
4. Meta title com keyword principal
5. NUNCA inventar certificações, garantias ou specs não listadas
6. Formato HTML limpo e semântico

Retorne APENAS um JSON:
{
  "specs_table_html": "<table>...</table>",
  "json_ld": { schema Product completo },
  "meta_title": "título",
  "meta_description": "descrição",
  "short_description": "descrição curta",
  "bullet_points": ["ponto1", "ponto2"]
}
`
  }
}
