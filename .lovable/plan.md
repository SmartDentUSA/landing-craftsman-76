

# Plano: Persistir sugestoes do PDF (SEO, Banner, etc.)

## Diagnostico

O callback `onApplySuggestions` (Editor.tsx, linhas 4988-5022) atualiza o estado local com `setData` e marca `dirtyRef.current = true`, mas **nao persiste no banco de dados**. Isso e o mesmo problema que afetava a tabela: o debounce de 1500ms ou guardas de hidratacao podem impedir o save, e os campos ficam vazios ao recarregar.

Campos afetados:
- SEO: `seo_title`, `seo_description`
- Banner: `title`, `subtitle`, `badge_text`
- Solutions: `solutions_title`
- Advisory: `title`, `paragraph`
- CTA Final: `title`, `paragraph`
- Desktop Info: `title`, `text`

## Correcao

### Arquivo: `src/pages/Editor.tsx` (linhas 4988-5022)

Adicionar uma chamada direta a `updateLandingPage` apos o `setData` no callback `onApplySuggestions`, seguindo o mesmo padrao ja aplicado no `onApplyTable`:

```typescript
onApplySuggestions={(suggestions) => {
  const updatedData = {
    ...data,
    seo_title: suggestions.seo_title || data.seo_title,
    seo_description: suggestions.seo_description || data.seo_description,
    seo: {
      ...data.seo,
      seo_title: suggestions.seo_title || data.seo?.seo_title,
      seo_description: suggestions.seo_description || data.seo?.seo_description,
    },
    banner: {
      ...data.banner,
      title: suggestions.banner_title || data.banner.title,
      subtitle: suggestions.banner_subtitle || data.banner.subtitle,
      badge_text: suggestions.banner_badge_text || data.banner.badge_text,
    },
    solutions_title: suggestions.solutions_title || data.solutions_title,
    advisory: {
      ...data.advisory,
      title: suggestions.advisory_title || data.advisory.title,
      paragraph: suggestions.advisory_paragraph || data.advisory.paragraph,
    },
    cta_final: {
      ...data.cta_final,
      title: suggestions.cta_final_title || data.cta_final.title,
      paragraph: suggestions.cta_final_paragraph || data.cta_final.paragraph,
    },
    desktop_info: {
      ...data.desktop_info,
      title: suggestions.desktop_info_title || data.desktop_info.title,
      text: suggestions.desktop_info_text || data.desktop_info.text,
    },
  };
  setData(updatedData);
  dirtyRef.current = true;

  // Save direto para persistencia imediata
  if (id) {
    updateLandingPage(id, { data: updatedData })
      .then((ok) => {
        if (ok) console.log('Sugestoes do PDF salvas com sucesso');
        else console.warn('Falha ao salvar sugestoes do PDF');
      });
  }
}}
```

Mudanca principal: trocar `setData(prev => ...)` por construir `updatedData` a partir de `data` (mesmo padrao do `onApplyTable`) e chamar `updateLandingPage` diretamente.

## Acao necessaria do usuario

Apos a implementacao, **re-importar o PDF** para que os campos sejam preenchidos e persistidos corretamente.

## Impacto

- Todos os campos sugeridos pela IA (SEO, Banner, Advisory, CTA, Desktop Info) serao salvos imediatamente no banco
- Sem dependencia de debounce ou guardas de hidratacao
- Nenhuma alteracao no frontend visual
