
# Adicionar Botão Salvar nas Edições do Carrossel Visual

## Problema Identificado

Existem **dois níveis** de "sem salvar":

### Nível 1 — Editor inline de cada slide (SlideWrapper) não tem botão Salvar
Em `StrategicCarouselPreview.tsx` (linha 208–228), o editor abre com campos de texto, o usuário edita, mas **só há o botão de toggle (✏️)** — não há um botão "Salvar" ou "Aplicar" dentro do editor. O usuário não sabe se as alterações foram aplicadas. A atualização acontece via `onChange` em tempo real (o que é bom), mas visualmente parece que nada foi salvo.

### Nível 2 — Nenhuma função salva `slideTexts` no banco Supabase
Comparando com `saveFeedVariation`, `saveReelsVariation` e `saveStory` (linhas 756–880), o carrossel visual **não possui equivalente**. O objeto `slideTexts` nunca é gravado em `products_repository.instagram_copies`. Ao fechar e reabrir o modal, os textos editados são perdidos (o `useEffect` reinicializa `slideTexts` com `buildDefaultSlideTexts()`).

## Solução Completa

### Parte 1 — Botão "✓ Aplicar" dentro do editor inline de cada slide (`StrategicCarouselPreview.tsx`)

Adicionar um botão "✓ Aplicar" no rodapé do painel do editor (dentro do `SlideWrapper`, após o mapeamento dos `fields`). Ao clicar, o editor fecha (`setEditorOpen(false)`) e mostra visualmente que as alterações foram capturadas. **As edições já são aplicadas via `onChange` em tempo real**, então o botão apenas fecha o editor com feedback visual claro.

```jsx
// No final do bloco {editorOpen && ...}:
<div className="flex justify-end pt-2 border-t border-border">
  <button
    onClick={() => setEditorOpen(false)}
    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium"
  >
    ✓ Aplicar
  </button>
</div>
```

### Parte 2 — Função `saveVisualCarouselTexts()` no Supabase (`InstagramCopyGenerator.tsx`)

Nova função que persiste `slideTexts` em `products_repository.instagram_copies.visual_carousel_texts`:

```ts
const saveVisualCarouselTexts = async () => {
  setSavingVisualCarousel(true);
  try {
    const { data: existingData } = await supabase
      .from('products_repository')
      .select('instagram_copies')
      .eq('id', productId)
      .single();

    const existingCopies = (existingData?.instagram_copies as any) || {};

    const { error } = await supabase
      .from('products_repository')
      .update({
        instagram_copies: {
          ...existingCopies,
          visual_carousel_texts: slideTexts,
          visual_carousel_colors: { primaryColor, accentColor },
          visual_carousel_font: { fontFamily, fontSize },
          last_updated: new Date().toISOString(),
        } as any
      })
      .eq('id', productId);

    if (error) throw error;

    toast({ title: "Salvo!", description: "Textos do Carrossel Visual salvos com sucesso." });
  } catch (error) {
    toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
  }
  setSavingVisualCarousel(false);
};
```

### Parte 3 — Carregar `slideTexts` salvos ao abrir o modal

Modificar o `useEffect([isOpen])` para, ao abrir o modal, verificar se existem `visual_carousel_texts` no banco e usar esses dados em vez de `buildDefaultSlideTexts()`:

```ts
useEffect(() => {
  if (!isOpen) return;
  // Carregar imagens
  if (productImages?.length > 0) {
    const map: Record<number, string> = {};
    for (let i = 1; i <= 6; i++) {
      map[i] = productImages[(i - 1) % productImages.length].url;
    }
    setSlideImageMap(map);
  }
  // Carregar textos salvos (ou defaults)
  const loadSaved = async () => {
    const { data } = await supabase
      .from('products_repository')
      .select('instagram_copies')
      .eq('id', productId)
      .single();
    const copies = data?.instagram_copies as any;
    if (copies?.visual_carousel_texts) {
      setSlideTexts(copies.visual_carousel_texts);
      if (copies.visual_carousel_colors) {
        setPrimaryColor(copies.visual_carousel_colors.primaryColor || '#1a1a2e');
        setAccentColor(copies.visual_carousel_colors.accentColor || '#e94560');
      }
      if (copies.visual_carousel_font) {
        setFontFamily(copies.visual_carousel_font.fontFamily || 'system-ui, -apple-system, sans-serif');
        setFontSize(copies.visual_carousel_font.fontSize || 100);
      }
    } else {
      setSlideTexts(buildDefaultSlideTexts());
    }
  };
  loadSaved();
}, [isOpen]);
```

### Parte 4 — Botão "💾 Salvar Carrossel" no header do Card

Adicionar ao lado dos botões "🤖 Gerar com IA" e "📦 Baixar ZIP" (linha ~1713):

```jsx
<Button
  onClick={saveVisualCarouselTexts}
  disabled={savingVisualCarousel}
  size="sm"
>
  {savingVisualCarousel ? (
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
  ) : (
    <Save className="h-4 w-4 mr-2" />
  )}
  💾 Salvar
</Button>
```

O botão "Salvar" usa variante `default` (azul/destaque) para se destacar dos botões outline ao lado, deixando claro que é a ação principal.

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|---------|
| `src/components/InstagramCopyGenerator.tsx` | (1) Adicionar estado `savingVisualCarousel`, (2) Função `saveVisualCarouselTexts()`, (3) Atualizar `useEffect([isOpen])` para carregar do banco, (4) Botão "💾 Salvar" no header do Card |
| `src/components/StrategicCarouselPreview.tsx` | Adicionar botão "✓ Aplicar" no rodapé do editor inline de cada slide |

## Resultado

- Usuário edita textos no slide → `onChange` atualiza estado em tempo real → preview atualiza → botão "✓ Aplicar" fecha o editor com feedback claro
- Usuário clica "💾 Salvar" → `slideTexts` + cores + fonte salvos em `products_repository.instagram_copies.visual_carousel_texts`
- Na próxima vez que o modal abre → textos salvos são restaurados automaticamente
- Cores e fonte também são persistidas junto
