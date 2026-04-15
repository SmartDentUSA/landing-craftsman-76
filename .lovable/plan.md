

## Plano: MCP Server para Claude acessar Edge Functions do Smart Dent

### O que é
Um servidor MCP (Model Context Protocol) hospedado como Supabase Edge Function que expõe as principais funções do sistema como "tools" para o Claude. Isso permite que o Claude, tanto no claude.ai quanto no Claude Code, execute funções diretamente — gerar blogs, SEO, conteúdo social, extrair legendas, etc.

### Como funciona

```text
Claude (web/CLI)
     │
     ▼
MCP Server (Edge Function)
     │  ← Streamable HTTP Transport
     ▼
Edge Functions existentes
(generate-social-content, ai-seo-generator, etc.)
```

### Implementação

**1. Criar `supabase/functions/mcp-server/index.ts`**

- Usa `mcp-lite` (npm:mcp-lite@^0.10.0) + Hono para routing
- Expõe as Edge Functions mais úteis como MCP tools:
  - `generate_social_content` — WhatsApp, Instagram, TikTok, YouTube
  - `generate_product_blog` — Blogs comerciais/técnicos
  - `ai_seo_generator` — Meta descriptions, títulos, keywords
  - `generate_ad_copies` — Google Ads copies
  - `extract_youtube_captions` — Extração e análise de legendas
  - `strategic_blog_generator` — Artigos estratégicos contextuais
  - `knowledge_base` — Consulta à base de conhecimento (770+ artigos)
  - `generate_product_ai_content` — Benefícios, keywords, características
- Cada tool chama internamente a Edge Function correspondente via `fetch` local
- Autenticação via API key no header (secret `MCP_API_KEY`)

**2. Adicionar config em `supabase/config.toml`**

```toml
[functions.mcp-server]
verify_jwt = false
```

JWT desabilitado porque o Claude autentica via `MCP_API_KEY` custom, não via Supabase Auth.

**3. Adicionar secret `MCP_API_KEY`**

Uma chave API que o Claude usará para autenticar. Será validada no código do MCP server.

### Como o usuário conecta no Claude

**Claude.ai:** Configurações → Conectores → Adicionar conector personalizado:
- URL: `https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/mcp-server`
- Header de autenticação com a `MCP_API_KEY`

**Claude Code:** Adicionar ao `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "smartdent": {
      "type": "streamable-http",
      "url": "https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/mcp-server",
      "headers": {
        "X-API-Key": "<MCP_API_KEY>"
      }
    }
  }
}
```

### Arquivos afetados
- **Criar:** `supabase/functions/mcp-server/index.ts` (MCP server com ~10 tools)
- **Editar:** `supabase/config.toml` (adicionar entry para mcp-server)
- **Secret:** `MCP_API_KEY` (nova)

### Segurança
- Validação de API key em todas as requisições
- Sem acesso direto ao banco — apenas proxy para Edge Functions existentes
- Rate limiting básico em memória

