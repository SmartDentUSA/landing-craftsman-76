import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DisplayFormat {
  width: number;
  height: number;
  name: string;
  category: string;
}

// IMPORTANT: This Edge Function ONLY generates copy (headline/subheadline) per format.
// HTML rendering is handled exclusively in the frontend via display-templates.ts.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      productName,
      productDescription,
      ctaText,
      formats,
      campaignSlug,
    } = await req.json();

    if (!productName || !formats?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields: productName, formats" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const copies: Record<string, { headline: string; subheadline: string }> = {};

    if (LOVABLE_API_KEY) {
      try {
        const formatDescriptions = (formats as DisplayFormat[])
          .map(f => `${f.width}x${f.height} (${f.name})`)
          .join(", ");

        const prompt = `Você gera textos publicitários para banners Google Ads Display do produto "${productName}".
Descrição: ${productDescription || "N/A"}
CTA configurado: ${ctaText || "Saiba Mais"}
Campanha: ${campaignSlug || "default"}

Formatos solicitados: ${formatDescriptions}

REGRAS DE LIMITE (caractere) por bucket:
- SMALL (320x50, 300x50, 468x60): headline ≤ 28, subheadline = "" (vazio)
- MEDIUM (300x250, 336x280, 250x250, 320x100): headline ≤ 42, subheadline ≤ 60
- LARGE (728x90, 970x90, 970x250): headline ≤ 65, subheadline ≤ 100 (apenas em billboards)
- INTERSTITIAL (320x480, 300x600): headline ≤ 60, subheadline ≤ 120

Tom: comercial, direto, sem clichês. PT-BR. Evite ponto final em headline. Não invente claims regulatórios — use o produto e seu valor.

Retorne via tool generate_banner_copy.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um especialista em Google Ads Display. Gere textos curtos, comerciais e respeitando limites estritos de caracteres." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_banner_copy",
                  description: "Return headline and subheadline for each banner format",
                  parameters: {
                    type: "object",
                    properties: {
                      copies: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            format: { type: "string", description: "WIDTHxHEIGHT (e.g. 300x250)" },
                            headline: { type: "string" },
                            subheadline: { type: "string" },
                          },
                          required: ["format", "headline", "subheadline"],
                        },
                      },
                    },
                    required: ["copies"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "generate_banner_copy" } },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await trackFromResponse(data, 'generate-display-banners', 'Banners Display');
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (Array.isArray(parsed.copies)) {
              for (const c of parsed.copies) {
                if (c.format) {
                  copies[c.format] = {
                    headline: String(c.headline || '').trim(),
                    subheadline: String(c.subheadline || '').trim(),
                  };
                }
              }
            }
          }
        } else {
          console.error("AI gateway non-OK:", response.status, await response.text());
        }
      } catch (aiError) {
        console.error("AI generation failed, falling back to product name:", aiError);
      }
    }

    // Fallback for any missing format
    for (const f of formats as DisplayFormat[]) {
      const key = `${f.width}x${f.height}`;
      if (!copies[key]) {
        copies[key] = {
          headline: productName,
          subheadline: (productDescription || '').substring(0, 100),
        };
      }
    }

    return new Response(JSON.stringify({ copies }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-display-banners:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
