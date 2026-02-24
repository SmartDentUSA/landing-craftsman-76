
# Auditoria de Select/SelectItem em todo o sistema

## Resultado da analise

Foram analisados **30 arquivos** com componentes `<Select>` e **160+ instancias** de `<SelectItem>`. O erro do Radix UI (`SelectItem must have a value prop that is not an empty string`) ocorre **somente** quando um `<SelectItem>` recebe `value=""`.

### Problema ja corrigido
- `NavigationFooterTab.tsx` - tinha `<SelectItem value="">` (corrigido para `value="none"`)

### Riscos remanescentes encontrados

Embora nao haja mais `<SelectItem value="">` hardcoded, existem **6 pontos** onde valores dinamicos podem gerar strings vazias em `SelectItem`:

| Arquivo | Risco | Descricao |
|---------|-------|-----------|
| `LinksManager.tsx` (L439, L551, L569, L736) | Medio | `dynamicCategories[].value` e `dynamicSubcategories[]` vem de `categories_config` - se uma categoria tiver nome vazio no DB, gera crash |
| `ProductSelector.tsx` (L194) | Baixo | `getUniqueCategories()` pode retornar string vazia se algum produto tem `category = ""` |
| `IntelligentLinksManager.tsx` (L348) | Baixo | `link.url` pode ser vazio se link mal cadastrado |
| `LPClonePanel.tsx` (L950, L1132, L1463) | Baixo | `d.domain` pode ser vazio se dominio sem nome |
| `ProductKeywordsImportModal.tsx` (L225) | Baixo | `link.url` pode ser vazio |
| `ClinicalBrain/ProductTypeSelector.tsx` (L140) | Nenhum | `value || ''` e usado no `<Select>` (permitido), nao no `<SelectItem>` |

### Plano de correcao preventiva

Adicionar filtros defensivos (`.filter(x => x && x.trim() !== '')`) em todos os pontos de risco **antes** do `.map()` que gera `<SelectItem>`:

**1. `src/components/LinksManager.tsx`** (4 locais)
- Linhas ~438, ~550, ~568, ~735: adicionar `.filter(option => option.value && option.value.trim() !== '')` antes do `.map()`
- Linha ~568 (subcategorias): adicionar `.filter(sub => sub && sub.trim() !== '')` antes do `.map()`

**2. `src/components/ProductSelector.tsx`** (1 local)
- Linha ~193: adicionar `.filter(category => category && category.trim() !== '')` antes do `.map()` (mesmo padrao ja usado em `ScoreFilters.tsx` L128)

**3. `src/components/IntelligentLinksManager.tsx`** (1 local)
- Linha ~347: adicionar `.filter(link => link.url && link.url.trim() !== '')` antes do `.map()`

**4. `src/components/LPClonePanel.tsx`** (3 locais)
- Linhas ~949, ~1131, ~1462: adicionar `.filter(d => d.domain && d.domain.trim() !== '')` antes do `.map()`

**5. `src/components/ProductKeywordsImportModal.tsx`** (1 local)
- Linha ~224: adicionar `.filter(link => link.url && link.url.trim() !== '')` antes do `.map()`

### Sem alteracao necessaria (ja seguros)

- `ScoreFilters.tsx` - ja tem `.filter(category => category && category.trim() !== '')` (padrao correto)
- `DualBlogGeneratorWithKOL.tsx` - ja tem `.filter(kol => kol.id && kol.id.trim() !== '')`
- `NavigationFooterTab.tsx` - ja corrigido com `value="none"`
- `SpinSolutionEditModal.tsx` - valores vem de constantes hardcoded (PAIN_TYPES, SPECIALTIES, etc.)
- `AfterSalesManager.tsx`, `CSManager.tsx` - `product.id` e UUID (nunca vazio)
- `BlogConsolidationInterface.tsx` - valores hardcoded
- `VideoTestimonialsSection.tsx` - valores hardcoded (states, specialties)
- `Editor.tsx` - valores hardcoded

### Total de alteracoes

- **5 arquivos** modificados
- **10 filtros defensivos** adicionados
- **Zero mudanca visual ou funcional** - apenas prevencao de crash
