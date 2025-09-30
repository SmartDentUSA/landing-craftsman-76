import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductData {
  name: string;
  price: number;
  promo_price?: number;
  installmentText?: string;
  description: string;
  image?: string;
  images_gallery?: Array<{ url: string; alt: string; order: number; is_main: boolean }>;
  available?: boolean;
  // Google Merchant + SEO fields
  gtin?: string;
  ean?: string;
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
  // Physical specifications
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
}

// 🔥 PARSING BRL ROBUSTO
const parsePriceBRL = (priceStr: string): number => {
  if (!priceStr) return 0;
  
  const original = priceStr;
  let cleaned = priceStr.trim();
  
  console.log(`💰 Parsing BRL price: "${original}"`);
  
  // Remover símbolos de moeda e espaços
  cleaned = cleaned.replace(/R\$|€|\$|USD|BRL/gi, '').trim();
  
  // Contar pontos e vírgulas para detectar formato
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  
  // Formato brasileiro: 1.859,00 ou 1859,00
  if (commaCount === 1 && (dotCount > 0 || cleaned.length > 6)) {
    // Remover pontos (milhares) e trocar vírgula por ponto (decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    console.log(`  ✅ Formato BRL detectado: ${cleaned}`);
  }
  // Apenas vírgula: 1859,00 -> 1859.00
  else if (commaCount === 1 && dotCount === 0) {
    cleaned = cleaned.replace(',', '.');
    console.log(`  ✅ Formato simples com vírgula: ${cleaned}`);
  }
  // Formato já correto: 1859.00
  else if (dotCount === 1 && commaCount === 0) {
    console.log(`  ✅ Formato já correto: ${cleaned}`);
  }
  // Fallback: apenas dígitos (ex: "185900" -> 1859.00)
  else {
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length > 0) {
      cleaned = (parseInt(digits) / 100).toFixed(2);
      console.log(`  ⚠️ Fallback aplicado (apenas dígitos): ${cleaned}`);
    }
  }
  
  const result = parseFloat(cleaned);
  console.log(`  💵 Resultado final: ${result}`);
  return isNaN(result) ? 0 : result;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL é obrigatória');
    }

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
    
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    
    const isPlaceholderData = (value: string): boolean => {
      if (!value || typeof value !== 'string') return false;
      const lower = value.toLowerCase().trim();
      const placeholderPatterns = [
        /^ex[:\s.]/i, /^exemplo[:\s.]/i, /^digite/i, /^preencha/i,
        /^informe/i, /^\[/, /^{/, /exemplo\s*:/i, /\(exemplo\)/i
      ];
      return placeholderPatterns.some(pattern => pattern.test(lower));
    };
    
    const extractPhysicalSpecs = () => {
      console.log('🔍 Iniciando extração de especificações físicas...');
      const specs: any = {};
      
      const weightPatterns = [
        /(?:peso|weight)[\s:]*([0-9.,]+)\s*(?:kg|g|gramas?)/i,
        /<td[^>]*>[^<]*(?:peso|weight)[^<]*<\/td>[\s\S]*?<td[^>]*>([0-9.,]+)\s*(?:kg|g)/i
      ];
      
      for (const pattern of weightPatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !isPlaceholderData(match[1])) {
          const weightValue = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(weightValue) && weightValue > 0) {
            specs.weight = match[0].toLowerCase().includes('g') && !match[0].toLowerCase().includes('kg')
              ? weightValue / 1000
              : weightValue;
            console.log(`✅ Peso: ${specs.weight}kg`);
            break;
          }
        }
      }
      
      const dimensionPatterns = {
        height: [/(?:altura|height)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i],
        width: [/(?:largura|width)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i],
        depth: [/(?:profundidade|depth|comprimento|length)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i]
      };
      
      for (const [key, patterns] of Object.entries(dimensionPatterns)) {
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1] && !isPlaceholderData(match[1])) {
            const value = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(value) && value > 0) {
              specs[key] = match[0].toLowerCase().includes('mm') ? value / 10 : value;
              console.log(`✅ ${key}: ${specs[key]}cm`);
              break;
            }
          }
        }
      }
      
      const breadcrumbMatch = html.match(/<nav[^>]*class="[^"]*breadcrumb[^"]*"[^>]*>(.*?)<\/nav>/is);
      if (breadcrumbMatch) {
        const breadcrumbLinks = breadcrumbMatch[1].match(/>([^<]+)</g);
        if (breadcrumbLinks && breadcrumbLinks.length > 1) {
          const categories = breadcrumbLinks
            .map(link => link.replace(/>/g, '').replace(/</g, '').trim())
            .filter(cat => cat && !cat.toLowerCase().includes('home') && cat.length < 200);
          if (categories.length > 0) {
            specs.store_category = categories[categories.length - 1];
            console.log(`✅ Categoria: ${specs.store_category}`);
          }
        }
      }
      
      return specs;
    };
    
    // 🔥 EXTRAÇÃO ROBUSTA DE VARIAÇÕES (Loja Integrada)
    const extractVariations = (jsonLdData?: any) => {
      console.log('🎨 Iniciando extração de variações...');
      const variations: { name: string; price?: number; stock?: number; color?: string; size?: string }[] = [];
      
      // 1. JSON-LD
      if (jsonLdData?.hasVariant) {
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
        if (variations.length > 0) console.log(`  ✅ ${variations.length} variações do JSON-LD`);
      }
      
      // 2. Select elements (Loja Integrada padrão)
      if (variations.length === 0) {
        const selectPatterns = [
          /<select[^>]*(?:name|id|class)="[^"]*(?:variacao|variation|variant)[^"]*"[^>]*>(.*?)<\/select>/gis,
          /<select[^>]*data-variant[^>]*>(.*?)<\/select>/gis
        ];
        
        selectPatterns.forEach(pattern => {
          const selectMatches = html.match(pattern);
          if (selectMatches) {
            selectMatches.forEach(selectHtml => {
              const options = selectHtml.match(/<option[^>]*value="[^"]*"[^>]*>([^<]+)<\/option>/gi);
              if (options) {
                options.forEach(option => {
                  const textMatch = option.match(/>([^<]+)</);
                  if (textMatch && textMatch[1].trim()) {
                    variations.push({ name: textMatch[1].trim() });
                  }
                });
              }
            });
          }
        });
        if (variations.length > 0) console.log(`  ✅ ${variations.length} variações de <select>`);
      }
      
      // 3. Radio buttons/Lists (alternativa Loja Integrada)
      if (variations.length === 0) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const variationContainers = doc?.querySelectorAll('.variacoes, .variacoes-produto, [class*="variation"]');
        variationContainers?.forEach((container: any) => {
          const inputs = container.querySelectorAll('input[type="radio"], input[name*="variacao"]');
          inputs?.forEach((input: any) => {
            const label = input.nextElementSibling?.textContent || input.value;
            if (label && label.trim()) {
              variations.push({ name: label.trim() });
            }
          });
        });
        if (variations.length > 0) console.log(`  ✅ ${variations.length} variações de radio/list`);
      }
      
      // 4. Data attributes
      if (variations.length === 0) {
        const dataPattern = /data-(?:variacao|variation|variant)="([^"]+)"/gi;
        let match;
        while ((match = dataPattern.exec(html)) !== null) {
          if (match[1]) variations.push({ name: match[1].trim() });
        }
        if (variations.length > 0) console.log(`  ✅ ${variations.length} variações de data-attributes`);
      }
      
      // Remove duplicates
      const unique = variations.filter((v, i, arr) => 
        arr.findIndex(v2 => v2.name === v.name) === i
      );
      
      console.log(`  🎯 Total de variações únicas: ${unique.length}`);
      return unique.length > 0 ? unique : undefined;
    };
    
    // 🔥 FILTRO MELHORADO DE IMAGENS
    const extractImagesGallery = (jsonLdData?: any, mainImageUrl?: string) => {
      const imagesSet = new Set<string>();
      const gallery: Array<{ url: string; alt: string; order: number; is_main: boolean }> = [];
      
      console.log('🖼️ Extraindo galeria de imagens...');
      
      const productIdMatch = url.match(/\/produto\/(\d+)|\/(\d+)\/|produto[/-](\d+)|[\/-](\d{5,})/i);
      const productId = productIdMatch ? (productIdMatch[1] || productIdMatch[2] || productIdMatch[3] || productIdMatch[4]) : null;
      
      if (jsonLdData?.image) {
        const jsonImages = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
        jsonImages.forEach((img: string) => {
          try {
            const normalizedUrl = new URL(img, url).href;
            imagesSet.add(normalizedUrl);
          } catch {
            if (img) imagesSet.add(img);
          }
        });
      }
      
      const imagePatterns = [
        /<img[^>]*class="[^"]*(?:product-image|gallery-image|main-image)[^"]*"[^>]*src="([^"]+)"/gi,
        /<img[^>]*data-image="([^"]+)"/gi,
        /<img[^>]*data-src="([^"]+)"/gi
      ];
      
      imagePatterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(html)) !== null) {
          const imgUrl = match[1];
          if (imgUrl && !imgUrl.includes('placeholder') && !imgUrl.includes('loading')) {
            try {
              const normalizedUrl = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, url).href;
              imagesSet.add(normalizedUrl);
            } catch {
              if (imgUrl.startsWith('http')) imagesSet.add(imgUrl);
            }
          }
        }
      });
      
      const urlDomain = new URL(url).hostname;
      
      const validImages = Array.from(imagesSet).filter(imgUrl => {
        const lower = imgUrl.toLowerCase();
        
        // Excluir --PRODUTO_IMAGEM-- explicitamente
        if (lower.includes('--produto_imagem--') || lower.includes('--produto-imagem--')) {
          console.log(`❌ Placeholder excluído: ${imgUrl.substring(0, 80)}`);
          return false;
        }
        
        try {
          const imgDomain = new URL(imgUrl.startsWith('http') ? imgUrl : `https:${imgUrl}`).hostname;
          if (!imgDomain.includes('cdn.awsli.com.br') && !imgDomain.includes(urlDomain)) {
            return false;
          }
        } catch {}
        
        // Dimensão mínima: 128x128
        const sizeMatch = imgUrl.match(/\/(\d+)x(\d+)\//);
        if (sizeMatch) {
          const width = parseInt(sizeMatch[1]);
          const height = parseInt(sizeMatch[2]);
          if (width < 128 || height < 128) {
            console.log(`❌ Imagem muito pequena: ${width}x${height}`);
            return false;
          }
        }
        
        const exclusions = [
          'logo', 'icon', 'banner', 'selo', 'badge', 'payment', 'pagamento',
          'whatsapp', 'instagram', 'facebook', 'social', 'ssl', 'footer', 'header'
        ];
        if (exclusions.some(pattern => lower.includes(pattern))) {
          return false;
        }
        
        return true;
      });
      
      // Priorizar 300x300+
      const sorted = validImages.sort((a, b) => {
        const getSize = (url: string) => {
          const match = url.match(/\/(\d+)x(\d+)\//);
          return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
        };
        return getSize(b) - getSize(a);
      });
      
      const limited = sorted.slice(0, 10);
      
      limited.forEach((imgUrl, index) => {
        gallery.push({
          url: imgUrl,
          alt: 'Imagem do produto',
          order: index,
          is_main: index === 0
        });
      });
      
      console.log(`✅ Galeria final: ${gallery.length} imagens`);
      return gallery;
    };

    let productData: ProductData = {
      name: '',
      price: 0,
      description: '',
      available: true,
      condition: 'new',
      availability: 'in stock'
    };

    if (jsonLdMatches && jsonLdMatches.length > 0) {
      for (const match of jsonLdMatches) {
        try {
          const jsonData = JSON.parse(match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, ''));
          
          if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData['@graph']) && jsonData['@graph'].find((item: any) => item['@type'] === 'Product'))) {
            const product = jsonData['@type'] === 'Product' ? jsonData : jsonData['@graph'].find((item: any) => item['@type'] === 'Product');
            
            productData.name = product.name || '';
            
            // 🔥 USAR parsePriceBRL para TODOS os preços
            if (product.offers) {
              const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              const priceStr = offers.price?.toString() || '';
              const lowPriceStr = offers.lowPrice?.toString() || '';
              
              const regularPrice = parsePriceBRL(priceStr);
              const promoPrice = parsePriceBRL(lowPriceStr);
              
              if (promoPrice > 0 && promoPrice < regularPrice) {
                productData.price = regularPrice;
                productData.promo_price = promoPrice;
                console.log(`💰 Preço normal: ${regularPrice} | Promo: ${promoPrice}`);
              } else {
                productData.price = regularPrice;
                console.log(`💰 Preço: ${regularPrice}`);
              }
              
              productData.availability = offers.availability?.includes('InStock') ? 'in stock' : 'out of stock';
            }
            
            productData.description = product.description || '';
            productData.image = product.image?.[0] || product.image || '';
            productData.brand = product.brand?.name || product.brand || '';
            productData.gtin = product.gtin13 || product.gtin || '';
            productData.ean = product.gtin13 || product.ean || '';
            productData.mpn = product.mpn || product.sku || '';
            
            const physicalSpecs = extractPhysicalSpecs();
            productData = { ...productData, ...physicalSpecs };
            
            productData.variations = extractVariations(product);
            productData.images_gallery = extractImagesGallery(product, productData.image);
            
            console.log('✅ Dados extraídos do JSON-LD com sucesso');
            break;
          }
        } catch (e) {
          console.log('Erro ao processar JSON-LD:', e);
        }
      }
    }

    // Fallback extraction
    if (!productData.name) {
      const nameMatch = html.match(/<h1[^>]*class="[^"]*(?:product|nome|title)[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<title>([^<|]+)/i);
      if (nameMatch) productData.name = nameMatch[1].trim();
    }

    if (!productData.price || productData.price === 0) {
      const pricePatterns = [
        /[R\$]\s*([0-9.,]+)/i,
        /price["\s:]+([0-9.,]+)/i,
        /"price":\s*"?([0-9.,]+)"?/i
      ];
      
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          productData.price = parsePriceBRL(match[1]);
          console.log(`💰 Preço fallback: ${productData.price}`);
          break;
        }
      }
    }

    if (!productData.description) {
      const descContainers = ['#descricao', '.descricao-produto', '.product-description', '[itemprop="description"]'];
      for (const selector of descContainers) {
        const match = html.match(new RegExp(`<[^>]*(?:id|class)=["'][^"']*${selector.replace(/[#.[\]]/g, '')}[^"']*["'][^>]*>([\\s\\S]{20,3000}?)<\/`, 'i'));
        if (match) {
          productData.description = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
          console.log(`✅ Descrição extraída`);
          break;
        }
      }
    }

    // 🔥 EXTRAÇÃO SEPARADA: GTIN, EAN, MPN
    if (!productData.gtin) {
      const gtinMatch = html.match(/(?:gtin|barcode|ean-?13)[":\s]+([0-9]{8,14})/i);
      if (gtinMatch) productData.gtin = gtinMatch[1];
    }
    
    if (!productData.ean) {
      const eanMatch = html.match(/(?:ean|ean-?13)[":\s]+([0-9]{13})/i);
      if (eanMatch) productData.ean = eanMatch[1];
    }
    
    if (!productData.mpn) {
      const mpnMatch = html.match(/(?:mpn|sku|model|modelo)[":\s]+([A-Z0-9-]+)/i);
      if (mpnMatch && mpnMatch[1] !== 'hide') productData.mpn = mpnMatch[1];
    }
    
    if (!productData.brand) {
      const brandMatch = html.match(/(?:brand|marca)[":\s]+([^"<\n]{2,50})/i);
      if (brandMatch) productData.brand = brandMatch[1].trim();
    }

    if (!productData.variations) {
      productData.variations = extractVariations();
    }

    if (!productData.images_gallery || productData.images_gallery.length === 0) {
      const physicalSpecs = extractPhysicalSpecs();
      productData = { ...productData, ...physicalSpecs };
      productData.images_gallery = extractImagesGallery(undefined, productData.image);
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
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro na extração:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
