# Geradores de Blog de Produto - Documentação Técnica

## Visão Geral

Os blogs de produto são gerados em duas etapas principais:
1. **Geração de Conteúdo (IA)** - Cria o texto markdown usando AI
2. **Publicação (HTML)** - Converte markdown para HTML estilizado e publica

---

## 1. Geração de Conteúdo com IA

### Arquivo Principal
`supabase/functions/generate-product-blog/index.ts`

### Função
Gera conteúdo de blog em markdown usando a API do Anthropic (Claude).

### Tipos de Blog
- **Blog Comercial** (`commercial`) - Foco em vendas e conversão
- **Blog Técnico** (`technical`) - Foco em especificações e detalhes técnicos

### Fluxo de Dados
```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  products_repository │ ──> │ generate-product-   │ ──> │  individual_blog_   │
│  (dados do produto) │     │ blog (Edge Function)│     │  content (JSON)     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │ prompts_configuration│
                            │ (prompts customizados)│
                            └─────────────────────┘
```

### Prompt Customizável
Os prompts são buscados da tabela `prompts_configuration`:

```sql
SELECT * FROM prompts_configuration 
WHERE edge_function_id = 'generate-product-blog'
  AND prompt_name IN ('Blog Comercial', 'Blog Técnico');
```

### Estrutura do Prompt (Fallback)
- **Blog Comercial**: Headlines impactantes, CTAs persuasivos, benefícios, casos de sucesso
- **Blog Técnico**: Especificações detalhadas, comparativos, dados clínicos, FAQ técnico

---

## 2. Publicação HTML

### Arquivo Principal
`supabase/functions/publish-product-blog-cloudflare/index.ts`

### Função `generateProductBlogHTML()`
Localização: Linhas 380-1829

### Estrutura do HTML Gerado

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <!-- Meta tags SEO -->
  <!-- Schema.org JSON-LD -->
  <!-- CSS Inline -->
</head>
<body>
  <!-- Header com navegação -->
  <header class="blog-header">...</header>
  
  <!-- Hero Section -->
  <section class="blog-hero">...</section>
  
  <!-- Trust Bar (KOL + Reviews) -->
  <section class="trust-bar">...</section>
  
  <!-- E-E-A-T Cards -->
  <section class="eeat-cards">...</section>
  
  <!-- Conteúdo Principal do Blog -->
  <article class="blog-content">...</article>
  
  <!-- Especificações Técnicas -->
  <section class="tech-specs">...</section>
  
  <!-- FAQ Accordion -->
  <section class="faq-section">...</section>
  
  <!-- Vídeos Relacionados -->
  <section class="videos-section">...</section>
  
  <!-- CTA Final -->
  <section class="blog-cta">...</section>
  
  <!-- Footer -->
  <footer>...</footer>
</body>
</html>
```

---

## 3. Tabela de Configuração de Prompts

### `prompts_configuration`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `edge_function_id` | TEXT | Nome da edge function (`generate-product-blog`) |
| `prompt_name` | TEXT | Nome do prompt (`Blog Comercial`, `Blog Técnico`) |
| `custom_prompt` | TEXT | Prompt customizado para a IA |
| `selected_data_sources` | JSON | Fontes de dados a incluir |
| `selected_fields` | JSON | Campos específicos do produto |
| `style_guidelines` | JSON | Diretrizes de estilo |
| `tone` | TEXT | Tom da escrita (técnico, comercial) |
| `is_active` | BOOLEAN | Se o prompt está ativo |

---

## 4. Componentes Frontend Relacionados

### Geração de Blog Individual
- `src/components/ProductBlogGeneratorModal.tsx` - Modal para gerar blog
- `src/components/ProductBlogCuratorPanel.tsx` - Curadoria de blogs
- `src/components/ProductBlogPublisherPanel.tsx` - Publicação

### Visualização
- `src/components/BlogPreview.tsx` - Preview do blog
- `src/components/ConsolidatedBlogViewer.tsx` - Visualização consolidada

### Hooks
- `src/hooks/useProductBlogsIntegration.ts` - Integração com blogs

---

## 5. Fluxo Completo

```
Usuário seleciona produto
        │
        ▼
[ProductBlogGeneratorModal]
        │
        ▼ (chama edge function)
[generate-product-blog]
        │
        ├──> Busca prompt em prompts_configuration
        ├──> Coleta dados do produto
        ├──> Envia para Claude AI
        │
        ▼
Salva em products_repository.individual_blog_content
        │
        ▼
[ProductBlogPublisherPanel]
        │
        ▼ (chama edge function)
[publish-product-blog-cloudflare]
        │
        ├──> Gera HTML completo (generateProductBlogHTML)
        ├──> Publica no Cloudflare Pages
        │
        ▼
Salva URL em product_blog_publications
```

---

## 6. Customização de Prompts

Para personalizar os prompts, edite na tabela `prompts_configuration`:

```sql
UPDATE prompts_configuration 
SET custom_prompt = 'Seu novo prompt aqui...',
    style_guidelines = '{"tone": "profissional", "length": "2000-3000 palavras"}'::jsonb
WHERE edge_function_id = 'generate-product-blog'
  AND prompt_name = 'Blog Comercial';
```

---

## 7. Variáveis Disponíveis no Prompt

O prompt pode usar estas variáveis (substituídas automaticamente):

| Variável | Descrição |
|----------|-----------|
| `{{product_name}}` | Nome do produto |
| `{{product_description}}` | Descrição completa |
| `{{product_benefits}}` | Lista de benefícios |
| `{{product_features}}` | Características técnicas |
| `{{product_faq}}` | Perguntas frequentes |
| `{{product_keywords}}` | Palavras-chave SEO |
| `{{company_name}}` | Nome da empresa |
| `{{target_audience}}` | Público-alvo |

---

## Última Atualização
2025-12-10
