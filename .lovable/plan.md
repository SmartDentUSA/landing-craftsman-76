

# Plano: Corrigir Export HTML5 para Google Ads (Imagens Locais + ZIP)

## Problema

O Google Ads **rejeita** banners HTML5 que referenciam imagens externas (`<img src="https://...">`). Todas as imagens devem estar **dentro do arquivo ZIP** e referenciadas com caminhos locais (`<img src="product.jpg">`).

## Solucao

Alterar o sistema de export para gerar **um ZIP por banner** (ou ZIP unico com todos), contendo:

```text
banner-300x250/
  index.html          <-- referencia "product.jpg" (local)
  product.jpg          <-- imagem real baixada
  logo.png             <-- (se houver)
```

## Alteracoes

### 1. Instalar dependencia: `jszip`

Biblioteca leve para criar arquivos ZIP no navegador.

### 2. Alterar `src/components/google-ads/display-templates.ts`

- A funcao `generateBannerHTML` passa a referenciar imagens com caminho local:
  - `<img src="product.jpg">` em vez de `<img src="https://cdn.exemplo.com/foto.jpg">`
  - `<img src="logo.png">` em vez de URL externa
- Os parametros `productImageUrl` e `logoUrl` continuam sendo recebidos, mas sao usados apenas para nomear os arquivos no ZIP

### 3. Alterar `src/components/google-ads/DisplayBannerGenerator.tsx`

- `handleDownload` passa a gerar um **ZIP** contendo:
  1. Busca a imagem do produto via `fetch()` e converte para blob
  2. Cria o ZIP com `index.html` + `product.jpg` (+ `logo.png` se aplicavel)
  3. Faz download do `.zip`
- `handleDownloadAll` gera um **ZIP unico** com subpastas por formato:
  ```text
  display-banners/
    300x250/index.html + product.jpg
    728x90/index.html + product.jpg
    320x50/index.html + product.jpg
    ...
  ```
- Adicionar state `isDownloading` com progresso visual

### 4. Alterar `supabase/functions/generate-display-banners/index.ts`

- O HTML gerado pela edge function tambem deve usar caminhos locais (`product.jpg`) em vez de URLs externas

## Secao Tecnica

### Logica do download individual

```text
async handleDownload(banner):
  1. fetch(selectedImage) -> imageBlob
  2. zip = new JSZip()
  3. zip.file("product.jpg", imageBlob)
  4. html = banner.html  // ja com src="product.jpg"
  5. zip.file("index.html", html)
  6. zipBlob = await zip.generateAsync({type: "blob"})
  7. download como "banner-300x250.zip"
```

### Logica do download todos

```text
async handleDownloadAll():
  1. fetch(selectedImage) -> imageBlob (uma vez so)
  2. zip = new JSZip()
  3. for each banner:
     folder = zip.folder("300x250")
     folder.file("index.html", banner.html)
     folder.file("product.jpg", imageBlob)
  4. download como "display-banners-all.zip"
```

### Template HTML alterado (trecho chave)

Antes: `<img src="${productImageUrl}">`
Depois: `<img src="product.jpg">`

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/google-ads/display-templates.ts` | Imagens locais ("product.jpg") no HTML |
| `src/components/google-ads/DisplayBannerGenerator.tsx` | Download como ZIP com imagem embutida |
| `supabase/functions/generate-display-banners/index.ts` | Imagens locais no HTML gerado |
| `package.json` | Adicionar `jszip` |

