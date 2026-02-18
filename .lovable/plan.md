
# Fix: Botão "🤖 Gerar com IA" — Mapeamento Correto de Todos os Slides

## O Problema Central

O botão **🤖 Gerar com IA** chama a edge function `generate-instagram-carousel` que retorna 6 slides, cada um com `title`, `text` e `image_suggestion`. O mapeamento atual em `InstagramCopyGenerator.tsx` (linha 854–883) está **com erros estruturais** em 4 dos 6 slides:

```
Slide 1: hook = buildSmartHook() LOCAL — ignora o texto da IA do slide 1  ✅ (ok por design)
Slide 2: NÃO é mapeado da IA — mantém padrão do produto  ✅ (ok)
Slide 3: title = s[2]?.title  —  mas o CORPO (specs/bullets) de s[2]?.text é IGNORADO  ❌
Slide 4: label = s[3]?.image_suggestion  ❌  (sugestão de foto vira label do card!)
         keyword = s[3]?.title ✅
         benefit = s[3]?.text ✅
Slide 5: title = s[4]?.title ✅
         badge1/badge2/badge3 = NÃO mapeados da IA — ficam como padrão  ❌
Slide 6: ctaButton = s[5]?.text.split('\n')[0]  ❌  (corpo motivacional longo)
         linkLabel/footer = NÃO mapeados da IA  ❌
```

## Estratégia de Correção

A edge function retorna o campo `text` com o corpo real de cada slide. Precisamos:

1. **Slide 3**: Extrair do `text` da IA o título técnico (primeira linha) e usá-lo. O campo `title` do JSON da IA já vem correto como título do slide 3.

2. **Slide 4**: Remover completamente `s[3]?.image_suggestion` do mapeamento do `label`. O label deve ser sempre fixo como `'EXPERIÊNCIA / FLUXO'` ou vir de edição prévia do usuário.

3. **Slide 5**: Extrair os **badges** do `text` do slide 5, quebrando por `\n` e pegando as linhas como bullets/badges.

4. **Slide 6**: O `ctaButton` nunca deve vir do `text` do slide 6. Deve ser extraído do `title` do slide 6 (que é o rótulo da ação, ex: "CTA") — mas como esse título também é genérico ("CTA"), usar um valor inteligente extraído das **primeiras palavras do text** (máximo 50 chars) ou um default limpo (`'💡 Saiba Mais'`).

## Detalhamento das Correções

### Arquivo: `src/components/InstagramCopyGenerator.tsx`

#### Correção 1 — Slide 4: remover `image_suggestion` do `label` (linha 867)

```typescript
// DE:
label: s[3]?.image_suggestion || prevTexts[4]?.label || 'EXPERIÊNCIA',

// PARA:
label: prevTexts[4]?.label || 'EXPERIÊNCIA / FLUXO',
```

#### Correção 2 — Slide 5: mapear badges do `text` da IA (linhas 871–876)

O `text` do Slide 5 contém o corpo da autoridade Smart Dent — linhas separadas por `\n` que servem como badges. Extrair os 3 primeiros bullets:

```typescript
// Extrair badges do text do Slide 5 (quebrado por \n)
const slide5Lines = (s[4]?.text || '').split('\n').map((l: string) => l.replace(/^[-•*✅]\s*/, '').trim()).filter(Boolean);

5: {
  title: s[4]?.title || prevTexts[5]?.title || 'Tecnologia Smart Dent',
  badge1: slide5Lines[0] || prevTexts[5]?.badge1 || '',
  badge2: slide5Lines[1] || prevTexts[5]?.badge2 || '',
  badge3: slide5Lines[2] || prevTexts[5]?.badge3 || '',
},
```

#### Correção 3 — Slide 6: `ctaButton` com valor correto (linha 879)

O CTA do slide 6 deve ser uma frase curta de ação. A edge function coloca no `text` do slide 6 o corpo motivacional + chamada. A primeira frase curta (≤ 50 chars) ou um default limpo:

```typescript
// Extrair CTA limpo: pegar primeira linha do text do slide 6 que seja curta
const slide6Lines = (s[5]?.text || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
const ctaCandidate = slide6Lines.find((l: string) => l.length >= 5 && l.length <= 55);

6: {
  productName: prevTexts[6]?.productName || productName,
  ctaButton: (ctaCandidate && ctaCandidate.length <= 55) ? ctaCandidate : '💡 Saiba Mais',
  linkLabel: prevTexts[6]?.linkLabel || '🔗 Link na Bio',
  footer: prevTexts[6]?.footer || 'Direct para mais informações',
},
```

#### Correção 4 — Slide 1: usar o `text` da IA para o gancho quando existir

Atualmente o hook do Slide 1 ignora completamente o texto gerado pela IA e usa apenas o `buildSmartHook()` local (que extrai do `sales_pitch`). O usuário quer que a IA gere o texto de todos os slides. 

A edge function retorna `s[0]?.text` que é exatamente o gancho/afirmação de impacto gerado pela IA com base na metodologia Smart Dent. Devemos usar esse texto quando disponível:

```typescript
// DE:
hook: buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch),

// PARA: priorizar gancho da IA, fallback para buildSmartHook
const aiHook = s[0]?.text?.split('\n')[0]?.trim();
hook: (aiHook && aiHook.length >= 10 && aiHook.length <= 120) ? aiHook : buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch),
```

## Também: Edge Function — adicionar campo `cta_label` no Slide 6

Para dar ao frontend um campo explícito de label do botão (sem depender de parsear `text`), adicionar no prompt da edge function:

```json
{ "position": 6, "title": "CTA", "text": "...", "cta_label": "...", "image_suggestion": "..." }
```

E no sistema prompt, instruir: `cta_label deve ter no máximo 6 palavras, é o texto do botão CTA (ex: 'Conheça no Link da Bio', 'Acesse pelo Link', 'Saiba Mais')`.

No frontend, usar `s[5]?.cta_label` como primeira opção para `ctaButton`.

## Resumo das Mudanças

| Arquivo | Mudança | Linha |
|---|---|---|
| `InstagramCopyGenerator.tsx` | Slide 1: usar `s[0]?.text` da IA como hook quando disponível | ~860 |
| `InstagramCopyGenerator.tsx` | Slide 4: remover `image_suggestion` do label | ~867 |
| `InstagramCopyGenerator.tsx` | Slide 5: extrair badges do `text` do slide 5 | ~871–876 |
| `InstagramCopyGenerator.tsx` | Slide 6: ctaButton via `cta_label` ou primeira linha curta do text | ~879 |
| `supabase/functions/generate-instagram-carousel/index.ts` | Adicionar campo `cta_label` no schema do Slide 6 e no prompt | ~128–137 |

**2 arquivos, 5 mudanças. Resultado: todos os 6 slides populados corretamente pela IA.**

## Antes / Depois

| Slide | Campo | Antes (bugado) | Depois (correto) |
|---|---|---|---|
| Slide 1 | hook | `buildSmartHook()` local (ignora IA) | Texto da IA, fallback para `buildSmartHook()` |
| Slide 4 | label | `"IMAGEM DAS MÃOS DE..."` (image_suggestion) | `"EXPERIÊNCIA / FLUXO"` (fixo) |
| Slide 5 | badge1/2/3 | vazio ou valor padrão (ignora IA) | Bullets extraídos do `text` do slide 5 |
| Slide 6 | ctaButton | `"Elimine o risco de retrabalho..."` (corpo longo) | `cta_label` da IA ou primeira linha curta ≤ 55 chars |
