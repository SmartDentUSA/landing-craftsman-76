
# Plano: Corrigir aplicacao de sugestoes, tabela e melhorar prompt de FAQ

## Diagnostico

Foram identificadas **3 causas raiz** para os problemas reportados:

---

### Bug 1: Stale Closure no `useUndoRedo` - Causa principal dos textos nao aplicados

**Arquivo:** `src/hooks/useUndoRedo.ts` (linhas 13-43)

O hook `useUndoRedo` tem um bug critico de **stale closure** no metodo `set`. Quando `handleApplySuggestions` chama `onApplySuggestions` (textos) e `onApplyTable` (tabela) em sequencia no mesmo ciclo de renderizacao:

```text
Chamada 1: onApplySuggestions -> setData(prev => { ...prev, seo_title, banner, ... })
Chamada 2: onApplyTable -> setData(prev => { ...prev, desktop_info: { show_table, ... } })
```

O problema esta na linha 16 e 29 do `useUndoRedo`:

```text
const set = useCallback((newState) => {
    setHistory(prevHistory => {
      const currentState = prevHistory[currentIndex]  // <-- currentIndex STALE!
      ...
      const newIndex = currentIndex + 1;               // <-- STALE! sempre o mesmo valor
      const newHistory = prevHistory.slice(0, newIndex); // <-- CORTA o estado da chamada 1!
      ...
    });
}, [currentIndex, initialState]);  // currentIndex no closure
```

**O que acontece:**
1. `currentIndex = 5` no closure
2. Chamada 1: adiciona textos no indice 6, chama `setCurrentIndex(6)` (pendente)
3. Chamada 2: `currentIndex` AINDA e 5 (closure stale!)
   - Le `prevHistory[5]` (estado ANTIGO, sem textos)
   - `slice(0, 6)` REMOVE a entrada de textos no indice 6
   - Adiciona tabela no indice 6 (sem textos)
4. Resultado: textos perdidos, apenas tabela aplicada

**Correcao:** Usar `useRef` para rastrear `currentIndex` sem depender do closure:

```text
const currentIndexRef = useRef(0);

// Manter ref sincronizado
useEffect(() => {
  currentIndexRef.current = currentIndex;
}, [currentIndex]);

const set = useCallback((newState) => {
    setHistory(prevHistory => {
      const idx = currentIndexRef.current;
      const currentState = prevHistory[idx] ?? initialState;
      ...
      const newIndex = idx + 1;
      const newHistory = prevHistory.slice(0, newIndex);
      newHistory.push(stateToAdd);
      ...
      currentIndexRef.current = newIndex;  // Atualiza ref imediatamente
      setCurrentIndex(newIndex);
      return newHistory;
    });
}, [initialState]);  // SEM currentIndex na dependency
```

Agora:
- Chamada 1: `currentIndexRef = 5`, atualiza para 6, adiciona textos
- Chamada 2: `currentIndexRef = 6`, atualiza para 7, adiciona tabela SOBRE os textos

---

### Bug 2: Schema de tabela com `additionalProperties` gera objetos vazios

**Arquivo:** `supabase/functions/transcribe-landing-page-pdf/index.ts` (linhas 241-248)

O schema do tool calling define `rows` como:
```text
rows: { type: "array", items: { type: "object", additionalProperties: { type: "string" } } }
```

O modelo Gemini usa chaves internas que nao correspondem aos headers (ex: `"col1"` em vez de `"Caracteristica"`), resultando em `row["Caracteristica"]` = `undefined` no frontend e 194 objetos vazios.

**Correcao:** Mudar para arrays posicionais + mapeamento no servidor:

1. Schema: `rows: { type: "array", items: { type: "array", items: { type: "string" } } }`
2. Prompt: "Cada row e um array de strings na MESMA ORDEM dos headers"
3. Post-processing: converter `["Conectividade", "USB"]` para `{"Caracteristica": "Conectividade", "Medit i600": "USB"}`
4. Validacao: preencher colunas faltantes com string vazia

---

### Bug 3: Prompt de FAQ generico demais

**Arquivo:** `supabase/functions/generate-landing-page-faqs/index.ts` (linhas 39-54)

O prompt atual e generico ("crie FAQs baseadas no conteudo"). O usuario forneceu um prompt ideal que inclui:
- Contexto especializado (odontologia digital, CAD/CAM)
- Perguntas obrigatorias cobrindo temas especificos
- Regras de linguagem (tecnica, neutra, sem termos promocionais)
- Respostas entre 40-80 palavras
- Otimizacao para SEO/IA Search

**Correcao:** Atualizar o prompt para ser **contextual** - a IA deve analisar o conteudo do PDF e gerar FAQs especializadas, cobrindo diferencias entre itens comparados, indicacao para diferentes perfis, custo-beneficio, e detalhes tecnicos.

---

### Correcao Adicional: Sincronizar `seo.seo_title` no callback

**Arquivo:** `src/pages/Editor.tsx` (linhas 4988-5017)

O `onApplySuggestions` atualiza `seo_title` no nivel raiz mas nao atualiza `seo.seo_title`, causando inconsistencia ao salvar. Adicionar sincronizacao:

```text
seo: {
  ...prev.seo,
  seo_title: suggestions.seo_title || prev.seo.seo_title,
  seo_description: suggestions.seo_description || prev.seo.seo_description,
},
```

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useUndoRedo.ts` | Usar useRef para currentIndex, eliminar stale closure |
| `supabase/functions/transcribe-landing-page-pdf/index.ts` | Mudar schema de rows para arrays posicionais + post-processing de mapeamento |
| `supabase/functions/generate-landing-page-faqs/index.ts` | Prompt contextual com regras de linguagem, cobertura tematica e otimizacao SEO |
| `src/pages/Editor.tsx` | Sincronizar seo.seo_title e seo.seo_description no callback onApplySuggestions |

## Resultado Esperado

- **Textos:** Todos os 12 campos (SEO, Banner, Advisory, CTA, Desktop Info) serao preenchidos corretamente ao clicar "Aplicar Selecionados"
- **Tabela:** Celulas preenchidas com dados reais (nao vazios), headers corretos
- **FAQs:** Perguntas especializadas, tecnicas e neutras, cobrindo diferencas de performance, custo-beneficio e indicacao para perfis
- **Persistencia:** Nenhum dado e sobrescrito por chamadas em sequencia
