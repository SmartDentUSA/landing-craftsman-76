# 📚 Knowledge Base API - Documentação Completa

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Endpoints](#endpoints)
- [Parâmetros](#parâmetros)
- [Formatos de Resposta](#formatos-de-resposta)
- [Estrutura de Dados](#estrutura-de-dados)
- [Rate Limits](#rate-limits)
- [Códigos de Erro](#códigos-de-erro)
- [Exemplos de Uso](#exemplos-de-uso)
- [JSON Schema](#json-schema)
- [Changelog](#changelog)

---

## 🎯 Visão Geral

A **Knowledge Base API** é um endpoint RESTful que fornece acesso completo a todos os dados do sistema, incluindo:

- ✅ **Perfil da Empresa** (60+ campos)
- ✅ **Categorias e Configurações** (30+ campos por categoria)
- ✅ **Links e Keywords Estratégicos** (25+ campos por link)
- ✅ **Produtos Completos** (150+ campos por produto)
- ✅ **Relacionamentos** (CS Messages, Aftersales, Cupons, Google Ads)
- ✅ **Scores de Completude** (métricas de qualidade)

**Total: 250+ campos únicos documentados**

### 🚀 Casos de Uso

- **IA de Atendimento**: Treinar chatbots com conhecimento completo da empresa
- **Sistema B**: Sincronização bidirecional de dados
- **CRM/ERP**: Integração de produtos e categorias
- **Google Merchant**: Feed de produtos otimizado
- **Power BI**: Dashboards e analytics
- **Automação**: Zapier, Make, n8n

---

## 🔐 Autenticação

### API Key (Obrigatória)

Todas as requisições devem incluir o header `x-api-key`:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base
```

### Como Obter sua API Key

1. Entre em contato com o administrador do sistema
2. A API Key será fornecida de forma segura
3. Armazene em variáveis de ambiente (NUNCA no código)

**⚠️ IMPORTANTE:**
- Não compartilhe sua API Key
- Não comite no Git
- Rotacione periodicamente
- Use HTTPS sempre

---

## 🌐 Endpoints

### Base URL
```
https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base
```

### GET /knowledge-base

Retorna a base de conhecimento completa baseada nos parâmetros fornecidos.

**Método:** `GET`  
**Autenticação:** API Key (header `x-api-key`)  
**Rate Limit:** 100 requisições/minuto

---

## ⚙️ Parâmetros

### Query Parameters

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `format` | `string` | `json` | Formato de resposta: `json`, `ai_training`, `system_b` |
| `include_company` | `boolean` | `true` | Incluir dados do perfil da empresa |
| `include_categories` | `boolean` | `true` | Incluir configurações de categorias |
| `include_links` | `boolean` | `true` | Incluir repository de links/keywords |
| `include_products` | `boolean` | `true` | Incluir produtos e relacionamentos |
| `approved_only` | `boolean` | `true` | Retornar apenas itens aprovados |
| `category` | `string` | `null` | Filtrar por categoria específica |
| `limit` | `number` | `50` | Limite de produtos (1-500) |
| `offset` | `number` | `0` | Offset para paginação |

### Exemplos de URLs

```bash
# Dados completos (padrão)
?format=json

# Apenas produtos de uma categoria
?category=Odontologia&limit=100

# Formato para treinar IA
?format=ai_training

# Sem perfil da empresa
?include_company=false&include_products=true

# Paginação (produtos 51-100)
?limit=50&offset=50
```

---

## 📊 Formatos de Resposta

### 1. `json` (Padrão)

Estrutura hierárquica completa com metadados.

**Content-Type:** `application/json`

```json
{
  "api_version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "total_fields": 3547,
  "data": {
    "company_profile": { /* 60+ campos */ },
    "categories_config": [ /* array */ ],
    "external_links": [ /* array */ ],
    "products": [ /* array */ ]
  }
}
```

### 2. `ai_training`

Formato de texto otimizado para LLMs (GPT, Claude, etc).

**Content-Type:** `text/plain`

```markdown
# BASE DE CONHECIMENTO COMPLETA

## PERFIL DA EMPRESA
**Nome:** Smartdent CAD/CAM
**Descrição:** Especializada em soluções odontológicas...
...
```

### 3. `system_b`

Estrutura flat para sistemas legados.

**Content-Type:** `application/json`

```json
{
  "company": { /* flat object */ },
  "categories": [ /* array */ ],
  "links": [ /* array */ ],
  "products": [ /* array with nested relations */ ]
}
```

---

## 📦 Estrutura de Dados

### 1. Company Profile (60+ campos)

```typescript
{
  "company_profile": {
    // Informações Básicas
    "id": "uuid",
    "company_name": "string",
    "company_description": "string",
    "business_sector": "string",
    "location": "string",
    "founded_year": "number",
    "team_size": "string",
    
    // Contato
    "contact_email": "string",
    "contact_phone": "string",
    "website_url": "string",
    
    // Estratégia e Posicionamento
    "mission_statement": "string",
    "vision_statement": "string",
    "brand_values": "string",
    "target_audience": "string",
    "differentiators": "string",
    "main_products_services": "string",
    
    // SEO
    "seo_market_positioning": "string",
    "seo_competitive_advantages": "string",
    "seo_technical_expertise": "string",
    "seo_service_areas": "string",
    "seo_context_keywords": ["array"],
    "seo_domains": ["array"],
    
    // Redes Sociais
    "instagram_profile": "string",
    "youtube_channel": "string",
    "social_media_links": [
      {
        "platform": "string",
        "url": "string"
      }
    ],
    
    // Links Institucionais
    "institutional_links": [
      {
        "label": "string",
        "url": "string"
      }
    ],
    
    // Vídeos da Empresa
    "company_videos": {
      "youtube_videos": [
        {
          "url": "string",
          "title": "string",
          "description": "string",
          "captions": "string",
          "analysis": {
            "keywords": ["array"],
            "sentiment": "string",
            "summary": "string"
          }
        }
      ],
      "instagram_videos": ["array"],
      "technical_videos": ["array"],
      "testimonial_videos": ["array"]
    },
    
    // Reviews
    "company_reviews": {
      "google_place_id": "string",
      "google_reviews_imported": "boolean",
      "last_google_sync": "timestamp",
      "manual_reviews": ["array"]
    },
    
    // Tracking e Pixels
    "tracking_pixels": {
      "google_tag_manager": {
        "enabled": "boolean",
        "container_id": "string"
      },
      "google_analytics": {
        "enabled": "boolean",
        "measurement_id": "string"
      },
      "meta_pixel": {
        "enabled": "boolean",
        "pixel_id": "string"
      },
      "tiktok_pixel": {
        "enabled": "boolean",
        "pixel_id": "string"
      }
    },
    
    // Rodapé YouTube
    "youtube_company_footer": "string (markdown)",
    
    // Metadata
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 2. Categories Config (30+ campos por categoria)

```typescript
{
  "categories_config": [
    {
      "id": "uuid",
      "category": "string",
      "subcategory": "string",
      
      // Keywords
      "keywords": ["array"],
      "market_keywords": ["array"],
      "search_intent_keywords": ["array"],
      "keyword_ids": ["array"],
      
      // Público-alvo
      "target_audience": ["array"],
      
      // Metadata
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

### 3. External Links / Keywords Repository (25+ campos)

```typescript
{
  "external_links": [
    {
      "id": "uuid",
      "name": "string",
      "url": "string",
      "description": "string",
      
      // Categorização
      "category": "string",
      "subcategory": "string",
      
      // Tipo e Intenção
      "keyword_type": "primary | secondary | long-tail",
      "search_intent": "informational | commercial | transactional | navigational",
      
      // Métricas SEO
      "monthly_searches": "number",
      "cpc_estimate": "number",
      "competition_level": "low | medium | high",
      "relevance_score": "number (0-100)",
      
      // Keywords Relacionadas
      "related_keywords": ["array"],
      
      // Rastreamento de Uso
      "usage_count": "number",
      "last_used_at": "timestamp",
      
      // IA
      "ai_generated": "boolean",
      "source_products": ["array of UUIDs"],
      
      // Status
      "approved": "boolean",
      
      // Metadata
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

### 4. Products (150+ campos por produto)

```typescript
{
  "products": [
    {
      "product": {
        // Informações Básicas (15 campos)
        "id": "uuid",
        "name": "string",
        "description": "string",
        "price": "number",
        "promo_price": "number",
        "currency": "BRL",
        "unit_measure": "string",
        
        // URLs e Imagens (10 campos)
        "product_url": "string",
        "image_url": "string",
        "images_gallery": [
          {
            "url": "string",
            "alt": "string",
            "order": "number"
          }
        ],
        
        // Categorização (10 campos)
        "category": "string",
        "subcategory": "string",
        "all_categories": ["array"],
        "store_category": "string",
        
        // Keywords e SEO (20 campos)
        "keywords": ["array"],
        "target_audience": ["array"],
        "market_keywords": ["array"],
        "search_intent_keywords": ["array"],
        "keyword_ids": ["array"],
        "seo_title_override": "string",
        "seo_description_override": "string",
        "canonical_url": "string",
        "slug": "string",
        
        // Conteúdo AI (15 campos)
        "benefits": ["array"],
        "features": ["array"],
        "sales_pitch": "string",
        "ai_generated_keywords": "boolean",
        "ai_generated_category": "boolean",
        "ai_generated_benefits": "boolean",
        "seo_enhanced": "boolean",
        
        // Especificações Técnicas (20 campos)
        "technical_specifications": [
          {
            "label": "string",
            "value": "string"
          }
        ],
        "faq": [
          {
            "question": "string",
            "answer": "string"
          }
        ],
        
        // Variações (10 campos)
        "variations": [
          {
            "name": "string",
            "values": ["array"]
          }
        ],
        "color": "string",
        "size": "string",
        "material": "string",
        
        // Dimensões e Peso (10 campos)
        "weight": "number",
        "height": "number",
        "width": "number",
        "depth": "number",
        "package_size": "string",
        
        // Estoque (10 campos)
        "stock_quantity": "number",
        "stock_managed": "boolean",
        "min_order_quantity": "number",
        "max_order_quantity": "number",
        "multiple_order_quantity": "number",
        "availability": "in stock | out of stock | preorder",
        
        // Status e Flags (10 campos)
        "active": "boolean",
        "featured": "boolean",
        "launch": "boolean",
        "promotion": "boolean",
        "showcase": "boolean",
        "approved": "boolean",
        "free_shipping": "boolean",
        
        // Vídeos (20 campos)
        "youtube_videos": [
          {
            "url": "string",
            "title": "string",
            "description": "string",
            "captions": "string",
            "analysis": {
              "keywords": ["array"],
              "sentiment": "string",
              "summary": "string"
            }
          }
        ],
        "instagram_videos": ["array"],
        "testimonial_videos": ["array"],
        "technical_videos": ["array"],
        "tiktok_videos": ["array"],
        "video_captions": { /* consolidated */ },
        
        // CTAs e Recursos (15 campos)
        "resource_cta1": {
          "label": "string",
          "url": "string",
          "visible": "boolean"
        },
        "resource_cta2": { /* same */ },
        "resource_cta3": { /* same */ },
        "offer_discount_cta": { /* same */ },
        "resource_descriptions": {
          "cta1": "string",
          "cta2": "string",
          "cta3": "string"
        },
        "show_in_resources": "boolean",
        "tutorial_resources": {
          "tutorials": [
            {
              "course_name": "string",
              "course_url": "string",
              "description": "string"
            }
          ]
        },
        
        // Conteúdo Gerado (20 campos)
        "individual_blog_content": {
          "technical": "string",
          "commercial": "string",
          "generated_at": "timestamp"
        },
        "whatsapp_messages": {
          "messages": ["array"],
          "last_generated": "timestamp"
        },
        "whatsapp_sequences": {
          "sequences": ["array"],
          "last_generated": "timestamp"
        },
        "youtube_descriptions": {
          "descriptions": ["array"],
          "last_generated": "timestamp"
        },
        "instagram_copies": {
          "copies": ["array"],
          "last_generated": "timestamp",
          "template_config": {}
        },
        "tiktok_content": {
          "copies": ["array"],
          "last_generated": "timestamp"
        },
        "bot_trigger_words": ["array"],
        
        // Google Merchant (15 campos)
        "gtin": "string",
        "mpn": "string",
        "brand": "string",
        "google_product_category": "string",
        "condition": "new | used | refurbished",
        "age_group": "adult | kids | toddler | infant | newborn",
        "gender": "male | female | unisex",
        
        // Fiscal (10 campos)
        "ean": "string",
        "ncm": "string",
        "tax_situation": "string",
        "fiscal_origin": "string",
        "fiscal_class": "string",
        
        // Logística (5 campos)
        "shipping_time": "string",
        "shipping_type": "string",
        
        // Origem e Seleção (5 campos)
        "source_type": "repository | landing_page",
        "source_landing_page_id": "string",
        "selected": "boolean",
        "use_in_ai_generation": "boolean",
        "display_order": "number",
        
        // Dados Originais
        "original_data": { /* JSONB */ },
        
        // Metadata
        "created_at": "timestamp",
        "updated_at": "timestamp"
      },
      
      // Relacionamentos
      "cs_messages": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "message_content": "string",
          "message_order": "number",
          "is_active": "boolean",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      
      "aftersales_messages": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "message_content": "string",
          "message_order": "number",
          "is_active": "boolean",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      
      "coupons": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "coupon_code": "string",
          "discount_percentage": "number",
          "allow_promotions": "boolean",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      
      "google_ads": [
        {
          "id": "uuid",
          "product_id": "uuid",
          "campaign_type": "landing_page | product",
          "config": { /* JSONB */ },
          "campaign_history": {
            "campaigns": ["array"],
            "last_generated": "timestamp"
          },
          "last_exported": "timestamp",
          "created_at": "timestamp",
          "updated_at": "timestamp"
        }
      ],
      
      "completion_score": {
        "id": "uuid",
        "entity_type": "product",
        "entity_id": "string",
        "completion_score": "number (0-100)",
        "completion_status": "critical | regular | good | complete",
        "score_details": {
          "basic_info": { "score": 0, "max": 15 },
          "seo_categories": { "score": 0, "max": 20 },
          "keywords_audience": { "score": 0, "max": 15 },
          "images_gallery": { "score": 0, "max": 15 },
          "technical_specs": { "score": 0, "max": 15 },
          "ai_content": { "score": 0, "max": 20 },
          "videos": { "score": 0, "max": 15 },
          "ctas_resources": { "score": 0, "max": 10 },
          "google_merchant": { "score": 0, "max": 10 }
        },
        "missing_fields": ["array"],
        "required_fields": ["array"],
        "last_calculated_at": "timestamp",
        "marked_complete": "boolean",
        "marked_complete_by": "uuid",
        "marked_complete_at": "timestamp",
        "created_at": "timestamp",
        "updated_at": "timestamp"
      }
    }
  ]
}
```

---

## 🚦 Rate Limits

### Limites Atuais

- **100 requisições por minuto** por API Key
- Contadores resetam a cada minuto
- Rate limit compartilhado entre todos os formatos

### Headers de Resposta

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2025-01-15T10:31:00Z
```

### Resposta ao Exceder Limite

**HTTP 429 Too Many Requests**

```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum 100 requests per minute",
  "reset_at": "2025-01-15T10:31:00Z"
}
```

---

## ❌ Códigos de Erro

| Código | Significado | Solução |
|--------|-------------|---------|
| `401` | Unauthorized | Verificar `x-api-key` header |
| `429` | Too Many Requests | Aguardar reset do rate limit |
| `500` | Internal Server Error | Contactar suporte |

### Exemplo de Erro 401

```json
{
  "error": "Invalid or missing API key",
  "message": "Please provide a valid x-api-key header"
}
```

---

## 💡 Exemplos de Uso

### 1. Obter Base Completa (JSON)

```bash
curl -X GET \
  -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base"
```

### 2. Treinar IA de Atendimento

```bash
curl -X GET \
  -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base?format=ai_training" \
  > knowledge_base.txt
```

### 3. Sincronizar com Sistema B

```bash
curl -X GET \
  -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base?format=system_b"
```

### 4. Obter Produtos de uma Categoria

```bash
curl -X GET \
  -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base?category=Odontologia&limit=100"
```

### 5. Paginação de Produtos

```bash
# Página 1 (produtos 1-50)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base?limit=50&offset=0"

# Página 2 (produtos 51-100)
curl -H "x-api-key: YOUR_API_KEY" \
  "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base?limit=50&offset=50"
```

### 6. JavaScript (Node.js)

```javascript
const fetch = require('node-fetch');

async function getKnowledgeBase() {
  const response = await fetch(
    'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
    {
      headers: {
        'x-api-key': process.env.KNOWLEDGE_BASE_API_KEY
      }
    }
  );
  
  const data = await response.json();
  console.log('Total campos:', data.total_fields);
  console.log('Produtos:', data.data.products.length);
}

getKnowledgeBase();
```

### 7. Python

```python
import requests
import os

def get_knowledge_base():
    response = requests.get(
        'https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/knowledge-base',
        headers={'x-api-key': os.environ['KNOWLEDGE_BASE_API_KEY']}
    )
    
    data = response.json()
    print(f"Total campos: {data['total_fields']}")
    print(f"Produtos: {len(data['data']['products'])}")

get_knowledge_base()
```

---

## 📝 JSON Schema

Schema completo disponível em: [KNOWLEDGE_BASE_FIELDS_REFERENCE.md](./KNOWLEDGE_BASE_FIELDS_REFERENCE.md)

---

## 📅 Changelog

### v1.0.0 (2025-01-15)
- ✅ Lançamento inicial
- ✅ 250+ campos documentados
- ✅ 3 formatos de saída (json, ai_training, system_b)
- ✅ Rate limiting (100 req/min)
- ✅ Autenticação via API Key
- ✅ Filtros por categoria
- ✅ Paginação de produtos
- ✅ Índices de performance

---

## 🆘 Suporte

Para dúvidas ou problemas:

1. Consulte [INTEGRATION_EXAMPLES.md](./INTEGRATION_EXAMPLES.md) para exemplos práticos
2. Consulte [KNOWLEDGE_BASE_FIELDS_REFERENCE.md](./KNOWLEDGE_BASE_FIELDS_REFERENCE.md) para referência de campos
3. Entre em contato com o administrador do sistema

---

**🚀 API Version:** 1.0.0  
**📅 Última Atualização:** 2025-01-15  
**📧 Suporte:** Via administrador do sistema
