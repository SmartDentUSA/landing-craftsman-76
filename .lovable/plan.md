

## Fix: Publicação com URL personalizada — trimming e link de resultado

### Problemas identificados

1. **Trailing space no path**: O `customPath` não é sanitizado — o registro no banco mostra `page_path: "/suport-resurces "` (com espaço no final), o que gera URLs quebradas
2. **Sem link clicável após publicar**: O toast só mostra texto "está sendo publicada em..." mas não gera um link clicável para o usuário acessar a página publicada

### Alterações

**Arquivo: `src/components/LPPublishDialog.tsx`**

1. **Sanitizar `customPath`**: Aplicar `.trim()` no `pagePath` e `previewUrl` quando `selectedCategory === 'custom'`, e também sanitizar no `onChange` do input
2. **Toast com link clicável**: Após publicação bem-sucedida, mostrar a URL final como link clicável no toast (usando `description` com a URL completa) e/ou adicionar um botão "Copiar Link" que copia a URL para o clipboard
3. **Atualizar `publish_status` para `published`**: Após a Edge Function retornar sucesso, atualizar o registro em `cloned_landing_pages` com `publish_status: 'published'`

### Detalhes

- No `pagePath` useMemo: adicionar `.trim()` ao resultado do customPath
- No `handlePublish`: após sucesso da edge function, mostrar toast com `action` contendo botão "Abrir" que abre `previewUrl` em nova aba
- Sanitizar slug também com `.trim()` por precaução

