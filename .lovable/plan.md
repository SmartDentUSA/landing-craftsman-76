

## Correção: Toggle de avaliações não persiste ao recarregar

### Causa raiz

A função `ensureLandingPageDefaults()` (linhas 511-634 de `Editor.tsx`) constrói o objeto de retorno **campo a campo** de forma explícita, mas **não inclui `reviews_section_visible`**. Quando a página é recarregada, os dados passam por essa função e o campo é descartado, fazendo o toggle voltar ao valor padrão (`undefined`, que é tratado como `true`).

O salvamento está correto (linhas 2662 e 2734 já incluem o campo). O problema é exclusivamente na **leitura/hidratação**.

### Correção

**Arquivo: `src/pages/Editor.tsx`**

Na função `ensureLandingPageDefaults`, adicionar o campo `reviews_section_visible` ao objeto retornado (perto da linha 633, antes do `} as LandingPageData`):

```typescript
reviews_section_visible: data.reviews_section_visible
```

Isso garante que o valor salvo no banco (`true` ou `false`) é preservado ao rehidratar os dados. Se o campo não existir no banco (LPs antigas), ficará `undefined`, que o template engine já trata como `true` via `!== false`.

### Resultado esperado
- Desligar o toggle → salvar → recarregar página → toggle permanece desligado
- LPs antigas sem o campo continuam funcionando normalmente (avaliações visíveis por padrão)

