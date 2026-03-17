

# Corrigir Tracking Pixels — Atualizar Banco de Dados

## Causa Raiz

O banco de dados **nunca foi atualizado** com a configuração correta. Estado atual:

| Campo | Valor atual | Valor necessário |
|-------|------------|-----------------|
| `google_tag_manager.enabled` | `false` | `true` |
| `tiktok_pixel.pixel_id` | `null` | `D05CI83C77UE5QUU9FR0` |
| `enable_fallback_pixels` | inexistente | `false` (ou `true` se quiser fallback) |

O código nos geradores está correto — todos chamam `generateTrackingHeadScripts()` que verifica `enabled === true` antes de injetar. Como está `false`, retorna string vazia.

## Plano

### Única alteração necessária: UPDATE no banco

Executar via SQL migration:

```sql
UPDATE company_profile 
SET tracking_pixels = '{
  "google_tag_manager": {"enabled": true, "container_id": "GTM-NZ64Q899", "note": "GTM principal - server-side tagging"},
  "google_analytics": {"enabled": false, "measurement_id": "G-59WWJQN34P", "note": "Gerenciado via GTM"},
  "meta_pixel": {"enabled": false, "pixel_id": "167413567155597", "note": "Fallback - controlado por enable_fallback_pixels"},
  "tiktok_pixel": {"enabled": false, "pixel_id": "D05CI83C77UE5QUU9FR0", "note": "Fallback - controlado por enable_fallback_pixels"},
  "enable_fallback_pixels": false
}'::jsonb;
```

Isso ativa o GTM imediatamente. Os geradores (E-commerce, SPIN, Blog, Clone LP, Git KingHost, FTP) já estão configurados para ler `tracking_pixels` e injetar via o módulo compartilhado.

### Resultado esperado após o UPDATE

- **GTM-NZ64Q899** será injetado no `<head>` + noscript após `<body>` em todas as páginas geradas
- **Meta Pixel + TikTok** ficam prontos mas só injetam se você mudar `enable_fallback_pixels` para `true`
- **Comentário de debug** aparece no topo do HTML

Nenhum arquivo de código precisa ser alterado — apenas o dado no banco.

