## Diagnóstico

A publicação do domínio `www.smartdent.com.br` está falhando dentro da Edge Function `publish-git-kinghost`.

Pelo log recente, o HTML é gerado, tracking é injetado e o caminho final é calculado como `index.html`, mas a etapa de GitHub falha aqui:

```text
GitHub API 404: Not Found
GET /repos/SmartDentUSA/landing-craftsman-76/git/ref/heads/stable-website
```

Isso indica que a função está tentando publicar na branch fixa `stable-website`, mas essa referência não existe, não está acessível pelo token atual, ou o repositório/branch mudou.

## Plano de correção

1. Atualizar `supabase/functions/publish-git-kinghost/index.ts`
   - Remover a dependência rígida da branch única `stable-website`.
   - Implementar resolução automática de branch:
     - tentar `stable-website` primeiro, para manter compatibilidade;
     - se não existir, tentar branches comuns como `main` e `master`;
     - se ainda falhar, consultar o repositório no GitHub e usar a `default_branch`.

2. Melhorar o erro retornado ao frontend
   - Quando nenhuma branch válida for encontrada, retornar mensagem clara explicando:
     - repositório alvo;
     - branches tentadas;
     - possível problema de permissão do `GITHUB_PAT_DEPLOY`;
     - possível branch ausente.

3. Preservar o fluxo atual de publicação
   - Continuar publicando `index.html` para homepage.
   - Continuar gerando `nav-data.js` quando houver páginas publicadas.
   - Continuar atualizando `cloned_landing_pages` com `publish_status`, `published_url` e erro quando necessário.
   - Não alterar banco de dados, domínio, HTML gerado ou tracking.

4. Validar por sinal correto
   - Conferir que a função passa a resolver uma branch válida antes de criar blob/tree/commit.
   - Após a alteração, o próximo teste de publicação deverá mostrar nos logs qual branch foi usada.

## Resultado esperado

A publicação de `www.smartdent.com.br` deixa de quebrar no erro 404 da branch `stable-website` e passa a usar automaticamente a branch existente do repositório GitHub.