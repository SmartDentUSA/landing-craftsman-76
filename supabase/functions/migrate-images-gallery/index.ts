import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Gera alt text SEO-friendly a partir da URL da imagem
 */
function sanitizeFileNameToAlt(url: string): string {
  try {
    const fileName = url.split('/').pop() || '';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    let cleaned = nameWithoutExt
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, '');
    
    cleaned = cleaned
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned || 'Imagem do Produto';
  } catch {
    return 'Imagem do Produto';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔄 Iniciando migração de images_gallery');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { productIds, forceReprocess } = await req.json().catch(() => ({}));

    console.log('📋 Parâmetros:', { productIds, forceReprocess });

    // 1️⃣ Buscar produtos que precisam migração
    let query = supabaseAdmin
      .from('products_repository')
      .select('id, name, image_url, images_gallery');

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
      console.log(`🎯 Processando ${productIds.length} produtos específicos`);
    } else {
      console.log('🌐 Processando todos os produtos');
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erro ao buscar produtos:', fetchError);
      throw fetchError;
    }

    console.log(`📦 Total de produtos encontrados: ${products?.length || 0}`);

    const results = {
      total: products?.length || 0,
      migrated: 0,
      skipped: 0,
      errors: [] as any[]
    };

    for (const product of products || []) {
      try {
        const hasImageUrl = product.image_url && product.image_url.trim() !== '';
        const hasGallery = product.images_gallery && 
                          Array.isArray(product.images_gallery) && 
                          product.images_gallery.length > 0;

        // Pular se não tem image_url
        if (!hasImageUrl) {
          console.log(`⏭️ Pulado (sem image_url): ${product.name}`);
          results.skipped++;
          continue;
        }

        // Pular se já tem galeria (exceto se forceReprocess)
        if (hasGallery && !forceReprocess) {
          console.log(`⏭️ Pulado (já tem galeria): ${product.name}`);
          results.skipped++;
          continue;
        }

        // 2️⃣ Gerar alt text SEO-friendly
        const altText = sanitizeFileNameToAlt(product.image_url);
        const productName = product.name || 'Produto';

        // 3️⃣ Criar objeto da galeria
        const galleryImage = {
          url: product.image_url,
          alt: `${altText} - ${productName}`,
          description: `Imagem principal do produto ${productName}`,
          width: 1200,
          height: 630,
          is_main: true,
          order: 0,
          migrated_at: new Date().toISOString()
        };

        // 4️⃣ Determinar nova galeria
        let newGallery: any[];
        
        if (forceReprocess && hasGallery) {
          console.log(`🔄 Reprocessando galeria existente: ${product.name}`);
          const existingGallery = product.images_gallery as any[];
          
          // Remover is_main de outras imagens
          const updatedGallery = existingGallery.map(img => ({
            ...img,
            is_main: false
          }));
          
          // Adicionar nova imagem principal no início
          newGallery = [galleryImage, ...updatedGallery];
        } else {
          console.log(`✨ Criando galeria nova: ${product.name}`);
          newGallery = [galleryImage];
        }

        // 5️⃣ Atualizar no banco
        const { error: updateError } = await supabaseAdmin
          .from('products_repository')
          .update({ images_gallery: newGallery })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${product.name}:`, updateError);
          throw updateError;
        }

        results.migrated++;
        console.log(`✅ Migrado (${results.migrated}/${results.total}): ${product.name}`);

      } catch (error) {
        results.errors.push({
          product_id: product.id,
          product_name: product.name,
          error: error.message
        });
        console.error(`❌ Erro ao migrar ${product.name}:`, error);
      }
    }

    console.log('📊 Resultado final:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migração concluída: ${results.migrated} produtos migrados, ${results.skipped} ignorados`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro fatal na migração:', error);
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
