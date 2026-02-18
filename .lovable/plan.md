
# Slide 4 (Experiência): Corrigir Texto Pequeno e Sincronizar Canvas

## Diagnóstico dos Problemas

### Problema 1 — Multiplicadores de redução no JSX (linhas 556–558)
Os font sizes calculados dinamicamente são REDUZIDOS por fatores `* 0.75` e `* 0.7`:

```tsx
// Linha 556 — label:
fontSize: labelFontSize * 0.75  // Reduz de 24–34px para 18–25px

// Linha 557 — keyword:
fontSize: kwFontSize * 0.7       // Reduz de 44–90px para 30–63px

// Linha 558 — benefit:
fontSize: benefitFontSize * 0.7  // Reduz de 22–38px para 15–26px
```

Esses multiplicadores foram herdados de quando o painel era 25% do card. Agora que o painel é 75%, não fazem sentido — as fontes calculadas já estão calibradas para o tamanho correto.

**Solução**: Remover os multiplicadores e usar os font sizes diretamente.

### Problema 2 — Canvas não usa `salesPitch` (linha 1101)
O JSX usa `salesPitch` como principal fonte de texto rico, mas o canvas ainda usa `benefits[1]` como fallback:

```typescript
// Canvas linha 1101 — DESATUALIZADO:
const benefit = texts?.benefit || benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso';

// JSX linha 512 — CORRETO:
const benefit = texts?.benefit || salesPitch || productData.benefits?.[0] || ...
```

**Solução**: Sincronizar o canvas para usar `salesPitch` também.

### Problema 3 — Label com `whiteSpace: 'nowrap'` e `textOverflow: 'ellipsis'` (linha 556)
O label `"Experiência com [Nome do Produto]"` é cortado com `...` porque `whiteSpace: 'nowrap'` impede a quebra de linha.

**Solução**: Permitir quebra de linha no label.

## Mudanças Técnicas

### JSX — `Slide4Experience` (linhas 556–558)

**Antes:**
```tsx
<p style={{ fontSize: labelFontSize * 0.75, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{label}</p>
<h2 style={{ fontSize: kwFontSize * 0.7 }}>{keyword}</h2>
<p style={{ fontSize: benefitFontSize * 0.7 }}>{benefit}</p>
```

**Depois** (remover multiplicadores + habilitar quebra de linha no label):
```tsx
<p style={{ fontSize: labelFontSize }}>{label}</p>
<h2 style={{ fontSize: kwFontSize }}>{keyword}</h2>
<p style={{ fontSize: benefitFontSize }}>{benefit}</p>
```

O painel de 75% tem espaço mais que suficiente para exibir os textos com os font sizes originalmente calculados.

### Canvas — Slide 4 (linha 1095–1102)

Sincronizar o `benefit` e `label` do canvas com a mesma lógica do JSX:

**Antes (linha 1100–1102):**
```typescript
const keyword = texts?.keyword || features[0] || 'Excelência';
const benefit = texts?.benefit || benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso';
const label4 = texts?.label || 'EXPERIÊNCIA';
```

**Depois:**
```typescript
const salesPitch4 = productData.salesPitch || '';
const name4 = productData.name || '';
const keyword = texts?.keyword || features[0] || name4 || 'Excelência';
const benefit = texts?.benefit || salesPitch4 || benefits[0] || benefits[1] || 'Resultados excepcionais em cada uso';
const label4 = texts?.label || (name4 ? `Experiência com ${name4}` : 'Experiência');
```

### Canvas — Ajuste de Font Size do Benefit (linha 1147)

O benefit agora pode conter o `salesPitch` completo (150–300 chars). Ajustar o font size do canvas para acomodar textos mais longos:

**Antes:**
```typescript
ctx.font = '400 36px system-ui';
```

**Depois (font size dinâmico baseado no comprimento):**
```typescript
const benFontSizeCanvas = benefit.length > 200 ? 28 : benefit.length > 120 ? 32 : 36;
ctx.font = `400 ${benFontSizeCanvas}px system-ui, -apple-system, sans-serif`;
// Linha height acompanha
const benLineH4 = benFontSizeCanvas * 1.45;
```

E nas linhas 1155 e 1177, usar `benLineH4` em vez do valor fixo `52`.

## Resumo das Mudanças

| Arquivo | Linhas | Mudança |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 556–558 | Remover `* 0.75` e `* 0.7`, remover `whiteSpace: 'nowrap'` do label |
| `src/components/StrategicCarouselPreview.tsx` | 1100–1102 | Sincronizar dados (salesPitch + nome dinâmico) no canvas |
| `src/components/StrategicCarouselPreview.tsx` | 1147–1155 | Font size dinâmico para benefit no canvas |
| `src/components/StrategicCarouselPreview.tsx` | 1177 | Usar `benLineH4` em vez de `52` fixo |

**1 arquivo, 4 seções cirúrgicas.**
