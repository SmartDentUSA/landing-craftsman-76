

# Plano: Remover "noindex" de todos os geradores de HTML

## Diagnostico

Verifiquei o banco de dados: **todas as paginas ja publicadas estao limpas** (sem `noindex`). O problema esta nos geradores de codigo que aplicam `noindex, nofollow` quando o modo preview esta ativo. Isso faz com que o HTML exibido no editor mostre `noindex`, e se por algum motivo esse HTML for publicado sem reprocessamento, a pagina ficaria bloqueada para Google.

## Arquivos afetados (5 pontos de correcao)

### 1. `src/hooks/useSEOHTMLGenerator.ts` (linha 1446)
Remover condicional de preview no robots:
```
// DE:
<meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow'}">
${preview ? '' : `<link rel="canonical" href="${blogURL}">`}

// PARA:
<meta name="robots" content="index, follow">
<link rel="canonical" href="${blogURL}">
```

### 2. `supabase/functions/generate-spin-landing-page/generateHTML.ts` (linha 874)
```
// DE:
<meta name="robots" content="${preview ? 'noindex, nofollow' : 'index, follow'}">

// PARA:
<meta name="robots" content="index, follow">
```

### 3. `src/services/seo/blogHTMLGenerator.ts` (linha 467)
```
// DE:
robots: preview ? 'noindex, nofollow' : 'index, follow',

// PARA:
robots: 'index, follow',
```

### 4. `src/services/seo/blogHTMLGenerator.ts` (linha 461)
Tambem remover a condicional do canonical:
```
// DE:
canonicalUrl: preview ? '' : validatedCanonical,

// PARA:
canonicalUrl: validatedCanonical,
```

### 5. `src/lib/template-engine.ts` (linha 3628)
O fallback ja esta correto (`'index, follow'`), mas garantir que nenhuma LP salva com `meta_robots: 'noindex'` passe. Forcar override:
```
// Forcar SEMPRE index, follow independente do que o usuario configurou
meta_robots: 'index, follow',
```

### Arquivos NAO alterados (ja corretos)
- `publish-cloudflare-pages/index.ts` - nao tem noindex
- `publish-product-blog-cloudflare/index.ts` - ja usa `index, follow` fixo
- `WhatsAppMessageGenerator.tsx` e `TikTokContentGenerator.tsx` - sao previews internos de mensagens, nao paginas publicaveis

## Impacto

- Todo HTML gerado (preview ou producao) tera `index, follow`
- Canonical URL sempre presente
- Paginas ja publicadas nao precisam ser republicadas (ja estao limpas)
- Novas geracoes nunca mais terao `noindex`
