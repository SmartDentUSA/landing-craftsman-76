

# Fix: column `products_repository.image_alt` does not exist

## Causa raiz

O `ProductEditModal.tsx` usa o campo `image_alt` no formulário e tenta salvá-lo via auto-save, mas essa coluna **nunca foi criada** na tabela `products_repository` do Supabase.

## Solução

### Passo 1 — Criar a coluna no banco (migration)

```sql
ALTER TABLE public.products_repository 
ADD COLUMN IF NOT EXISTS image_alt TEXT;
```

Isso resolve o erro imediatamente. O campo já está mapeado corretamente no frontend — só faltava a coluna no banco.

### Arquivos afetados
| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Adicionar coluna `image_alt` tipo TEXT |

Nenhuma alteração de código necessária — o frontend já lê e grava `image_alt` corretamente.

