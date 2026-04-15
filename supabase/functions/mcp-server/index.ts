import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MCP_API_KEY = Deno.env.get("MCP_API_KEY");

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Helper to call sibling edge functions
async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
  method = "POST"
): Promise<unknown> {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json();
  }
  return await res.text();
}

// --- MCP Server Setup ---
const mcpServer = new McpServer({
  name: "smartdent-mcp",
  version: "1.0.0",
});

// 1. Knowledge Base
mcpServer.tool({
  name: "knowledge_base",
  description:
    "Consulta a base de conhecimento completa da Smart Dent (770+ artigos, produtos, reviews, categorias). Use format 'ai_training' para obter dados estruturados.",
  inputSchema: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["ai_training", "rag", "system_b"],
        description: "Formato de saída dos dados",
      },
      category: {
        type: "string",
        description: "Filtrar por categoria específica (ex: Resinas, Scanners)",
      },
      include_products: {
        type: "boolean",
        description: "Incluir produtos no resultado",
      },
      include_company: {
        type: "boolean",
        description: "Incluir perfil da empresa",
      },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("knowledge-base", params);
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: "text", text: text.slice(0, 50000) }] };
  },
});

// 2. Generate Social Content
mcpServer.tool({
  name: "generate_social_content",
  description:
    "Gera conteúdo para redes sociais (Instagram, WhatsApp, TikTok, YouTube) baseado em um produto da Smart Dent.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "ID do produto (UUID)" },
      platform: {
        type: "string",
        enum: ["instagram", "whatsapp", "tiktok", "youtube"],
        description: "Plataforma alvo",
      },
      contentType: {
        type: "string",
        description: "Tipo de conteúdo (post, story, reel, carousel)",
      },
    },
    required: ["productId", "platform"],
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("generate-social-content", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 3. AI SEO Generator
mcpServer.tool({
  name: "ai_seo_generator",
  description:
    "Gera meta descriptions, títulos SEO e keywords otimizados para produtos ou landing pages.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "ID do produto (UUID)" },
      landingPageId: { type: "string", description: "ID da landing page" },
      type: {
        type: "string",
        enum: ["product", "landing_page"],
        description: "Tipo de entidade para gerar SEO",
      },
    },
    required: ["type"],
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("ai-seo-generator", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 4. Generate Product Blog
mcpServer.tool({
  name: "generate_product_blog",
  description:
    "Gera artigos de blog comerciais ou técnicos sobre produtos da Smart Dent, otimizados para SEO.",
  inputSchema: {
    type: "object",
    properties: {
      landingPageId: {
        type: "string",
        description: "ID da landing page associada",
      },
      blogType: {
        type: "string",
        enum: ["commercial", "technical", "educational"],
        description: "Tipo do blog",
      },
      productIds: {
        type: "array",
        items: { type: "string" },
        description: "IDs dos produtos a incluir",
      },
    },
    required: ["landingPageId"],
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("generate-product-blog", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 5. Generate Ad Copies
mcpServer.tool({
  name: "generate_ad_copies",
  description:
    "Gera copies para Google Ads (headlines e descriptions) baseados em produtos ou landing pages.",
  inputSchema: {
    type: "object",
    properties: {
      productId: { type: "string", description: "ID do produto" },
      landingPageId: { type: "string", description: "ID da landing page" },
      campaignType: {
        type: "string",
        enum: ["search", "display", "performance_max"],
        description: "Tipo de campanha",
      },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("generate-ad-copies", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 6. Extract YouTube Captions
mcpServer.tool({
  name: "extract_youtube_captions",
  description:
    "Extrai legendas/transcrições de vídeos do YouTube para análise ou reaproveitamento de conteúdo.",
  inputSchema: {
    type: "object",
    properties: {
      videoUrl: {
        type: "string",
        description: "URL do vídeo do YouTube",
      },
      videoId: {
        type: "string",
        description: "ID do vídeo do YouTube",
      },
    },
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("extract-youtube-captions", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 7. Strategic Blog Generator
mcpServer.tool({
  name: "strategic_blog_generator",
  description:
    "Gera artigos estratégicos contextualizados com dados do Knowledge Graph, reviews e categorias.",
  inputSchema: {
    type: "object",
    properties: {
      landingPageId: {
        type: "string",
        description: "ID da landing page",
      },
      topic: {
        type: "string",
        description: "Tópico/assunto do artigo",
      },
      keywords: {
        type: "array",
        items: { type: "string" },
        description: "Keywords alvo",
      },
    },
    required: ["landingPageId"],
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction("strategic-blog-generator", params);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// 8. Generate Product AI Content
mcpServer.tool({
  name: "generate_product_ai_content",
  description:
    "Gera conteúdo AI para produtos: benefícios, características, keywords, público-alvo e FAQs.",
  inputSchema: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        description: "ID do produto (UUID)",
      },
      contentTypes: {
        type: "array",
        items: {
          type: "string",
          enum: ["benefits", "features", "keywords", "target_audience", "faq"],
        },
        description: "Tipos de conteúdo a gerar",
      },
    },
    required: ["productId"],
  },
  handler: async (params: Record<string, unknown>) => {
    const result = await callEdgeFunction(
      "generate-product-ai-content",
      params
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
});

// --- Hono App with Auth ---
const app = new Hono();

// Auth middleware
app.use("/*", async (c, next) => {
  // Allow OPTIONS for CORS
  if (c.req.method === "OPTIONS") {
    return c.text("ok", 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-api-key, mcp-session-id",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    });
  }

  // Validate API key
  const apiKey =
    c.req.header("X-API-Key") || c.req.header("x-api-key");

  if (!MCP_API_KEY) {
    console.error("MCP_API_KEY secret not configured");
    return c.json({ error: "Server misconfigured" }, 500);
  }

  if (apiKey !== MCP_API_KEY) {
    return c.json({ error: "Unauthorized: Invalid API key" }, 401);
  }

  // Rate limit by API key
  if (!checkRateLimit(apiKey)) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  await next();
});

// MCP transport
const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  const response = await transport.handleRequest(c.req.raw, mcpServer);
  // Add CORS headers to response
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
});

Deno.serve(app.fetch);
