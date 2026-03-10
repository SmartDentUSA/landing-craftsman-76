

# Diagnóstico: O GitHub Actions está sobrescrevendo os HTMLs da Edge Function

## Problema raiz

Existem **dois sistemas escrevendo na mesma branch `stable-website`** e se sobrescrevendo:

1. **Edge Function `publish-git-kinghost`** — commita HTML das landing pages diretamente na `stable-website` via GitHub API (correto)
2. **GitHub Actions workflow** (`lovable-deploy.yml`) — a cada push no `main`, faz `npm run build` e deploya `dist/` na `stable-website` com `clean: true`, **apagando tudo** que a Edge Function commitou

O `clean: true` na linha 53 do workflow é destrutivo: ele substitui todo o conteúdo da `stable-website` pelo `dist/` do Vite (que é um React SPA, não os HTMLs estáticos das landing pages).

```text
Fluxo atual (quebrado):
Edge Function → commit HTML em stable-website ✓
Lovable push main → Actions build → clean: true → APAGA tudo → deploya SPA React ✗
```

## Solução: Remover o workflow

O workflow não é necessário. A Edge Function já commita os HTMLs finais diretamente na `stable-website`, e a KingHost/Hostinger sincroniza essa branch. O workflow só atrapalha.

### Alteração

**Deletar** `.github/workflows/lovable-deploy.yml`

Isso resolve o problema porque:
- A Edge Function continua commitando HTMLs standalone (com `<html>`, `<body>`, CSS inline, etc.) na `stable-website`
- A Hostinger sincroniza a `stable-website` e serve os HTMLs diretamente
- Nenhum build de SPA React interfere mais

### Alternativa (se quiser manter o workflow por outro motivo)

Se por alguma razão o workflow for necessário para outros fins, mudar `clean: true` para `clean: false` e adicionar `clean-exclude` para preservar os HTMLs das landing pages. Mas isso adiciona complexidade desnecessária.

