
## Plano: Gerar planilha com produtos e documentos técnicos

Vou criar um arquivo Excel (.xlsx) com todos os 120 produtos do repositório, contendo:

**Colunas:**
- Nome do Produto
- ID Loja Integrada
- Documentos Técnicos (nome + link de cada documento, separados por quebra de linha na célula)

**Dados:**
- 63 produtos possuem documentos técnicos (de 1 a 10 docs cada)
- 57 produtos não possuem documentos técnicos (célula ficará vazia ou "Sem documentos")

**Formato:**
- Arquivo XLSX com formatação profissional (cabeçalho em destaque, colunas ajustadas)
- Links dos documentos clicáveis
- Salvo em `/mnt/documents/produtos_documentos_tecnicos.xlsx`

**Implementação:**
- Script Python com openpyxl consultando os dados já extraídos do banco
- Uma linha por produto, documentos agrupados na mesma célula
