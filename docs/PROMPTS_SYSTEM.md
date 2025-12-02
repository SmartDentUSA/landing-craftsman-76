# 📋 Sistema de Prompts IA - Documentação Completa

> **Última atualização:** 2025-12-02  
> **Versão:** 1.0.0  
> **Autor:** Auditoria Técnica de Engenharia de Prompts

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Fontes de Dados](#fontes-de-dados)
4. [Sistema de Prompts Configuráveis](#sistema-de-prompts-configuráveis)
5. [Catálogo de Edge Functions](#catálogo-de-edge-functions)
6. [Variáveis de Template](#variáveis-de-template)
7. [Sistema Dual-AI Competition](#sistema-dual-ai-competition)
8. [SPIN Super-Prompt](#spin-super-prompt)
9. [Processador de Prompts](#processador-de-prompts)
10. [Métricas e Observabilidade](#métricas-e-observabilidade)
11. [Recomendações de Melhoria](#recomendações-de-melhoria)

---

## Visão Geral

O sistema utiliza **20+ edge functions** com integração IA para geração de conteúdo. Os prompts são gerenciados através de:

| Tipo | Localização | Editável |
|------|-------------|----------|
| **Super-Prompt SPIN** | `supabase/functions/_shared/spin-system-prompt.ts` | Código |
| **Prompts Configuráveis** | Tabela `prompts_configuration` | Database |
| **Prompts Hardcoded** | Dentro de cada edge function | Código |
| **Variáveis de Template** | `prompt-processor.ts` | Código |

### APIs de IA Utilizadas

| API | Endpoint | Modelos |
|-----|----------|---------|
| **Lovable AI** | `https://ai.gateway.lovable.dev/v1/chat/completions` | `google/gemini-2.5-flash` (padrão) |
| **DeepSeek** | `https://api.deepseek.com/chat/completions` | `deepseek-chat` |

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                            │
│  - ProductAIGenerator.tsx                                       │
│  - ProductAISmartMerge.tsx                                      │
│  - ProductAICompleteGenerator.tsx                               │
│  - PromptsAIManager.tsx (gerenciamento de prompts)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ generate-       │  │ generate-       │  │ strategic-      │  │
│  │ product-ai-     │  │ social-content  │  │ blog-generator  │  │
│  │ content         │  │                 │  │                 │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           ▼                    ▼                    ▼           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              MÓDULOS COMPARTILHADOS (_shared/)              ││
│  │  - spin-system-prompt.ts (Super-Prompt)                     ││
│  │  - prompt-processor.ts (variáveis)                          ││
│  │  - dual-ai-competition.ts (competição IA)                   ││
│  │  - content-validators.ts (validação)                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ prompts_        │  │ products_       │  │ company_        │  │
│  │ configuration   │  │ repository      │  │ profile         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ spin_selling_   │  │ landing_pages   │  │ external_links  │  │
│  │ solutions       │  │                 │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       APIS EXTERNAS                             │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │      LOVABLE AI         │  │         DEEPSEEK            │   │
│  │  gemini-2.5-flash       │  │       deepseek-chat         │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fontes de Dados

### Tabelas Principais

| Tabela | Campos Utilizados | Uso |
|--------|-------------------|-----|
| `products_repository` | name, description, category, subcategory, price, benefits, keywords, features, target_audience, technical_specifications, variations, document_transcriptions, video_captions | Contexto de produto |
| `company_profile` | company_name, company_description, target_audience, brand_values, differentiators, seo_* | Contexto empresarial |
| `spin_selling_solutions` | problem_description, implication, need_payoff, sales_pitch, success_cases | Metodologia SPIN |
| `landing_pages` | data (JSON), selected_product_ids | Conteúdo de páginas |
| `external_links` | name, url, category, keywords | Links e keywords |
| `key_opinion_leaders` | full_name, specialty, mini_cv | Autoridade |
| `approved_reviews` | contextual_seo_info, ai_keywords | Social proof |
| `categories_config` | category, subcategory, keywords, target_audience | Taxonomia |

### Campos JSON Complexos (products_repository)

```typescript
// technical_specifications
[{ "label": "string", "value": "string" }]

// variations
[{ "name": "string", "sku": "string", "price": number, "attributes": {} }]

// document_transcriptions
[{ "filename": "string", "content": "string", "extracted_at": "date" }]

// video_captions
[{ "video_url": "string", "captions": "string", "source": "string" }]

// benefits
["string", "string", ...]

// keywords
["string", "string", ...]

// target_audience
["string", "string", ...]
```

---

## Sistema de Prompts Configuráveis

### Tabela: `prompts_configuration`

```sql
CREATE TABLE prompts_configuration (
  id UUID PRIMARY KEY,
  edge_function_id TEXT NOT NULL,        -- Ex: 'generate-product-ai-content'
  prompt_name TEXT NOT NULL,             -- Ex: 'benefits_generation'
  prompt_text TEXT NOT NULL,             -- O prompt em si
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Campos de metadados
  data_sources JSONB,                    -- Quais tabelas/campos usar
  style_guidelines JSONB,                -- Diretrizes de estilo
  performance_metrics JSONB,             -- Métricas de uso
  content_validation JSONB,              -- Regras de validação
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Variáveis Suportadas nos Prompts

| Variável | Descrição | Origem |
|----------|-----------|--------|
| `{product.name}` | Nome do produto | products_repository.name |
| `{product.description}` | Descrição | products_repository.description |
| `{product.category}` | Categoria | products_repository.category |
| `{product.subcategory}` | Subcategoria | products_repository.subcategory |
| `{product.price}` | Preço formatado | products_repository.price + currency |
| `{product.target_audience}` | Público-alvo | products_repository.target_audience |
| `{existingContext}` | Itens existentes (anti-duplicação) | Calculado |
| `{instruction}` | Instrução baseada no modo | Calculado |

### Exemplo de Prompt Configurável

```
Você é um especialista em marketing digital para produtos odontológicos.

PRODUTO: {product.name}
DESCRIÇÃO: {product.description}
CATEGORIA: {product.category}
PÚBLICO-ALVO: {product.target_audience}

{existingContext}

{instruction}

Gere benefícios únicos, técnicos e persuasivos.
Formato: Array JSON de strings.
```

---

## Catálogo de Edge Functions

### 1. generate-product-ai-content

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-product-ai-content/index.ts` |
| **API** | Lovable AI (`google/gemini-2.5-flash`) |
| **Prompt Config** | `benefits_generation`, `keywords_generation`, `features_generation` |
| **Dados** | products_repository (completo), document_transcriptions, video_captions |
| **Saída** | benefits[], keywords[], features[] |

**Prompt Hardcoded (fallback benefits):**
```
Você é um especialista em marketing de produtos odontológicos.
Analise este produto e gere 5 benefícios únicos e persuasivos.

PRODUTO: ${product.name}
DESCRIÇÃO: ${product.description}
CATEGORIA: ${product.category}

CONTEXTO TÉCNICO PRIORITÁRIO:
${technicalContext}

${existingContext}

${instruction}

REGRAS:
- Benefícios técnicos e específicos
- Sem repetições dos existentes
- Linguagem profissional
- Máximo 15 palavras por benefício

Retorne APENAS um array JSON de strings.
```

---

### 2. generate-social-content

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-social-content/index.ts` |
| **API** | Lovable AI |
| **Prompt Config** | `whatsapp_promo`, `youtube_description`, `instagram_caption` |
| **Dados** | products_repository, company_profile |
| **Saída** | { whatsapp: string, youtube: string, instagram: string } |

**Prompts por Canal:**

**WhatsApp:**
```
Crie uma mensagem promocional para WhatsApp.
Produto: {product.name}
Preço: {product.price}
Benefícios: {product.benefits}

REGRAS:
- Máximo 300 caracteres
- Emojis estratégicos
- CTA claro
- Tom conversacional
```

**YouTube:**
```
Crie uma descrição para vídeo do YouTube.
Produto: {product.name}
Benefícios: {product.benefits}

ESTRUTURA:
1. Gancho inicial (2 linhas)
2. Descrição técnica (3-4 linhas)
3. Benefícios principais
4. CTA com link
5. Hashtags relevantes
```

**Instagram:**
```
Crie uma legenda para post do Instagram.
Produto: {product.name}
Público: {product.target_audience}

REGRAS:
- Gancho na primeira linha
- Máximo 2200 caracteres
- 5-10 hashtags no final
- Emojis estratégicos
```

---

### 3. generate-tiktok-content

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-tiktok-content/index.ts` |
| **API** | Lovable AI |
| **Dados** | products_repository, company_profile |
| **Saída** | { hook, script, hashtags, cta, music_suggestion } |

**Prompt:**
```
Crie um roteiro viral para TikTok sobre este produto odontológico.

PRODUTO: ${product.name}
DESCRIÇÃO: ${product.description}
BENEFÍCIOS: ${benefits}

ESTRUTURA REQUERIDA:
1. HOOK (3 segundos): Frase de impacto para parar o scroll
2. ROTEIRO (15-30 segundos): Conteúdo educativo/demonstrativo
3. CTA: Chamada para ação
4. HASHTAGS: 5-7 hashtags relevantes
5. SUGESTÃO DE MÚSICA: Trending sounds

REGRAS:
- Linguagem Gen-Z friendly
- Trends atuais
- Formato vertical
- Ritmo rápido
```

---

### 4. generate-product-blog

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-product-blog/index.ts` |
| **API** | Lovable AI |
| **Prompt Config** | `product_blog` |
| **Dados** | products_repository, company_profile, key_opinion_leaders |
| **Saída** | { title, meta_description, content, keywords[] } |

**Prompt:**
```
Crie um artigo de blog técnico-comercial sobre este produto.

PRODUTO: ${product.name}
CATEGORIA: ${product.category}
ESPECIFICAÇÕES: ${specs}
BENEFÍCIOS: ${benefits}
PÚBLICO-ALVO: ${targetAudience}

ESTRUTURA:
1. Título SEO (máx 60 caracteres)
2. Meta description (máx 160 caracteres)
3. Introdução com gancho
4. H2: O que é [produto]
5. H2: Benefícios principais
6. H2: Como usar
7. H2: Para quem é indicado
8. H2: Especificações técnicas
9. Conclusão com CTA

REGRAS SEO:
- Keyword principal no título
- Keyword nos H2
- Links internos sugeridos
- Alt text para imagens
```

---

### 5. strategic-blog-generator

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/strategic-blog-generator/index.ts` |
| **API** | **Dual-AI** (Lovable AI + DeepSeek) |
| **Dados** | landing_pages, products_repository, approved_reviews, key_opinion_leaders, company_profile |
| **Saída** | { dentala: BlogContent, eodonto: BlogContent } |

**Sistema Dual-Domínio:**

| Domínio | Foco | Tom |
|---------|------|-----|
| **Dentala** | Técnico/Educacional | Profissional, científico |
| **Eodonto** | Comercial/Persuasivo | Vendas, benefícios |

**Prompt Dentala:**
```
Você é um redator técnico especializado em odontologia.
Crie um artigo educacional para o blog Dentala.

CONTEXTO:
${strategicContext}

KEYWORDS TÉCNICAS: ${technicalKeywords}
PÚBLICO: Dentistas e especialistas

DIRETRIZES:
- Tom científico e educacional
- Referências técnicas
- Sem linguagem de vendas direta
- Foco em conhecimento

ESTRUTURA:
[H1] Título técnico com keyword
[Intro] Contextualização científica
[H2] Fundamentação técnica
[H2] Aplicações clínicas
[H2] Evidências e estudos
[H2] Considerações práticas
[Conclusão] Síntese técnica
```

**Prompt Eodonto:**
```
Você é um copywriter especializado em e-commerce odontológico.
Crie um artigo persuasivo para o blog Eodonto.

CONTEXTO:
${strategicContext}

KEYWORDS COMERCIAIS: ${commercialKeywords}
PÚBLICO: Compradores e decisores

DIRETRIZES:
- Tom persuasivo e orientado a vendas
- Foco em benefícios práticos
- CTAs estratégicos
- Ofertas e diferenciais

ESTRUTURA:
[H1] Título com benefício principal
[Intro] Problema e solução
[H2] Por que escolher [produto]
[H2] Benefícios exclusivos
[H2] Comparativo de mercado
[H2] Depoimentos e cases
[CTA] Oferta especial
```

---

### 6. generate-spin-landing-page

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-landing-page/index.ts` |
| **API** | Lovable AI |
| **Super-Prompt** | `spin-system-prompt.ts` |
| **Dados** | spin_selling_solutions, products_repository, company_profile |
| **Saída** | HTML completo da landing page |

**Usa o SPIN Super-Prompt** (ver seção específica)

---

### 7. generate-spin-sales-pitch

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-sales-pitch/index.ts` |
| **API** | Lovable AI |
| **Super-Prompt** | `spin-system-prompt.ts` |
| **Dados** | spin_selling_solutions (problema, implicação, necessidade) |
| **Saída** | { sales_pitch: string, key_points: string[] } |

**Prompt:**
```
${SPIN_SYSTEM_PROMPT}

TAREFA: Gerar Sales Pitch para solução SPIN

SITUAÇÃO: ${solution.situation}
PROBLEMA: ${solution.problem_description}
IMPLICAÇÃO: ${solution.implication}
NECESSIDADE: ${solution.need_payoff}

PRODUTOS RELACIONADOS:
${relatedProducts}

Gere um pitch de vendas consultivo que:
1. Conecte o problema às consequências
2. Apresente a solução como necessidade
3. Demonstre valor tangível
4. Inclua prova social
5. Tenha CTA claro
```

---

### 8. generate-spin-journey

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-journey/index.ts` |
| **API** | Lovable AI |
| **Dados** | spin_selling_solutions, products_repository |
| **Saída** | { stages: JourneyStage[] } |

---

### 9. generate-spin-faqs

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-faqs/index.ts` |
| **API** | Lovable AI |
| **Dados** | spin_selling_solutions, products_repository |
| **Saída** | { faqs: FAQ[] } |

---

### 10. generate-spin-metrics

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-metrics/index.ts` |
| **API** | Lovable AI |
| **Dados** | spin_selling_solutions.success_cases |
| **Saída** | { impact_metrics: Metric[] } |

**Prompt:**
```
Analise os casos de sucesso e extraia métricas quantificáveis.

SALES PITCH: ${solution.sales_pitch}

CASOS DE SUCESSO:
${successCases}

Gere métricas no formato:
[
  {
    "label": "Redução de tempo",
    "value": "40%",
    "description": "Tempo médio de procedimento"
  }
]

REGRAS:
- Apenas dados dos casos reais
- Métricas quantificáveis
- Sem invenção de números
```

---

### 11. generate-spin-hero-banner

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-hero-banner/index.ts` |
| **API** | Lovable AI |
| **Dados** | spin_selling_solutions |
| **Saída** | { headline, subheadline, cta_text } |

---

### 12. generate-spin-campaign

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-spin-campaign/index.ts` |
| **API** | Lovable AI |
| **Dados** | spin_selling_solutions, products_repository |
| **Saída** | { whatsapp_sequence: Message[], email_sequence: Email[] } |

---

### 13. generate-product-faqs

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-product-faqs/index.ts` |
| **API** | Lovable AI |
| **Prompt Config** | `product_faqs` |
| **Dados** | products_repository |
| **Saída** | { faqs: FAQ[] } |

**Prompt:**
```
Gere FAQs para este produto odontológico.

PRODUTO: ${product.name}
DESCRIÇÃO: ${product.description}
ESPECIFICAÇÕES: ${specs}
PÚBLICO: ${targetAudience}

Gere 5-8 perguntas frequentes que:
1. Antecipem dúvidas reais
2. Incluam informações técnicas
3. Abordem uso e aplicação
4. Mencionem garantia/suporte
5. Comparem com alternativas

Formato:
[{ "question": "...", "answer": "..." }]
```

---

### 14. generate-ad-copies

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-ad-copies/index.ts` |
| **API** | Lovable AI |
| **Dados** | products_repository, google_ads_campaigns |
| **Saída** | { headlines: string[], descriptions: string[] } |

**Prompt:**
```
Crie copies para Google Ads.

PRODUTO: ${product.name}
KEYWORDS: ${keywords}
LANDING PAGE: ${landingUrl}

GERE:
- 15 headlines (máx 30 caracteres cada)
- 4 descriptions (máx 90 caracteres cada)

REGRAS:
- Inclua keyword principal
- CTAs variados
- Benefícios específicos
- Números quando possível
- Sem pontuação excessiva
```

---

### 15. generate-ecommerce-html

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-ecommerce-html/index.ts` |
| **API** | Lovable AI |
| **Dados** | products_repository |
| **Saída** | { html: string, structured_data: JSON-LD } |

---

### 16. ai-content-generator

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/ai-content-generator/index.ts` |
| **API** | Lovable AI |
| **Uso** | Geração genérica de conteúdo |

---

### 17. ai-seo-generator

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/ai-seo-generator/index.ts` |
| **API** | Lovable AI |
| **Dados** | products_repository, landing_pages |
| **Saída** | { seo_title, seo_description, keywords } |

---

### 18. auto-seo-enhancer

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/auto-seo-enhancer/index.ts` |
| **API** | Lovable AI |
| **Dados** | products_repository |
| **Saída** | Campos SEO otimizados |

---

### 19. generate-content-from-interests

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/generate-content-from-interests/index.ts` |
| **API** | Lovable AI |
| **Dados** | Interesses do usuário (NPS) |
| **Saída** | Conteúdo personalizado |

---

### 20. transcribe-product-document

| Atributo | Valor |
|----------|-------|
| **Arquivo** | `supabase/functions/transcribe-product-document/index.ts` |
| **API** | Lovable AI (Gemini 2.5 Flash) |
| **Entrada** | PDF (formData) |
| **Saída** | { text: string, structured_data: ProductData } |

**Usa Tool Calling para extração estruturada:**
```typescript
tools: [{
  type: "function",
  function: {
    name: "extract_product_data",
    parameters: {
      type: "object",
      properties: {
        technical_specifications: { type: "array" },
        certifications: { type: "array" },
        applications: { type: "array" },
        // ... mais campos
      }
    }
  }
}]
```

---

## Variáveis de Template

### Arquivo: `supabase/functions/_shared/prompt-processor.ts`

```typescript
interface SelectedFieldsConfig {
  product?: string[];    // Campos do produto
  company?: string[];    // Campos da empresa
  custom?: Record<string, any>; // Campos customizados
}

// Funções principais
extractSelectedData(product, companyProfile, config)
buildContextFromSelectedData(extractedData)
processPromptWithSelectedData(prompt, extractedData, existingContent)
extractExistingContent(product, contentType)
```

### Arquivo: `supabase/functions/generate-product-ai-content/prompt-variables.ts`

```typescript
function processPromptVariables(
  prompt: string,
  product: any,
  existingItems: string[] = [],
  complementOnly: boolean = false
): string {
  // Substituições:
  // {product.name} → product.name
  // {product.description} → product.description
  // {product.category} → product.category
  // {product.subcategory} → product.subcategory
  // {product.price} → formatted price
  // {product.target_audience} → product.target_audience
  // {existingContext} → lista de itens existentes
  // {instruction} → instrução baseada no modo
}
```

---

## Sistema Dual-AI Competition

### Arquivo: `supabase/functions/_shared/dual-ai-competition.ts`

O sistema executa o mesmo prompt em duas APIs e seleciona o melhor resultado.

```typescript
interface DualAIResult {
  winner: 'lovable' | 'deepseek';
  content: string;
  scores: {
    lovable: number;
    deepseek: number;
  };
  metadata: {
    lovable_tokens: number;
    deepseek_tokens: number;
    processing_time: number;
  };
}

async function runDualAICompetition(
  prompt: string,
  systemPrompt: string,
  evaluationCriteria: EvaluationCriteria
): Promise<DualAIResult>
```

### Critérios de Avaliação

| Critério | Peso | Descrição |
|----------|------|-----------|
| Word Count | 15% | Tamanho adequado |
| Markdown Structure | 20% | Uso de headings, listas |
| Key Elements | 25% | Presença de elementos requeridos |
| Text Quality | 25% | Originalidade, fluência |
| Repetition | 15% | Penalidade por repetição |

### Edge Functions que usam Dual-AI

- `strategic-blog-generator` (principal)
- `generate-product-blog` (opcional)

---

## SPIN Super-Prompt

### Arquivo: `supabase/functions/_shared/spin-system-prompt.ts`

O SPIN Super-Prompt é a "constituição" de todas as gerações SPIN. Versão atual: **1.0.0**

```typescript
export const SPIN_SYSTEM_PROMPT = `
# SUPER-PROMPT DO SISTEMA SPIN SELLING

## PRINCÍPIOS UNIVERSAIS
1. Abordagem consultiva (não agressiva)
2. Foco em diagnóstico antes de prescrição
3. Dados reais > suposições
4. ROI quantificável sempre que possível

## METODOLOGIA SPIN
- Situation: Contexto atual do cliente
- Problem: Dores identificadas
- Implication: Consequências de não agir
- Need-payoff: Valor da solução

## PADRÕES DE SAÍDA

### Sales Pitch
- Tom: Consultivo, não vendedor
- Estrutura: Problema → Implicação → Solução → Prova
- Tamanho: 200-400 palavras

### Landing Page
- Hero: Headline focada no problema
- Corpo: Jornada de transformação
- Prova: Métricas e depoimentos
- CTA: Ação clara e específica

### FAQs
- Antecipam objeções reais
- Respondem com dados
- Direcionam para ação

## ANTI-ALUCINAÇÃO
- NUNCA inventar números
- NUNCA criar cases fictícios
- NUNCA atribuir quotes falsas
- SEMPRE basear em dados fornecidos

## VALIDAÇÃO CRUZADA
Antes de gerar, verificar:
1. Dados existem no contexto?
2. Métricas são dos cases reais?
3. Produtos mencionados existem?
`;

export function buildSPINPrompt(
  specificPrompt: string,
  context?: string
): string {
  return `${SPIN_SYSTEM_PROMPT}\n\n${context || ''}\n\n${specificPrompt}`;
}
```

### Edge Functions que usam SPIN Super-Prompt

| Function | Uso |
|----------|-----|
| `generate-spin-landing-page` | Completo |
| `generate-spin-sales-pitch` | Completo |
| `generate-spin-journey` | Completo |
| `generate-spin-faqs` | Completo |
| `generate-spin-metrics` | Parcial |
| `generate-spin-hero-banner` | Parcial |
| `generate-spin-campaign` | Completo |

---

## Processador de Prompts

### Fluxo de Processamento

```
┌─────────────────┐
│ Prompt Template │
│ (configurável)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ extractSelected │
│ Data()          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ buildContext    │
│ FromSelectedData│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ processPrompt   │
│ Variables()     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Prompt Final    │
│ (processado)    │
└─────────────────┘
```

### Exemplo de Processamento

**Input (Template):**
```
Gere benefícios para {product.name}.
Categoria: {product.category}
{existingContext}
{instruction}
```

**Dados:**
```javascript
product = {
  name: "Scanner Intraoral",
  category: "Equipamentos Digitais"
}
existingItems = ["Alta precisão", "Fácil uso"]
complementOnly = true
```

**Output (Processado):**
```
Gere benefícios para Scanner Intraoral.
Categoria: Equipamentos Digitais

ITENS MANUAIS EXISTENTES (NÃO DUPLICAR): Alta precisão, Fácil uso

Gere APENAS 3 itens complementares que NÃO duplicem os existentes:
```

---

## Métricas e Observabilidade

### Campos de Métricas (prompts_configuration)

```typescript
performance_metrics: {
  usage_count: number;      // Vezes usado
  last_used: string;        // Última utilização
  avg_response_time: number; // Tempo médio
  success_rate: number;     // Taxa de sucesso
  quality_scores: number[]; // Scores de qualidade
}
```

### Trigger de Log (Database)

```sql
CREATE FUNCTION log_prompt_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE prompts_configuration 
  SET performance_metrics = performance_metrics || jsonb_build_object(
    'usage_count', COALESCE((performance_metrics->>'usage_count')::integer, 0) + 1,
    'last_used', now()
  )
  WHERE id = NEW.id;
  
  INSERT INTO system_monitoring (
    event_type, component_name, event_data, severity, tags
  ) VALUES (
    'prompt_usage', 'prompts_configuration',
    jsonb_build_object('prompt_id', NEW.id, ...),
    'info', '["prompts", "usage"]'
  );
  
  RETURN NEW;
END;
$$;
```

### Monitoramento Recomendado

| Métrica | Onde Monitorar | Alerta |
|---------|----------------|--------|
| Taxa de erro | Edge function logs | > 5% |
| Tempo de resposta | performance_metrics | > 30s |
| Qualidade | Avaliação manual | < 3/5 |
| Duplicações | Content validation | > 0 |

---

## Recomendações de Melhoria

### ✅ Pontos Fortes Atuais

1. **Prompts Configuráveis**: Sistema flexível via database
2. **Dual-AI Competition**: Seleção automática do melhor resultado
3. **Anti-alucinação**: Instruções explícitas nos prompts
4. **SPIN Super-Prompt**: Consistência entre functions
5. **Variáveis Padronizadas**: Reutilização de contexto

### ⚠️ Pontos de Atenção

| Problema | Impacto | Solução |
|----------|---------|---------|
| Prompts hardcoded | Difícil manutenção | Migrar para database |
| Sem versionamento | Sem rollback | Implementar versões |
| Métricas não usadas | Sem dados de qualidade | Ativar tracking |
| Logs descentralizados | Debug difícil | Centralizar em system_monitoring |

### 📋 Plano de Ação

#### Fase 1: Documentação (Concluída) ✅
- [x] Criar docs/PROMPTS_SYSTEM.md

#### Fase 2: Padronização
- [ ] Migrar prompts hardcoded para `prompts_configuration`
- [ ] Implementar fallback consistente em todas as functions
- [ ] Adicionar log de prompt_id em cada geração

#### Fase 3: Observabilidade
- [ ] Implementar tracking real de `performance_metrics`
- [ ] Criar dashboard de métricas de prompts
- [ ] Adicionar alertas de qualidade

#### Fase 4: Evolução
- [ ] Implementar versionamento de prompts
- [ ] Sistema de rollback
- [ ] A/B testing de prompts
- [ ] Feedback loop de qualidade

---

## Apêndice: Exemplos de Uso

### Buscar Prompt Configurável

```typescript
// No edge function
const { data: promptConfig } = await supabase
  .from('prompts_configuration')
  .select('*')
  .eq('edge_function_id', 'generate-product-ai-content')
  .eq('prompt_name', 'benefits_generation')
  .eq('is_active', true)
  .single();

if (promptConfig) {
  const processedPrompt = processPromptVariables(
    promptConfig.prompt_text,
    product,
    existingBenefits,
    complementOnly
  );
  // Usar processedPrompt na chamada IA
} else {
  // Usar prompt hardcoded como fallback
}
```

### Chamar Lovable AI

```typescript
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  })
});
```

### Usar SPIN Super-Prompt

```typescript
import { buildSPINPrompt, SPIN_SYSTEM_PROMPT } from '../_shared/spin-system-prompt.ts';

const fullPrompt = buildSPINPrompt(
  'Gere um sales pitch para esta solução SPIN.',
  `SOLUÇÃO: ${solution.name}\nPROBLEMA: ${solution.problem_description}`
);
```

---

> **Nota:** Esta documentação deve ser atualizada sempre que novos prompts ou edge functions forem adicionados ao sistema.
