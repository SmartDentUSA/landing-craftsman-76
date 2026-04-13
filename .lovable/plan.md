
Objetivo

Corrigir o fluxo do gerador de descrição e-commerce para que o HTML seja gerado com sucesso e só então possa ser enviado para a Loja Integrada.

O que foi confirmado

- O erro atual acontece antes do envio para a Loja Integrada.
- O replay da sessão mostra a UI travando em “Gerando HTML com IA...” e depois retornando erro da Edge Function.
- Os logs do `generate-ecommerce-html` mostram claramente:
  `ReferenceError: companyData is not defined`
- No código atual de `supabase/functions/generate-ecommerce-html/index.ts`, a função `buildEcommerceHTML` recebe `company`, mas ainda existem referências órfãs a `companyData`.

Raiz do problema

Há uma correção incompleta no arquivo do gerador:
- `buildEcommerceHTML(...)` já voltou a usar `company`
- porém ainda restam referências a `companyData`, inclusive dentro do fluxo ativo
- isso faz a geração falhar antes de salvar o HTML e antes do botão de envio para a Loja Integrada conseguir avançar

Plano de implementação

1. Corrigir o erro ativo no gerador
- Substituir as referências restantes de `companyData` por `company` dentro do fluxo realmente executado de `buildEcommerceHTML`
- Corrigir especialmente o bloco final de Wikidata/Thing schema, que ainda usa `companyData`

2. Higienizar helpers para não quebrar de novo
- Revisar `generateProductSchema` e `buildSEOHead`
- Padronizar esses helpers para receber o perfil da empresa explicitamente, ou remover referências fora de escopo
- Garantir que não exista mais mistura entre `company`, `companyData` e `companyName` implícito

3. Redeploy e validação da geração
- Publicar novamente `generate-ecommerce-html`
- Testar a geração do mesmo produto do erro
- Confirmar nos logs:
  - fim da geração sem exception
  - HTML salvo em `products_repository.ecommerce_html`
  - UI entrando no estado “HTML E-commerce Gerado”

4. Validar envio para Loja Integrada
- Depois da geração funcionar, testar o botão “Enviar Loja Integrada”
- Se aparecer novo erro, aí sim investigar `update-loja-integrada-product` com logs e resposta da API

Detalhes técnicos

- Arquivo principal: `supabase/functions/generate-ecommerce-html/index.ts`
- O problema atual não indica falha no PUT da Loja Integrada; o fluxo quebra antes, na geração do HTML
- Há sinais de referências órfãs em blocos de schema/SEO que precisam ser normalizadas no mesmo ajuste para evitar nova regressão
