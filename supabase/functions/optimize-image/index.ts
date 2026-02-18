import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      imageUrl, 
      format = 'webp', 
      quality = 85, 
      maxWidth = 1920,
      responsive = false, // Gerar múltiplas resoluções
      returnBase64 = false // Retornar data: URL para uso seguro no Canvas
    } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🖼️ Otimizando imagem:', { imageUrl, format, quality, maxWidth, responsive });

    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch image', status: imageResponse.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const originalSize = imageBuffer.byteLength;
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    console.log('✅ Imagem baixada:', { originalSize, sizeKB: (originalSize / 1024).toFixed(2) });

    // OPÇÃO BASE64: Retornar data: URL para uso seguro no Canvas (sem CORS)
    if (returnBase64) {
      const uint8 = new Uint8Array(imageBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const chunk = uint8.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:${contentType};base64,${base64}`;

      console.log('✅ Retornando Base64 data: URL');
      return new Response(
        JSON.stringify({ dataUrl, originalSize, contentType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OPÇÃO 1: Usar Cloudflare Images API (se configurado)
    const cloudflareAccountHash = Deno.env.get('CLOUDFLARE_ACCOUNT_HASH');
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    
    if (cloudflareAccountHash && cloudflareApiToken) {
      console.log('☁️ Usando Cloudflare Images para otimização');
      
      // Upload para Cloudflare Images
      const formData = new FormData();
      formData.append('file', new Blob([imageBuffer]));
      
      const uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountHash}/images/v1`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cloudflareApiToken}`,
          },
          body: formData
        }
      );

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        const cfImageId = uploadData.result.id;
        
        // Gerar URLs otimizadas
        const optimizedUrl = `https://imagedelivery.net/${cloudflareAccountHash}/${cfImageId}/w=${maxWidth},format=${format},quality=${quality}`;
        
        let variants = {};
        if (responsive) {
          variants = {
            mobile: `https://imagedelivery.net/${cloudflareAccountHash}/${cfImageId}/w=400,format=${format},quality=${quality}`,
            tablet: `https://imagedelivery.net/${cloudflareAccountHash}/${cfImageId}/w=800,format=${format},quality=${quality}`,
            desktop: `https://imagedelivery.net/${cloudflareAccountHash}/${cfImageId}/w=1200,format=${format},quality=${quality}`,
            large: `https://imagedelivery.net/${cloudflareAccountHash}/${cfImageId}/w=1600,format=${format},quality=${quality}`
          };
        }

        console.log('✅ Imagem otimizada com Cloudflare');

        return new Response(
          JSON.stringify({ 
            optimizedUrl,
            variants,
            originalSize,
            estimatedSize: Math.round(originalSize * 0.3), // WebP ~70% menor
            format,
            quality,
            maxWidth,
            provider: 'cloudflare'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // OPÇÃO 2: Fallback - Retornar URL com query params (sem conversão real)
    console.log('⚠️ Cloudflare não configurado, usando fallback');
    
    const optimizedUrl = `${imageUrl}?format=${format}&quality=${quality}&width=${maxWidth}`;
    
    let variants = {};
    if (responsive) {
      variants = {
        mobile: `${imageUrl}?format=${format}&quality=${quality}&width=400`,
        tablet: `${imageUrl}?format=${format}&quality=${quality}&width=800`,
        desktop: `${imageUrl}?format=${format}&quality=${quality}&width=1200`,
        large: `${imageUrl}?format=${format}&quality=${quality}&width=1600`
      };
    }

    return new Response(
      JSON.stringify({ 
        optimizedUrl,
        variants,
        originalSize,
        estimatedSize: originalSize, // Sem otimização real
        format,
        quality,
        maxWidth,
        provider: 'fallback',
        warning: 'Cloudflare Images não configurado. Configure CLOUDFLARE_ACCOUNT_HASH e CLOUDFLARE_API_TOKEN para otimização real.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});