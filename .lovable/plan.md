

## Plano: Popular CTAs com documentos técnicos disponíveis (não apenas IFU/FDS)

### Problema
O script anterior só mapeava documentos com nome exato "IFU" ou "FDS". Os 9 produtos restantes (incluindo Bio Vitality com 13 documentos) possuem laudos técnicos com nomes descritivos que não foram reconhecidos.

### Solução
Executar um novo script batch que popula os CTAs usando os **primeiros documentos disponíveis** no array `technical_documents`, independente do nome:

| CTA | Conteúdo |
|-----|----------|
| CTA 1 | 1º documento técnico disponível |
| CTA 2 | 2º documento técnico disponível |
| CTA 3 | 3º documento técnico disponível |

### Produtos afetados (9)
- Resina 3D Smart Print Bio Bite Splint +Flex (2 docs)
- Resina 3D Smart Print Bio Bite Splint Clear (10 docs)
- Resina 3D Smart Print Bio Denture (1 doc)
- Resina 3D Smart Print Bio Temp B1 (1 doc)
- **Resina 3D Smart Print Bio Vitality (13 docs)**
- Resina 3D Smart Print Modelo Ocre (2 docs)
- Resina 3D Smart Print Try-In Calcinável (1 doc)
- Resina Smart 3D Print Bio Clear Guide (3 docs)
- Resina Smart Print Modelo Láqua (2 docs)

### Execução
Script Python via `code--exec` que para cada produto:
1. Lê `technical_documents[0]` → `resource_cta1 = {label: nome, url: url_download, visible: true}`
2. Lê `technical_documents[1]` → `resource_cta2` (se existir)
3. Lê `technical_documents[2]` → `resource_cta3` (se existir)
4. Atualiza `resource_descriptions` com as descrições dos documentos
5. Faz PATCH via Supabase REST API

### Resultado
- Todos os 9 produtos terão CTAs ativos com links diretos para seus documentos técnicos
- Os botões aparecerão imediatamente na seção "Recursos e Downloads"

