

## Diagnóstico Definitivo + Correção: OAuth 1.0a "Invalid Signature"

### Análise da causa raiz

O erro `mwoauth-invalid-authorization: Invalid signature` persiste mesmo com os secrets corretos e aprovados. Analisando o código em `signOAuth1a()` (linhas 90-143), a implementação manual do OAuth 1.0a usa `crypto.subtle` (Web Crypto API) para HMAC-SHA1. Esta implementação manual é frágil e propensa a bugs sutis de encoding que são difíceis de diagnosticar.

A abordagem correta é **substituir a implementação manual por uma biblioteca battle-tested** (`oauth-1.0a` + `crypto-js`), que é exatamente o que a [documentação oficial do MediaWiki](https://www.mediawiki.org/wiki/User:Chlod/OAuth) recomenda.

### Plano (2 partes)

**Parte 1 — Adicionar ação `test_oauth` para diagnóstico**

Adicionar uma nova ação `test_oauth` na edge function `wikidata-sync` que:
- Loga os **primeiros 6 e últimos 4 caracteres** de cada secret (para verificação visual)
- Faz uma chamada simples `action=query&meta=siteinfo` (sem CSRF, sem escrita)
- Retorna o resultado completo: sucesso ou erro detalhado com signature base string

**Parte 2 — Substituir implementação OAuth manual por biblioteca**

Substituir `signOAuth1a()` e `buildOAuthHeader()` pela biblioteca `oauth-1.0a` (via esm.sh):

```typescript
import OAuth from "https://esm.sh/oauth-1.0a@2.2.6";
import hmacSHA1 from "https://esm.sh/crypto-js@4.2.0/hmac-sha1";
import Base64 from "https://esm.sh/crypto-js@4.2.0/enc-base64";
```

Esta biblioteca:
- É recomendada pela documentação oficial do MediaWiki
- Gera assinaturas OAuth 1.0a comprovadamente compatíveis
- Elimina bugs sutis de encoding na construção da signature base string

### Arquivos impactados
- `supabase/functions/wikidata-sync/index.ts` — substituir `signOAuth1a`, `buildOAuthHeader`, `percentEncode` pela lib; adicionar handler `test_oauth`
- Redeploy automático da edge function

### Resultado esperado
1. Ação `test_oauth` permite validar os secrets sem efeitos colaterais
2. A lib `oauth-1.0a` gera assinaturas corretas, eliminando o "Invalid signature"
3. CSRF token é obtido com sucesso → `wbeditentity` funciona

