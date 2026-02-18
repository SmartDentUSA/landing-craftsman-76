
# Fix: Imagens do Produto não Aparecem nos Banners HTML5 Display

## Diagnóstico Raiz

O HTML gerado para os banners usa `src="product.jpg"` — um caminho relativo que assume que o arquivo físico `product.jpg` existe na mesma pasta. Isso gera **dois cenários de falha**:

### Falha 1 — Preview no browser (iframe + modo "Ampliar")
- O iframe recebe o HTML via `doc.write(html)` com `sandbox="allow-same-origin"` mas **sem acesso a arquivos externos** (a URL da imagem do produto está em outro domínio — Supabase Storage ou Cloudflare).
- O modo "Ampliar" usa `dangerouslySetInnerHTML` que renderiza inline na página, onde `product.jpg` simplesmente não existe.

### Falha 2 — ZIP exportado (secundário)
- O ZIP correto inclui `product.jpg` junto com `index.html` — isso funciona para o Google Ads. Mas o preview **antes** de baixar já está quebrado.

## Solução: Embed da Imagem como Base64 no HTML

A correção definitiva é **converter a imagem do produto para Base64 e embuti-la diretamente no `src` da tag `<img>`** no HTML gerado. Assim o HTML é completamente autônomo — funciona no preview do iframe, no modo "Ampliar" e no ZIP exportado.

```
<img class="pi" src="data:image/jpeg;base64,/9j/4AAQ..." alt="Produto">
```

### Por que Base64 é a abordagem correta aqui:
- O Google Ads permite HTML5 ads autônomos com Base64
- O limite de 150KB do Google Ads se aplica ao arquivo descomprimido — com Base64 o HTML ficará maior mas ainda dentro do limite para maioria dos formatos
- Elimina dependência de arquivos externos em 100% dos contextos (preview, fullscreen, ZIP)

## Mudanças por Arquivo

### 1. `src/components/google-ads/DisplayBannerGenerator.tsx`
**Onde:** Função `handleGenerate` (linha 75)

Antes de gerar os banners, converter `selectedImage` para Base64 uma única vez:

```typescript
// Converter imagem para base64 antes de gerar
const imageBase64 = await imageUrlToBase64(selectedImage);

// Usar imageBase64 em vez de selectedImage no generateBannerHTML local
const html = generateBannerHTML({
  ...
  productImageUrl: imageBase64,  // ← base64, não URL
  ...
});
```

Adicionar helper function:
```typescript
const imageUrlToBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
```

**Também:** No `handleGenerate`, enviar o Base64 para a edge function via `productImageBase64` (além ou em vez de `productImageUrl`).

**Também:** No `handleDownload` e `handleDownloadAll`, como o HTML já tem a imagem embutida, **não é mais necessário** fetchear a imagem e adicioná-la ao ZIP separadamente — simplificando o export.

### 2. `supabase/functions/generate-display-banners/index.ts`
**Onde:** Função `generateHTML` (linha 166) e o corpo do `serve`

Aceitar `productImageBase64` como campo adicional no body. Quando disponível, usar o Base64 diretamente no `src` da imagem em vez de `"product.jpg"`:

```typescript
const { productImageUrl, productImageBase64, ... } = await req.json();
const imgSrc = productImageBase64 || productImageUrl || 'product.jpg';

// Na generateHTML:
<img class="pi" src="${imgSrc}" alt="Produto">
```

### 3. `src/components/google-ads/DisplayBannerPreview.tsx`
**Onde:** Dialog "Ampliar" (linha 74-78)

O modo "Ampliar" usa `dangerouslySetInnerHTML` que quebra o HTML do banner (estilos, scripts, estrutura). Corrigir para usar um `<iframe>` separado — idêntico ao preview normal — em vez de inserir o HTML inline:

```tsx
<Dialog open={fullscreen} onOpenChange={setFullscreen}>
  <DialogContent className="max-w-fit max-h-[90vh] overflow-auto">
    <DialogTitle>{format.name} — {format.width}×{format.height}</DialogTitle>
    <FullscreenIframe html={html} width={format.width} height={format.height} />
  </DialogContent>
</Dialog>
```

Onde `FullscreenIframe` é um componente com `useEffect` + `doc.write` igual ao preview normal.

### 4. `src/components/google-ads/display-templates.ts` (fallback local)
O `generateBannerHTML` no frontend também usa `src="product.jpg"`. Como o gerador agora vai passar o Base64, a função já receberá o dado correto em `productImageUrl` — sem mudança de assinatura necessária.

## Fluxo Corrigido

```
Usuário clica "Gerar Banners"
  ↓
Frontend converte selectedImage → Base64 (uma vez)
  ↓
  ├── Envia Base64 para edge function → HTML com <img src="data:...">
  └── Fallback local → generateBannerHTML com Base64
  ↓
DisplayBannerPreview recebe HTML com Base64 embutido
  ├── Preview iframe: imagem aparece ✅
  └── Modo Ampliar (iframe fixado): imagem aparece ✅
  ↓
Download ZIP: HTML já é autônomo → não precisa adicionar product.jpg ✅
```

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/google-ads/DisplayBannerGenerator.tsx` | Converter imagem para Base64 antes de gerar; simplificar download ZIP |
| `supabase/functions/generate-display-banners/index.ts` | Aceitar `productImageBase64`; usar no `<img src>` |
| `src/components/google-ads/DisplayBannerPreview.tsx` | Substituir `dangerouslySetInnerHTML` por iframe no modo "Ampliar" |

**3 arquivos. Resultado: imagens aparecem no preview, no fullscreen e no ZIP exportado.**

## Impacto no Tamanho do HTML

Uma imagem JPEG de produto típica de ~200KB vira ~267KB em Base64 (+33%). Para formatos grandes isso pode ultrapassar os 150KB do Google Ads. Estratégia: para o preview, usar Base64; para o download do ZIP, continuar com `product.jpg` como referência local (comportamento atual do ZIP já estava correto, só o preview estava quebrado).

Isso significa que para o **ZIP de download**, o `handleDownload`/`handleDownloadAll` podem gerar o HTML com `src="product.jpg"` (sem Base64) e adicionar o arquivo da imagem — que é exatamente o que já fazem. Só o preview precisa do Base64.

Portanto a mudança de Base64 fica restrita a: **na geração do preview** (o HTML armazenado em `banners` state). Para o download, o HTML já é re-gerado ou a imagem continua sendo adicionada ao ZIP.

## Implementação Simplificada

Para evitar complexidade duplicada (HTML com Base64 para preview vs. HTML com `product.jpg` para ZIP), a solução mais limpa é:

1. Gerar banners normalmente com `productImageUrl` (URL real) para enviar à edge function
2. Após receber o HTML, fazer um replace client-side: `html.replace('product.jpg', base64String)` antes de armazenar no state
3. No download, usar o HTML com `product.jpg` + adicionar o arquivo da imagem ao ZIP (comportamento atual preservado)

Isso isola a mudança ao mínimo e manteia os ZIPs dentro do limite de 150KB.
