

## Correção: Links em Soluções + Toggle de Avaliações

### Problemas identificados

**1. Links nas soluções não funcionam**
No template HTML (`src/lib/template-engine.ts`, linhas 2190 e 2206), o texto das soluções usa `{{text}}` (Mustache com escape HTML). Isso transforma qualquer `<a href="...">` em `&lt;a href=...&gt;`, impedindo que links funcionem. A correção é usar `{{{text}}}` (triple-stache, sem escape).

**2. Toggle de avaliações não persiste**
No `handleSave` do Editor (`src/pages/Editor.tsx`, linhas 2633-2661), o campo `reviews_section_visible` **não está incluído** no payload salvo no banco de dados. Quando a página é recarregada, o valor volta como `undefined`, e a lógica `data.reviews_section_visible !== false` avalia como `true` — fazendo as avaliações sempre aparecerem no HTML gerado.

### Correções

**Arquivo 1: `src/lib/template-engine.ts`**
- Linha 2190: trocar `{{text}}` por `{{{text}}}` (desktop grid)
- Linha 2206: trocar `{{text}}` por `{{{text}}}` (mobile carousel)

**Arquivo 2: `src/pages/Editor.tsx`**
- No bloco do `handleSave` (entre linhas 2633-2661), adicionar `reviews_section_visible: processedData.reviews_section_visible` ao objeto `data` do payload salvo
- Fazer o mesmo no bloco de criação de nova LP (perto da linha 2700)

### Resultado esperado
- Links inseridos em soluções via editor renderizam como links clicáveis no HTML gerado
- Desativar o toggle de avaliações persiste no banco e o HTML gerado não inclui a seção visual de reviews

