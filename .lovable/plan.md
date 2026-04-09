

## Plano: Corrigir CTAs do Vitality e dos 9 produtos — aplicar regra FDS/IFU/Perfil corretamente

### Problema raiz
O Bio Vitality **tem** IFU e FDS (documentos 11 e 12 de 13), mas os scripts anteriores falharam porque:
- O 1o script procurava `nome = 'FDS'` e `nome = 'IFU'` mas iterava apenas os primeiros documentos
- O 2o script ignorou a regra e pegou os 3 primeiros documentos (laudos genéricos)

### Estado atual (errado)
| CTA | Conteudo atual | Deveria ser |
|-----|---------------|-------------|
| CTA 1 | "Avaliacao da Atividade Mutagenica" | **FDS** |
| CTA 2 | "Avaliacao de Efeitos Genotoxicos" | **IFU** |
| CTA 3 | "Avaliacao Modulo e Resistencia a flexao" | Vazio (nao tem Perfil Tecnico) |

### Correcao

**1. Script batch via insert tool** — para TODOS os 56 produtos das categorias alvo:
- Varrer o array `technical_documents` COMPLETO (nao so os 3 primeiros)
- CTA 1 = documento com `nome = 'FDS'` (busca case-insensitive)
- CTA 2 = documento com `nome = 'IFU'` (busca case-insensitive)
- CTA 3 = documento com `nome` contendo "Perfil" (busca case-insensitive)
- Se nao encontrar o documento especifico, setar `{visible: false}`

**2. Corrigir fallback no `ProductEditModal.tsx`**
- Remover a logica de auto-preenchimento generico (que pega qualquer documento)
- O fallback so deve sugerir CTAs se encontrar documentos com nome exato "FDS", "IFU" ou contendo "Perfil"

### Resultado esperado para o Vitality
- CTA 1: FDS (doc 12) com link correto
- CTA 2: IFU (doc 11) com link correto
- CTA 3: Vazio (nao tem Perfil Tecnico)

