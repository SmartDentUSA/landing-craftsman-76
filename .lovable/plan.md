

# Backup do HTML Publicado da Institucional

## Situação Atual

- A página institucional **está no ar** em `smartdent.com.br` e funcionando corretamente
- O HTML publicado está salvo em `cloned_landing_pages` (id: `83de3354`, ~203KB)
- Os dados do editor (LP `5f7bea68`) ainda existem com todas as chaves (faq, seo, menu, banner, solutions, etc.)
- O que o usuário precisa: **uma forma de baixar/salvar o HTML que está publicado**

## Plano

### Adicionar botão "Baixar HTML" no Dashboard

No card de cada LP publicada no Dashboard (`src/pages/Dashboard.tsx`), adicionar um botão que:

1. Busca o `transformed_html` da `cloned_landing_pages` onde `source_landing_page_id` = LP id e `publish_status = 'published'`
2. Gera um download do arquivo `.html` com o conteúdo

Isso já existe parcialmente no `LPClonePanel` (função `handlePreviewSavedLP`), mas não está acessível no Dashboard principal.

### Implementação

**Arquivo: `src/pages/Dashboard.tsx`**

- Adicionar botão "⬇ Baixar HTML" ao lado do badge "Publicado" nos cards de LP
- Ao clicar, busca `transformed_html` do registro publicado em `cloned_landing_pages` e faz download como arquivo `.html`
- Também adicionar botão "👁 Ver ao vivo" que abre a URL publicada

### Código do handler

```typescript
const handleDownloadPublishedHTML = async (lpId: string, lpName: string) => {
  const { data } = await supabase
    .from('cloned_landing_pages')
    .select('transformed_html, original_html')
    .eq('source_landing_page_id', lpId)
    .eq('publish_status', 'published')
    .limit(1)
    .maybeSingle();
  
  const html = data?.transformed_html || data?.original_html;
  if (!html) { toast error; return; }
  
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(lpName)}.html`;
  a.click();
};
```

### Arquivo a editar

| Arquivo | Acao |
|---------|------|
| `src/pages/Dashboard.tsx` | Adicionar botao de download HTML publicado |

