# Investigar e corrigir "Confirmar agendamento"

## O que eu verifiquei

Busquei em todo o código deste projeto (Sistema A / parametros.smartdent.com.br) por qualquer tela de agendamento e **não existe**:

- Nenhum texto "Confirmar agendamento", "Agendar" ou "Publicar depois" em `src/`.
- Nenhum campo `scheduled_at` / `scheduled_for` / `publish_at` usado no frontend.
- Os únicos botões de publicação são imediatos: "Publicar post GBP" (`src/components/repository/GoogleApisTab.tsx`, chama `publish-gbp-post`) e os fluxos de publicação de landing pages/blog.
- Os únicos diálogos de "Confirmar" existentes são de exclusão (CSManager, AfterSalesManager).

Ou seja: o botão que você está clicando **não pertence a este projeto** — muito provavelmente está no Sistema B / SmartOps (`okeogjgqijbfkudfjadz`), que é onde ficam os fluxos de WhatsApp/Copilot/leads, ou em uma ferramenta externa.

## Plano (em duas etapas)

### Etapa 1 — Localizar a origem real do botão (rápida, sem alterar nada)
1. Consultar os logs de Edge Functions e os logs HTTP recentes do Sistema B para identificar qual função é chamada (ou falha) no momento do clique em "Confirmar agendamento".
2. Se a chamada nem sai do navegador, confirmar pelos logs de rede/console do app onde a tela vive — indicando erro de validação, RLS ou botão em estado `disabled`.
3. Reportar a causa exata (função, tabela, erro) antes de qualquer correção.

Como o Sistema B é **read-only e imutável** por regra do projeto, qualquer correção lá é aplicada por você/no painel do Supabase — eu entrego o diagnóstico e o SQL/ajuste necessário.

### Etapa 2 — Se a intenção for ter agendamento aqui no Sistema A
Caso o que você queira seja agendar publicações dentro deste sistema (ex.: post GBP / blog / carrossel em data futura), eu implemento:
1. Campo de data/hora no fluxo de publicação existente, gravando `scheduled_at` + `status = 'scheduled'`.
2. Botão "Confirmar agendamento" com validação (data futura obrigatória), toast de sucesso/erro e log de erro visível — sem falhas silenciosas.
3. Worker/cron horário que publica somente itens com `scheduled_at <= now()` e `status = 'scheduled'`, marcando como `published` para evitar reenvio duplicado.

## Detalhes técnicos
- Diagnóstico via `supabase--edge_function_logs` e `analytics_query` (function_edge_logs) do projeto correspondente.
- Se implementado no Sistema A: migração adicionando `scheduled_at timestamptz` e status `scheduled` na tabela de publicação alvo, com GRANTs e RLS mantidos; reaproveitando `publish-gbp-post` / `publish-blog-post` no worker.

## Bloqueio
Para a Etapa 1 preciso saber em qual tela/app o botão aparece (print ou URL). Sem isso, eu começo consultando os logs do Sistema B por suspeita mais provável.
