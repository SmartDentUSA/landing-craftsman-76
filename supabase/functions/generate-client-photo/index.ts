import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_name, specialty, area } = await req.json();
    if (!client_name) {
      return new Response(JSON.stringify({ error: "client_name é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Determine gender hint from name prefix
    const isFemale = client_name.match(/^(Dra\.|Maria|Ana|Beatriz|Camila|Luciana|Mariana|Fernanda|Juliana|Patricia|Carla|Renata|Claudia|Sandra|Tatiana|Vanessa|Adriana|Cristina|Helena|Isabela|Larissa|Natalia|Priscila|Roberta|Simone|Viviane)/i);
    const genderDesc = isFemale ? "woman" : "man";

    const prompt = `Generate a professional headshot photo of a Brazilian dental professional. They are a ${genderDesc}. They work as a ${specialty || 'dental professional'} in ${area || 'a dental clinic'}. The photo should be a realistic portrait with warm lighting, professional attire (white dental coat), friendly confident smile, neutral soft-focus background. The person should appear natural, authentic, and approachable. High quality studio portrait photography style.`;

    console.log(`Generating photo for: ${client_name} (${genderDesc})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido, tente novamente" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("AI não retornou imagem");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) throw new Error("Formato de imagem inválido");

    const imageFormat = base64Match[1];
    const base64Content = base64Match[2];
    const imageBytes = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const timestamp = Date.now();
    const sanitizedName = client_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const filePath = `spin-clients/ai-generated-${sanitizedName}-${timestamp}.${imageFormat === 'jpeg' ? 'jpg' : imageFormat}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(filePath, imageBytes, {
        contentType: `image/${imageFormat}`,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Upload falhou: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(filePath);

    const result = {
      src: publicUrlData.publicUrl,
      supabase_path: filePath,
      uploaded_at: new Date().toISOString(),
      alt: `Foto de ${client_name}`,
    };

    console.log(`Photo generated and uploaded for ${client_name}: ${filePath}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-client-photo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
