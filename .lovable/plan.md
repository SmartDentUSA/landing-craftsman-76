

## Plano: Priorizar "Resinas" + Igualar layout mobile de Recursos ao de Ofertas

### 1. Priorizar categoria "Resinas" no topo

**Arquivo: `src/lib/template-engine.ts`** — linhas ~3572 e ~4159

Substituir `.sort()` por ordenação customizada nos dois locais onde `resources_categories` é montado:

```typescript
Object.keys(grouped).sort((a, b) => {
  const aIsResinas = a.toLowerCase().includes('resina');
  const bIsResinas = b.toLowerCase().includes('resina');
  if (aIsResinas && !bIsResinas) return -1;
  if (!aIsResinas && bIsResinas) return 1;
  return a.localeCompare(b);
})
```

### 2. Igualar layout mobile de Recursos ao de Ofertas

**Arquivo: `src/lib/template-engine.ts`**

- **HTML mobile (~2332-2369)**: Substituir `carousel-track` por `resources-grid` no bloco mobile de Recursos
- **CSS mobile (~1355-1385)**: Garantir que `.resources-grid` no mobile use `repeat(2, 1fr)` e que os cards tenham mesmo sizing (imagem, padding, font-size) que `.offers-grid`
- Remover estilos/lógica de carousel do mobile de recursos

### Resultado
- "Resinas" sempre aparece primeiro, demais em ordem alfabética
- Cards de Recursos no mobile idênticos aos de Ofertas (grid 2 colunas, sem scroll horizontal)

