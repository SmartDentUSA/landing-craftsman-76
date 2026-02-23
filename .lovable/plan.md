
# Corrigir Resolucao de HTML da Landing Page SPIN

## Problema
O HTML da landing page esta sendo salvo no Storage (bucket `landing-pages-html`) quando e grande (>500KB), e o banco de dados armazena apenas uma referencia como `__storage__:spin-lps/uuid.html`. Porem, em varios pontos do codigo, essa referencia nao e resolvida antes de ser usada, resultando em:

1. **Download/Preview** exibem apenas o texto `__storage__:spin-lps/...` em vez do HTML real
2. **formData** carrega a referencia crua do banco e nunca resolve para o HTML real
3. **Salvar edicoes** tenta gravar HTML grande diretamente no banco, causando erro `PGRST102`

## Arquivos Alterados

### 1. `src/components/SpinSolutionEditModal.tsx`

**Problema A - Carga inicial (linha 359):**
O `formData.landing_page_html` recebe o valor cru do banco (`__storage__:spin-lps/...`). Precisa resolver a referencia de storage ao carregar a solucao.

**Correcao:** No `useEffect` que carrega `existingSolution` (linha 332-389), apos setar o formData, verificar se `landing_page_html` comeca com `__storage__:` e, se sim, chamar `resolveStorageHtml()` para buscar o HTML real e atualizar o formData.

**Problema B - Preview e Download (linhas 1202-1225):**
As funcoes `handlePreviewLandingPage` e `handleDownloadLandingPage` usam `formData.landing_page_html` diretamente, que pode conter a referencia de storage.

**Correcao:** Tornar essas funcoes `async` e chamar `resolveStorageHtml()` antes de criar o Blob. Se o valor ja for HTML real, a funcao retorna como esta (sem overhead).

### 2. `src/components/SpinLandingPageEditablePreview.tsx`

**Problema C - Salvar edicoes (linhas 444-455):**
A funcao `saveChanges` grava o HTML editado diretamente no banco via `supabase.update()`. Para HTMLs grandes (>500KB), isso causa erro PGRST102.

**Correcao:** Adicionar logica de verificacao de tamanho. Se o HTML for >500KB:
1. Upload para o bucket `landing-pages-html` no path `spin-lps/{solutionId}.html`
2. Salvar a referencia `__storage__:spin-lps/{solutionId}.html` no banco
Se for <=500KB, salvar normalmente no banco (comportamento atual).

## Secao Tecnica

### Mudanca 1 - Resolver storage na carga inicial

```typescript
// No useEffect que carrega existingSolution (SpinSolutionEditModal.tsx)
useEffect(() => {
  if (existingSolution) {
    // ... setFormData existente ...

    // Resolver referencia de storage se necessario
    if (existingSolution.landing_page_html?.startsWith('__storage__:')) {
      import('@/lib/resolve-storage-html').then(({ resolveStorageHtml }) => {
        resolveStorageHtml(existingSolution.landing_page_html).then(resolved => {
          if (resolved) {
            setFormData(prev => ({ ...prev, landing_page_html: resolved }));
          }
        });
      });
    }
  }
}, [existingSolution]);
```

### Mudanca 2 - Preview e Download com resolucao

```typescript
const handlePreviewLandingPage = async () => {
  if (!formData.landing_page_html) return;
  const { resolveStorageHtml } = await import('@/lib/resolve-storage-html');
  const html = await resolveStorageHtml(formData.landing_page_html) || formData.landing_page_html;
  const blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank');
};
```

### Mudanca 3 - Salvar com storage para HTMLs grandes

```typescript
// Em SpinLandingPageEditablePreview.tsx, saveChanges:
const finalHtml = '<!DOCTYPE html>\n' + clone.documentElement.outerHTML;

if (finalHtml.length > 500 * 1024) {
  // Upload para Storage
  const storagePath = `spin-lps/${solutionId}.html`;
  const blob = new Blob([finalHtml], { type: 'text/html; charset=utf-8' });
  await supabase.storage.from('landing-pages-html').upload(storagePath, blob, { upsert: true });

  // Salvar referencia no banco
  await supabase.from('spin_selling_solutions').update({
    landing_page_html: `__storage__:${storagePath}`,
    landing_page_generated_at: newTimestamp
  }).eq('id', solutionId);
} else {
  // Salvar direto no banco (pequeno)
  await supabase.from('spin_selling_solutions').update({
    landing_page_html: finalHtml,
    landing_page_generated_at: newTimestamp
  }).eq('id', solutionId);
}

// Manter HTML real no estado local para preview
setHtml(finalHtml);
```

### Resumo das correcoes
1. **SpinSolutionEditModal.tsx** - Resolver `__storage__:` ao carregar solucao e antes de preview/download
2. **SpinLandingPageEditablePreview.tsx** - Usar Storage para salvar HTMLs grandes editados (>500KB)
