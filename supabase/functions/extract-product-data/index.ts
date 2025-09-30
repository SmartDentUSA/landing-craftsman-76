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
  installmentText?: string;
  description: string;
  image?: string;
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
              return new Response(
                JSON.stringify({
                  success: true,
                  data: {
                    name: item.name,
                    price: item.offers?.price || item.offers?.priceRange || '',
                    originalPrice: item.offers?.highPrice || '',
                    promoPrice: item.offers?.lowPrice || item.offers?.price || '',
                    installmentText: item.offers?.priceSpecification?.priceCurrency ? `ou ${item.offers?.priceSpecification?.maxPrice || ''} em até 12x` : '',
                    description: item.description || '',
                    image: normalizedImage,
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
                    gender: item.audience?.suggestedGender || ''
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
    
    // 6. Definir preço principal - CORRIGIDO: usar preço promocional como principal se existir
    if (productData.promoPrice) {
      // Se temos preço promocional, ele é o preço principal
      if (!productData.originalPrice && productData.price && productData.price !== productData.promoPrice) {
        // O preço atual vira o preço original se for diferente do promocional
        productData.originalPrice = productData.price;
      }
      productData.price = productData.promoPrice;
    } else if (!productData.price && productData.originalPrice) {
      // Se só temos preço original, ele vira o preço principal
      productData.price = productData.originalPrice;
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

    // ✨ EXTRAIR CAMPOS GOOGLE MERCHANT VIA META TAGS E REGEX
    
    // Extrair GTIN/EAN/UPC
    const gtinMatch = html.match(/<meta[^>]*property=["']product:gtin["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/<meta[^>]*name=["']gtin["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/EAN[:\s]*(\d{13})/i) ||
                      html.match(/GTIN[:\s]*(\d{8,14})/i);
    if (gtinMatch) productData.gtin = gtinMatch[1];

    // Extrair MPN/SKU
    const mpnMatch = html.match(/<meta[^>]*property=["']product:mpn["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/<meta[^>]*name=["']mpn["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                     html.match(/SKU[:\s]*([A-Z0-9\-_]+)/i) ||
                     html.match(/Código[:\s]*([A-Z0-9\-_]+)/i);
    if (mpnMatch) productData.mpn = mpnMatch[1];

    // Extrair Marca
    const brandMatch = html.match(/<meta[^>]*property=["']product:brand["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                       html.match(/<meta[^>]*name=["']brand["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                       html.match(/Marca[:\s]*([A-Za-z0-9\s]+)/i);
    if (brandMatch) productData.brand = brandMatch[1].trim();

    // Extrair Cor
    const colorMatch = html.match(/<meta[^>]*property=["']product:color["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                       html.match(/Cor[:\s]*([A-Za-z\s]+)/i);
    if (colorMatch) productData.color = colorMatch[1].trim();

    // Extrair Tamanho
    const sizeMatch = html.match(/<meta[^>]*property=["']product:size["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                      html.match(/Tamanho[:\s]*([A-Za-z0-9\s]+)/i);
    if (sizeMatch) productData.size = sizeMatch[1].trim();

    // Verificar disponibilidade (melhorado)
    const unavailableKeywords = ['indisponível', 'esgotado', 'fora de estoque', 'sem estoque', 'out of stock'];
    const isUnavailable = unavailableKeywords.some(keyword => 
      html.toLowerCase().includes(keyword)
    );
    productData.available = !isUnavailable;
    productData.availability = isUnavailable ? 'out of stock' : 'in stock';
    
    // Definir condição padrão
    productData.condition = 'new';

    // Extract physical specifications
    // Weight
    const weightMatch = html.match(/(?:peso|weight)[\s:]*([0-9.,]+)\s*(?:kg|g)/i);
    if (weightMatch) {
      const weightValue = parseFloat(weightMatch[1].replace(',', '.'));
      productData.weight = weightMatch[0].toLowerCase().includes('g') && !weightMatch[0].toLowerCase().includes('kg')
        ? weightValue / 1000 // Convert grams to kg
        : weightValue;
    }

    // Dimensions (height, width, depth)
    const heightMatch = html.match(/(?:altura|height)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i);
    if (heightMatch) {
      const heightValue = parseFloat(heightMatch[1].replace(',', '.'));
      productData.height = heightMatch[0].toLowerCase().includes('mm')
        ? heightValue / 10 // Convert mm to cm
        : heightValue;
    }

    const widthMatch = html.match(/(?:largura|width)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i);
    if (widthMatch) {
      const widthValue = parseFloat(widthMatch[1].replace(',', '.'));
      productData.width = widthMatch[0].toLowerCase().includes('mm')
        ? widthValue / 10
        : widthValue;
    }

    const depthMatch = html.match(/(?:profundidade|depth|comprimento|length)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i);
    if (depthMatch) {
      const depthValue = parseFloat(depthMatch[1].replace(',', '.'));
      productData.depth = depthMatch[0].toLowerCase().includes('mm')
        ? depthValue / 10
        : depthValue;
    }

    // Package size
    const packageMatch = html.match(/(?:embalagem|package|packaging)[\s:]*([^<\n]{5,50})/i);
    if (packageMatch) {
      productData.package_size = packageMatch[1].trim();
    }

    // Store category - extract from breadcrumbs or navigation
    const breadcrumbMatch = html.match(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/nav>/is);
    if (breadcrumbMatch) {
      const breadcrumbLinks = breadcrumbMatch[1].match(/>([^<]+)</g);
      if (breadcrumbLinks && breadcrumbLinks.length > 1) {
        // Get the last meaningful category (excluding "Home" and product name)
        const categories = breadcrumbLinks
          .map(link => link.replace(/>/g, '').replace(/</g, '').trim())
          .filter(cat => cat && !cat.toLowerCase().includes('home') && cat.length < 50);
        if (categories.length > 0) {
          productData.store_category = categories[categories.length - 1];
        }
      }
    }

    // Extract product variations from JSON-LD or variation selectors
    const variations: { name: string; price?: number; stock?: number; color?: string; size?: string }[] = [];
    
    // Try to find variations in product schema
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            if (item.hasVariant) {
              const variants = Array.isArray(item.hasVariant) ? item.hasVariant : [item.hasVariant];
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
          }
        } catch (_e) {
          // Continue to next approach
        }
      }
    }

    // Fallback: Try to extract from select/option elements (common in Loja Integrada)
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

    if (variations.length > 0) {
      productData.variations = variations;
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