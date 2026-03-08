# 📚 SYSTEM DOCUMENTATION v3.0

> **Landing Craftsman** — Plataforma Enterprise de Geração de Conteúdo com IA para o Mercado Odontológico
> 
> Última atualização: 2026-03-08

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Módulos Frontend](#3-módulos-frontend)
4. [Banco de Dados](#4-banco-de-dados)
5. [Edge Functions](#5-edge-functions)
6. [Clinical Brain v2.0](#6-clinical-brain-v20)
7. [Dual-AI Competition](#7-dual-ai-competition)
8. [Knowledge Graph](#8-knowledge-graph)
9. [Knowledge System & GEO](#9-knowledge-system--geo)
10. [Integração Sistema B](#10-integração-sistema-b)
11. [APIs Externas](#11-apis-externas)
12. [Schema.org](#12-schemaorg)
13. [SEO & Feature Flags](#13-seo--feature-flags)
14. [Publicação](#14-publicação)
15. [Hooks React](#15-hooks-react)
16. [Segurança](#16-segurança)
17. [Tracking & Analytics](#17-tracking--analytics)
18. [Dependências](#18-dependências)
19. [Fluxos de Dados](#19-fluxos-de-dados)

---

## 1. Visão Geral

### Propósito

Sistema de geração automatizada de conteúdo para empresas do setor odontológico, focado em:

- **Landing Pages** otimizadas para SEO e conversão
- **Blogs técnicos** com autoridade E-E-A-T
- **Conteúdo para redes sociais** (YouTube, Instagram, TikTok)
- **Knowledge Base** para chatbots e LLMs
- **Feeds XML** para Google Merchant e sitemaps

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Estado | TanStack Query + Zustand |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| IA | Gemini 2.5 Flash + DeepSeek R1 |
| Deploy | Cloudflare Pages + WordPress REST API |

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SISTEMA B (Externo)                         │
│         okeogjgqijbfkudfjadz.supabase.co/functions/v1              │
│                                                                     │
│  Endpoint: /data-export?format=ai_ready                            │
│  Fornece: vídeos, documentos técnicos, resinas, autores, reviews   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ fetch() unidirecional
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SISTEMA A (Este projeto)                         │
│             pgfgripuanuwwolmtknn.supabase.co                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BANCO DE DADOS                            │   │
│  │  company_profile │ products_repository │ categories_config  │   │
│  │  approved_reviews │ key_opinion_leaders │ blog_posts        │   │
│  │  external_links │ company_milestones │ video_testimonials   │   │
│  │  landing_pages │ knowledge_vectors │ lia_* (chatbot)        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   EDGE FUNCTIONS (80+)                       │   │
│  │  Geradores HTML │ Geradores IA │ Knowledge Base │ Sync      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   FRONTEND REACT                             │   │
│  │  12 Rotas │ 15 Abas Repositório │ 60+ Hooks                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ APIs públicas
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CONSUMIDORES EXTERNOS                            │
│  ├── Chatbots externos (via knowledge-base API)                    │
│  ├── Google Merchant Center (via merchant-feed XML)                │
│  ├── Crawlers SEO (via sitemap, video-sitemap, robots.txt)         │
│  ├── LLMs (Gemini, GPT, Claude — via RAG format)                  │
│  ├── Sistema B (via knowledge-base?format=system_b)                │
│  └── Plataformas e-commerce (via HTML gerado)                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Módulos Frontend

### 3.1 Rotas Principais

| Rota | Descrição | Componente Principal |
|------|-----------|---------------------|
| `/` | Dashboard principal | `Index.tsx` |
| `/repository` | Repositório Central (15 abas) | `Repository.tsx` |
| `/company` | Perfil da Empresa (10 abas) | `CompanyProfile.tsx` |
| `/landing-page-builder` | Builder de Landing Pages | `LandingPageBuilder.tsx` |
| `/cloner-editor` | Editor de LPs clonadas | `ClonerEditor.tsx` |
| `/spin-generator` | Gerador SPIN Selling | `SpinSellingSuiteV2.tsx` |
| `/wordpress-connector` | Conexão WordPress | `WordPressConnector.tsx` |
| `/google-ads-generator` | Gerador Google Ads | `GoogleAdsGenerator.tsx` |
| `/code-view` | Visualização de código | `CodeView.tsx` |
| `/admin` | Admin área | `AdminArea.tsx` |
| `/login` | Autenticação | `Login.tsx` |
| `/settings` | Configurações | `Settings.tsx` |

### 3.2 Repositório Central (15 Abas)

```typescript
// Abas do Repositório de Produtos
const REPOSITORY_TABS = [
  'info',           // Informações básicas
  'seo',            // SEO & Keywords
  'sales',          // Vendas & Pitch
  'benefits',       // Benefícios & Features
  'faq',            // FAQ Técnico
  'workflow',       // Workflow 6 etapas
  'videos',         // Vídeos (YT, IG, Técnicos)
  'images',         // Galeria de imagens
  'documents',      // Documentos técnicos
  'clinical-brain', // Clinical Brain (Anti-alucinação)
  'messages',       // Mensagens CS/AfterSales
  'youtube',        // Scripts YouTube
  'instagram',      // Copies Instagram
  'ecommerce',      // HTML E-commerce
  'blog'            // Blog individual
];
```

### 3.3 Perfil da Empresa (10 Abas)

```typescript
// Abas do Company Profile
const COMPANY_PROFILE_TABS = [
  'basic',          // Nome, descrição, setor
  'address',        // Endereço estruturado + coordenadas
  'contact',        // Email, telefone, social
  'identity',       // Missão, visão, valores
  'legal',          // CNPJ, razão social, DUNS
  'founder',        // Fundador + LinkedIn
  'tracking',       // GTM, GA4, Meta, TikTok pixels
  'videos',         // Vídeos institucionais
  'reviews',        // Reviews Google + manuais
  'domains'         // Domínios SEO configurados
];
```

---

## 4. Banco de Dados

### 4.1 Tabelas Principais

| Tabela | Registros Típicos | Propósito |
|--------|-------------------|-----------|
| `company_profile` | 1 | Perfil único da empresa (50+ campos) |
| `products_repository` | 100-500 | Catálogo completo de produtos |
| `categories_config` | 20-50 | Categorias com keywords e regras |
| `approved_reviews` | 50-200 | Reviews aprovados para uso |
| `raw_reviews` | 100-500 | Reviews brutos (Google, etc.) |
| `key_opinion_leaders` | 10-30 | KOLs/Especialistas |
| `blog_posts` | 50-200 | Posts de blog gerados |
| `external_links` | 100-300 | Keywords estratégicas com URLs |
| `company_milestones` | 10-30 | Timeline da empresa |
| `video_testimonials` | 20-50 | Depoimentos em vídeo |
| `landing_pages` | 50-100 | LPs configuradas |
| `cloned_landing_pages` | 10-50 | LPs clonadas |
| `knowledge_vectors` | 1000+ | Embeddings para RAG |
| `lia_leads` | 100+ | Leads do chatbot LIA |
| `lia_conversations` | 500+ | Conversas do chatbot |
| `ai_token_usage` | 10000+ | Tracking de uso de IA |

### 4.2 Estrutura do `company_profile`

```sql
-- 50+ campos organizados em 10 grupos
company_profile (
  -- BÁSICO
  id, user_id, company_name, company_description,
  business_sector, target_audience, main_products_services,
  brand_values, company_logo_url, company_logo_supabase_path,
  
  -- ENDEREÇO ESTRUTURADO
  country, state, city, street_address, address_number,
  postal_code, latitude, longitude,
  
  -- CONTATO
  website_url, contact_email, contact_phone,
  youtube_channel, instagram_profile,
  
  -- IDENTIDADE CORPORATIVA
  mission_statement, vision_statement, company_culture,
  working_methodology, delivery_approach, differentiators,
  founded_year, team_size,
  
  -- LEGAL
  legal_name, tax_id, duns_number,
  number_of_employees, price_range,
  
  -- FUNDADOR
  founder_name, founder_title, founder_linkedin,
  
  -- TRACKING PIXELS (JSONB)
  tracking_pixels: {
    google_tag_manager: { container_id, enabled },
    google_analytics: { measurement_id, enabled },
    meta_pixel: { pixel_id, enabled },
    tiktok_pixel: { pixel_id, enabled }
  },
  
  -- VÍDEOS (JSONB)
  company_videos: {
    youtube_videos: [],
    instagram_videos: [],
    technical_videos: [],
    testimonial_videos: []
  },
  
  -- REVIEWS (JSONB)
  company_reviews: {
    google_place_id, google_reviews_imported,
    last_google_sync, manual_reviews: []
  },
  google_aggregate_rating: { ratingValue, reviewCount },
  nps_metrics,
  
  -- SEO
  seo_context_keywords: [],
  seo_domains: [],
  seo_market_positioning,
  seo_competitive_advantages,
  seo_technical_expertise,
  seo_service_areas,
  
  -- SOCIAL
  social_media_links: [],
  social_media_hashtags: [],
  social_media_handles: [],
  youtube_verified, instagram_verified,
  youtube_company_footer, youtube_tags: [],
  
  -- OPERACIONAL
  opening_hours: [],
  areas_served: [],
  
  -- NAVEGAÇÃO
  institutional_links: [],
  navigation_footer_config: {
    navigation_menu: [],
    footer: { title, links: [], locations: [], social_links: [] }
  }
)
```

### 4.3 Estrutura do `products_repository`

```sql
-- 80+ campos por produto
products_repository (
  -- IDENTIFICAÇÃO
  id, name, slug, description, brand,
  category, subcategory, product_type,
  
  -- PREÇOS
  price, promo_price, currency,
  
  -- CÓDIGOS
  gtin, mpn, ean, ncm,
  google_product_category,
  
  -- DISPONIBILIDADE
  availability, stock_quantity, stock_managed,
  min_order_quantity, max_order_quantity,
  
  -- MÍDIA
  image_url, image_url_original,
  images_gallery: [],
  product_url, canonical_url,
  
  -- SEO
  keywords: [], market_keywords: [],
  search_intent_keywords: [], keyword_ids: [],
  seo_title_override, seo_description_override,
  target_audience: [],
  
  -- CONTEÚDO
  benefits: [], features: [], faq: [],
  technical_specifications: {},
  applications, sales_pitch,
  
  -- VÍDEOS
  youtube_videos: [], instagram_videos: [],
  technical_videos: [], testimonial_videos: [],
  
  -- DOCUMENTOS
  technical_documents: [],
  document_transcriptions: [],
  
  -- CLINICAL BRAIN
  anti_hallucination_rules: {
    never_claim: [],
    never_mix_with: [],
    never_use_in_stages: [],
    always_require: [],
    always_explain: []
  },
  required_products: [],
  forbidden_products: [],
  workflow_stages: {},
  
  -- CONTEÚDO GERADO
  ecommerce_html: {},
  individual_blog_content: {},
  youtube_scripts: [],
  youtube_descriptions: [],
  instagram_copies: [],
  instagram_reels_scripts: [],
  tiktok_content: [],
  whatsapp_messages: [],
  whatsapp_sequences: [],
  video_captions: [],
  
  -- CTAs
  resource_cta1: {}, resource_cta2: {}, resource_cta3: {},
  offer_discount_cta: {},
  resource_descriptions: {},
  
  -- STATUS
  approved, active, selected, featured,
  launch, promotion, showcase,
  use_in_ai_generation,
  
  -- CLINICAL BRAIN STATUS
  clinical_brain_status,
  clinical_brain_generated_at,
  clinical_brain_validated_at,
  clinical_brain_validator_name,
  clinical_brain_validation_notes,
  
  -- METADATA
  source_type, source_landing_page_id,
  display_order, created_at, updated_at
)
```

---

## 5. Edge Functions

### 5.1 Inventário Completo (80+ funções)

#### Geradores de HTML (5)

| Função | Propósito | Tabelas Usadas |
|--------|-----------|----------------|
| `generate-ecommerce-html` | HTML para e-commerce | products, company |
| `generate-spin-landing-page` | LP SPIN Selling | products, categories, spin, videos |
| `product-blog-html-v2` | Blog individual do produto | products, company, kols |
| `clone-landing-page` | Clonar LP externa | cloned_landing_pages |
| `generate-consolidated-landing-page` | LP consolidada | landing_pages, products |

#### Shared Helpers (25)

```
supabase/functions/_shared/
├── fetchKnowledgeGraph.ts      # Knowledge Graph centralizado
├── schemaBuilders/
│   ├── productSchema.ts        # Schema Product
│   ├── articleSchema.ts        # Schema Article
│   ├── organizationSchema.ts   # Schema Organization
│   ├── faqSchema.ts            # Schema FAQPage
│   ├── videoSchema.ts          # Schema VideoObject
│   ├── reviewSchema.ts         # Schema Review
│   ├── howToSchema.ts          # Schema HowTo
│   ├── webPageSchema.ts        # Schema WebPage
│   └── breadcrumbSchema.ts     # Schema BreadcrumbList
├── entityIndex.ts              # Entity Index para GEO
├── aiCrawlerPolicy.ts          # AI Crawler Policy
├── citationBlocks.ts           # Citation Blocks
├── domainConfig.ts             # Configuração de domínios
├── cors.ts                     # Headers CORS
├── supabase.ts                 # Cliente Supabase
├── trackAIUsage.ts             # Tracking de tokens
├── templateHelpers.ts          # Helpers Mustache
├── htmlMinifier.ts             # Minificação HTML
├── imageOptimizer.ts           # Otimização de imagens
├── seoEnhancer.ts              # SEO enhancer
├── seoValidator.ts             # Validação SEO
├── sanitizeHtml.ts             # Sanitização HTML
├── slugify.ts                  # Geração de slugs
├── extractColors.ts            # Extração de cores
└── youtubeEmbed.ts             # Embed YouTube
```

#### Geradores de Conteúdo IA (15+)

| Função | Propósito |
|--------|-----------|
| `generate-benefits` | Benefícios do produto |
| `generate-product-features` | Features técnicas |
| `generate-faq` | FAQ técnico |
| `generate-workflow-stages` | Workflow 6 etapas |
| `generate-youtube-script` | Scripts YouTube |
| `generate-youtube-description` | Descrições YouTube |
| `generate-instagram-copy` | Copies Instagram |
| `generate-instagram-reels-script` | Scripts Reels |
| `generate-tiktok-content` | Conteúdo TikTok |
| `generate-whatsapp-messages` | Mensagens WhatsApp |
| `generate-whatsapp-sequences` | Sequências WhatsApp |
| `generate-video-captions` | Legendas de vídeo |
| `generate-google-ads-campaign` | Campanhas Google Ads |
| `generate-clinical-brain` | Clinical Brain completo |
| `generate-sales-pitch` | Pitch de vendas |

#### SPIN Selling Suite (6)

| Função | Propósito |
|--------|-----------|
| `generate-spin-landing-page` | Landing Page SPIN |
| `generate-spin-solutions` | Soluções SPIN |
| `generate-spin-questions` | Perguntas SPIN |
| `generate-spin-pain-points` | Pain Points |
| `generate-spin-objections` | Objeções |
| `generate-spin-success-cases` | Casos de sucesso |

#### APIs Externas / Knowledge Base (7)

| Função | Propósito | Formatos |
|--------|-----------|----------|
| `knowledge-base` | Knowledge Base principal | json, rag, ai_training, system_b |
| `knowledge-feed` | Feed de LPs | json |
| `rag-chat` | Chat RAG (LIA) | stream, json |
| `generate-merchant-feed` | Google Merchant | xml |
| `generate-sitemap` | Sitemap | xml |
| `generate-video-sitemap` | Video Sitemap | xml |
| `generate-robots-txt` | Robots.txt | text |

#### Importação e Sincronização (8)

| Função | Propósito |
|--------|-----------|
| `sync-system-b-documents` | Sincronizar docs do Sistema B |
| `import-systemb-authors` | Importar KOLs do Sistema B |
| `import-google-reviews` | Importar reviews Google |
| `import-products-csv` | Importar produtos via CSV |
| `index-knowledge-base` | Indexar vetores para RAG |
| `sync-landing-page-products` | Sincronizar produtos da LP |
| `migrate-landing-page-data` | Migrar dados de LP |
| `debug-systemb-product` | Debug de produto Sistema B |

#### Processamento e Utilidades (15+)

| Função | Propósito |
|--------|-----------|
| `categorize-product` | Categorização automática |
| `generate-keywords` | Geração de keywords |
| `generate-seo-context` | Contexto SEO |
| `enhance-seo-content` | Melhorar conteúdo SEO |
| `validate-product-content` | Validar conteúdo |
| `calculate-completion-score` | Score de completude |
| `process-document` | Processar documento |
| `transcribe-document` | Transcrever documento |
| `extract-product-info` | Extrair info de produto |
| `generate-slug` | Gerar slug |
| `optimize-image` | Otimizar imagem |
| `resize-image` | Redimensionar imagem |
| `convert-image-format` | Converter formato |
| `extract-colors` | Extrair cores |
| `analyze-content-quality` | Analisar qualidade |

#### Publicação (5)

| Função | Propósito |
|--------|-----------|
| `publish-to-cloudflare` | Deploy Cloudflare |
| `publish-to-wordpress` | Publicar no WordPress |
| `publish-blog-to-cloudflare` | Blog no Cloudflare |
| `unpublish-from-cloudflare` | Remover do Cloudflare |
| `check-publication-status` | Status de publicação |

#### OAuth e Conexões (8)

| Função | Propósito |
|--------|-----------|
| `google-oauth-callback` | Callback OAuth Google |
| `google-oauth-token` | Token OAuth Google |
| `refresh-google-token` | Refresh token Google |
| `youtube-oauth-callback` | Callback OAuth YouTube |
| `wordpress-auth` | Autenticação WordPress |
| `wordpress-publish` | Publicar no WordPress |
| `verify-jwt` | Verificar JWT |
| `check-auth` | Verificar autenticação |

---

## 6. Clinical Brain v2.0

### 6.1 Visão Geral

O **Clinical Brain** é o sistema de anti-alucinação que garante precisão técnica em todo conteúdo gerado.

### 6.2 Componentes

```typescript
// src/components/ClinicalBrain/types.ts

interface AntiHallucinationRules {
  never_claim: string[];        // Nunca afirmar isso
  never_mix_with: string[];     // Nunca misturar com
  never_use_in_stages: string[]; // Etapas proibidas
  always_require: string[];     // Sempre requer isso
  always_explain: string[];     // Sempre explicar
}

interface ForbiddenProduct {
  product_id?: string;
  product_name: string;
  reason: string;              // Por que é proibido
}

interface RequiredProduct {
  product_id?: string;
  product_name: string;
  context: string;             // Quando é necessário
}
```

### 6.3 Workflow 6 Etapas

```typescript
// Etapas do fluxo odontológico
const WORKFLOW_STAGES = [
  'scanning',    // 1. Escaneamento intraoral
  'design',      // 2. Design CAD/CAM
  'printing',    // 3. Impressão 3D
  'post_cure',   // 4. Pós-cura UV
  'finishing',   // 5. Acabamento e polimento
  'cementation'  // 6. Cimentação/instalação
];

// Cada etapa tem:
interface WorkflowStage {
  stage: string;
  title: string;
  description: string;
  duration: string;
  equipment: string[];
  materials: string[];
  safety_notes: string[];
  tips: string[];
}
```

### 6.4 Master System Prompt

```typescript
// src/components/ClinicalBrain/master-system-prompt.ts

export function buildMasterSystemPrompt(
  product: ProductNode,
  company: CompanyNode,
  context: 'ecommerce' | 'blog' | 'youtube' | 'instagram' | 'whatsapp'
) {
  return `
    PERSONA: ${getToneByProductType(product.category)}
    
    EMPRESA:
    - Nome: ${company.company_name}
    - Setor: ${company.business_sector}
    - Diferenciais: ${company.differentiators}
    
    PRODUTO:
    - Nome: ${product.name}
    - Categoria: ${product.category}
    - Aplicações: ${product.applications}
    
    REGRAS ANTI-ALUCINAÇÃO:
    - NUNCA afirmar: ${product.anti_hallucination_rules?.never_claim?.join(', ')}
    - NUNCA misturar com: ${product.anti_hallucination_rules?.never_mix_with?.join(', ')}
    - SEMPRE explicar: ${product.anti_hallucination_rules?.always_explain?.join(', ')}
    
    WORKFLOW OBRIGATÓRIO:
    ${JSON.stringify(product.workflow_stages, null, 2)}
    
    CONTEXTO DE GERAÇÃO: ${context}
  `;
}
```

### 6.5 Validação

```typescript
// Status de validação
type ClinicalBrainStatus = 
  | 'not_generated'  // Não gerado
  | 'generated'      // Gerado, aguarda validação
  | 'validated'      // Validado por especialista
  | 'rejected';      // Rejeitado, precisa regenerar

// Campos de validação no produto
interface ClinicalBrainValidation {
  clinical_brain_status: ClinicalBrainStatus;
  clinical_brain_generated_at: string | null;
  clinical_brain_validated_at: string | null;
  clinical_brain_validator_name: string | null;
  clinical_brain_validation_notes: string | null;
}
```

---

## 7. Dual-AI Competition

### 7.1 Visão Geral

Sistema de competição entre dois modelos de IA para garantir máxima qualidade.

### 7.2 Modelos

| Modelo | Provider | Uso Principal |
|--------|----------|---------------|
| `gemini-2.5-flash` | Google | Geração rápida, conteúdo técnico |
| `deepseek-r1` | DeepSeek | Raciocínio complexo, validação |

### 7.3 Critérios de Avaliação

```typescript
interface AIEvaluationCriteria {
  technical_accuracy: number;  // 0-100: Precisão técnica
  seo_optimization: number;    // 0-100: Otimização SEO
  brand_voice: number;         // 0-100: Voz da marca
  readability: number;         // 0-100: Legibilidade
  compliance: number;          // 0-100: Conformidade regulatória
}

// Score final = média ponderada
const WEIGHTS = {
  technical_accuracy: 0.30,
  seo_optimization: 0.25,
  brand_voice: 0.20,
  readability: 0.15,
  compliance: 0.10
};
```

### 7.4 Tracking de Uso

```typescript
// Tabela ai_token_usage
interface AITokenUsage {
  id: string;
  edge_function_id: string;
  action_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_brl: number;
  product_name?: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Custo por 1M tokens (atualizado 2026-03)
const TOKEN_COSTS = {
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'deepseek-r1': { input: 0.55, output: 2.19 }
};
```

---

## 8. Knowledge Graph

### 8.1 Função Central

```typescript
// supabase/functions/_shared/fetchKnowledgeGraph.ts

interface KnowledgeGraph {
  company: CompanyNode | null;
  products: ProductNode[];
  reviews: ReviewNode[];
  videos: VideoNode[];
  experts: ExpertNode[];
  blogPosts: BlogPostNode[];
  externalLinks: ExternalLinkNode[];
  milestones: MilestoneNode[];
}

// Busca paralela de 8 tabelas
async function fetchKnowledgeGraph(
  supabase: SupabaseClient,
  options?: {
    productIds?: string[];
    landingPageId?: string;
    includeUnpublishedBlogs?: boolean;
    limit?: number;
  }
): Promise<KnowledgeGraph>
```

### 8.2 Helpers Derivados

```typescript
// Grafo focado em produto
function buildProductGraph(kg: KnowledgeGraph, productId: string) {
  return {
    product: ProductNode,
    reviews: ReviewNode[],      // Reviews relacionados
    videos: VideoNode[],        // Vídeos do produto
    experts: ExpertNode[],      // Especialistas relevantes
    blogPosts: BlogPostNode[],  // Posts relacionados
    externalLinks: ExternalLinkNode[],
    milestones: MilestoneNode[],
    company: CompanyNode
  };
}

// Grafo focado em blog
function buildBlogGraph(kg: KnowledgeGraph, blogIdentifier: string) {
  return {
    blogPost: BlogPostNode,
    author: ExpertNode | null,  // Autor KOL
    relatedProducts: ProductNode[],
    externalLinks: ExternalLinkNode[],
    reviews: ReviewNode[],
    videos: VideoNode[],
    milestones: MilestoneNode[],
    company: CompanyNode
  };
}
```

### 8.3 Uso nos Geradores

```typescript
// Exemplo: generate-ecommerce-html
import { fetchKnowledgeGraph, buildProductGraph } from '../_shared/fetchKnowledgeGraph.ts';

const kg = await fetchKnowledgeGraph(supabase, { productIds: [productId] });
const productGraph = buildProductGraph(kg, productId);

// Usar dados no HTML
const html = generateHTML({
  product: productGraph.product,
  reviews: productGraph.reviews,        // AggregateRating
  videos: productGraph.videos,          // VideoObject
  experts: productGraph.experts,        // Citation blocks
  company: productGraph.company         // Organization schema
});
```

---

## 9. Knowledge System & GEO

### 9.1 Entity Index

```typescript
// Mapa de entidades para LLMs
interface EntityIndex {
  "@context": "https://schema.org";
  "@graph": [
    { "@type": "Organization", ... },
    { "@type": "Product", ... },
    { "@type": "Person", ... },      // KOLs
    { "@type": "Review", ... },
    { "@type": "VideoObject", ... },
    { "@type": "Article", ... }      // Blogs
  ];
}

// Gerado automaticamente com Wikidata linking
function buildEntityIndex(kg: KnowledgeGraph): EntityIndex
```

### 9.2 AI Crawler Policy

```html
<!-- Adicionado ao <head> de todas as páginas -->
<meta name="ai-content-policy" content="
  Allow: Summarization, Citation, Learning
  Require: Attribution to [Company Name]
  Contact: [contact email] for licensing
">

<meta name="robots" content="
  index, follow,
  max-snippet:-1,
  max-image-preview:large,
  max-video-preview:-1
">
```

### 9.3 Citation Blocks

```html
<!-- Blocos de citação com fonte verificável -->
<blockquote class="citation-block" 
            itemscope 
            itemtype="https://schema.org/Citation">
  <p itemprop="text">"[Citação do especialista]"</p>
  <cite itemprop="author" 
        itemscope 
        itemtype="https://schema.org/Person">
    <span itemprop="name">Dr. João Silva</span>
    <meta itemprop="sameAs" content="[URL Lattes]">
  </cite>
  <meta itemprop="isBasedOn" content="[URL da fonte]">
</blockquote>
```

### 9.4 Wikidata Linking

```typescript
// Linking com entidades Wikidata
const WIKIDATA_ENTITIES = {
  'odontologia': 'Q12128',
  'impressora_3d': 'Q1072035',
  'resina': 'Q174698',
  'ortodontia': 'Q181536',
  'protese_dentaria': 'Q786915'
};

// Aplicado em sameAs do schema
{
  "@type": "Product",
  "category": {
    "@type": "Thing",
    "name": "Resina 3D",
    "sameAs": "https://www.wikidata.org/wiki/Q174698"
  }
}
```

---

## 10. Integração Sistema B

### 10.1 Endpoint do Sistema B

```
URL: https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export

Parâmetros:
- format=ai_ready (obrigatório)
- include_product_videos=true
- include_resin_videos=true
```

### 10.2 Payload Recebido

```typescript
interface SystemBPayload {
  produtos: {
    resinas: Array<{
      id: string;
      slug: string;
      nome: string;
      correlacao: { loja_integrada_id: string };
      documentos: Array<{
        nome: string;
        url_download: string;
        tamanho_bytes: number;
      }>;
    }>;
    documentos_tecnicos: Array<{
      resina: { id: string };
      documentos: any[];
      ordem_exibicao: number;
    }>;
  };
  
  documentos_catalogo: Array<{
    id: string;
    document_name: string;
    file_url: string;
    file_size: number;
    product_external_id: string;
  }>;
  
  videos_produtos: Array<{
    titulo: string;
    embed_url: string;
    thumbnail: string;
    transcricao: string;
    tags: string[];
    produto_correlacionado: string;
  }>;
  
  videos_resinas: Array<{...}>;
  
  autores: Array<{
    nome: string;
    foto: string;
    bio: string;
    especialidade: string;
    instagram: string;
    youtube: string;
    lattes: string;
  }>;
  
  reputacao_google: {
    avaliacoes: any[];
    nota_media: number;
    total_avaliacoes: number;
    place_id: string;
  };
}
```

### 10.3 Fluxo de Sincronização

```
Sistema B                    Sistema A
    │                            │
    │  ──── data-export ────►    │
    │                            │
    │                       sync-system-b-documents
    │                            │
    │                       ┌────┴────┐
    │                       │         │
    │                products_repository
    │                technical_documents
    │                       │         │
    │                       └────┬────┘
    │                            │
    │                       import-systemb-authors
    │                            │
    │                       key_opinion_leaders
    │                            │
    │  ◄── knowledge-base ────   │
    │      ?format=system_b      │
```

---

## 11. APIs Externas

### 11.1 Knowledge Base API

```
GET /functions/v1/knowledge-base

Parâmetros:
- format: json | rag | ai_training | system_b
- include_products: true (default)
- include_categories: true (default)
- include_kols: false (default)
- include_blog_posts: false (default)
- product_id: [UUID] (filtrar por produto)
```

#### Formato RAG (otimizado para tokens)

```json
{
  "company": {
    "name": "...",
    "description": "...",
    "sector": "...",
    "social": { "youtube": "...", "instagram": "..." },
    "tracking": { "gtm": "...", "ga4": "..." }
  },
  "products": [
    {
      "id": "...",
      "name": "...",
      "category": "...",
      "price": 299.90,
      "benefits": ["..."],
      "antiHallucination": {
        "neverClaim": ["..."],
        "neverMixWith": ["..."]
      },
      "workflow": { "scanning": {...}, "printing": {...} }
    }
  ],
  "categories": [...],
  "externalLinks": [...],
  "meta": {
    "generatedAt": "2026-03-08T...",
    "totalProducts": 150,
    "version": "3.0"
  }
}
```

### 11.2 RAG Chat API (LIA)

```
POST /functions/v1/rag-chat

Body:
{
  "message": "Como usar resina biocompatível?",
  "conversation_id": "uuid" (opcional),
  "lead_id": "uuid" (opcional),
  "stream": true
}

Response (SSE):
data: {"chunk": "Para usar ", "done": false}
data: {"chunk": "resina biocompatível...", "done": false}
data: {"chunk": "", "done": true, "sources": [...]}
```

### 11.3 Merchant Feed

```
GET /functions/v1/generate-merchant-feed

Response: XML (Google Merchant Center format)

<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Company Name Products</title>
    <item>
      <g:id>uuid</g:id>
      <g:title>Product Name</g:title>
      <g:price>299.90 BRL</g:price>
      <g:gtin>7891234567890</g:gtin>
      <g:mpn>SKU-001</g:mpn>
      <g:availability>in_stock</g:availability>
      ...
    </item>
  </channel>
</rss>
```

### 11.4 Sitemaps

```
GET /functions/v1/generate-sitemap
→ XML sitemap com landing pages e blogs

GET /functions/v1/generate-video-sitemap
→ XML sitemap com vídeos (YouTube, técnicos)

GET /functions/v1/generate-robots-txt
→ Robots.txt com link para sitemap
```

---

## 12. Schema.org

### 12.1 Tipos Implementados (16)

| Tipo | Uso | Helper |
|------|-----|--------|
| `Organization` | Empresa | `organizationSchema.ts` |
| `LocalBusiness` | Empresa local | `organizationSchema.ts` |
| `Product` | Produtos | `productSchema.ts` |
| `Offer` | Preços | `productSchema.ts` |
| `AggregateRating` | Avaliações | `reviewSchema.ts` |
| `Review` | Review individual | `reviewSchema.ts` |
| `Person` | KOLs/Autores | `personSchema.ts` |
| `Article` | Blog posts | `articleSchema.ts` |
| `BlogPosting` | Blog posts | `articleSchema.ts` |
| `FAQPage` | FAQ | `faqSchema.ts` |
| `HowTo` | Tutoriais | `howToSchema.ts` |
| `VideoObject` | Vídeos | `videoSchema.ts` |
| `WebPage` | Páginas | `webPageSchema.ts` |
| `BreadcrumbList` | Navegação | `breadcrumbSchema.ts` |
| `ImageObject` | Imagens | `imageSchema.ts` |
| `ItemList` | Listas | `listSchema.ts` |

### 12.2 Exemplo de @graph

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      "name": "Company Name",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png",
      "sameAs": ["https://youtube.com/...", "https://instagram.com/..."]
    },
    {
      "@type": "Product",
      "@id": "https://example.com/produto/resina-bio#product",
      "name": "Resina Biocompatível",
      "brand": { "@id": "https://example.com/#organization" },
      "offers": {
        "@type": "Offer",
        "price": "299.90",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Como usar a resina?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "..."
          }
        }
      ]
    }
  ]
}
```

---

## 13. SEO & Feature Flags

### 13.1 Feature Flags

```typescript
// src/config/feature-flags.ts

// SEO Context Inteligente (IA + reconciliação)
export const isSEOContextEnabled = (): boolean => {
  return env('VITE_ENABLE_SEO_CONTEXT') === 'true';
};

// Auto-link em todos os conteúdos
export const isAutoLinkAllEnabled = (): boolean => {
  return env('VITE_LINK_AUTOLINK_ALL') === 'true';
};

// Debug SEO
export const DEBUG_SEO_GENERATION = env('VITE_DEBUG_SEO') === 'true';

// SEO Enhancer (pós-processamento)
// ✅ Ativo por padrão
export const isSEOEnhancerEnabled = (): boolean => {
  return env('VITE_SEO_ENHANCER') !== 'false';
};
```

### 13.2 Configuração de Domínios

```typescript
// company_profile.seo_domains
interface SEODomain {
  domain: string;           // "blog.example.com"
  type: 'blog' | 'ecommerce' | 'landing' | 'institutional';
  primary: boolean;
  gtm_id?: string;
  ga4_id?: string;
  meta_pixel_id?: string;
  canonical_base?: string;
  default_author_kol_id?: string;
}
```

### 13.3 Auto-Linking

```typescript
// Aplica links automáticos baseado em external_links
function applyAutoLinking(
  html: string,
  externalLinks: ExternalLinkNode[]
): string {
  // Substitui keywords por links
  // Respeita densidade máxima de links
  // Prioriza por relevance_score
}
```

---

## 14. Publicação

### 14.1 Destinos de Publicação

| Destino | Função | Formato |
|---------|--------|---------|
| Cloudflare Pages | `publish-to-cloudflare` | HTML estático |
| WordPress | `publish-to-wordpress` | REST API |
| Google Merchant | `generate-merchant-feed` | XML |
| Sitemaps | `generate-sitemap` | XML |

### 14.2 Formatos de Exportação

| Formato | Uso |
|---------|-----|
| HTML minificado | Deploy direto |
| HTML com metadata | Cloudflare + SEO |
| JSON Schema | API consumption |
| Markdown | Documentação |
| XML (RSS/Atom) | Feeds |

### 14.3 Fluxo de Publicação Cloudflare

```
Landing Page
    │
    ▼
generate-consolidated-landing-page
    │
    ├── fetchKnowledgeGraph()
    ├── buildProductGraph()
    ├── generateSchemas()
    ├── injectEntityIndex()
    ├── applyAutoLinking()
    └── minifyHTML()
    │
    ▼
publish-to-cloudflare
    │
    ├── uploadAssets()
    ├── deployPage()
    └── updateDNS()
    │
    ▼
cloned_landing_pages.published_url
```

---

## 15. Hooks React

### 15.1 Hooks de Dados (20+)

```typescript
// Produtos
useProducts()
useProduct(id)
useProductCategories()
useProductsByCategory(category)
useProductSearch(query)

// Empresa
useCompanyProfile()
useCompanyMilestones()
useCompanyVideos()

// Reviews
useApprovedReviews(landingPageId)
useRawReviews()
useGoogleReviews()

// KOLs
useKeyOpinionLeaders()
useKOL(id)

// Blog
useBlogPosts(landingPageId)
useBlogPost(id)
usePublishedBlogs()

// Links
useExternalLinks()
useExternalLinksByCategory(category)

// Landing Pages
useLandingPages()
useLandingPage(id)
useClonedLandingPages()
```

### 15.2 Hooks de Geração (15+)

```typescript
// Geração de conteúdo
useGenerateBenefits()
useGenerateFeatures()
useGenerateFAQ()
useGenerateWorkflowStages()
useGenerateClinicalBrain()

// Geração de mídia
useGenerateYouTubeScript()
useGenerateYouTubeDescription()
useGenerateInstagramCopy()
useGenerateReelsScript()
useGenerateTikTokContent()

// Geração de HTML
useGenerateEcommerceHTML()
useGenerateSpinLanding()
useGenerateProductBlog()
useConsolidateLandingPage()
```

### 15.3 Hooks de Utilidade (25+)

```typescript
// Autenticação
useAuth()
useUser()
useAdminCheck()

// Toast/Notificações
useToast()

// Formulários
useForm()
useFormValidation()

// UI
useMediaQuery()
useDebounce()
useThrottle()
useLocalStorage()
useClipboard()

// Upload
useFileUpload()
useImageUpload()
useDragAndDrop()

// Tracking
useAITokenUsage()
useAnalytics()
usePageView()
```

---

## 16. Segurança

### 16.1 Autenticação

```typescript
// Supabase Auth
const { data: { user }, error } = await supabase.auth.getUser();

// Verificação de sessão
const { data: { session } } = await supabase.auth.getSession();
```

### 16.2 Row Level Security (RLS)

```sql
-- Exemplo: products_repository
CREATE POLICY "Anyone can view approved products"
ON products_repository FOR SELECT
USING (approved = true AND active = true);

CREATE POLICY "Only admins can manage products"
ON products_repository FOR ALL
USING (has_role(auth.uid(), 'admin'));
```

### 16.3 Roles

```sql
-- Enum de roles
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

-- Tabela de roles (separada do profile)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Função de verificação (SECURITY DEFINER)
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 16.4 JWT Verification

```typescript
// Edge Function: verify-jwt
const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(jwt);

if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 17. Tracking & Analytics

### 17.1 AI Token Usage

```typescript
// Tracking automático em todas as Edge Functions
await trackAIUsage(supabase, {
  edge_function_id: 'generate-benefits',
  action_name: 'generate',
  model: 'gemini-2.5-flash',
  prompt_tokens: 1500,
  completion_tokens: 800,
  product_name: 'Resina Biocompatível',
  metadata: { category: 'RESINAS 3D' }
});
```

### 17.2 Tracking Pixels

```typescript
// company_profile.tracking_pixels
{
  "google_tag_manager": {
    "container_id": "GTM-XXXXXX",
    "enabled": true,
    "note": "GTM - Única fonte de tags recomendada"
  },
  "google_analytics": {
    "measurement_id": "G-XXXXXXXXXX",
    "enabled": true,
    "note": "GA4 (pode ser gerenciado via GTM)"
  },
  "meta_pixel": {
    "pixel_id": "123456789",
    "enabled": true,
    "note": "Meta Pixel global"
  },
  "tiktok_pixel": {
    "pixel_id": "XXXXXXXX",
    "enabled": false,
    "note": "TikTok Pixel para remarketing"
  }
}
```

### 17.3 Content Analytics

```typescript
// Tabela content_analytics
interface ContentAnalytics {
  id: string;
  content_id: string;
  content_type: 'product' | 'blog' | 'landing_page';
  action_type: 'view' | 'generate' | 'publish' | 'edit';
  performance_score?: number;
  quality_metrics?: {
    seo_score: number;
    readability_score: number;
    keyword_density: number;
  };
  user_feedback?: {
    helpful: boolean;
    rating: number;
    comment: string;
  };
  metadata?: Record<string, any>;
}
```

---

## 18. Dependências

### 18.1 Dependências Principais

| Pacote | Versão | Uso |
|--------|--------|-----|
| `react` | ^18.3.1 | UI Framework |
| `react-router-dom` | ^6.30.1 | Roteamento |
| `@tanstack/react-query` | ^5.83.0 | Data fetching |
| `zustand` | ^5.0.8 | Estado global |
| `@supabase/supabase-js` | ^2.56.0 | Backend |
| `tailwindcss` | - | Estilização |
| `lucide-react` | ^0.462.0 | Ícones |
| `zod` | ^3.25.76 | Validação |
| `react-hook-form` | ^7.61.1 | Formulários |
| `date-fns` | ^3.6.0 | Datas |
| `recharts` | ^2.15.4 | Gráficos |
| `@tiptap/react` | ^3.4.5 | Editor rich text |
| `framer-motion` | - | Animações |
| `sonner` | ^1.7.4 | Toasts |
| `mustache` | ^4.2.0 | Templates |
| `marked` | ^16.3.0 | Markdown |
| `dompurify` | ^3.3.0 | Sanitização HTML |

### 18.2 UI Components (shadcn/ui)

```
@radix-ui/react-accordion
@radix-ui/react-alert-dialog
@radix-ui/react-avatar
@radix-ui/react-checkbox
@radix-ui/react-collapsible
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-hover-card
@radix-ui/react-label
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-popover
@radix-ui/react-progress
@radix-ui/react-radio-group
@radix-ui/react-scroll-area
@radix-ui/react-select
@radix-ui/react-separator
@radix-ui/react-slider
@radix-ui/react-switch
@radix-ui/react-tabs
@radix-ui/react-toast
@radix-ui/react-toggle
@radix-ui/react-tooltip
```

---

## 19. Fluxos de Dados

### 19.1 Fluxo: Cadastro de Produto

```
UI: ProductForm
    │
    ▼
useProduct.create()
    │
    ▼
products_repository.insert()
    │
    ▼
categorize-product (Edge Function)
    │
    ├── Categoriza via IA
    └── Atualiza category/subcategory
    │
    ▼
generate-keywords (Edge Function)
    │
    ├── Gera keywords via IA
    └── Atualiza keywords[], market_keywords[]
    │
    ▼
calculate-completion-score (Edge Function)
    │
    └── Atualiza content_completion_tracking
```

### 19.2 Fluxo: Geração de HTML

```
UI: GenerateButton
    │
    ▼
useGenerateEcommerceHTML()
    │
    ▼
generate-ecommerce-html (Edge Function)
    │
    ├── fetchKnowledgeGraph()
    ├── buildProductGraph()
    ├── buildMasterSystemPrompt()
    │
    ▼
Gemini 2.5 Flash
    │
    ├── Gera HTML otimizado
    └── Aplica regras anti-alucinação
    │
    ▼
Post-processing
    │
    ├── injectSchemas()
    ├── injectEntityIndex()
    ├── applyAutoLinking()
    ├── injectTrackingPixels()
    └── minifyHTML()
    │
    ▼
products_repository.update()
    │
    └── ecommerce_html = { html, generated_at, model }
```

### 19.3 Fluxo: RAG Chat (LIA)

```
Usuário: "Como usar resina biocompatível?"
    │
    ▼
rag-chat (Edge Function)
    │
    ├── search_knowledge_vectors()
    │   └── Busca por similaridade semântica
    │
    ├── Chunks relevantes (top 5)
    │
    ▼
Gemini 2.5 Flash
    │
    ├── System prompt + chunks
    └── Gera resposta
    │
    ▼
lia_messages.insert()
lia_conversations.update()
    │
    ▼
Response (SSE stream)
```

### 19.4 Fluxo: Sync Sistema B

```
Trigger: Manual ou Scheduled
    │
    ▼
sync-system-b-documents (Edge Function)
    │
    ├── fetch(Sistema B /data-export?format=ai_ready)
    │
    ▼
Processamento
    │
    ├── Match produtos por correlacao.loja_integrada_id
    ├── Upsert documentos técnicos
    └── Upsert vídeos
    │
    ▼
products_repository.update()
    │
    └── technical_documents, youtube_videos
    │
    ▼
import-systemb-authors (Edge Function)
    │
    ├── Processa autores/profissionais
    └── Upsert em key_opinion_leaders
```

---

## 📝 Changelog

### v3.0 (2026-03-08)
- Adicionado Knowledge Graph centralizado (`fetchKnowledgeGraph.ts`)
- Documentação completa de 80+ Edge Functions
- Detalhamento do Clinical Brain v2.0
- Fluxos de dados detalhados

### v2.0 (2026-02-15)
- Dual-AI Competition (Gemini + DeepSeek)
- GEO (Generative Engine Optimization)
- Entity Index para LLMs

### v1.0 (2026-01-01)
- Documentação inicial
- Estrutura básica do sistema

---

> **Mantido por**: Equipe de Desenvolvimento
> **Contato**: dev@example.com
