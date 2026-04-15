

## Plano: Publicar redirect smartdent.com.br/support-resources → parametros.smartdent.com.br/support-resources

### O que será feito

1. Inserir um registro na tabela `cloned_landing_pages` com o HTML de redirect para o domínio `smartdent.com.br` no path `/support-resources`
2. Chamar a Edge Function `publish-git-kinghost` para fazer o commit do HTML no repositório Git (branch `stable-website`)

### HTML do redirect

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=https://parametros.smartdent.com.br/support-resources">
  <link rel="canonical" href="https://parametros.smartdent.com.br/support-resources">
  <title>Redirecionando...</title>
  <script>window.location.href="https://parametros.smartdent.com.br/support-resources";</script>
</head>
<body>
  <p>Redirecionando para <a href="https://parametros.smartdent.com.br/support-resources">parametros.smartdent.com.br/support-resources</a>...</p>
</body>
</html>
```

### Execução

1. Inserir registro via Supabase (insert em `cloned_landing_pages` com `target_domain='smartdent.com.br'`, `page_path='/support-resources'`)
2. Invocar `publish-git-kinghost` via `curl` com o HTML acima, `pagePath=/support-resources`, `domain=smartdent.com.br`
3. Confirmar que o commit foi criado e a URL está ativa

### Resultado
QR Code apontando para `smartdent.com.br/support-resources` redirecionará instantaneamente para `parametros.smartdent.com.br/support-resources`.

