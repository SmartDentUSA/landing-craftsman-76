
# Duas Mudanças no Carrossel Estratégico

## 1 — Slide 6 (🛒 CTA): Trocar "Comprar Agora" por "Saiba Mais"

### Estado Atual
O Slide 6 exibe o botão CTA com o texto padrão **"🛒 Comprar Agora"** em dois lugares:
- **JSX** (linha 610): `const ctaButton = texts?.ctaButton || '🛒 Comprar Agora';`
- **Canvas** (linha 1232): `const ctaBtn = texts?.ctaButton || '🛒 Comprar Agora';`

E o link secundário com **"🔗 Link na Bio"**:
- **JSX** (linha 611): `const linkLabel = texts?.linkLabel || '🔗 Link na Bio';`
- **Canvas** (linha 1233): `const linkLbl = texts?.linkLabel || '🔗 Link na Bio';`

### O que Muda
| Campo | Antes | Depois |
|---|---|---|
| Botão CTA (JSX + Canvas) | `'🛒 Comprar Agora'` | `'💡 Saiba Mais'` |
| Link secundário (JSX + Canvas) | `'🔗 Link na Bio'` | `'🔗 Saiba Mais'` |

Alteração cirúrgica em **4 strings de fallback** (2 no JSX, 2 no canvas).

---

## 2 — Slide 4 (💫 Experiência): Usar Dados Mais Ricos do Produto

### Problema Atual
Com o painel agora ocupando 75% do card (muito espaço disponível), os dados que preenchem o slide são muito genéricos:

```typescript
// Atual — dados superficiais:
const benefit = texts?.benefit || productData.benefits?.[2] || productData.benefits?.[1] || 'Resultados excepcionais em cada uso';
const keyword = texts?.keyword || productData.features?.[0] || 'Excelência';
const label = texts?.label || 'Experiência';
```

- `keyword` usa apenas `features[0]` — geralmente um item técnico curto
- `benefit` usa `benefits[2]` ou `benefits[1]` — pode ser um benefício genérico
- `label` é apenas "Experiência" — sem contexto do produto

### O que Muda

Aproveitar o espaço adicional com dados mais ricos e específicos do produto:

```typescript
// Novo — usa sales_pitch, description e dados estratégicos:
const salesPitch = productData.sales_pitch || '';
const description = productData.description || '';
const name = productData.name || '';

// Keyword: nome do produto ou feature principal com mais contexto
const keyword = texts?.keyword 
  || productData.features?.[0] 
  || name 
  || 'Excelência';

// Label: contextualizar com a categoria ou "Experiência com [produto]"
const label = texts?.label 
  || (name ? `Experiência com ${name}` : 'Experiência')
  || 'Experiência';

// Benefit: sales_pitch é o campo mais rico — o diferencial real do produto
// Se não tiver, usar description truncada, depois benefits
const benefit = texts?.benefit 
  || salesPitch 
  || description.slice(0, 200) 
  || productData.benefits?.[0] 
  || productData.benefits?.[1] 
  || 'Resultados excepcionais em cada uso';
```

### Por que `sales_pitch`?
O `sales_pitch` é especificamente o campo onde o usuário descreve **o que o produto entrega de diferencial** — exatamente o que o slide Experiência deve comunicar. Já `description` serve como fallback rico se o pitch não existir.

### Ajuste de Font Size para Benefit
Com `sales_pitch` sendo potencialmente mais longo (pode ter 150-300 chars), os breakpoints de auto-sizing do `benefit` precisam de ajuste:

```typescript
// Atual:
const benefitFontSize = benefit.length > 120 ? 24 : benefit.length > 80 ? 28 : benefit.length > 60 ? 32 : 38;

// Novo (mais espaço, textos maiores):
const benefitFontSize = benefit.length > 200 ? 22 : benefit.length > 120 ? 26 : benefit.length > 80 ? 30 : benefit.length > 60 ? 34 : 38;
```

Isso garante que pitch mais longos ainda caibam de forma legível no painel de 75%.

---

## Arquivos a Modificar

| Arquivo | Linhas | Mudança |
|---|---|---|
| `src/components/StrategicCarouselPreview.tsx` | 510–518 | Dados do Slide 4 (JSX) |
| `src/components/StrategicCarouselPreview.tsx` | 610–611 | Strings CTA do Slide 6 (JSX) |
| `src/components/StrategicCarouselPreview.tsx` | 1232–1233 | Strings CTA do Slide 6 (Canvas) |

**1 arquivo, 3 seções pequenas.**
