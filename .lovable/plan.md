

# Plano: Desabilitar Reviews + Reposicionar Navegação no Rodapé

## 1. Desabilitar seção "Avaliações de Clientes" no template engine

**Arquivo:** `src/lib/template-engine.ts` (linhas ~5583-5617)

Comentar/desabilitar o bloco que popula `processedData.reviews_section` com `has_reviews: true`. Sem esse campo, o template condicional `{{#reviews_section.has_reviews}}` não renderiza a seção. Basta forçar `has_reviews: false` ou simplesmente não atribuir o `reviews_section` ao `processedData`.

Abordagem: envolver o bloco em um flag `const ENABLE_REVIEWS_SECTION = false;` para facilitar reativação futura.

## 2. Reposicionar "Navegue por nossas páginas" dentro do footer

**Problema atual:** O JS do `nav-data.js` procura um elemento com `©` ou `direitos` dentro do `<footer>` para inserir antes dele. Na homepage ao vivo, o footer parece estar ausente ou o script está adicionando ao `document.body` como fallback (ficando no fim absoluto da página).

**Solução:** Alterar a lógica de inserção no `generateNavDataJS` em **4 arquivos** para buscar especificamente o bloco `.footer-social-inline` e inserir **após** ele (antes do `.footer-copyright`):

```js
// Nova lógica de posicionamento:
var socialBlock = footer.querySelector('.footer-social-inline');
if (socialBlock) {
  socialBlock.parentNode.insertBefore(nav, socialBlock.nextSibling);
} else if (copyright) {
  copyright.parentNode.insertBefore(nav, copyright);
} else {
  footer.appendChild(nav);
}
```

Também atualizar o bloco estático `generateStaticNavFooter` para ser injetado no HTML **entre** `.footer-social-inline` e `.footer-copyright` em vez de antes do `</body>`.

**Arquivos a editar:**
- `supabase/functions/republish-domain-pages/index.ts`
- `supabase/functions/publish-git-kinghost/index.ts`
- `supabase/functions/publish-ftp-pages/index.ts`
- `supabase/functions/unpublish-pages/index.ts`

## 3. Atualizar injeção do HTML estático

Na função `updateNoscriptInHtml`, em vez de injetar o bloco `smartdent-static-nav` antes de `</body>`, injetá-lo dentro do `<footer>`, especificamente após o bloco que contém "Redes Sociais" e antes do `footer-copyright`. Usar regex para encontrar `</div>\s*</div>\s*<div class="footer-copyright"` e inserir os links ali.

## Resumo

| Arquivo | Mudança |
|---------|---------|
| `src/lib/template-engine.ts` | Desabilitar `reviews_section` com flag |
| `supabase/functions/republish-domain-pages/index.ts` | Reposicionar nav após `.footer-social-inline` |
| `supabase/functions/publish-git-kinghost/index.ts` | Mesma correção de posicionamento |
| `supabase/functions/publish-ftp-pages/index.ts` | Mesma correção de posicionamento |
| `supabase/functions/unpublish-pages/index.ts` | Mesma correção de posicionamento |

