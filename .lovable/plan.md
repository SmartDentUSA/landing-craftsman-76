Vou corrigir o caso do produto “Ativação DentalCAD Ultimate Lab Bundle - RMS”, que parece cair no fluxo de variação da Loja Integrada e perde o `li_product_id` no topo de `original_data`.

Plano:

1. Corrigir o envio do HTML e-commerce
   - Em `ProductEcommerceGenerator`, resolver o ID da Loja Integrada a partir de vários formatos possíveis:
     - `original_data.li_product_id`
     - `original_data.id`
     - `original_data.resource_uri`
     - `original_data.variation.id`
     - `original_data.variation.resource_uri`
     - `original_data.merged.id`
   - Assim o botão “Enviar Loja Integrada” não bloqueia produtos recém-importados como variação.

2. Corrigir a importação via API da Loja Integrada
   - Em `import-loja-integrada-api`, quando o produto for `atributo_opcao`/variação, preservar também no topo:
     - `li_product_id`
     - `resource_uri`
     - dados de `variation`, `parent` e `merged`
   - Isso evita que futuros imports salvem `original_data` sem vínculo utilizável.

3. Corrigir normalização no frontend do importador
   - Em `ProductLojaIntegradaImporter`, extrair o ID também dos caminhos aninhados (`variation.id`, `variation.resource_uri`, `merged.id`, etc.).
   - Isso garante que o modal de edição já salve o produto com o ID correto.

4. Validar
   - Verificar que o botão deixa de mostrar “Produto não vinculado” quando houver ID em qualquer desses formatos.
   - Se ainda não houver ID salvo para esse registro específico, a UI passará a mostrar um erro mais útil indicando que o import não capturou nenhum ID da Loja Integrada.