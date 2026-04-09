
Plano: corrigir o Vitality e impedir que os CTAs voltem a ficar vazios

Diagnóstico do código
- O editor de produto (`src/components/ProductEditModal.tsx`) só mostra os campos a partir do que já está salvo em `products_repository`: `show_in_resources`, `selected`, `resource_cta1`, `resource_cta2`, `resource_cta3` e `resource_descriptions`.
- Ele não converte `technical_documents` em CTA automaticamente.
- A landing (`src/pages/Editor.tsx` + `src/lib/template-engine.ts`) também só renderiza CTAs que já vierem nesses campos.
- Então, se o Vitality continua vazio no editor, o problema é de dado persistido/registro errado, não do HTML da seção.

O que vou fazer
1. Validar o registro correto no banco
- Conferir o produto exato “Resina 3D Smart Print Bio Vitality” em `products_repository`.
- Verificar se existe duplicata com nome parecido/mesmo slug/mesma URL.
- Ler estes campos no registro real: `technical_documents`, `show_in_resources`, `selected`, `resource_cta1`, `resource_cta2`, `resource_cta3`, `resource_descriptions`.

2. Corrigir os dados do produto
- Atualizar o registro correto para:
  - `show_in_resources = true`
  - `selected = true` se ele também deve aparecer em “Ofertas”
  - `resource_cta1/2/3` usando os documentos técnicos disponíveis
  - `resource_descriptions` com os nomes/descrições dos documentos
- Se houver duplicata, corrigir o item certo e identificar o item incorreto para evitar nova edição do produto errado.

3. Blindar o editor para não depender só do batch
- Em `src/components/ProductEditModal.tsx`, adicionar fallback/autopreenchimento:
  - se o produto tiver `technical_documents`
  - e os CTAs estiverem vazios
  - o modal sugere/preenche CTA 1, CTA 2 e CTA 3 automaticamente
- Isso evita que produtos com documentos técnicos apareçam “vazios” mesmo quando o batch falhar ou pegar nomes diferentes.

4. Validar na landing
- Confirmar que o produto aparece com botões em “Recursos e Downloads”.
- Confirmar que aparece em “Ofertas” quando `selected` estiver ativo.
- Verificar o fluxo completo: repositório → editor do produto → editor da landing → preview final.

Arquivos envolvidos
- `src/components/ProductEditModal.tsx`
- `src/pages/Editor.tsx`
- `src/lib/template-engine.ts`

Resultado esperado
- O Vitality abrirá no editor com os CTAs preenchidos.
- O switch “Mostrar na seção Recursos e Downloads” ficará coerente com os documentos existentes.
- Os botões aparecerão na landing, e também em “Ofertas” se essa flag estiver habilitada.
