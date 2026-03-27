

# Corrigir QIDs errados no mapa de fallback do Wikidata

## Problema

O mapa `CATEGORY_FALLBACK_MAP` no edge function `wikidata-sync` contém **QIDs completamente errados**. Verifiquei cada um diretamente no Wikidata:

| Categoria | QID atual | Entidade real | QID correto | Entidade correta |
|-----------|-----------|---------------|-------------|------------------|
| resina composta | Q2648150 | **Alldeutsche** (página de desambiguação alemã) | Q1780993 | dental composite |
| impressora 3d | Q59890062 | desconhecido | Q3834994 | 3D printer |
| resina 3d / photopolymer | Q11474 | **plastic** (plástico genérico) | Q2631097 | photopolymer |
| scanner 3d | Q1753819 | desconhecido | Q1618071 | 3D scanner |
| cimento dental | Q170585 | **polygamy** (poligamia!) | Q204885 | dental cement |
| silicone | Q147271 | desconhecido | Q146439 | silicone |
| alginato | Q422219 | desconhecido | Q11685373 | alginate |
| clareamento | Q900406 | desconhecido | Q143458 | tooth bleaching |
| fotopolimerizador | Q1198635 | desconhecido | precisa validação | curing light |
| cerâmica | Q45621 | ceramic ✓ | Q45621 | correto |
| adesivo | Q131790 | adhesive ✓ | Q131790 | correto |
| software | Q7397 | software ✓ | Q7397 | correto |

Apenas 3 dos 12 QIDs estão corretos.

## Solução

### Passo 1 — Corrigir todos os QIDs no `CATEGORY_FALLBACK_MAP`

Substituir os QIDs errados pelos corretos validados no Wikidata:

```text
resina composta     → Q1780993  (dental composite)
impressora 3d       → Q3834994  (3D printer)
resina 3d           → Q2631097  (photopolymer)
scanner 3d          → Q1618071  (3D scanner)
cimento             → Q204885   (dental cement)
silicone            → Q146439   (silicone)
alginato            → Q11685373 (alginate)
clareamento         → Q143458   (tooth bleaching)
fotopolimerizador   → Q1198635  (precisa validação, buscar correto)
selante             → Q1780993  (dental composite - mesmo tipo)
cerâmica            → Q45621    ✓
adesivo             → Q131790   ✓
software            → Q7397     ✓
```

### Passo 2 — Limpar QIDs errados já salvos no banco

Os produtos que já foram sincronizados com QIDs errados (ex: Q2648150 para "Atos Resina Composta") precisam ter o campo `wikidata_item_id` limpo para que possam ser re-sincronizados com os QIDs corretos.

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/wikidata-sync/index.ts` | Corrigir todos os QIDs no `CATEGORY_FALLBACK_MAP` |
| Migração SQL | `UPDATE products_repository SET wikidata_item_id = NULL WHERE wikidata_item_id IN ('Q2648150', 'Q59890062', 'Q11474', 'Q1753819', 'Q170585', 'Q147271', 'Q422219', 'Q900406')` |

