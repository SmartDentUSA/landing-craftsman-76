

## Plano: Permitir edicao livre da URL final no dialogo de publicacao

### Problema
Atualmente o usuario so pode escolher entre categorias pre-definidas (produtos, blog, guias, etc.) vindas do `url_structure` do dominio. Nao ha opcao de digitar um path customizado.

### Solucao

**Arquivo: `src/components/LPPublishDialog.tsx`**

1. Adicionar opcao "Personalizado" no Select de Categoria (alem das categorias do `url_structure`)
2. Quando "Personalizado" estiver selecionado, mostrar um campo Input para o usuario digitar o path completo (ex: `/qrcode`, `/promo/verao-2026`)
3. Tornar o campo "URL final" editavel — o usuario pode clicar e editar diretamente o path gerado, independente da categoria
4. Atualizar `pagePath` e `previewUrl` para refletir o path customizado

### Detalhes da implementacao

- Novo estado `customPath` para path livre
- No Select de categoria, adicionar item `custom` com label "📝 Personalizado"
- Quando `selectedCategory === 'custom'`, mostrar Input de path livre em vez do slug
- O `pagePath` usa `customPath` quando categoria e custom
- Manter compatibilidade com fluxo existente (categorias pre-definidas continuam funcionando)

