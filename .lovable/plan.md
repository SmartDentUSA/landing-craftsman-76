## Problema

As Especificações Técnicas sumiram dos cards porque o bloco que as renderizava foi removido no commit `074079e2` (29/set/2025 — "Remove technical specs preview from product card"). O componente `TechnicalSpecsPreview` continuou importado em `src/components/ModernProductCard.tsx` mas nunca mais foi usado.

## Correção

Restaurar **exatamente** o bloco removido, dentro de `<Card>`, logo antes de `</Card>` (próximo da linha 705 atual):

```tsx
{/* Preview das Especificações Técnicas dentro do Card */}
{(product.technical_specifications && product.technical_specifications.length > 0) && (
  <TechnicalSpecsPreview
    specs={product.technical_specifications}
    onEdit={() => setShowTechnicalSpecs(true)}
    productName={product.name}
  />
)}
```

Comportamento (mesmo de antes):
- Produto **com** specs → tabela compacta com label/valor, badge de contagem, botão "Editar" (abre o modal já existente). URLs viram botão Download.
- Produto **sem** specs → nada é renderizado no card (mantém o comportamento anterior à remoção; o botão de engrenagem nos ícones de ação continua disponível para adicionar).

## Fora do escopo

- Sem mudanças no modal, no schema, no handler de save, ou em outros componentes.
- Sem alteração no carrossel ou em System B.

## Validação

Abrir `/repository` e confirmar que produtos com `technical_specifications` populadas voltam a exibir a seção "Especificações Técnicas" no rodapé do card.
