## Plano

Corrigir o fluxo para que produtos recém-importados da Loja Integrada não fiquem sem vínculo ao clicar em **Enviar Loja Integrada** na Descrição E-commerce.

## O que será ajustado

1. **Preservar o ID no importador**
   - Garantir que `ProductLojaIntegradaImporter` sempre propague `original_data.li_product_id` quando a API retornar `id`, `resource_uri`, `pai`, `variation`, `merged` ou `parent`.
   - Isso deve acontecer mesmo quando o produto já tem nome/preço e o modo “sobrescrever” está desligado.

2. **Aceitar importação parcial no modal de edição**
   - Ajustar `ProductEditModal` para não rejeitar callbacks de importação que tragam apenas campos parciais, como somente `original_data.li_product_id`.
   - Hoje o callback exige `name`, mas o próprio importador pode enviar apenas campos atualizados; isso pode impedir o ID da Loja Integrada de entrar no formulário.

3. **Resolver o ID de forma mais robusta no envio do HTML**
   - Em `ProductEcommerceGenerator`, ampliar o fallback do botão **Enviar Loja Integrada** para buscar no banco mais campos além de `original_data`, como `product_url` e `slug`.
   - Resolver o ID a partir de múltiplos formatos: número direto, `/produto/{id}`, `resource_uri`, variação, pai e dados mesclados.

4. **Melhorar a mensagem quando realmente não houver ID**
   - Se nenhum ID existir em lugar nenhum, a mensagem deve explicar que o produto foi salvo sem vínculo e orientar a colar/reimportar pelo ID da Loja Integrada.

5. **Validar no fluxo atual**
   - Conferir que o produto “Ativação DentalCAD Ultimate Lab Bundle - RMS” deixa de cair no toast **Produto não vinculado** quando o ID estiver disponível no dado importado.
   - Se o registro antigo já estiver salvo sem nenhum ID, o código novo evitará novas perdas; para esse registro específico será necessário reimportar pelo ID/URL uma vez para gravar o vínculo.