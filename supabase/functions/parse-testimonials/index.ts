import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Texto muito curto para extrair depoimentos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em extrair depoimentos de textos. Extraia TODOS os depoimentos do texto fornecido."
          },
          {
            role: "user",
            content: `Extraia todos os depoimentos do texto abaixo. Para cada depoimento, retorne os dados estruturados usando a tool fornecida.\n\nTexto:\n${text}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_testimonials",
              description: "Extrai depoimentos estruturados do texto",
              parameters: {
                type: "object",
                properties: {
                  testimonials: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        client_name: { type: "string", description: "Nome completo da pessoa" },
                        specialty: {
                          type: "string",
                          enum: ["CLINICO_GERAL", "DENTISTICA", "IMPLANTODONTISTA", "PROTESISTA", "ODONTOPEDIATRIA", "ORTODONTISTA", "PERIODONTISTA", "RADIOLOGISTA", "ESTOMATOLOGISTA", "CIRURGIA_BUCO_MAXILO", "TECNICO_RADIOLOGIA", "TECNICO_PROTESE", "ESTETICA", "HARMONIZACAO", "LABORATORIO", "TPD", "GESTAO", "ASB", "PESQUISADOR", "OUTRO"],
                          description: "Especialidade mapeada para o enum"
                        },
                        area: {
                          type: "string",
                          enum: ["CLINICA_CONSULTORIO", "LABORATORIO_PROTESE", "PLANNING_CENTER", "EMPRESA_ALINHADORES", "GESTOR_REDE_CLINICAS", "EDUCACAO", "CENTRAL_IMPRESSOES", "RADIOLOGIA_ODONTOLOGICA", "GESTOR_FRANQUIAS"],
                          description: "Área de atuação mapeada para o enum"
                        },
                        results_achieved: { type: "string", description: "Texto completo do depoimento, sem aspas" },
                        clinic_name: { type: "string", description: "Nome da clínica se mencionado, senão string vazia" },
                        city: { type: "string", description: "Cidade da pessoa, ex: Recife, Curitiba" },
                        state: { type: "string", description: "Sigla do estado (UF), ex: PE, PR, SP" }
                      },
                      required: ["client_name", "specialty", "area", "results_achieved", "clinic_name", "city", "state"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["testimonials"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_testimonials" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    await trackFromResponse(data, 'parse-testimonials', 'Extração Depoimentos');
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("AI não retornou dados estruturados");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const testimonials = parsed.testimonials || [];

    console.log(`Extracted ${testimonials.length} testimonials`);

    return new Response(JSON.stringify({ testimonials }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-testimonials error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
