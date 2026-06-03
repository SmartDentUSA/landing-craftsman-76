
# Limpeza de SEO Overrides Placeholder

## Objetivo
Remover textos genéricos/placeholder dos campos `seo_title_override` e `seo_description_override` em `products_repository`, fazendo o endpoint `knowledge-export-full` voltar a usar os nomes/descrições reais dos produtos como fallback.

## Passos

1. **Backup CSV (reversibilidade)**
   - Exportar para `/mnt/documents/backup_seo_overrides_pre_cleanup.csv` as 43+13 linhas afetadas (id, name, seo_title_override, seo_description_override) antes de qualquer UPDATE.

2. **UPDATE via insert tool (DML, não migration)**
   - `seo_title_override = NULL` onde casa regex:
     `smartphone|colch[aã]o|notebook|guia definitivo.*(escolher|como|escolha)|melhores.*2024|2024.*(comparativo|guia|an[aá]lise|modelos)`
   - `seo_description_override = NULL` onde ILIKE padrões genéricos:
     - `%melhores produtos premium%entrega rápida%`
     - `%anúncios personalizados no TikTok%`
     - demais frases genéricas identificadas na auditoria anterior

3. **Validação pós-update**
   - `curl` no endpoint `?format=json&include=all` e `grep -ci` para "colchão", "smartphone", "guia definitivo", "2024" → esperado 0 ocorrências dos placeholders.
   - Query SQL contando linhas ainda com padrões → esperado 0.

4. **Relatório final**
   - Quantas linhas tiveram `seo_title_override` limpo
   - Quantas linhas tiveram `seo_description_override` limpo
   - Link do CSV de backup

## Fora de escopo
- Nenhuma alteração em código, edge functions, prompts ou schema.
- Páginas publicadas não são tocadas (apenas o override no banco).
- Reversível: basta re-importar o CSV de backup.
