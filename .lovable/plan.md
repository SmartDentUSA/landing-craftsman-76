## Causa raiz da lentidão

A tabela `company_profile` tem **2 registros** quando o sistema exige **exatamente 1** (regra core do projeto):

| id | company_name | criado em |
|---|---|---|
| `3b20b85d…` | **Smart Dent** (real, em uso) | 2025-10-14 |
| `6f984e6c…` | **Nova Empresa** (lixo, vazio — sem email/site) | 2026-04-14 |

Isso quebra todas as queries que usam `.maybeSingle()` / `.single()` em `company_profile`, retornando o erro `PGRST116` visível no console:

```
❌ Error loading tracking config:
{ code: "PGRST116", message: "Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row" }
    at getTrackingConfig (src/lib/tracking-injector.ts:12)
```

`company_profile` é consumido em **34 arquivos** (hooks de vídeos, reviews, links institucionais, target audience, NPS metrics, tracking, template engine, blog editor, LP publish, code view, etc.). Toda página que monta o Dashboard/LP/Blog dispara várias dessas queries em paralelo — **todas falhando** → React Query tenta retry → re-renders em cascata → sistema travado.

Não tem relação com o deploy do `knowledge-export-full` (esse é backend, não é chamado pelo frontend). A coincidência de timing é só percepção.

## Correção (1 migration)

Deletar o registro duplicado "Nova Empresa" (vazio, nunca foi preenchido):

```sql
DELETE FROM public.company_profile
WHERE id = '6f984e6c-8bec-4dc9-a81e-9d29e9714909'
  AND company_name = 'Nova Empresa';
```

Manter apenas o registro real `3b20b85d…` (Smart Dent).

## Proteção futura (opcional, recomendado)

Adicionar constraint para impedir que isso volte a acontecer:

```sql
CREATE UNIQUE INDEX company_profile_singleton
  ON public.company_profile ((true));
```

Isso garante que só pode existir 1 linha na tabela — qualquer INSERT extra falha imediatamente, em vez de quebrar o app silenciosamente. Alinhado com a regra core "company_profile MUST contain exactly ONE record".

## Validação

1. Recarregar `/dashboard` — o erro `PGRST116` no console deve sumir.
2. Navegação geral deve voltar à velocidade normal.
3. `SELECT COUNT(*) FROM company_profile` → deve retornar `1`.

## Fora do escopo

- Não mexer no `knowledge-export-full` (está funcionando, não é a causa).
- Não alterar nenhum hook/componente — o código está correto, o dado é que está inválido.
