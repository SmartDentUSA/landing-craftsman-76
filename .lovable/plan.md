
# Remover Preço dos Slides do Carrossel Visual

## O que será alterado

O preço aparece **apenas no Slide 2 (Apresentação/Solução)** em dois lugares dentro de `src/components/StrategicCarouselPreview.tsx`:

### Trecho 1 — Preview visual (linha 215-220)
Remover o bloco condicional de preço do componente `Slide2Solution`:
```text
{/* Price */}
{priceFormatted && (
  <div style={{ marginTop: 30, display: 'inline-block', background: accentColor, color: textOnAccent, borderRadius: 16, padding: '20px 60px', fontSize: 56, fontWeight: 900 }}>
    {priceFormatted}
  </div>
)}
```

### Trecho 2 — HTML do export ZIP (linha 581)
Remover a linha condicional de preço dentro do template HTML estático:
```text
${priceFormatted ? `<div style="...">...</div>` : ''}
```

## Arquivo modificado

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/components/StrategicCarouselPreview.tsx` | Edição | Remover bloco de preço do preview (linhas 215-220) e do HTML de export (linha 581) |

Nenhuma outra mudança necessária. As variáveis `priceFormatted` e `price` na interface podem ser mantidas para uso futuro, apenas o render visual é removido.
