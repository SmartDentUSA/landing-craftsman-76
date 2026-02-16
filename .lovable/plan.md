

# Plano: Aba "Display" com Foto do Produto nos Banners HTML5

## Resumo

Adicionar a aba **"Display"** dentro do `GoogleAdsProductTab` (criador de campanha do produto). Os banners HTML5 gerados usarao **obrigatoriamente a foto real do produto** como elemento central -- nunca imagens geradas por IA.

## Onde fica

```text
Card do Produto -> Botao Google Ads -> ProductGoogleAdsModal
  -> GoogleAdsProductTab (Tabs: 4 -> 5 abas)
    -> Configuracoes | Videos | Preview | UTM | Display (NOVA)
```

## Como a foto do produto entra

O produto ja possui `image_url` e `images_gallery` (array de fotos). O `DisplayBannerGenerator` vai:

1. Carregar todas as fotos do produto da galeria (`images_gallery`) + `image_url` como fallback
2. Permitir ao usuario escolher qual foto usar no banner (seletor visual com thumbnails)
3. A foto escolhida e inserida como `<img>` real no HTML5 (URL direta, sem reprocessamento por IA)
4. A IA (Gemini Flash) gera apenas os **textos** (headline, descricao curta, CTA) otimizados para cada tamanho

Resultado: produto 100% real, texto otimizado por IA, layout profissional via template CSS.

## Alteracoes na interface Product

A interface `Product` no `GoogleAdsProductTab` precisa incluir os campos de imagem:

```text
interface Product {
  ...campos existentes...
  image_url?: string;         // foto principal
  images_gallery?: Array<{ url: string; alt?: string }>;  // galeria completa
}
```

O `ProductGoogleAdsModal` ja recebe o produto do `ModernProductCard`, que ja possui esses campos.

---

## Implementacao

### 1. Alteracao: `GoogleAdsProductTab.tsx`

- Adicionar `image_url` e `images_gallery` ao interface `Product` (linhas 25-42)
- Mudar `grid-cols-4` para `grid-cols-5` no TabsList (linha 377)
- Adicionar `<TabsTrigger value="display">Display</TabsTrigger>`
- Adicionar `<TabsContent value="display">` com `<DisplayBannerGenerator product={product} />`

### 2. Alteracao: `ProductGoogleAdsModal.tsx`

- Adicionar `image_url` e `images_gallery` ao interface `Product` local

### 3. Novo: `src/components/google-ads/display-templates.ts`

4 templates HTML5/CSS com placeholder para foto do produto:

| Template | Estilo |
|----------|--------|
| Moderno | Gradiente + foto com overlay + CTA animado |
| Minimalista | Fundo branco + foto centralizada + texto limpo |
| Bold | Cores vibrantes + foto grande + CTA chamativo |
| Clinico | Azul/branco + foto profissional + confianca |

Cada template tem a foto do produto como **elemento obrigatorio e central**, adaptando layout por orientacao (horizontal, vertical, quadrado).

### 4. Novo: `src/components/google-ads/DisplayBannerGenerator.tsx`

- **Seletor de foto**: Grid de thumbnails das fotos do produto (da `images_gallery`), usuario clica para escolher qual usar
- **Seletor de formatos**: Checkboxes agrupados (Populares, Mobile, Horizontal, Vertical) com "Selecionar Todos"
- **Seletor de estilo**: 4 cards visuais clicaveis
- **Color picker**: Cor primaria/secundaria (pre-populado)
- **CTA editavel**: Campo de texto (default "Saiba Mais")
- **Botao "Gerar Banners"**: Chama edge function
- **Grid de previews**: Iframes em escala com badge de formato e peso (KB)
- **Download**: Individual (.html) ou ZIP de todos

### 5. Novo: `src/components/google-ads/DisplayBannerPreview.tsx`

Card individual por banner: iframe em escala, badge formato, peso KB, botoes download/regenerar.

### 6. Novo: `supabase/functions/generate-display-banners/index.ts`

- Recebe: dados do produto + foto URL + estilo + formatos + cores + CTA
- IA gera copys otimizados por tamanho (headline curto para mobile, longo para billboard)
- Template engine monta HTML5 com a **foto real do produto via URL** (nao base64, nao IA)
- Valida peso < 150KB
- Retorna array de `{ format, width, height, html }`

### 7. Alteracao: `src/types/google-ads.ts`

Adicionar tipos: `DisplayFormat`, `DisplayStyle`, `DisplayBanner`, `DisplayBannerConfig`.

### 8. Alteracao: `supabase/config.toml`

Registrar `[functions.generate-display-banners]` com `verify_jwt = false`.

---

## Formatos suportados (16 formatos Google Display)

| Formato | Nome | Categoria |
|---------|------|-----------|
| 300x250 | Medium Rectangle | Popular |
| 336x280 | Large Rectangle | Popular |
| 728x90 | Leaderboard | Horizontal |
| 970x90 | Large Leaderboard | Horizontal |
| 970x250 | Billboard | Horizontal |
| 468x60 | Banner | Horizontal |
| 320x50 | Mobile Leaderboard | Mobile |
| 320x100 | Large Mobile Banner | Mobile |
| 300x50 | Mobile Banner | Mobile |
| 160x600 | Wide Skyscraper | Vertical |
| 120x600 | Skyscraper | Vertical |
| 300x600 | Half Page | Vertical |
| 250x250 | Square | Quadrado |
| 200x200 | Small Square | Quadrado |
| 480x320 | Mobile Interstitial | Mobile |
| 320x480 | Mobile Interstitial Vertical | Mobile |

## Ponto chave: foto real, nao IA

A foto do produto e **sempre real** (URL da galeria). A IA so gera texto. Isso garante:
- Zero artefatos visuais
- Produto identico ao real
- Confianca do usuario no banner
- Compliance com politicas Google Ads (sem conteudo enganoso)

