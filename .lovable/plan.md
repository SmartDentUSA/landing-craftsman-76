

# Fix nav-data.js: Deduplicar URLs + Posicionar dentro do footer

## Problema 1: Duplicatas
A query retorna múltiplos registros com a mesma URL (ex: várias clones da mesma homepage). Sem deduplicação, o nav-data.js repete links.

## Problema 2: Posição
O script usa `document.body.appendChild(nav)` — isso coloca o bloco **depois** do footer. Deve ser inserido **antes** do copyright dentro do footer existente.

## Correções (2 arquivos, mesma lógica duplicada)

### Ambos: `publish-git-kinghost/index.ts` e `publish-ftp-pages/index.ts`

**1. Deduplicar navItems por URL** (após o `.map()`):
```typescript
// Deduplicate by URL, keep first occurrence
const seen = new Set<string>();
const uniqueNavItems = navItems.filter((item: any) => {
  if (seen.has(item.url)) return false;
  seen.add(item.url);
  return true;
});
```
Usar `uniqueNavItems` no lugar de `navItems` para gerar o JSON.

**2. Posicionar dentro do footer, antes do copyright:**

Substituir `document.body.appendChild(nav)` por lógica que:
1. Procura um `<footer>` existente
2. Dentro do footer, procura elemento com texto de copyright ("©" ou "direitos")
3. Se encontrado, insere o nav **antes** do copyright
4. Fallback: se não achar footer, usa `document.body.appendChild` como antes

```javascript
var footer = document.querySelector('footer');
if (footer) {
  var copyright = null;
  var allEls = footer.querySelectorAll('*');
  for (var i = 0; i < allEls.length; i++) {
    if (allEls[i].textContent && allEls[i].textContent.indexOf('©') !== -1 && allEls[i].children.length === 0) {
      copyright = allEls[i];
      break;
    }
  }
  if (copyright) {
    copyright.parentNode.insertBefore(nav, copyright);
  } else {
    footer.appendChild(nav);
  }
} else {
  document.body.appendChild(nav);
}
```

Também remover `margin-top:40px;` e `border-top` do nav style (já estará dentro do footer).

### Arquivos alterados
- `supabase/functions/publish-git-kinghost/index.ts`
- `supabase/functions/publish-ftp-pages/index.ts`

### Deploy
Ambas as Edge Functions precisam ser re-deployed.

