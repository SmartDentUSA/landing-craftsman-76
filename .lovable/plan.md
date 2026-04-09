

## Plano: Popular CTAs de Recursos automaticamente com IFU e FDS dos Documentos Tecnicos

### Contexto confirmado
- 56 produtos nas categorias RESINAS 3D e DENTISTICA possuem `technical_documents` com documentos nomeados "IFU" e "FDS" (importados do Sistema B)
- Os campos `resource_cta1`, `resource_cta2`, `resource_cta3` estao todos vazios (`visible: false`)
- Cada documento tem `nome` (ex: "IFU", "FDS") e `url_download` com link direto

### Mapeamento dos CTAs

| CTA | Conteudo | Label |
|-----|----------|-------|
| CTA 1 | FDS (Ficha de Dados de Seguranca) | "FDS" |
| CTA 2 | IFU (Instructions for Use) | "IFU" |
| CTA 3 | Perfil Tecnico (quando existir) | "Perfil Tecnico" |

### Implementacao

**Script SQL batch** que para cada produto dessas categorias:

1. Extrai do array `technical_documents` o documento com `nome = 'IFU'` → popula `resource_cta2` com `{label: "IFU - {nome_arquivo}", url: "{url_download}", visible: true}`
2. Extrai documento com `nome = 'FDS'` → popula `resource_cta1` com `{label: "FDS - {nome_arquivo}", url: "{url_download}", visible: true}`
3. Extrai documento com nome contendo "Perfil" → popula `resource_cta3` com `{label: "{nome}", url: "{url_download}", visible: true}`
4. Atualiza `resource_descriptions` com descricoes extraidas dos documentos

**Execucao**: Script Python via `code--exec` que consulta os 56 produtos, monta os CTAs e faz UPDATE via Supabase client.

### Abrangencia
- Categoria "RESINAS 3D" → subcategorias Biocompativeis e Uso Geral
- Categoria "DENTISTICA, ESTETICA E ORTODONTIA" → subcategorias Adesivos, Ceromero, Cimentos, Resinas Compostas

### Resultado
- 56 produtos terao CTAs populados automaticamente com links diretos para IFU, FDS e Perfil Tecnico
- Os botoes aparecerao imediatamente na secao "Recursos e Downloads" do editor

