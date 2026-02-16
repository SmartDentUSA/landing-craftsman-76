

# Plano: Exportar Todos os Banners HTML5 de Uma Vez

## Problema Atual

O botao "Baixar Todos" ja existe, mas dispara todos os downloads simultaneamente -- navegadores modernos bloqueiam downloads multiplos sem intervalo.

## Solucao

Alterar `handleDownloadAll` em `DisplayBannerGenerator.tsx` para:

1. Adicionar atraso de 500ms entre cada download (padrao ja usado no projeto para evitar bloqueio do navegador)
2. Mostrar progresso visual durante o download sequencial ("Baixando 3/16...")
3. Desabilitar o botao durante o processo

### Alteracao no arquivo: `src/components/google-ads/DisplayBannerGenerator.tsx`

- Adicionar state `isDownloading` (boolean)
- Reescrever `handleDownloadAll` para usar `async/await` com `setTimeout` de 500ms entre cada arquivo
- Atualizar o botao "Baixar Todos" para mostrar progresso e ficar desabilitado durante download

### Secao Tecnica

Logica do download sequencial:

```text
handleDownloadAll:
  isDownloading = true
  for each banner (i):
    handleDownload(banner)
    if not last: await sleep(500ms)
  isDownloading = false
  toast("X arquivos baixados")
```

O botao mostra `<Loader2 spin />` + "Baixando X/Y..." enquanto `isDownloading = true`.

Apenas 1 arquivo modificado: `src/components/google-ads/DisplayBannerGenerator.tsx`.

