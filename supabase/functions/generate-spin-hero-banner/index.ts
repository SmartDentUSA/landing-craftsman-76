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
  const productDims = products
    .map(calculateProductVolume)
    .sort((a, b) => b.volume - a.volume);
  
  const maxVolume = productDims[0].volume;
  productDims.forEach(p => {
    p.relativeSize = (p.volume / maxVolume) * 100;
  });

  const productInstructions = productDims.map((p, idx) => {
    const positions = ['center-front', 'left-mid', 'right-back', 'center-back'];
    const focus = idx === 0 ? 'primary sharp focus' 
      : idx === 1 ? 'secondary slight blur'
      : 'tertiary background blur';
    
    return `
PRODUTO ${idx + 1} - ${p.name}:
- Dimensões físicas reais: ${p.width}cm (L) × ${p.height}cm (A) × ${p.depth}cm (P)
- Volume calculado: ${p.volume.toLocaleString()}cm³
- Categoria de tamanho: ${p.sizeClass}
- Proporção na cena: ${p.relativeSize.toFixed(0)}% do produto maior
- Posicionamento: ${positions[idx] || 'background'}
- Foco ótico: ${focus}
- Iluminação: ${idx === 0 ? 'key light principal' : 'fill light suave'}
`.trim();
  }).join('\n\n');

  return `
🚨 CRITICAL INSTRUCTIONS - NO TEXT IN IMAGE:
- ABSOLUTELY NO text, watermarks, labels, captions, or written content
- NO product names, brand names, or any letters/numbers visible
- PURE PHOTOGRAPHIC IMAGE ONLY - no overlays of any kind

📦 PRODUTOS NA CENA (${products.length} ${products.length > 1 ? 'produtos' : 'produto'}):
${productInstructions}

🏥 AMBIENTE CLÍNICO ODONTOLÓGICO:
- Consultório odontológico moderno e clean
- Fundo branco puro (#FFFFFF) ou cinza claríssimo (#F8FAFC)
- Iluminação profissional: soft box da esquerda + refletor da direita
- Sombras suaves e naturais (sem contraste forte)
- Texturas realistas dos materiais (metal, plástico, cerâmica)

📷 ESPECIFICAÇÕES TÉCNICAS DA CÂMERA:
- Proporção: EXATAMENTE 16:9 (landscape horizontal)
- Resolução equivalente: 4K (3840×2160px)
- Lente: 50mm f/2.8 (equivalente)
- Profundidade de campo: Shallow (foco no produto maior, blur progressivo nos demais)
- ISO: 100 (zero ruído)
- Iluminação: 5500K (luz do dia neutra)

🎨 COMPOSIÇÃO VISUAL:
- Regra dos terços aplicada
- Produto maior ocupando 40-50% do frame central
- Produtos menores distribuídos harmonicamente
- Espaço negativo (whitespace) para respiro visual
- Perspectiva levemente elevada (15-30° acima da horizontal)

⚖️ REALISMO FÍSICO:
- Respeitar EXATAMENTE as proporções dos volumes calculados
- Produto de 200.000cm³ deve ser VISIVELMENTE maior que um de 50.000cm³
- Manter escala realista entre todos os objetos
- Gravidade e física corretas (produtos apoiados naturalmente)

🔍 HIERARQUIA VISUAL:
1. Produto maior: Centro-frontal, sharp focus, key light
2. Produtos médios: Laterais, slight blur, fill light
3. Produtos menores: Background, soft blur, ambient light

🎯 OBJETIVO FINAL:
Criar uma imagem fotográfica profissional de alta qualidade que mostre ${products.length} ${products.length > 1 ? 'equipamentos odontológicos' : 'equipamento odontológico'} em um ambiente clínico realista, respeitando suas dimensões físicas reais e sem NENHUM texto visível.

REPEAT: NO TEXT, NO WORDS, NO LABELS - PURE IMAGE ONLY
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
