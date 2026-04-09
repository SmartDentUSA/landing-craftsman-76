

## Plano: Agrupar produtos por categoria na seção Recursos e Downloads

### Problema atual
A seção "Recursos e Downloads" renderiza todos os produtos em uma lista/grid plana sem organização. O usuário quer ver os produtos agrupados por categoria.

### Alterações

**1. Template HTML — `src/lib/template-engine.ts` (linhas 2263-2350)**

Substituir a iteração plana `{{#resources_products}}` por uma iteração agrupada `{{#resources_categories}}`, onde cada categoria tem um título e seus produtos:

```text
{{#resources_categories}}
  <div class="resources-category-block">
    <h3 class="resources-category-title">{{category_name}}</h3>
    <div class="resources-grid">
      {{#products}}
        <div class="offer-card">...</div>
      {{/products}}
    </div>
  </div>
{{/resources_categories}}
```

Manter a mesma estrutura de card (imagem, nome, CTAs). Aplicar tanto para desktop quanto mobile.

**2. Dados do template — `src/lib/template-engine.ts` (linhas 3511-3528 e 4073-4110)**

Nos dois pontos onde `resources_products` é montado, adicionar um novo campo `resources_categories` que agrupa os produtos por `category`:

- Agrupar offers com `show_in_resources === true` por `offer.category || 'Outros'`
- Gerar array `[{ category_name, products: [...] }]` ordenado alfabeticamente
- Manter `resources_products` para compatibilidade (flat list)

**3. CSS — `src/lib/template-engine.ts` (seção de estilos)**

Adicionar estilos para `.resources-category-block` e `.resources-category-title`:
- Título da categoria com margem superior, font-size médio, cor do tema
- Separação visual entre blocos de categorias

### Resultado
- Produtos organizados por categoria com títulos visuais
- Categorias ordenadas alfabeticamente
- Produtos sem categoria agrupados sob "Outros"

