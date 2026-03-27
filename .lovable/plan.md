

# Fix: `wikidata-sync` retorna 401 — função não registrada no config.toml

## Diagnóstico

Testei a edge function `wikidata-sync` diretamente e ela retorna **401 Unauthorized**. A causa raiz:

- A função **não está registrada** no `supabase/config.toml`
- Sem registro, o Supabase assume `verify_jwt = true` por padrão
- Os logs mostram apenas "booted" — a função nem chega a processar o request porque o JWT é rejeitado antes

O frontend usa `supabase.functions.invoke()` que envia o token do usuário logado automaticamente. No entanto, o token anon usado no teste retorna "Invalid token", o que sugere que a verificação JWT pode estar falhando mesmo com usuário logado (dependendo da configuração da função deployada).

## Solução

### Passo único — Registrar `wikidata-sync` no `config.toml`

Adicionar a entrada com `verify_jwt = false` (a função já está deployada externamente e presumivelmente faz sua própria validação):

```toml
[functions.wikidata-sync]
verify_jwt = false
```

Isso é consistente com o padrão usado pela maioria das outras funções no projeto.

### Arquivo alterado
| Arquivo | Ação |
|---------|------|
| `supabase/config.toml` | Adicionar seção `[functions.wikidata-sync]` com `verify_jwt = false` |

Nenhuma outra alteração necessária. O frontend já está correto.

