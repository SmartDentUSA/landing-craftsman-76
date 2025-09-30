import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  name: string;
  price: string;
  originalPrice?: string;
  promoPrice?: string;
  promo_price?: number;
  installmentText?: string;
  description: string;
  image?: string;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean }>;
  available?: boolean;
  // ✨ NOVOS CAMPOS GOOGLE MERCHANT + SEO
  gtin?: string;
  mpn?: string;
  brand?: string;
  google_product_category?: string;
  condition?: 'new' | 'used' | 'refurbished';
  availability?: 'in stock' | 'out of stock' | 'preorder';
  color?: string;
  size?: string;
  material?: string;
  age_group?: string;
  gender?: string;
  // ✨ ESPECIFICAÇÕES FÍSICAS
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL é obrigatória');
    }

    // Permitir domínios customizados - não validar domínio rigidamente

    console.log('Extraindo dados da URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar a URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Tentar extrair dados do JSON-LD primeiro
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    
    // Extract physical specifications and variations from HTML (needed for both JSON-LD and fallback)
    // 🛡️ FUNÇÃO AUXILIAR: Validar se o dado é placeholder ou exemplo
    const isPlaceholderData = (value: string): boolean => {
      if (!value || typeof value !== 'string') return false;
      
      const lower = value.toLowerCase().trim();
      const placeholderPatterns = [
        /^ex[:\s.]/i,           // Ex: 2.5
        /^exemplo[:\s.]/i,      // Exemplo: valor
        /^digite/i,             // Digite aqui
        /^preencha/i,           // Preencha este campo
        /^informe/i,            // Informe o valor
        /^\[/,                  // [placeholder]
        /^{/,                   // {placeholder}
        /exemplo\s*:/i,         // "exemplo: valor"
        /\(exemplo\)/i          // "(exemplo)"
      ];
      
      const isPlaceholder = placeholderPatterns.some(pattern => pattern.test(lower));
      
      if (isPlaceholder) {
        console.log(`⚠️ PLACEHOLDER DETECTADO e REJEITADO: "${value}"`);
      }
      
      return isPlaceholder;
    };
    
    const extractPhysicalSpecs = () => {
      console.log('🔍 Iniciando extração de especificações físicas...');
      const specs: any = {};
      
      // PADRÕES EXPANDIDOS para Loja Integrada
      // Weight - múltiplos padrões
      const weightPatterns = [
        /(?:peso|weight)[\s:]*([0-9.,]+)\s*(?:kg|g|gramas?)/i,
        /<td[^>]*>[^<]*(?:peso|weight)[^<]*<\/td>[\s\S]*?<td[^>]*>([0-9.,]+)\s*(?:kg|g)/i,
        /data-weight=["']([0-9.,]+)["']/i,
        /"weight"[\s:]*"?([0-9.,]+)"?/i
      ];
      
      for (const pattern of weightPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          // 🛡️ VALIDAR se não é placeholder
          if (isPlaceholderData(match[1])) {
            console.log(`⚠️ Peso ignorado (placeholder): ${match[1]}`);
            continue;
          }
          
          const weightValue = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(weightValue) && weightValue > 0) {
            specs.weight = match[0].toLowerCase().includes('g') && !match[0].toLowerCase().includes('kg')
              ? weightValue / 1000
              : weightValue;
            console.log(`✅ Peso VÁLIDO encontrado: ${specs.weight}kg (origem: padrão regex)`);
            break;
          }
        }
      }
      
      // Dimensions - padrões expandidos
      const dimensionPatterns = {
        height: [
          /(?:altura|height)[\s:]*([0-9.,]+)\s*(?:cm|mm|centímetros?)/i,
          /<td[^>]*>[^<]*(?:altura|height)[^<]*<\/td>[\s\S]*?<td[^>]*>([0-9.,]+)/i,
          /data-height=["']([0-9.,]+)["']/i,
          /"height"[\s:]*"?([0-9.,]+)"?/i
        ],
        width: [
          /(?:largura|width)[\s:]*([0-9.,]+)\s*(?:cm|mm|centímetros?)/i,
          /<td[^>]*>[^<]*(?:largura|width)[^<]*<\/td>[\s\S]*?<td[^>]*>([0-9.,]+)/i,
          /data-width=["']([0-9.,]+)["']/i,
          /"width"[\s:]*"?([0-9.,]+)"?/i
        ],
        depth: [
          /(?:profundidade|depth|comprimento|length)[\s:]*([0-9.,]+)\s*(?:cm|mm|centímetros?)/i,
          /<td[^>]*>[^<]*(?:profundidade|comprimento|depth|length)[^<]*<\/td>[\s\S]*?<td[^>]*>([0-9.,]+)/i,
          /data-(?:depth|length)=["']([0-9.,]+)["']/i,
          /"(?:depth|length)"[\s:]*"?([0-9.,]+)"?/i
        ]
      };
      
      for (const [key, patterns] of Object.entries(dimensionPatterns)) {
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            // 🛡️ VALIDAR se não é placeholder
            if (isPlaceholderData(match[1])) {
              console.log(`⚠️ ${key} ignorado (placeholder): ${match[1]}`);
              continue;
            }
            
            const value = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(value) && value > 0) {
              specs[key] = match[0].toLowerCase().includes('mm') ? value / 10 : value;
              console.log(`✅ ${key} VÁLIDO encontrado: ${specs[key]}cm (origem: padrão regex)`);
              break;
            }
          }
        }
      }
      
      // Package size - SEM LIMITE de caracteres
      const packagePatterns = [
        /(?:embalagem|package|packaging)[\s:]*([^<\n]{5,500})/i,
        /<td[^>]*>[^<]*(?:embalagem|package)[^<]*<\/td>[\s\S]*?<td[^>]*>([^<]{5,500})<\/td>/i,
        /data-package=["']([^"']{5,500})["']/i
      ];
      
      for (const pattern of packagePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const packageValue = match[1].trim();
          
          // 🛡️ VALIDAR se não é placeholder
          if (isPlaceholderData(packageValue)) {
            console.log(`⚠️ Tamanho da embalagem ignorado (placeholder): ${packageValue}`);
            continue;
          }
          
          specs.package_size = packageValue;
          console.log(`✅ Tamanho da embalagem VÁLIDO: ${specs.package_size.substring(0, 50)}... (${specs.package_size.length} caracteres, origem: regex)`);
          break;
        }
      }
      
      // Store category from breadcrumbs - MÚLTIPLOS padrões
      const breadcrumbPatterns = [
        /<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/nav>/is,
        /<ol[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/ol>/is,
        /<ul[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/ul>/is,
        /<div[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/div>/is
      ];
      
      for (const pattern of breadcrumbPatterns) {
        const breadcrumbMatch = html.match(pattern);
        if (breadcrumbMatch) {
          const breadcrumbLinks = breadcrumbMatch[1].match(/>([^<]+)</g);
          if (breadcrumbLinks && breadcrumbLinks.length > 1) {
            const categories = breadcrumbLinks
              .map(link => link.replace(/>/g, '').replace(/</g, '').trim())
              .filter(cat => cat && !cat.toLowerCase().includes('home') && cat.length < 200);
            if (categories.length > 0) {
              specs.store_category = categories[categories.length - 1];
              console.log(`✅ Categoria da loja: ${specs.store_category}`);
              break;
            }
          }
        }
      }
      
      console.log(`📊 Especificações extraídas:`, specs);
      return specs;
    };
    
    const extractVariations = (jsonLdData?: any) => {
      const variations: { name: string; price?: number; stock?: number; color?: string; size?: string }[] = [];
      
      // Try from JSON-LD first
      if (jsonLdData && jsonLdData.hasVariant) {
        const variants = Array.isArray(jsonLdData.hasVariant) ? jsonLdData.hasVariant : [jsonLdData.hasVariant];
        variants.forEach((variant: any) => {
          variations.push({
            name: variant.name || '',
            price: variant.offers?.price ? parseFloat(variant.offers.price) : undefined,
            stock: variant.offers?.availability === 'InStock' ? 999 : 0,
            color: variant.color || '',
            size: variant.size || ''
          });
        });
      }
      
      // Fallback: extract from select/option elements
      if (variations.length === 0) {
        const variationSelectMatch = html.match(/<select[^>]*(?:data-variant|variant|variacao)[^>]*>(.*?)<\/select>/gis);
        if (variationSelectMatch) {
          variationSelectMatch.forEach(selectHtml => {
            const options = selectHtml.match(/<option[^>]*value="([^"]*)"[^>]*>([^<]+)<\/option>/gi);
            if (options) {
              options.forEach(option => {
                const textMatch = option.match(/>([^<]+)</);
                if (textMatch && textMatch[1].trim()) {
                  variations.push({
                    name: textMatch[1].trim(),
                    price: undefined,
                    stock: undefined,
                    color: '',
                    size: ''
                  });
                }
              });
            }
          });
        }
      }
      
      return variations.length > 0 ? variations : undefined;
    };
    
    // ✨ FUNÇÃO CORRIGIDA: Extrair APENAS imagens do produto específico
    const extractImagesGallery = (jsonLdData?: any, mainImageUrl?: string) => {
      const imagesSet = new Set<string>();
      const gallery: Array<{ url: string; alt: string; order: number; is_main: boolean }> = [];
      
      console.log('🖼️ Iniciando extração de galeria de imagens...');
      
      // 🎯 EXTRAIR ID DO PRODUTO DA URL
      const productIdMatch = url.match(/\/produto\/(\d+)|\/(\d+)\/|produto[/-](\d+)|[\/-](\d{5,})/i);
      const productId = productIdMatch ? (productIdMatch[1] || productIdMatch[2] || productIdMatch[3] || productIdMatch[4]) : null;
      
      if (productId) {
        console.log(`🔍 ID do produto identificado: ${productId}`);
      } else {
        console.log('⚠️ ID do produto não identificado na URL - filtragem será menos precisa');
      }
      
      // 1. Extrair do JSON-LD
      if (jsonLdData?.image) {
        const jsonImages = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
        jsonImages.forEach((img: string) => {
          try {
            const normalizedUrl = new URL(img, url).href;
            imagesSet.add(normalizedUrl);
          } catch (_e) {
            if (img) imagesSet.add(img);
          }
        });
        console.log(`✅ Extraídas ${jsonImages.length} imagens do JSON-LD`);
      }
      
      // 2. PADRÕES EXPANDIDOS para Loja Integrada e outros e-commerces
      const imageExtractionPatterns = [
        // Loja Integrada - Galeria principal
        /<div[^>]*class="[^"]*product-images[^"]*"[^>]*>[\s\S]{0,2000}?<img[^>]*src="([^"]+)"/gi,
        /<div[^>]*class="[^"]*product-gallery[^"]*"[^>]*>[\s\S]{0,2000}?<img[^>]*src="([^"]+)"/gi,
        /<div[^>]*class="[^"]*thumbs?[^"]*"[^>]*>[\s\S]{0,2000}?<img[^>]*src="([^"]+)"/gi,
        
        // Imagens com data attributes (comum em Loja Integrada)
        /<img[^>]*data-image="([^"]+)"/gi,
        /<img[^>]*data-src="([^"]+)"/gi,
        /<a[^>]*data-image="([^"]+)"/gi,
        /<a[^>]*href="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi,
        
        // Classes específicas
        /<img[^>]*class="[^"]*(?:product-image|gallery-image|main-image|thumb|slide|zoom)[^"]*"[^>]*src="([^"]+)"/gi,
        
        // Picture element
        /<picture[^>]*>[\s\S]{0,500}?<img[^>]*src="([^"]+)"/gi,
        /<picture[^>]*>[\s\S]{0,500}?<source[^>]*srcset="([^"\s]+)"/gi,
        
        // Srcset
        /<img[^>]*srcset="([^"\s]+)"/gi,
        
        // Padrão genérico para produtos
        /<img[^>]*src="([^"]*product[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi,
        /<img[^>]*src="([^"]*cdn[^"]*\.(jpg|jpeg|png|webp)[^"]*)"/gi
      ];
      
      console.log(`🔍 Executando ${imageExtractionPatterns.length} padrões de extração...`);
      let totalMatches = 0;
      
      imageExtractionPatterns.forEach((pattern, index) => {
        let match;
        let patternMatches = 0;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(html)) !== null) {
          const imgUrl = match[1];
          if (imgUrl && !imgUrl.includes('placeholder') && !imgUrl.includes('loading') && !imgUrl.includes('spacer')) {
            try {
              const normalizedUrl = imgUrl.startsWith('http') 
                ? imgUrl 
                : new URL(imgUrl, url).href;
              imagesSet.add(normalizedUrl);
              patternMatches++;
            } catch (_e) {
              if (imgUrl.startsWith('http')) {
                imagesSet.add(imgUrl);
                patternMatches++;
              }
            }
          }
        }
        
        if (patternMatches > 0) {
          console.log(`  ✅ Padrão ${index + 1}: ${patternMatches} imagens encontradas`);
          totalMatches += patternMatches;
        }
      });
      
      console.log(`📊 Total de matches: ${totalMatches}, imagens únicas: ${imagesSet.size}`);
      
      // 3. Buscar meta tags og:image e twitter:image
      const metaImagePatterns = [
        /property=["']og:image["'][^>]*content=["']([^"']+)["']/gi,
        /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi,
        /content=["']([^"']+)["'][^>]*property=["']og:image["']/gi
      ];
      
      metaImagePatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          try {
            const normalizedUrl = new URL(match[1], url).href;
            imagesSet.add(normalizedUrl);
          } catch (_e) {
            if (match[1]) imagesSet.add(match[1]);
          }
        }
      });
      
      // 4. 🎯 FILTRAGEM RIGOROSA: apenas imagens DO PRODUTO ESPECÍFICO
      const validImages = Array.from(imagesSet).filter(imgUrl => {
        const lower = imgUrl.toLowerCase();
        
        // 🚫 EXCLUIR IMEDIATAMENTE: ícones, pagamentos, selos, badges
        const criticalExclusions = [
          'logo', 'icon', 'banner', 'selo', 'badge', 'sprite', 'favicon',
          'payment', 'pagamento', 'payu', 'mercadopago', 'ssl', 'seguro',
          'whatsapp', 'instagram', 'facebook', 'twitter', 'social',
          'correios', 'sedex', 'frete', 'shipping',
          'certificado', 'garantia', 'warranty'
        ];
        if (criticalExclusions.some(pattern => lower.includes(pattern))) {
          console.log(`❌ Excluída imagem de serviço/pagamento: ${imgUrl.substring(0, 60)}...`);
          return false;
        }
        
        // 🚫 EXCLUIR: Produtos relacionados/sugeridos (URLs que indicam outros produtos)
        if (lower.includes('relacionado') || lower.includes('sugerido') || lower.includes('similar')) {
          console.log(`❌ Excluída imagem de produto relacionado: ${imgUrl.substring(0, 60)}...`);
          return false;
        }
        
        // 🎯 FILTRO POR ID: Se temos ID do produto, PRIORIZAR imagens que contenham esse ID
        if (productId) {
          const hasProductId = imgUrl.includes(`/${productId}/`) || 
                               imgUrl.includes(`produto/${productId}`) ||
                               imgUrl.includes(`product/${productId}`) ||
                               imgUrl.includes(`${productId}.`) ||
                               imgUrl.includes(`-${productId}-`) ||
                               imgUrl.includes(`_${productId}_`);
          
          if (!hasProductId) {
            // Se não tem o ID do produto na URL, é muito provável que seja de outro produto
            // Vamos ser MUITO restritivos aqui
            const hasOtherProductId = /\/\d{5,}[\/\.]/.test(imgUrl) && !imgUrl.includes(productId);
            if (hasOtherProductId) {
              console.log(`❌ Excluída imagem de OUTRO produto (ID diferente): ${imgUrl.substring(0, 60)}...`);
              return false;
            }
          } else {
            console.log(`✅ Imagem CONFIRMADA do produto ${productId}: ${imgUrl.substring(0, 60)}...`);
          }
        }
        
        // ✅ INCLUIR: imagens com padrões claros de produto
        const includePatterns = ['product', 'produto', '800x800', '1000x1000', '1200x1200', '2500x2500', 'gallery', 'zoom'];
        if (includePatterns.some(pattern => lower.includes(pattern))) return true;
        
        // ✅ INCLUIR: CDN com extensão válida
        if (lower.includes('cdn') && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower)) return true;
        
        return false;
      });
      
      console.log(`✅ Imagens válidas após filtragem: ${validImages.length}`);
      
      // 5. Construir galeria ordenada
      validImages.forEach((imgUrl, index) => {
        const isMain = mainImageUrl ? imgUrl === mainImageUrl : index === 0;
        gallery.push({
          url: imgUrl,
          alt: jsonLdData?.name || 'Imagem do produto',
          order: isMain ? 0 : index + 1,
          is_main: isMain
        });
      });
      
      // 6. Garantir que existe uma imagem principal
      if (gallery.length > 0 && !gallery.some(img => img.is_main)) {
        gallery[0].is_main = true;
        gallery[0].order = 0;
      }
      
      // 7. Reordenar: imagem principal primeiro
      gallery.sort((a, b) => {
        if (a.is_main) return -1;
        if (b.is_main) return 1;
        return a.order - b.order;
      });
      
      console.log(`✅ Galeria final com ${gallery.length} imagens`);
      gallery.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.is_main ? '⭐ PRINCIPAL' : '  '} ${img.url.substring(0, 80)}...`);
      });
      
      return gallery.length > 0 ? gallery : undefined;
    };
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          
          // Handle array of structured data
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            if (item['@type'] === 'Product' && item.name) {
              console.log('Found product in JSON-LD:', item);
              const rawImage = Array.isArray(item.image) ? item.image?.[0] : item.image;
              let normalizedImage = '';
              try {
                normalizedImage = rawImage ? new URL(rawImage, url).href : '';
              } catch (_e) {
                normalizedImage = rawImage || '';
              }
              console.log('JSON-LD image (normalized):', { rawImage, normalizedImage });
              
              // Extract physical specs, variations and images gallery
              const physicalSpecs = extractPhysicalSpecs();
              const variations = extractVariations(item);
              const imagesGallery = extractImagesGallery(item, normalizedImage);
              
              // Preparar dados com conversão de promo_price
              const promoPrice = item.offers?.lowPrice || item.offers?.price || '';
              const promoPriceNumeric = promoPrice ? parseFloat(promoPrice.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : undefined;
              
              return new Response(
                JSON.stringify({
                  success: true,
                  data: {
                    name: item.name,
                    price: item.offers?.price || item.offers?.priceRange || '',
                    originalPrice: item.offers?.highPrice || '',
                    promoPrice: promoPrice,
                    promo_price: (promoPriceNumeric && !isNaN(promoPriceNumeric) && promoPriceNumeric > 0) ? promoPriceNumeric : undefined,
                    installmentText: item.offers?.priceSpecification?.priceCurrency ? `ou ${item.offers?.priceSpecification?.maxPrice || ''} em até 12x` : '',
                    description: item.description || '',
                    image: normalizedImage,
                    images_gallery: imagesGallery,
                    available: item.offers?.availability !== 'OutOfStock',
                    // ✨ EXTRAIR DADOS GOOGLE MERCHANT DO JSON-LD
                    gtin: item.gtin13 || item.gtin14 || item.gtin || item.ean || item.upc || '',
                    mpn: item.mpn || item.sku || item.model || '',
                    brand: item.brand?.name || item.brand || '',
                    google_product_category: item.category || '',
                    condition: item.itemCondition === 'NewCondition' ? 'new' : (item.itemCondition === 'UsedCondition' ? 'used' : 'new'),
                    availability: item.offers?.availability === 'InStock' ? 'in stock' : (item.offers?.availability === 'OutOfStock' ? 'out of stock' : 'in stock'),
                    color: item.color || '',
                    size: item.size || '',
                    material: item.material || '',
                    age_group: item.audience?.suggestedMinAge ? 'adult' : '',
                    gender: item.audience?.suggestedGender || '',
                    // ✨ ESPECIFICAÇÕES FÍSICAS E VARIAÇÕES
                    ...physicalSpecs,
                    variations
                  },
                  extracted_at: new Date().toISOString()
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
    }
    
    // Fallback para extração por regex
    const productData: ProductData = {
      name: '',
      price: '',
      description: '',
      image: '',
      available: true
    };

    // Extrair nome do produto
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                      html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/property="og:title"\s+content="([^"]+)"/i);
    if (titleMatch) {
      productData.name = titleMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extrair preços múltiplos - Loja Integrada e outros e-commerces brasileiros
    
    // 1. Tentar meta property da Loja Integrada
    const priceMetaMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (priceMetaMatch) {
      productData.promoPrice = priceMetaMatch[1].trim();
      console.log('Promotional price found via meta property:', productData.promoPrice);
    }
    
    // 2. Buscar preços riscados (preço original)
    const originalPricePatterns = [
      /de[:\s]*R?\$?\s*([\d.,]+)/gi,
      /preço[:\s]*normal[:\s]*R?\$?\s*([\d.,]+)/gi,
      /valor[:\s]*original[:\s]*R?\$?\s*([\d.,]+)/gi,
      /<del[^>]*>.*?R?\$?\s*([\d.,]+).*?<\/del>/gi,
      /<s[^>]*>.*?R?\$?\s*([\d.,]+).*?<\/s>/gi,
      /text-decoration[:\s]*line-through[^>]*>.*?R?\$?\s*([\d.,]+)/gi
    ];
    
    for (const pattern of originalPricePatterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        const price = match[0].replace(/[^\d.,]/g, '').replace(',', '.');
        if (price && parseFloat(price) > 0) {
          productData.originalPrice = price;
          console.log('Original price found:', productData.originalPrice);
          break;
        }
      }
    }
    
    // 3. Buscar preços promocionais (destacados)
    const promoPricePatterns = [
      /por[:\s]*R?\$?\s*([\d.,]+)/gi,
      /apenas[:\s]*R?\$?\s*([\d.,]+)/gi,
      /oferta[:\s]*R?\$?\s*([\d.,]+)/gi,
      /promoção[:\s]*R?\$?\s*([\d.,]+)/gi,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>.*?R?\$?\s*([\d.,]+)/gi,
      /<div[^>]*class="[^"]*promo[^"]*"[^>]*>.*?R?\$?\s*([\d.,]+)/gi
    ];
    
    if (!productData.promoPrice) {
      for (const pattern of promoPricePatterns) {
        const match = html.match(pattern);
        if (match && match[0]) {
          const price = match[0].replace(/[^\d.,]/g, '').replace(',', '.');
          if (price && parseFloat(price) > 0) {
            productData.promoPrice = price;
            console.log('Promotional price found via pattern:', productData.promoPrice);
            break;
          }
        }
      }
    }
    
    // 4. Buscar informações de parcelamento
    const installmentPatterns = [
      /ou\s*até?\s*(\d+)x?\s*de\s*R?\$?\s*([\d.,]+)/gi,
      /(\d+)x?\s*de\s*R?\$?\s*([\d.,]+)\s*sem\s*juros?/gi,
      /parcelamento[:\s]*(\d+)x?\s*R?\$?\s*([\d.,]+)/gi,
      /em\s*até?\s*(\d+)x?\s*R?\$?\s*([\d.,]+)/gi
    ];
    
    for (const pattern of installmentPatterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[2]) {
        const installments = match[1];
        const installmentValue = match[2].replace(/[^\d.,]/g, '').replace(',', '.');
        productData.installmentText = `ou ${installments}x de R$ ${installmentValue}`;
        console.log('Installment info found:', productData.installmentText);
        break;
      }
    }
    
    // 5. Fallback: buscar qualquer preço no formato R$ 
    if (!productData.price && !productData.promoPrice) {
      const allPrices = html.match(/R\$\s*[\d.,]+/gi);
      if (allPrices && allPrices.length > 0) {
        // Usar o primeiro preço encontrado como preço principal
        productData.price = allPrices[0].replace(/[^\d.,]/g, '').replace(',', '.');
        console.log('Fallback price found via regex:', productData.price);
      }
    }
    
    // 6. Organizar preços: price = normal, promoPrice = promocional
    // Se existe originalPrice, ele é o preço de venda normal
    if (productData.originalPrice && !productData.price) {
      productData.price = productData.originalPrice;
    }
    
    // Se temos promoPrice e price, verificar qual é maior para garantir que price seja o normal
    if (productData.promoPrice && productData.price) {
      const priceNum = parseFloat(productData.price);
      const promoNum = parseFloat(productData.promoPrice);
      
      // Se o "promoPrice" for maior que o "price", inverter
      if (promoNum > priceNum) {
        const temp = productData.price;
        productData.price = productData.promoPrice;
        productData.promoPrice = temp;
      }
    }
    
    // Se só temos promoPrice mas não temos price, promoPrice vira price (não há promoção)
    if (productData.promoPrice && !productData.price) {
      productData.price = productData.promoPrice;
      productData.promoPrice = undefined; // Limpar promoPrice pois não há diferença
    }
    
    // Converter promoPrice para número (promo_price) se existir
    if (productData.promoPrice) {
      const promoNumeric = parseFloat(productData.promoPrice.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(promoNumeric) && promoNumeric > 0) {
        productData.promo_price = promoNumeric;
      }
    }

    // Extrair descrição
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                     html.match(/property="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
      productData.description = descMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extrair imagem principal
    const imgMatch = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                    html.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
    if (imgMatch) {
      const rawImg = imgMatch[1];
      try {
        productData.image = new URL(rawImg, url).href;
      } catch (_e) {
        productData.image = rawImg;
      }
      console.log('Fallback image (normalized):', { rawImg, normalized: productData.image });
    }

    // ✨ EXTRAIR CAMPOS GOOGLE MERCHANT VIA META TAGS E REGEX - COM VALIDAÇÃO DE PLACEHOLDERS
    console.log('🏪 Iniciando extração de dados Google Merchant Center...');
    
    // 🛡️ Função auxiliar para validar e extrair dados Google Merchant
    const extractMerchantField = (patterns: RegExp[], fieldName: string): string => {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const value = match[1].trim();
          
          // Validar se não é placeholder
          if (isPlaceholderData(value)) {
            console.log(`⚠️ ${fieldName} ignorado (placeholder detectado): "${value}"`);
            continue;
          }
          
          // Validar se não é muito curto ou genérico
          if (value.length < 2 || value.toLowerCase() === 'hide') {
            console.log(`⚠️ ${fieldName} ignorado (valor inválido): "${value}"`);
            continue;
          }
          
          console.log(`✅ ${fieldName} VÁLIDO encontrado: "${value}" (origem: padrão regex)`);
          return value;
        }
      }
      return '';
    };
    
    // Extrair GTIN/EAN/UPC com múltiplos padrões
    const gtinPatterns = [
      /<meta[^>]*property=["']product:gtin["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']gtin["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']product:ean["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*(?:EAN|GTIN|UPC)[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>(\d{8,14})<\/td>/i,
      /EAN[:\s]*(\d{13})/i,
      /GTIN[:\s]*(\d{8,14})/i,
      /UPC[:\s]*(\d{12})/i,
      /Código\s*de\s*Barras[:\s]*(\d{8,14})/i,
      /"gtin"[\s:]*"(\d{8,14})"/i
    ];
    
    const extractedGtin = extractMerchantField(gtinPatterns, 'GTIN');
    if (extractedGtin && /^\d{8,14}$/.test(extractedGtin)) {
      productData.gtin = extractedGtin;
    }
    if (!productData.gtin) console.log('⚠️ GTIN não encontrado');

    // Extrair MPN/SKU com múltiplos padrões
    const mpnPatterns = [
      /<meta[^>]*property=["']product:mpn["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']mpn["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']product:sku["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*(?:SKU|MPN|Código|Referência)[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([A-Z0-9\-_]+)<\/td>/i,
      /SKU[:\s]*([A-Z0-9\-_]+)/i,
      /MPN[:\s]*([A-Z0-9\-_]+)/i,
      /Código[:\s]*([A-Z0-9\-_]+)/i,
      /Referência[:\s]*([A-Z0-9\-_]+)/i,
      /"sku"[\s:]*"([^"]+)"/i,
      /data-sku=["']([^"']+)["']/i
    ];
    
    const extractedMpn = extractMerchantField(mpnPatterns, 'MPN/SKU');
    if (extractedMpn) {
      productData.mpn = extractedMpn;
    }
    if (!productData.mpn) console.log('⚠️ MPN/SKU não encontrado');

    // Extrair Marca com múltiplos padrões
    const brandPatterns = [
      /<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']brand["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*property=["']og:brand["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*Marca[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([^<]+)<\/td>/i,
      /Marca[:\s]*<[^>]*>([^<]+)</i,
      /Marca[:\s]*([A-Za-z0-9\s\-]+)(?:<|$|\n)/i,
      /"brand"[\s:]*{[^}]*"name"[\s:]*"([^"]+)"/i,
      /"brand"[\s:]*"([^"]+)"/i,
      /data-brand=["']([^"']+)["']/i
    ];
    
    const extractedBrand = extractMerchantField(brandPatterns, 'Marca');
    if (extractedBrand) {
      productData.brand = extractedBrand;
    }
    if (!productData.brand) console.log('⚠️ Marca não encontrada');

    // Extrair Cor com múltiplos padrões - SEM LIMITE de caracteres
    const colorPatterns = [
      /<meta[^>]*property=["']product:color["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*Cor[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([^<]+)<\/td>/i,
      /Cor[:\s]*<[^>]*>([^<]+)</i,
      /Cor[:\s]*([A-Za-zÀ-ÿ0-9\s\-\/,]+)(?:<|$|\n)/i,
      /"color"[\s:]*"([^"]+)"/i,
      /data-color=["']([^"']+)["']/i,
      /Cores?\s*Disponíveis?[:\s]*([^<\n]{3,200})/i
    ];
    
    const extractedColor = extractMerchantField(colorPatterns, 'Cor');
    if (extractedColor) {
      productData.color = extractedColor;
      console.log(`✅ Cor FINAL definida: ${productData.color} (${productData.color.length} caracteres)`);
    }
    if (!productData.color) console.log('⚠️ Cor não encontrada');

    // Extrair Tamanho com múltiplos padrões
    const sizePatterns = [
      /<meta[^>]*property=["']product:size["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*Tamanho[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([^<]+)<\/td>/i,
      /Tamanho[:\s]*([A-Za-z0-9\s\-]+)(?:<|$|\n)/i,
      /"size"[\s:]*"([^"]+)"/i,
      /data-size=["']([^"']+)["']/i
    ];
    
    const extractedSize = extractMerchantField(sizePatterns, 'Tamanho');
    if (extractedSize) {
      productData.size = extractedSize;
    }
    if (!productData.size) console.log('⚠️ Tamanho não encontrado');

    // Extrair Material
    const materialPatterns = [
      /<meta[^>]*property=["']product:material["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<td[^>]*>[^<]*Material[^<]*<\/td>[\s\S]{0,200}?<td[^>]*>([^<]+)<\/td>/i,
      /Material[:\s]*([A-Za-zÀ-ÿ0-9\s\-,\/]+)(?:<|$|\n)/i,
      /"material"[\s:]*"([^"]+)"/i
    ];
    
    const extractedMaterial = extractMerchantField(materialPatterns, 'Material');
    if (extractedMaterial) {
      productData.material = extractedMaterial;
    }
    if (!productData.material) console.log('⚠️ Material não encontrado');

    // Extrair Google Product Category
    const categoryPatterns = [
      /<meta[^>]*property=["']product:category["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*name=["']google_product_category["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /"google_product_category"[\s:]*"([^"]+)"/i
    ];
    
    for (const pattern of categoryPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        productData.google_product_category = match[1].trim();
        console.log(`✅ Google Product Category: ${productData.google_product_category}`);
        break;
      }
    }
    if (!productData.google_product_category) console.log('ℹ️ Google Product Category não encontrada (será mapeada pela categoria da loja)');

    // Verificar disponibilidade (melhorado)
    const unavailableKeywords = ['indisponível', 'esgotado', 'fora de estoque', 'sem estoque', 'out of stock', 'unavailable'];
    const availableKeywords = ['em estoque', 'disponível', 'in stock', 'available'];
    
    const htmlLower = html.toLowerCase();
    const hasUnavailable = unavailableKeywords.some(keyword => htmlLower.includes(keyword));
    const hasAvailable = availableKeywords.some(keyword => htmlLower.includes(keyword));
    
    const isUnavailable = hasUnavailable && !hasAvailable;
    productData.available = !isUnavailable;
    productData.availability = isUnavailable ? 'out of stock' : 'in stock';
    console.log(`✅ Disponibilidade: ${productData.availability}`);
    
    // Definir condição padrão
    productData.condition = 'new';
    console.log('✅ Condição definida como: new');
    
    console.log('📊 Resumo Google Merchant:', {
      gtin: productData.gtin || 'NÃO ENCONTRADO',
      mpn: productData.mpn || 'NÃO ENCONTRADO',
      brand: productData.brand || 'NÃO ENCONTRADO',
      color: productData.color ? `${productData.color.substring(0, 30)}...` : 'NÃO ENCONTRADO',
      size: productData.size || 'NÃO ENCONTRADO',
      material: productData.material || 'NÃO ENCONTRADO',
      availability: productData.availability,
      condition: productData.condition
    });

    // Extract physical specifications using the helper function
    const physicalSpecs = extractPhysicalSpecs();
    Object.assign(productData, physicalSpecs);
    
    // Extract variations using the helper function
    const variationsData = extractVariations();
    if (variationsData) {
      productData.variations = variationsData;
    }
    
    // Extract images gallery using the helper function
    const imagesGallery = extractImagesGallery(undefined, productData.image);
    if (imagesGallery) {
      productData.images_gallery = imagesGallery;
    }

    console.log('Dados extraídos:', productData);

    return new Response(
      JSON.stringify({
        success: true,
        data: productData,
        extracted_at: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro ao extrair dados do produto:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || 'Erro ao extrair dados do produto',
        extracted_at: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});