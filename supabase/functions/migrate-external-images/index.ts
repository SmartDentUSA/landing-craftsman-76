import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  productId: string;
  productName: string;
  originalUrl: string;
  newUrl?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { batchSize = 10, forceRemigrate = false, productIds = null } = await req.json();

    console.log(`🚀 Iniciando migração de imagens (batch: ${batchSize}, force: ${forceRemigrate})`);

    // Buscar produtos com imagens externas
    let query = supabase
      .from('products_repository')
      .select('id, name, image_url, images_gallery, image_url_original');

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
    } else {
      // Apenas produtos com imagens externas
      query = query.or('image_url.like.%cdn.awsli.com.br%,image_url.like.http%://%');
      
      if (!forceRemigrate) {
        // Pular produtos já migrados
        query = query.is('image_url_original', null);
      }
    }

    const { data: products, error: fetchError } = await query.limit(batchSize);

    if (fetchError) {
      throw new Error(`Erro ao buscar produtos: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      console.log('✅ Nenhum produto para migrar');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma imagem para migrar',
          results: [],
          stats: { total: 0, success: 0, failed: 0, skipped: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Processando ${products.length} produtos`);

    const results: MigrationResult[] = [];
    const stats = { total: products.length, success: 0, failed: 0, skipped: 0 };

    for (const product of products) {
      const result: MigrationResult = {
        productId: product.id,
        productName: product.name,
        originalUrl: product.image_url,
        status: 'failed'
      };

      try {
        // Validar URL
        if (!product.image_url || !product.image_url.startsWith('http')) {
          result.status = 'skipped';
          result.error = 'URL inválida ou vazia';
          stats.skipped++;
          results.push(result);
          continue;
        }

        // Já migrado?
        if (!forceRemigrate && product.image_url.includes('supabase.co/storage')) {
          result.status = 'skipped';
          result.error = 'Já migrado para Supabase';
          stats.skipped++;
          results.push(result);
          continue;
        }

        console.log(`⬇️ Downloading: ${product.name} - ${product.image_url}`);

        // Download da imagem com headers para contornar hot-linking
        const imageResponse = await fetch(product.image_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://smartdent.com.br',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });

        if (!imageResponse.ok) {
          throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
        }

        const imageBlob = await imageResponse.blob();
        
        // Validar tipo de imagem
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
        if (!contentType.startsWith('image/')) {
          throw new Error(`Tipo inválido: ${contentType}`);
        }

        // Determinar extensão
        const extension = contentType.split('/')[1].split(';')[0] || 'jpg';
        const timestamp = Date.now();
        const fileName = `products/${product.id}-${timestamp}.${extension}`;

        console.log(`⬆️ Uploading: ${fileName} (${(imageBlob.size / 1024).toFixed(2)} KB)`);

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageBlob, {
            contentType,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload falhou: ${uploadError.message}`);
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        result.newUrl = publicUrl;

        // Atualizar galeria de imagens se existir
        let updatedGallery = product.images_gallery;
        if (Array.isArray(updatedGallery) && updatedGallery.length > 0) {
          updatedGallery = updatedGallery.map((img: any) => {
            if (img.url === product.image_url) {
              return { ...img, url: publicUrl };
            }
            return img;
          });
        }

        // Atualizar produto no banco
        const { error: updateError } = await supabase
          .from('products_repository')
          .update({
            image_url: publicUrl,
            image_url_original: product.image_url,
            images_gallery: updatedGallery,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (updateError) {
          throw new Error(`Erro ao atualizar produto: ${updateError.message}`);
        }

        result.status = 'success';
        stats.success++;
        console.log(`✅ Migrado: ${product.name}`);

      } catch (error: any) {
        result.status = 'failed';
        result.error = error.message;
        stats.failed++;
        console.error(`❌ Falha ${product.name}:`, error.message);
      }

      results.push(result);
    }

    console.log(`📊 Estatísticas: ${stats.success} sucesso, ${stats.failed} falhas, ${stats.skipped} pulados`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migração concluída: ${stats.success}/${stats.total} imagens migradas`,
        results,
        stats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
