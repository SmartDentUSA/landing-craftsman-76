

# Fix nav-data.js: Limpar duplicatas do DB + Corrigir posição no footer

## Diagnóstico

**Duplicatas**: O banco tem **11 registros** de homepage para `smartdent.com.br` com `publish_status='published'`. O código de dedup por URL no JS funciona, mas o `nav-data.js` atual no site pode ter sido gerado antes do deploy do fix. Além disso, o DB precisa de limpeza.

**Posição**: O JavaScript busca `©` via `'\u00A9'` dentro de elementos-folha do `<footer>`. Possível que o elemento de copyright no HTML gerado tenha filhos (ex: `<p>` com `<span>` dentro), fazendo a condição `children.length === 0` falhar. Resultado: cai no fallback `document.body.appendChild`.

## Plano

### 1. Limpar duplicatas existentes no DB

Manter apenas o registro mais recente de homepage por domínio, marcando os demais como `replaced`:

```sql
-- Keep only the latest homepage per domain, archive the rest
UPDATE cloned_landing_pages 
SET publish_status = 'replaced'
WHERE id IN (
  SELECT id FROM cloned_landing_pages 
  WHERE target_domain = 'smartdent.com.br' 
    AND is_homepage = true 
    AND publish_status = 'published'
  ORDER BY created_at DESC
  OFFSET 1
);
```

### 2. Corrigir busca do copyright no nav-data.js (ambas Edge Functions)

O problema é que `children.length === 0` falha se o copyright estiver em um elemento com sub-elementos. Mudar a lógica para buscar o **container pai** do texto de copyright, usando uma busca mais flexível:

```javascript
// Buscar por texto "©" OU "direitos reservados" (mais robusto)
var copyright = null;
var allEls = footer.querySelectorAll('*');
for (var i = 0; i < allEls.length; i++) {
  var txt = allEls[i].textContent || '';
  if ((txt.indexOf('©') !== -1 || txt.indexOf('direitos') !== -1) && allEls[i].children.length === 0) {
    copyright = allEls[i];
    break;
  }
}
// Se não achou folha, tentar containers diretos do footer
if (!copyright) {
  var directChildren = footer.children;
  for (var j = directChildren.length - 1; j >= 0; j--) {
    var t = directChildren[j].textContent || '';
    if (t.indexOf('©') !== -1 || t.indexOf('direitos') !== -1) {
      copyright = directChildren[j];
      break;
    }
  }
}
```

A mudança chave: se a busca por elemento-folha falhar, fazer uma segunda passada nos filhos diretos do footer (que podem ter sub-elementos).

### 3. Usar `©` literal em vez de `\u00A9`

Substituir `'\\u00A9'` por `'©'` diretamente na string do JS gerado. Mais legível e elimina ambiguidade de escaping entre template literals do TypeScript e o JS final.

### Arquivos alterados
- `supabase/functions/publish-git-kinghost/index.ts` — corrigir busca copyright
- `supabase/functions/publish-ftp-pages/index.ts` — mesma correção
- DB: executar UPDATE para limpar duplicatas

### Deploy
Ambas Edge Functions re-deployed. Depois, re-publicar a homepage para gerar novo `nav-data.js`.

