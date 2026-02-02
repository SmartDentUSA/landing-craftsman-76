
# Plano: Implementar Hreflang Multi-Idioma em Todos os Geradores HTML

## Contexto do Problema

Atualmente, todos os geradores HTML apontam o `x-default` para a mesma URL em português, sem criar versões alternativas reais para outros idiomas. Isso prejudica o SEO internacional e não segue as melhores práticas do Google para sites multilíngue.

**Situação atual:**
```html
<link rel="alternate" hreflang="pt-BR" href="https://dentala.com.br/pagina">
<link rel="alternate" hreflang="x-default" href="https://dentala.com.br/pagina">
```

**Situação desejada:**
```html
<link rel="alternate" hreflang="pt-BR" href="https://dentala.com.br/pagina">
<link rel="alternate" hreflang="en-US" href="https://dentala.com.br/en/pagina">
<link rel="alternate" hreflang="es-ES" href="https://dentala.com.br/es/pagina">
<link rel="alternate" hreflang="x-default" href="https://dentala.com.br/pagina">
```

---

## Arquivos a Modificar

| Arquivo | Tipo | Prioridade |
|---------|------|------------|
| `supabase/functions/_shared/seo-fine-tuning.ts` | Helper centralizado (NOVO) | Alta |
| `supabase/functions/generate-spin-landing-page/generateHTML.ts` | SPIN LP | Alta |
| `supabase/functions/_shared/product-blog-html-v2.ts` | Blog V2 | Alta |
| `supabase/functions/clone-landing-page/index.ts` | LP Clone | Media |
| `supabase/functions/generate-ecommerce-html/index.ts` | E-commerce | Media |
| `supabase/functions/publish-blog-post/index.ts` | Blog Post | Media |
| `supabase/functions/_shared/mustache-template-engine.ts` | Templates | Media |
| `src/lib/template-engine.ts` | LP Frontend | Alta |

---

## Implementação

### Fase 1: Criar Helper Centralizado

**Arquivo:** `supabase/functions/_shared/seo-fine-tuning.ts`

Adicionar novas funções para geração de hreflang:

```typescript
// ============================================
// G. Hreflang Multi-Language Support
// ============================================
export interface HreflangConfig {
  defaultLang: 'pt-BR';
  supportedLangs: Array<'pt-BR' | 'en-US' | 'es-ES' | 'pt-PT'>;
  langPaths: Record<string, string>;
}

export const DEFAULT_HREFLANG_CONFIG: HreflangConfig = {
  defaultLang: 'pt-BR',
  supportedLangs: ['pt-BR', 'en-US', 'es-ES'],
  langPaths: {
    'pt-BR': '',      // Raiz (sem prefixo)
    'en-US': '/en',   // /en/slug
    'es-ES': '/es',   // /es/slug
    'pt-PT': '/pt'    // /pt/slug
  }
};

export interface HreflangTag {
  lang: string;
  url: string;
}

export function generateHreflangTags(
  canonicalUrl: string,
  config: Partial<HreflangConfig> = {}
): HreflangTag[] {
  const finalConfig = { ...DEFAULT_HREFLANG_CONFIG, ...config };
  const tags: HreflangTag[] = [];
  
  // Parse canonical URL
  const urlObj = new URL(canonicalUrl);
  const baseDomain = `${urlObj.protocol}//${urlObj.host}`;
  const pathname = urlObj.pathname;
  
  // Remove any existing language prefix from pathname
  const cleanPath = pathname.replace(/^\/(en|es|pt)\//, '/');
  
  // Generate tag for each supported language
  for (const lang of finalConfig.supportedLangs) {
    const langPath = finalConfig.langPaths[lang] || '';
    const langUrl = `${baseDomain}${langPath}${cleanPath}`;
    tags.push({ lang, url: langUrl });
  }
  
  // Add x-default pointing to default language
  const defaultPath = finalConfig.langPaths[finalConfig.defaultLang] || '';
  tags.push({ 
    lang: 'x-default', 
    url: `${baseDomain}${defaultPath}${cleanPath}` 
  });
  
  return tags;
}

export function generateHreflangHTML(
  canonicalUrl: string,
  config?: Partial<HreflangConfig>
): string {
  const tags = generateHreflangTags(canonicalUrl, config);
  
  return tags
    .map(tag => `<link rel="alternate" hreflang="${tag.lang}" href="${tag.url}">`)
    .join('\n  ');
}
```

---

### Fase 2: Atualizar SPIN Landing Page Generator

**Arquivo:** `supabase/functions/generate-spin-landing-page/generateHTML.ts`

**Localização:** Linhas 925-929

**De:**
```typescript
<!-- HREFLANG (Multi-domínio) -->
<link rel="alternate" hreflang="pt-BR" href="${escapeHtml(canonicalUrl)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">
${company?.usa_address ? `<link rel="alternate" hreflang="en-US" href="...">` : ''}
```

**Para:**
```typescript
<!-- HREFLANG (Multi-idioma Internacional) -->
${generateHreflangHTML(canonicalUrl)}
```

**Adicionar import:**
```typescript
import { generateHreflangHTML } from '../_shared/seo-fine-tuning.ts';
```

---

### Fase 3: Atualizar Product Blog HTML V2

**Arquivo:** `supabase/functions/_shared/product-blog-html-v2.ts`

**Localização:** Linhas 1453-1455

**De:**
```html
<link rel="alternate" hreflang="pt-BR" href="${canonicalUrl}">
<link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
```

**Para:**
```typescript
${generateHreflangHTML(canonicalUrl)}
```

---

### Fase 4: Atualizar Clone Landing Page

**Arquivo:** `supabase/functions/clone-landing-page/index.ts`

**Localização:** Linhas 1991-1992

**De:**
```html
<link rel="alternate" hreflang="pt-BR" href="${canonical}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
```

**Para:**
```typescript
${generateHreflangHTML(canonical)}
```

---

### Fase 5: Atualizar E-commerce HTML Generator

**Arquivo:** `supabase/functions/generate-ecommerce-html/index.ts`

Adicionar seção de hreflang após as meta tags (se ainda não existir):

```typescript
<!-- Hreflang Multi-idioma -->
${generateHreflangHTML(canonicalUrl)}
```

---

### Fase 6: Atualizar Template Engine (Frontend)

**Arquivo:** `src/lib/template-engine.ts`

**Localização:** Linhas 50-56

**De:**
```html
<!-- Hreflang Tags -->
<link rel="alternate" hreflang="pt-br" href="{{canonical_url}}">
<link rel="alternate" hreflang="x-default" href="{{canonical_url}}">
{{#hreflang}}
{{#lang}}
<link rel="alternate" hreflang="{{lang}}" href="{{url}}">
{{/lang}}
{{/hreflang}}
```

**Para:**
```html
<!-- Hreflang Tags (Multi-idioma) -->
{{#hreflang_tags}}
<link rel="alternate" hreflang="{{lang}}" href="{{url}}">
{{/hreflang_tags}}
```

**Adicionar lógica no processamento:**
```typescript
// Gerar hreflang tags automaticamente
if (processedData.canonical_url) {
  const baseUrl = processedData.canonical_url.split('/').slice(0, 3).join('/');
  const pathname = new URL(processedData.canonical_url).pathname;
  
  processedData.hreflang_tags = [
    { lang: 'pt-BR', url: processedData.canonical_url },
    { lang: 'en-US', url: `${baseUrl}/en${pathname}` },
    { lang: 'es-ES', url: `${baseUrl}/es${pathname}` },
    { lang: 'x-default', url: processedData.canonical_url }
  ];
}
```

---

## Resultado Final

Todas as páginas geradas terão hreflang tags completas:

```html
<!-- Hreflang Multi-idioma -->
<link rel="alternate" hreflang="pt-BR" href="https://dentala.com.br/scanner-3d">
<link rel="alternate" hreflang="en-US" href="https://dentala.com.br/en/scanner-3d">
<link rel="alternate" hreflang="es-ES" href="https://dentala.com.br/es/scanner-3d">
<link rel="alternate" hreflang="x-default" href="https://dentala.com.br/scanner-3d">
```

---

## Benefícios SEO

1. **Google Search Console** reconhecerá versões internacionais
2. **Indexação correta** por idioma/região
3. **Evita conteúdo duplicado** entre versões de idioma
4. **Preparação para expansão** (quando conteúdo traduzido for criado, URLs já existem)
5. **Conformidade com Google Guidelines** para sites multilíngue

---

## Nota Importante

As URLs geradas (ex: `/en/scanner-3d`) são **declarativas** - indicam ao Google que essas versões podem existir. A implementação real do conteúdo traduzido pode ser feita posteriormente:
- Via subdiretórios (`/en/`, `/es/`)
- Via subdomínios (`en.dentala.com.br`)
- Via domínios separados (`dentala.com` para inglês)

O importante é que a estrutura de hreflang esteja pronta desde agora.
