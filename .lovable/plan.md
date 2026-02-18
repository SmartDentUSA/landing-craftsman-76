
# Reduzir Fonte e Remover Bold do Slide 1

## Localização Exata

**Arquivo:** `src/components/StrategicCarouselPreview.tsx`

### JSX — Linha 346
O texto do hook (gancho principal) do Slide 1:
```tsx
// ANTES:
<p style={{ color: textColor, fontWeight: 900, fontSize: 80, lineHeight: 1.1, margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>{hook}</p>

// DEPOIS:
<p style={{ color: textColor, fontWeight: 400, fontSize: 58, lineHeight: 1.2, margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>{hook}</p>
```
- `fontWeight: 900` → `fontWeight: 400` (sem bold — peso normal)
- `fontSize: 80` → `fontSize: 58` (fonte menor, mais elegante)
- `lineHeight: 1.1` → `lineHeight: 1.2` (um pouco mais de espaçamento para compensar o peso menor)

### Canvas Export — Linhas ~835-842
O canvas do PNG exportado também precisa ser atualizado para manter consistência com o preview:
```ts
// ANTES:
ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';

// DEPOIS:
ctx.font = '400 58px system-ui, -apple-system, sans-serif';
```

## Mudanças Resumidas

| Propriedade | Antes | Depois |
|------------|-------|--------|
| `fontWeight` (JSX) | `900` (extra-bold) | `400` (normal) |
| `fontSize` (JSX) | `80px` | `58px` |
| `font` (Canvas) | `bold 80px` | `400 58px` |

## Arquivo a Modificar
**`src/components/StrategicCarouselPreview.tsx`** — 2 pontos cirúrgicos (linha 346 no JSX e ~linha 835 no canvas).
