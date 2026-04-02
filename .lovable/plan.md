
## Corrigir Google APIs logado pelo Google, mas sem funcionar

### Diagnóstico resumido
O problema não é “login Google”. O login do usuário está separado das credenciais usadas pelas integrações Google APIs.

Hoje existem 4 quebras principais no fluxo:

1. **OAuth salvo em uma tabela, consumo em outra**
   - As telas de OAuth salvam em `oauth_credentials`
   - As edge functions críticas (`respond-review-ai`, `update-youtube-metadata`, `refresh-google-token`, `_shared/google-auth.ts`) ainda dependem de `google_oauth_tokens`
   - Resultado: usuário conecta, mas as funções dizem que OAuth não está configurado

2. **Callback OAuth volta para `/repository`, mas o processamento do código está nas páginas erradas**
   - `OAuthCallback.tsx` redireciona para `/repository`
   - Porém quem escuta `openOAuthModal/code` são `GoogleBusinessOAuthSettings.tsx` e `YouTubeOAuthSettings.tsx`
   - Resultado: o código OAuth chega, mas muitas vezes não é trocado por refresh token no lugar certo

3. **YouTube usa fonte antiga para testar**
   - `test-youtube-connection` ainda busca `youtube_oauth_credentials`
   - A UI nova salva em `oauth_credentials`
   - Resultado: YouTube parece desconectado mesmo após configurar

4. **Google Reviews posta no endpoint antigo**
   - `respond-review-ai` usa `mybusiness.googleapis.com/v4/.../reply`
   - O projeto já está migrando para APIs novas em outros pontos
   - Mesmo com token válido, isso pode falhar ou ficar inconsistente

### O que vou implementar

#### 1) Unificar a leitura de credenciais Google
Criar/ajustar a camada compartilhada para que **todas** as funções Google leiam primeiro de `oauth_credentials` e só usem `google_oauth_tokens` como fallback temporário.

Arquivos:
- `supabase/functions/_shared/google-auth.ts`
- `supabase/functions/refresh-google-token/index.ts`

Objetivo:
- Buscar credenciais por usuário e provider (`google_business` / `youtube`)
- Fazer refresh com `GOOGLE_CLIENT_ID/SECRET` ou com credenciais salvas do usuário, conforme o fluxo já existente
- Parar de depender exclusivamente de `google_oauth_tokens`

#### 2) Corrigir o callback OAuth no front
Mover o processamento do retorno OAuth para o fluxo que realmente recebe o redirecionamento.

Arquivos:
- `src/pages/OAuthCallback.tsx`
- `src/pages/Repository.tsx`
- possivelmente `src/components/OAuthSettingsCard.tsx`

Objetivo:
- Quando o callback voltar com `code`, abrir a aba correta e encaminhar o código para o componente certo
- Garantir que o token seja efetivamente salvo em `oauth_credentials`
- Eliminar o estado “logado no Google, mas sem integração ativa”

#### 3) Corrigir testes de conexão
Padronizar testes de Google Business e YouTube para a mesma origem de dados.

Arquivos:
- `supabase/functions/test-youtube-connection/index.ts`
- `supabase/functions/test-google-business-connection/index.ts`

Objetivo:
- YouTube passar a ler `oauth_credentials`
- Google Business manter leitura coerente com o novo fluxo
- Mensagens de erro ficarem claras: sem credencial, token expirado, escopo faltando, client inválido

#### 4) Corrigir postagem de respostas de reviews
Atualizar a função para usar token válido do novo fluxo e revisar o endpoint de reply.

Arquivo:
- `supabase/functions/respond-review-ai/index.ts`

Objetivo:
- Gerar/postar respostas reais usando o token correto
- Continuar usando a lógica já certa de “reviews sem resposta IA”, não a presença de resposta manual do dono
- Melhorar logs para diferenciar: sem token, endpoint Google falhou, review sem identificador válido

#### 5) Corrigir pipeline do YouTube
Fazer a geração e aplicação dependerem de credenciais consistentes e validação real de item.

Arquivo:
- `supabase/functions/update-youtube-metadata/index.ts`

Objetivo:
- Usar o mesmo resolvedor de token compartilhado
- Evitar fila “presa” por credencial aparentemente conectada mas não utilizável
- Manter a validação de `product_id`

#### 6) Melhorar SEO Local para parecer SmartDent de verdade
A função já injeta alguns produtos reais, mas ainda deixa o layout muito genérico porque o HTML final fica por conta do modelo sem um template visual mais rígido.

Arquivo:
- `supabase/functions/generate-local-seo-page/index.ts`

Objetivo:
- Forçar estrutura branded:
  - header com marca SmartDent
  - hero com proposta real da empresa
  - cards de produtos reais com imagem real
  - bloco de diferenciais da SmartDent
  - CTA e visual mais profissional
- Reduzir páginas “genéricas” mesmo quando houver poucos produtos compatíveis

### Ordem de implementação
1. Unificar token/refresh em `_shared/google-auth.ts` e `refresh-google-token`
2. Corrigir callback OAuth no front
3. Corrigir `test-youtube-connection` e alinhar testes
4. Corrigir `respond-review-ai`
5. Corrigir `update-youtube-metadata`
6. Reforçar template branded em `generate-local-seo-page`

### Resultado esperado
- Usuário pode estar logado com Google e também ter a integração realmente ativa
- Google Business passa a funcionar para postar respostas
- YouTube deixa de parecer “desconectado” falsamente
- SEO Local passa a gerar páginas com cara de SmartDent, usando logo/branding/produtos reais
- O hub “Google APIs” finalmente reflete o estado real das integrações

### Detalhes técnicos
```text
Situação atual:
Login Google do app -> OK
OAuth integrações -> salvo em oauth_credentials
Funções backend -> ainda leem google_oauth_tokens / tabela antiga
Callback -> volta para /repository, mas listener fica em outra tela

Situação corrigida:
Login Google do app -> independente
OAuth integrações -> salvo e lido de oauth_credentials
Shared token resolver -> centralizado
Callback -> processado onde o usuário realmente retorna
Reviews / YouTube / SEO -> usam a mesma base correta
```

Risco principal:
- há coexistência de fluxos antigos e novos; vou preservar compatibilidade temporária com fallback para não quebrar credenciais já existentes durante a transição.
