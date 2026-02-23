

# Documentacao Tecnica em formato Acordeao

## O que sera feito

Transformar a secao "Documentacao Tecnica" (downloads de PDFs/documentos) dentro de "Veja como funciona na pratica" para usar o formato acordeao (`<details>/<summary>`), igual ao usado na secao FAQ.

## Alteracao

### Arquivo: `supabase/functions/generate-spin-landing-page/generateHTML.ts` (~linhas 2899-2933)

Envolver cada documento em um `<details>/<summary>` em vez do layout de lista tabular atual.

**Antes:** Lista com header + items em formato de tabela (colunas: icone, nome, produto, tamanho, download).

**Depois:** Cada documento renderizado como um acordeao:
- `<summary>` mostra o icone do arquivo + nome do documento + badge do produto
- Conteudo expandido mostra descricao completa, tamanho e botao de download

A estrutura visual segue o mesmo padrao `<details>/<summary>` ja usado na FAQ (linha 2957), mantendo consistencia.

### Deploy

Re-deploy da edge function `generate-spin-landing-page`.

