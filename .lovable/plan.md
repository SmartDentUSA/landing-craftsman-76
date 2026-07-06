## Plano

1. **Atualizar o produto existente**
   - Localizar o produto `Ativação DentalCAD Ultimate Lab Bundle - RMS` no repositório.
   - Gravar o vínculo da Loja Integrada como `li_product_id = "402002410"` dentro de `original_data`, preservando os dados já existentes.

2. **Garantir que o envio use esse vínculo**
   - Confirmar que o botão **Enviar Loja Integrada** resolve o ID `402002410` a partir de `original_data.li_product_id`.
   - Se necessário, ajustar o fallback para priorizar esse campo antes de mostrar “Produto não vinculado”.

3. **Evitar perda do ID em futuras edições/importações**
   - Revisar o fluxo de importação/edição para não sobrescrever `original_data.li_product_id` com vazio quando o produto já tem vínculo.
   - Manter o ID da Loja Integrada quando dados parciais forem salvos.

4. **Validar o caso real**
   - Testar o fluxo para o produto informado e confirmar que ele não exibe mais o alerta “Produto não vinculado”.
   - O resultado esperado é o envio do HTML E-commerce para o produto `402002410`.