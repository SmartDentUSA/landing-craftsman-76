

# Remover seção "HTML Blogs Copy & Paste" do Dashboard

## Escopo

Remover a seção inteira de HTML Blogs Copy & Paste (linhas ~1229-1445) do JSX, e todo o código de suporte que só existia para essa seção:

### Código a remover do Dashboard.tsx:

1. **JSX da seção** (linhas 1229-1445) — os dois cards Eodonto/Dentala + controle de geração
2. **Variáveis/funções usadas apenas pela seção removida:**
   - `eodontoHTML`, `dentalaHTML` (useMemo, linhas 856-864)
   - `eodontoCleanHTML`, `dentalaCleanHTML` (useState + useEffect, linhas 867-899)
   - `eodontoCleanText`, `dentalaCleanText` (useMemo, linhas 902-910)
   - `copyConsolidatedHTML` (useCallback, linhas 912-944)
   - `getApprovedBlogsCount` (function, linhas 946-962)
   - `generateConsolidatedHTML` (useCallback, linhas 534-853) — a função enorme com todo o template HTML inline
   - `generateCleanHTML` (useCallback, linhas 482-532)
   - `extractCleanText` (useCallback, linhas 450-479)

3. **Hooks/imports que ficam sem uso após remoção:**
   - `useConsolidatedBlogAutoGenerator` + suas variáveis (`consolidatedHTMLs`, `isGeneratingConsolidated`, `generateAllConsolidated`)
   - `useBlogReadMore`
   - `sanitizeBlogContent` import
   - `processContentWithIntelligentLinks` import
   - `useSEOHTMLGenerator` hook
   - `useProductBlogsIntegration` hook (verificar se usado em outro lugar)
   - Icons: `Building2`, `Globe`, `Wand2`, `CheckCircle`, `AlertCircle`, `Loader2` (verificar uso restante)

4. **useEffect de log** (linhas 226-233) que monitora `approvedBlogsCount`/`generatedBlogsCount`/`publishedBlogsCount` — remover se não tiver outro uso

### Imports a limpar
Remover imports não utilizados após as remoções acima.

### Arquivos afetados
| Acao | Arquivo |
|------|---------|
| Modificar | `src/pages/Dashboard.tsx` — remover seção + código morto |

Nenhuma mudança de banco de dados necessária.

