

# Adicionar Toggle de Visualização de Avaliações no HTML

## Situação Atual

- Existe um toggle `reviews_enabled` na aba **Schema** do editor, mas ele controla apenas o JSON-LD schema, não a seção visual de avaliações no HTML
- O template engine (`template-engine.ts`) **sempre** renderiza a seção visual de reviews se existirem reviews no banco — não há como desabilitar
- O usuário precisa de um controle claro para habilitar/desabilitar a **seção visual** de avaliações no HTML gerado

## Plano

### 1. Adicionar campo `reviews_section_visible` ao tipo de dados da LP

**Arquivo: `src/pages/Editor.tsx`** (interface principal de dados)
- Adicionar `reviews_section_visible?: boolean` na interface de dados (nível raiz ou dentro de `seo`)

### 2. Adicionar toggle visível na aba principal (Básico ou Banner)

**Arquivo: `src/pages/Editor.tsx`**
- Adicionar um Card com Switch na aba **Básico** (ou no topo do editor), com label claro:
  - "Exibir Avaliações de Clientes no HTML"
  - Descrição: "Quando ativado, a seção de avaliações será incluída na página gerada"
- Posicionar junto aos outros toggles de seção (vídeo, FAQ, etc.)

### 3. Respeitar o toggle no template engine

**Arquivo: `src/lib/template-engine.ts`**
- Na lógica que popula `processedData.reviews_section` (~linha 5603), checar se `data.reviews_section_visible !== false` antes de injetar os dados
- Se desabilitado, setar `reviews_section.has_reviews = false` para que o template Mustache não renderize a seção

### Arquivos a editar

| Arquivo | Ação |
|---------|------|
| `src/pages/Editor.tsx` | Adicionar toggle + campo no estado |
| `src/lib/template-engine.ts` | Condicionar renderização ao flag |

