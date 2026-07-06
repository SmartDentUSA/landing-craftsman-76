## Problema

No modal "Editar Produto", ao adicionar imagens na **Galeria de Imagens** e salvar, as imagens somem ao reabrir o produto.

## Causa raiz

`RepositoryPanel.tsx` define as listas de colunas usadas em todos os `select()` do repositório:

- `PRODUCT_REPOSITORY_LIST_COLUMNS` (linha 114) — usado na listagem
- `PRODUCT_REPOSITORY_EDIT_COLUMNS` (linha 122) — usado ao abrir um produto para edição

Nenhuma das duas listas inclui `images_gallery`. O `ProductEditModal` grava a coluna corretamente no banco (linha 1894), mas quando o produto é relido (linha 615 do `RepositoryPanel`, `.select(PRODUCT_REPOSITORY_EDIT_COLUMNS)`), o campo não vem, e `setImagesGallery((product as any).images_gallery || [])` cai no `[]`. Resultado: parece que sumiu.

O mapeamento em `RepositoryPanel.tsx:464` (`images_gallery: Array.isArray(data.images_gallery) ? … : []`) confirma que o código espera o campo, mas ele nunca é solicitado no SELECT.

## Correção

Adicionar `images_gallery` a `PRODUCT_REPOSITORY_EDIT_COLUMNS` em `src/components/RepositoryPanel.tsx` para que o campo seja carregado ao abrir o modal de edição.

Opcionalmente incluir também em `PRODUCT_REPOSITORY_LIST_COLUMNS` apenas se a listagem precisar da galeria (não é o caso deste bug — vou deixar de fora para não ampliar o payload).

## Validação

1. Abrir um produto no `/repository`.
2. Adicionar uma imagem na Galeria de Imagens → salvar.
3. Fechar o modal e reabrir o mesmo produto.
4. Confirmar que a imagem persiste na galeria.

## Detalhes técnicos

- Arquivo alterado: `src/components/RepositoryPanel.tsx`
- Mudança: incluir `'images_gallery'` na constante `PRODUCT_REPOSITORY_EDIT_COLUMNS`.
- Sem alteração de esquema (coluna já existe em `products_repository`).
- Sem alterações no `ProductEditModal` — o save já grava corretamente.