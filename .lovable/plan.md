

## Correção: Erro "Inconsistent language 'pt' detected (expected 'en')"

### Causa raiz

O erro vem da API do Wikidata rejeitando o payload porque os **aliases** no campo `en` contêm objetos com `language: "pt"`. A API exige que o valor de `language` dentro de cada alias corresponda à chave do idioma.

**Código problemático** em `wikidata-payload-builder.ts`:

```typescript
// Produto (linha 687):
payload.aliases = { pt: aliasValues, en: aliasValues }; 
// aliasValues = [{ language: "pt", value: "..." }]
// ↑ "en" recebe aliases com language: "pt" → ERRO

// Empresa (linha 511):
payload.aliases = { pt: aliasValues, en: aliasValues };
// mesmo problema
```

### Correção

Modificar **2 trechos** no arquivo `supabase/functions/_shared/wikidata-payload-builder.ts`:

**1. Aliases de empresa (linhas ~506-512)** — criar cópias separadas para cada idioma:

```typescript
if (aliasValues.length > 0) {
  const ptAliases = aliasValues.map(a => ({ language: "pt", value: a.value }));
  const enAliases = aliasValues.map(a => ({ language: "en", value: a.value }));
  payload.aliases = { pt: ptAliases, en: enAliases };
}
```

**2. Aliases de produto (linhas ~676-688)** — mesma abordagem, gerar aliases com `language` correto para cada idioma:

```typescript
if (aliasValues.length > 0) {
  const ptAliases = aliasValues.map(a => ({ language: "pt", value: a.value }));
  const enAliases = aliasValues.map(a => ({ language: "en", value: a.value }));
  payload.aliases = { pt: ptAliases, en: enAliases };
}
```

### Arquivo impactado
- `supabase/functions/_shared/wikidata-payload-builder.ts` — 2 edições (~4 linhas cada)

### Resultado esperado
- O payload enviado ao Wikidata terá `aliases.en[*].language === "en"` e `aliases.pt[*].language === "pt"`
- O erro "Inconsistent language" desaparece
- A edge function `wikidata-sync` será redeployada automaticamente

