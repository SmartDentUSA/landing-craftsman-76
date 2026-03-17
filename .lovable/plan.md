

# Diagnóstico: Inserção Incremental no smartdent.com.br

## O que aconteceu

Analisando os logs e o site ao vivo, o sistema **de fato executou** a republicação incremental com sucesso:

- **Edge Function logs**: `republish-domain-pages` executou, encontrou 3 páginas, atualizou 2, e criou commit `1d23650e` no Git
- **nav-data.js**: Está no servidor com 3 entradas corretas (Homepage, `/comparativo-scanners-intraorais`, `/produtos/comparativo-scanners-intraorais`)
- **Homepage HTML**: Comentário mostra `Gerado por: republish-domain-pages` com timestamp `13:32:22`

## Problemas Identificados

### 1. Registros duplicados no banco de dados
Existem **2 registros** para o mesmo conteúdo com paths diferentes:
- `/comparativo-scanners-intraorais` (antigo)
- `/produtos/comparativo-scanners-intraorais` (novo)

Isso gera 2 links duplicados no nav-data.js com o mesmo nome.

### 2. O nav footer JS pode não estar visível
O `nav-data.js` cria um bloco dinâmico no **final absoluto da página** (dentro ou após o `<footer>`). Se o footer da homepage está vazio ou tem estrutura inesperada, o bloco pode estar renderizando mas invisível ou em posição estranha.

### 3. Comparação de URL com trailing slash
O JS usa `item.url === window.location.href` para filtrar a página atual. A homepage carrega como `https://smartdent.com.br/` (com `/`), mas o nav-data tem `https://smartdent.com.br` (sem `/`). O filtro não funciona e a homepage aparece como link em si mesma.

### 4. Noscript links ausentes
O HTML da homepage não contém o bloco `<noscript>` com links estáticos, apesar do código de injeção existir.

## Plano de Correção

### Etapa 1: Corrigir comparação de URL no nav-data.js
No `republish-domain-pages/index.ts`, na função `generateNavDataJS`, normalizar URLs removendo trailing slash na comparação:

```js
// Antes: if (item.url === window.location.href) return;
// Depois: 
var currentUrl = window.location.href.replace(/\/$/, '');
if (item.url.replace(/\/$/, '') === currentUrl) return;
```

### Etapa 2: Deduplicar entradas no nav-data por nome
Adicionar deduplicação por `name` além de `url` para evitar links duplicados quando o mesmo conteúdo está em paths diferentes.

### Etapa 3: Melhorar visibilidade do nav footer
Adicionar um fallback que injeta links diretamente no HTML estático (dentro do footer existente), além do JS dinâmico. Na função `updateNoscriptInHtml`, também injetar links visíveis em `<div>` antes do `</body>` como fallback caso o JS não execute.

### Etapa 4: Garantir injeção do script tag
Adicionar log de debug confirmando se o `nav-data.js` script tag foi injetado, e usar regex mais robusto para encontrar `</body>` mesmo com espaços/quebras de linha.

### Arquivos a editar
- `supabase/functions/republish-domain-pages/index.ts` — Corrigir URL comparison, deduplicação, injeção de links
- `supabase/functions/publish-git-kinghost/index.ts` — Mesma correção no generateNavDataJS (se duplicado)

