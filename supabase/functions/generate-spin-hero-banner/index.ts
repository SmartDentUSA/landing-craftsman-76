import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductDimensions {
  name: string;
  width: number;
  height: number;
  depth: number;
  volume: number;
  sizeClass: 'extra_large' | 'large' | 'medium' | 'small' | 'tiny';
  relativeSize: number;
}

function calculateProductVolume(product: any): ProductDimensions {
  const w = product.width || 30;
  const h = product.height || 30;
  const d = product.depth || 30;
  const volume = w * h * d;
  
  let sizeClass: ProductDimensions['sizeClass'] = 'medium';
  if (volume > 100000) sizeClass = 'extra_large';
  else if (volume > 50000) sizeClass = 'large';
  else if (volume > 10000) sizeClass = 'medium';
  else if (volume > 1000) sizeClass = 'small';
  else sizeClass = 'tiny';
  
  return {
    name: product.name,
    width: w,
    height: h,
    depth: d,
    volume,
    sizeClass,
    relativeSize: 100
  };
}

function buildIntelligentPrompt(products: any[]): string {
  const productNames = products.map(p => p.name).join(', ');
  
  return `
Crie um banner profissional para landing page usando EXATAMENTE os produtos mostrados nas imagens anexadas como referência visual.

🚨 INSTRUÇÕES OBRIGATÓRIAS:
1. Use as imagens dos produtos fornecidas como BASE VISUAL - não invente produtos diferentes
2. Componha os produtos em uma cena profissional com fundo limpo (branco ou cinza claro)
3. Mantenha a aparência real dos produtos das imagens - não crie novos equipamentos
4. Formato: 16:9 landscape horizontal
5. SEM texto, logos, watermarks ou qualquer escrita na imagem
6. Iluminação profissional de estúdio com sombras suaves

📦 PRODUTOS A INCLUIR NA COMPOSIÇÃO:
${productNames}

🎨 COMPOSIÇÃO VISUAL:
- Produto principal centralizado em destaque
- Demais produtos harmonicamente distribuídos ao redor
- Fundo branco puro ou cinza muito claro
- Iluminação suave e profissional
- Sombras naturais e discretas
- Perspectiva levemente elevada

🎯 RESULTADO ESPERADO:
Banner profissional mostrando os produtos das imagens em composição limpa e atrativa para landing page.

CRÍTICO: Use as imagens anexadas como referência - não crie produtos inventados.
`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId, productIds, selectedImageUrls } = await req.json();

    console.log('🚀 generate-spin-hero-banner invoked:', {
      timestamp: new Date().toISOString(),
      solutionId,
      productIds,
      productsCount: productIds?.length || 0,
      selectedImagesCount: selectedImageUrls?.length || 0
    });

    // ✅ VALIDAÇÃO 1: selectedImageUrls
    if (!selectedImageUrls || selectedImageUrls.length === 0) {
      console.error('❌ Nenhuma imagem selecionada');
      return new Response(
        JSON.stringify({ 
          error: 'Selecione pelo menos 1 imagem de produto para gerar o banner' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ VALIDAÇÃO 2: LOVABLE_API_KEY
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ 
          error: 'Configure LOVABLE_API_KEY nas Secrets das Functions (Supabase Dashboard > Edge Functions > Secrets)' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: products, error: productsError } = await supabase
      .from('products_repository')
      .select('id, name, width, height, depth')
      .in('id', productIds);

    if (productsError || !products || products.length === 0) {
      throw new Error('Produtos não encontrados');
    }

    console.log(`📦 ${products.length} produtos carregados:`);
    products.forEach(p => {
      console.log(`  - ${p.name}: ${p.width}×${p.height}×${p.depth}cm`);
    });

    const prompt = buildIntelligentPrompt(products);
    console.log('🎨 Prompt gerado:', prompt.substring(0, 300) + '...');

    const productImages = selectedImageUrls.map(url => ({
      type: "image_url",
      image_url: { url }
    }));

    console.log(`📸 Enviando ${productImages.length} imagens selecionadas para a IA`);

    const startTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...productImages
          ]
        }],
        modalities: ["image", "text"]
      })
    });

    // ✅ ERRO DETALHADO: Status não OK
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API error:', {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        body: errorText.substring(0, 500)
      });
      return new Response(
        JSON.stringify({ 
          error: `AI API retornou erro ${aiResponse.status}: ${errorText.substring(0, 200)}` 
        }),
        { status: aiResponse.status === 402 ? 402 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generationTime = Date.now() - startTime;

    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // ✅ ERRO DETALHADO: Imagem não encontrada no payload
    if (!imageBase64) {
      console.error('❌ IA não retornou imagem:', {
        hasChoices: !!aiData.choices,
        choicesLength: aiData.choices?.length,
        firstChoice: JSON.stringify(aiData.choices?.[0] || {}).substring(0, 300)
      });
      return new Response(
        JSON.stringify({ 
          error: 'IA não retornou imagem. Verifique o modelo e o payload enviado. Tente novamente.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Imagem gerada em ${generationTime}ms com ${selectedImageUrls.length} imagens`);

    const aiGeneratedImages = {
      hero_banner: {
        mode: 'ai_generated',
        ai_generated: {
          src: imageBase64,
          generated_at: new Date().toISOString(),
          prompt_used: prompt,
          model: "google/gemini-2.5-flash-image",
          products_used: productIds,
          selected_images_count: selectedImageUrls.length,
          generation_time_ms: generationTime
        }
      },
      last_updated: new Date().toISOString()
    };

    await supabase
      .from('spin_selling_solutions')
      .update({ ai_generated_images: aiGeneratedImages })
      .eq('id', solutionId);

    return new Response(
      JSON.stringify({
        success: true,
        imageBase64,
        prompt,
        model: "google/gemini-2.5-flash-image",
        details: {
          generation_time: generationTime,
          products_count: products.length,
          selected_images_count: selectedImageUrls.length,
          prompt_summary: prompt.substring(0, 150) + '...'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ generate-spin-hero-banner error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
