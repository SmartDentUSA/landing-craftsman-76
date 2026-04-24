## Plano

1. Confirmar a causa no fluxo de republicação em massa
- Manter o botão `Republicar Tudo` usando o mesmo pipeline de publicação individual, mas identificar e tratar explicitamente os itens que hoje derrubam o lote.
- Basear a correção no comportamento já encontrado: o bulk está disparando publicações, porém alguns itens específicos falham e fazem parecer que “nada foi ao ar”.

2. Adicionar validação prévia por domínio antes do bulk
- Validar a configuração do domínio antes de iniciar cada publicação em massa.
- Para domínios Cloudflare, bloquear ou pular domínios com configuração inconsistente e registrar motivo legível.
- No caso atual, `printsafebr.com.br` já aparece com `cloudflare_status = error`, então o lote deve sinalizar isso antes de tentar publicar os itens desse domínio.

3. Melhorar o tratamento de erros no botão `Republicar Tudo`
- Ajustar `handleBulkRepublish` em `LPClonePanel.tsx` para separar claramente:
  - itens publicados com sucesso
  - itens pulados por configuração inválida
  - itens que falharam no Edge Function
- Mostrar no resumo final quais domínios/itens falharam e por quê, em vez de só dizer que houve erro genérico.
- Preservar o processamento dos demais itens válidos mesmo quando um domínio estiver com problema.

4. Endurecer a publicação backend para retornar motivo útil
- Revisar os Edge Functions envolvidos para garantir mensagens de erro mais diagnósticas no bulk, especialmente para Cloudflare.
- Validar melhor o domínio/projeto de destino antes de tentar deployment.
- Garantir que o erro devolvido ao frontend identifique domínio, path e causa, para que o lote não pareça silenciosamente quebrado.

5. Validar paridade entre manual e em massa
- Testar os mesmos registros publicados manualmente e via `Republicar Tudo`.
- Confirmar que:
  - itens válidos continuam indo ao ar no bulk
  - itens de domínios quebrados são marcados como falha explícita
  - o usuário recebe um resumo final confiável

## Achado principal
- O problema não parece ser o clique do botão em si.
- O bulk já está executando a mutation de publicação, mas os erros vistos no console apontam falhas em itens específicos.
- Os registros que encontrei com falha estão concentrados em `printsafebr.com.br`, incluindo:
  - `Sitemap — PrintSafe BR`
  - `RSS Feed — PrintSafe BR`
  - `Depoimentos — Smart Dent`
- A configuração desse domínio está marcada com `cloudflare_status: error`, o que é compatível com o comportamento observado.

## Detalhes técnicos
- Arquivos principais a ajustar:
  - `src/components/LPClonePanel.tsx`
  - `supabase/functions/publish-cloudflare-pages/index.ts`
  - possivelmente `supabase/functions/republish-domain-pages/index.ts` se o resumo/retorno do backend precisar ser enriquecido
- Estratégia de correção:
  - pré-checagem de domínio antes do bulk
  - resumo estruturado por domínio/item
  - mensagens de erro retornadas pelo backend com contexto suficiente
  - não deixar um domínio quebrado mascarar os sucessos do restante do lote