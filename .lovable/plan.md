

# Enviar HTML da Landing Page SPIN para a Biblioteca LP Clone & Blogs

## O que sera feito

Adicionar um botao "Enviar para Biblioteca" no Editor Visual da Landing Page SPIN (`SpinLandingPageEditablePreview`) que salva o HTML completo na tabela `cloned_landing_pages`, fazendo com que a LP apareca na aba "LP Clone & Blogs" do Repositorio, pronta para publicacao em qualquer dominio configurado no Cloudflare Pages.

## Como vai funcionar

1. O usuario abre o Editor Visual da Landing Page SPIN
2. Clica no novo botao "Enviar para Biblioteca" (icone de foguete/globe)
3. O sistema sanitiza o HTML atual do iframe (removendo artefatos do editor)
4. Insere um registro na tabela `cloned_landing_pages` com o HTML transformado
5. A LP aparece automaticamente na aba "LP Clone & Blogs" com status "draft"
6. De la, o usuario pode configurar dominio, caminho e publicar normalmente

## Detalhes tecnicos

### Arquivo: `src/components/SpinLandingPageEditablePreview.tsx`

**1. Adicionar imports necessarios:**
- `Rocket` do lucide-react
- `useState` para controlar estado de envio

**2. Adicionar estado:**
- `isSendingToLibrary` (boolean) para feedback visual durante envio

**3. Criar funcao `sendToLibrary`:**
- Buscar dados da solucao SPIN (`spin_selling_solutions`) para obter titulo e metadados
- Sanitizar HTML do iframe (mesma logica ja usada em `saveChanges`/`copyUpdatedHTML`)
- Inserir na tabela `cloned_landing_pages` com:
  - `name`: titulo da solucao SPIN
  - `brand`: null (LP SPIN nao tem brand)
  - `product`: titulo da solucao como referencia
  - `original_html`: HTML sanitizado
  - `transformed_html`: HTML sanitizado (mesmo, pois ja esta pronto)
  - `status`: 'draft'
  - `publish_status`: 'draft'
  - `captured_images`: [] (imagens ja inline no HTML)
  - `seo_config`: extrair meta tags do HTML se existirem
- Toast de sucesso com link para o Repositorio

**4. Adicionar botao na barra de acoes do DialogTitle:**
- Posicionar entre "Exportar HTML" e o botao de fechar (X)
- Icone: `Rocket` com texto "Enviar para Biblioteca"
- Desabilitado durante envio (spinner)

### Nenhuma migracao necessaria
A tabela `cloned_landing_pages` ja existe e aceita os campos necessarios. O campo `user_id` sera preenchido via `supabase.auth.getUser()`.
