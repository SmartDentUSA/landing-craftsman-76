import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      productName,
      productDescription,
      productImageUrl,
      primaryColor,
      secondaryColor,
      ctaText,
      style,
      formats,
      finalUrl,
    } = await req.json();

    if (!productName || !productImageUrl || !formats?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let copyPerFormat: Record<string, { headline: string; description: string }> = {};

    if (LOVABLE_API_KEY) {
      try {
        const formatDescriptions = (formats as DisplayFormat[])
          .map(f => `${f.width}x${f.height} (${f.name})`)
          .join(", ");

        const prompt = `Gere textos publicitários para banners Google Ads Display para o produto "${productName}".
Descrição do produto: ${productDescription || "N/A"}
CTA desejado: ${ctaText}

Formatos necessários: ${formatDescriptions}

Para cada formato, gere um headline e uma description curta. O headline deve ser impactante e caber no espaço do banner.
Para formatos pequenos (320x50, 300x50, 468x60), headline de no máximo 25 caracteres.
Para formatos médios (300x250, 336x280), headline de no máximo 40 caracteres.
Para formatos grandes (970x250, 728x90), headline de até 60 caracteres.

Retorne usando a tool generate_banner_copy.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Você é um especialista em Google Ads Display. Gere textos publicitários curtos e impactantes em português brasileiro." },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "generate_banner_copy",
                  description: "Return headline and description for each banner format",
                  parameters: {
                    type: "object",
                    properties: {
                      copies: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            format: { type: "string", description: "WIDTHxHEIGHT e.g. 300x250" },
                            headline: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["format", "headline", "description"],
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
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            if (parsed.copies) {
              for (const copy of parsed.copies) {
                copyPerFormat[copy.format] = {
                  headline: copy.headline,
                  description: copy.description,
                };
              }
            }
          }
        }
      } catch (aiError) {
        console.error("AI generation failed, using fallback:", aiError);
      }
    }

    // Generate HTML for each format
    const banners = (formats as DisplayFormat[]).map((format) => {
      const key = `${format.width}x${format.height}`;
      const copy = copyPerFormat[key] || {
        headline: productName.substring(0, format.width < 400 ? 25 : 50),
        description: (productDescription || "").substring(0, 80),
      };

      const html = generateHTML({
        width: format.width,
        height: format.height,
        style,
        primaryColor,
        secondaryColor,
        headline: copy.headline,
        description: copy.description,
        ctaText,
        productImageUrl,
        finalUrl: finalUrl || "#",
      });

      return {
        format,
        html,
        sizeKB: new TextEncoder().encode(html).length / 1024,
      };
    });

    return new Response(JSON.stringify({ banners }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateHTML(params: {
  width: number; height: number; style: string;
  primaryColor: string; secondaryColor: string;
  headline: string; description: string; ctaText: string;
  productImageUrl: string; finalUrl: string;
}): string {
  const { width, height, style, primaryColor, secondaryColor, headline, description, ctaText, productImageUrl, finalUrl } = params;
  const ratio = width / height;
  const isHorizontal = ratio > 1.5;
  const isVertical = ratio < 0.75;
  const isTiny = height <= 60;
  const isCompact = width * height < 25000;
  const flexDir = isHorizontal ? "row" : "column";
  const fontH = isTiny ? 11 : isCompact ? 13 : Math.min(Math.max(width / 18, 14), 28);
  const fontP = isTiny ? 0 : isCompact ? 0 : Math.max(fontH * 0.65, 10);
  const fontCTA = isTiny ? 10 : isCompact ? 11 : Math.max(fontH * 0.6, 11);
  const pad = isTiny ? "2px 6px" : isCompact ? "6px" : "12px";
  const ctaPad = isTiny ? "2px 8px" : isCompact ? "4px 10px" : "8px 20px";

  const imgDim = isHorizontal
    ? `width:${Math.min(height - 10, width * 0.3)}px;height:${Math.min(height - 10, width * 0.3)}px;`
    : isVertical
    ? `width:${width - 20}px;height:${Math.min(width - 20, height * 0.4)}px;`
    : `width:${width * 0.55}px;height:${width * 0.55}px;`;

  const bgMap: Record<string, string> = {
    modern: `background:linear-gradient(135deg,${primaryColor} 0%,${secondaryColor} 100%);`,
    minimal: `background:#fff;border:1px solid #e5e7eb;`,
    bold: `background:${primaryColor};`,
    clinical: `background:linear-gradient(180deg,#f0f7ff 0%,#fff 100%);border:1px solid #bfdbfe;`,
  };

  const textColorMap: Record<string, { h: string; p: string; cta: string; ctaBg: string }> = {
    modern: { h: "#fff", p: "rgba(255,255,255,0.9)", cta: primaryColor, ctaBg: "#fff" },
    minimal: { h: "#111827", p: "#6b7280", cta: "#fff", ctaBg: primaryColor },
    bold: { h: "#fff", p: "rgba(255,255,255,0.95)", cta: "#fff", ctaBg: secondaryColor },
    clinical: { h: "#1e40af", p: "#3b82f6", cta: "#fff", ctaBg: "#1e40af" },
  };

  const s = textColorMap[style] || textColorMap.modern;
  const bg = bgMap[style] || bgMap.modern;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="ad.size" content="width=${width},height=${height}">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{overflow:hidden}
.b{width:${width}px;height:${height}px;overflow:hidden;position:relative;cursor:pointer;display:flex;flex-direction:${flexDir};align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;gap:${isTiny?4:8}px;padding:${pad};${bg}}
.pi{object-fit:contain;${imgDim}flex-shrink:0;border-radius:6px}
.tw{display:flex;flex-direction:column;${isHorizontal?'flex:1;min-width:0;':'align-items:center;text-align:center;'}gap:${isTiny?2:4}px}
.h{font-size:${fontH}px;font-weight:700;line-height:1.2;color:${s.h};overflow:hidden}
.d{font-size:${fontP}px;line-height:1.3;color:${s.p};overflow:hidden;${fontP===0?'display:none;':''}}
.c{display:inline-block;font-size:${fontCTA}px;padding:${ctaPad};border:none;cursor:pointer;font-weight:700;background:${s.ctaBg};color:${s.cta};border-radius:6px;text-decoration:none;white-space:nowrap;transition:transform .2s}
.c:hover{transform:scale(1.05)}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.b>*{animation:fi .5s ease-out both}.b>*:nth-child(2){animation-delay:.15s}.b>*:nth-child(3){animation-delay:.3s}
</style></head>
<body><div class="b" onclick="window.open('${finalUrl}','_blank')">
<img class="pi" src="product.jpg" alt="Produto">
<div class="tw"><div class="h">${headline}</div>${fontP>0?`<div class="d">${description}</div>`:''}<button class="c">${ctaText}</button></div>
</div></body></html>`;
}
