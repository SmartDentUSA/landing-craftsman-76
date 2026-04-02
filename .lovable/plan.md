

## Fix: Lista de produtos vazia + Respostas de reviews falhando

### Problema 1: Lista de produtos nao aparece no YouTube

**Causa raiz**: O codigo em `GoogleApisTab.tsx` linha 342 usa `.eq('is_active', true)` mas a coluna real na tabela `products_repository` se chama `active` (confirmado via erro SQL). Resultado: query retorna 0 produtos, select fica vazio.

**Fix**: Trocar `is_active` por `active` na query de produtos (linha 342).

### Problema 2: Envio de respostas nao funciona

Existem 2 sub-problemas:

**2a) "Gerar Respostas" diz 0 geradas**: Todas as 30 reviews ja tem resposta em `review_responses` (30/30). Nao ha reviews novas para processar. O botao funciona, mas nao ha trabalho a fazer. As 20 "pendentes" que o usuario ve sao na verdade respostas com `status: failed` (todas as 30 estao com status `failed`).

**2b) "Postar Pendentes" falha**: Os logs mostram `No valid Google Business token found`. A tabela `oauth_credentials` esta vazia e os tokens antigos expiraram. Sem token valido, a funcao marca todas como `failed` com mensagem "OAuth nao configurado".

**Fix para 2a**: Resetar as 30 respostas falhadas para `pending` para que possam ser re-postadas quando o OAuth estiver configurado. Tambem corrigir o badge na UI — o card mostra "20 pendentes" mas na verdade sao `failed`, o que confunde.

**Fix para 2b**: O OAuth precisa ser reconectado (problema separado ja em andamento). Porem, a UI deve mostrar claramente que o problema e OAuth, nao "sem respostas".

### Alteracoes

| Arquivo | O que muda |
|---|---|
| `src/components/repository/GoogleApisTab.tsx` | Linha 342: trocar `is_active` por `active`. Adicionar badge para respostas `failed`. Adicionar botao "Retentar Falhadas" que reseta status de `failed` para `pending`. |

### Resultado esperado
- Select de produtos mostra os 120 produtos ativos
- UI mostra claramente quantas respostas falharam vs pendentes
- Botao "Retentar" permite re-postar quando OAuth estiver configurado

