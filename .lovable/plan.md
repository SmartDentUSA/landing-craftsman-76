

## Checklist de Produtos - Arquivo .md

### O que será gerado

Um arquivo Markdown (`/mnt/documents/checklist_produtos_smartdent.md`) com:

1. **Resumo executivo** - totais gerais (120 produtos, cobertura por campo)
2. **Tabela por categoria** - cada produto com ✅/❌ para 27 campos de conteúdo agrupados em:
   - **Dados Básicos**: Descrição, Preço, Imagem, URL, Marca
   - **Conteúdo Rico**: Pitch, Keywords, Benefícios, Features, Público, FAQ, Specs
   - **SEO**: Title, Description, Slug, Canonical
   - **Mídia**: YouTube, Instagram, Vídeos Técnicos, Legendas
   - **Documentação**: Docs Técnicos, Transcrições, Workflow, Concorrentes
   - **Conteúdo Gerado**: WhatsApp, Instagram Copies, YouTube Desc, Blog, E-commerce HTML
3. **Produtos críticos** - lista dos que têm mais campos faltantes para priorização

### Implementação

Um script Python que:
1. Consulta `products_repository` via `psql`
2. Monta o Markdown com tabelas organizadas por categoria/subcategoria
3. Salva em `/mnt/documents/checklist_produtos_smartdent.md`

### Dados já coletados
- 120 produtos, 8 categorias
- Cobertura geral: Descrição 95%, Preço 100%, Imagem 93%, SEO Title 98%, Slug 98%
- Campos mais deficientes: `technical_documents`, `tags`, `canonical_url`

