

# Filtrar apenas videos tecnicos na secao "Veja como funciona na pratica"

## O que sera feito

Alteracao simples: na secao "Veja como funciona na pratica", filtrar `productVideos` para exibir **apenas** os videos com `type === 'technical'`. O layout e os cards continuam exatamente como estao hoje, sem mudancas visuais.

## Alteracao

### Arquivo: `supabase/functions/generate-spin-landing-page/generateHTML.ts` (~linha 2844)

Adicionar uma linha de filtro logo apos obter o array de videos:

**Antes:**
```
const productVideos = aiContent?.productVideos || [];
if (productVideos.length === 0) return '';
```

**Depois:**
```
const allProductVideos = aiContent?.productVideos || [];
const productVideos = allProductVideos.filter((v: any) => v.type === 'technical');
if (productVideos.length === 0) return '';
```

Isso remove youtube, instagram, testimonial e tiktok da secao, mantendo apenas os videos tecnicos. Todo o restante (cards, thumbnails, badges, grid) permanece identico.

### Deploy

Re-deploy da edge function `generate-spin-landing-page`.

