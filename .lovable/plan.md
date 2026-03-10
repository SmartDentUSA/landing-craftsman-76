

# Adicionar botão "Despublicar" no card de Landing Pages do Dashboard

## O que será feito

Adicionar um botão "Despublicar" nos cards de LP do Dashboard (`src/pages/Dashboard.tsx`) que aparece apenas quando a LP está publicada. Ao clicar, confirma com o usuário e chama a Edge Function `unpublish-pages` para remover do servidor, igual ao que já existe no `LPClonePanel`.

## Mudanças — `src/pages/Dashboard.tsx`

### 1. Adicionar imports
- `Loader2` do lucide-react
- `useMutation`, `useQueryClient` do `@tanstack/react-query`

### 2. Adicionar mutation de despublicação
Reutilizar a mesma lógica do `LPClonePanel`:
```typescript
const unpublishMutation = useMutation({
  mutationFn: async (lpId: string) => {
    // Buscar o cloned_landing_pages.id pelo source_landing_page_id
    const { data: cloned } = await supabase
      .from('cloned_landing_pages')
      .select('id')
      .eq('source_landing_page_id', lpId)
      .eq('publish_status', 'published')
      .single();
    if (!cloned) throw new Error('Publicação não encontrada');
    
    const { data, error } = await supabase.functions.invoke('unpublish-pages', {
      body: { lpId: cloned.id, entityType: 'lp' }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Erro');
  },
  onSuccess: () => {
    toast({ title: 'Despublicado com sucesso!' });
    // Refresh publishedMap
    fetchPublishedInfo(); // need to extract this
  },
  onError: (error) => {
    toast({ title: 'Erro ao despublicar', description: error.message, variant: 'destructive' });
  }
});
```

### 3. Extrair `fetchPublishedInfo` para função reutilizável
Atualmente está inline no `useEffect`. Extrair para um `useCallback` que pode ser chamado após despublicação.

### 4. Adicionar botão no card (após o badge "Publicado", na área de ações)
Quando `publishedMap[landingPage.id]?.publish_status === 'published'`, mostrar botão vermelho "Despublicar" com ícone e confirmação via `window.confirm`.

```tsx
{publishedMap[landingPage.id]?.publish_status === 'published' && (
  <Button
    variant="destructive"
    size="sm"
    onClick={() => {
      if (window.confirm('Despublicar esta LP? O conteúdo será removido do servidor.')) {
        unpublishMutation.mutate(landingPage.id);
      }
    }}
    disabled={unpublishMutation.isPending}
  >
    {unpublishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
    Despublicar
  </Button>
)}
```

### Arquivo alterado
- `src/pages/Dashboard.tsx`

