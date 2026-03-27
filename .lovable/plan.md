

# Gerar documentação técnica completa da integração Wikidata

## Objetivo

Criar um arquivo `.md` detalhado documentando todo o fluxo da integração com o Wikidata: origem dos dados, sincronização, armazenamento, e consumo nos geradores de HTML.

## Conteúdo do documento

O arquivo `/mnt/documents/WIKIDATA_INTEGRATION_DOCS.md` cobrirá:

### 1. Visão geral da arquitetura
Diagrama ASCII do fluxo completo: UI → Service → Edge Function → Wikidata API → Supabase → Geradores HTML

### 2. Componentes do sistema
- **Frontend**: `WikidataSyncButton.tsx` (botão no modal de produto)
- **Service Layer**: `src/services/wikidata-sync.ts` (invocação autenticada)
- **Edge Function**: `supabase/functions/wikidata-sync/index.ts` (lógica de busca e scoring)
- **Helpers**: `ai-readiness-helpers.ts` (enriquecimento semântico)

### 3. Fluxo de sincronização da empresa
- Origem: `company_profile` (company_name, website_url, company_description)
- Busca na Wikidata API (wbsearchentities) em PT e EN
- Scoring: domain match (+100), label match (+40), description signals (+8/+15)
- Threshold: score >= 45
- Destino: `company_profile.wikidata_id`

### 4. Fluxo de sincronização de produtos
- Origem: `products_repository` (name, brand, category, subcategory, description)
- Extração de termos genéricos (remove códigos DA2, medidas ml/g)
- Busca dinâmica + Category Fallback Map (20 categorias mapeadas)
- Scoring: label match (+45), category match (+12/+18), dental context (+8)
- Threshold: score >= 35 (ou fallback com score 30)
- Destino: `products_repository.wikidata_item_id`

### 5. Category Fallback Map completo
Tabela com todas as 20+ categorias e seus QIDs validados

### 6. Consumo nos geradores de HTML
- `mustache-template-engine.ts`: Product JSON-LD com sameAs + manufacturer + brand
- `product-blog-html-v2.ts`: Mesmo padrão para blogs de produto
- `generate-ecommerce-html`: E-commerce pages
- `publish-product-blog-cloudflare`: Blog publicado
- `clone-landing-page` e `publish-blog-post`: Landing pages e blog posts

### 7. JSON-LD resultante
Exemplo completo do grafo semântico gerado

### 8. Autenticação e segurança
- JWT validation via `auth.getClaims()`
- Admin-only via `has_role()` RPC
- Service role key para escrita no banco

## Arquivo gerado

| Arquivo | Local |
|---------|-------|
| `WIKIDATA_INTEGRATION_DOCS.md` | `/mnt/documents/` |

Será gerado via script, sem alterações no codebase.

