

## Plano: Publicar redirect smartdent.com.br/manuais → parametros.smartdent.com.br/support-resources

Mesmo processo usado para `/support-resources`: invocar `publish-git-kinghost` com HTML de redirect no path `/manuais`.

### HTML

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

1. Chamar `publish-git-kinghost` via `curl` com `pagePath=/manuais`, `domain=smartdent.com.br`, e o HTML acima
2. Confirmar commit criado no branch `stable-website`

### Resultado
`smartdent.com.br/manuais` redirecionará instantaneamente para `parametros.smartdent.com.br/support-resources`.

