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
  variations?: { name: string; price?: number; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
}

function parsePriceBRL(priceStr: string): number {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  
  let cleaned = priceStr.trim().replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/R\$|BRL/gi, '').trim();
  
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function isInvalidDescription(desc: string, productName: string): boolean {
  if (!desc || desc.trim().length < 20) return true;
  const normalized = desc.trim().toLowerCase();
  const nameLower = productName.trim().toLowerCase();
  return normalized === nameLower || normalized.includes('produto sem descrição');
}

function extractDescriptionFromDOM(doc: Document, productName: string): string {
  const selectors = [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'div[itemprop="description"]',
    '.product-description',
    '#descricao',
    '.descricao-produto',
    '.description'
  ];

  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (!el) continue;
    
    const content = el.getAttribute('content') || el.textContent;
    if (content && content.trim().length > 20 && !isInvalidDescription(content, productName)) {
      console.log(`✅ Descrição extraída de ${sel}`);
      return content.trim();
    }
  }
  
  return productName;
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

    console.log('Extraindo dados da URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
              break;
            }
          }
        }
      }
      
      return specs;
    };
    
    const extractVariations = (jsonLdData?: any, doc?: Document) => {
      console.log('🎨 Iniciando extração de variações...');
      const variations: { name: string; price?: number; stock?: number; color?: string; size?: string }[] = [];
      const variationNames = new Set<string>();
      
      // 1. JSON-LD
      if (jsonLdData?.hasVariant) {
        const variants = Array.isArray(jsonLdData.hasVariant) ? jsonLdData.hasVariant : [jsonLdData.hasVariant];
        variants.forEach((variant: any) => {
          const name = variant.name;
          if (name && !name.includes('{{') && !name.includes("' + ")) {
            variationNames.add(name);
            variations.push({
              name,
              price: variant.offers?.price ? parseFloat(variant.offers.price) : undefined,
              stock: variant.offers?.availability === 'InStock' ? 999 : 0,
              color: variant.color || '',
              size: variant.size || ''
            });
          }
        });
      }
      
      if (!doc) return variations.length > 0 ? variations : undefined;
      
      // 2. Select elements
      doc.querySelectorAll('select[name*="variacao"], select[name*="variation"], select.product-variants option').forEach((option) => {
        const text = option.textContent?.trim();
        if (text && text !== 'Selecione' && text !== 'Escolha' && !text.includes('{{') && !variationNames.has(text)) {
          variationNames.add(text);
          variations.push({ name: text });
        }
      });
      
      // 3. Radio buttons
      doc.querySelectorAll('input[type="radio"][name*="variacao"], input[type="radio"][name*="variation"]').forEach((input) => {
        const label = doc.querySelector(`label[for="${input.id}"]`)?.textContent?.trim();
        const value = input.getAttribute('value');
        const name = label || value;
        if (name && !name.includes('{{') && !variationNames.has(name)) {
          variationNames.add(name);
          variations.push({ name });
        }
      });
      
      // 4. Loja Integrada: atributos data-* e listas
      doc.querySelectorAll('[data-variation], [data-variacao], .variacao-item, ul.variacoes li').forEach((el) => {
        const value = el.getAttribute('data-variation') || 
                      el.getAttribute('data-variacao') || 
                      el.textContent?.trim();
        if (value && !value.includes('{{') && !value.includes("' + ") && value.length < 100 && !variationNames.has(value)) {
          variationNames.add(value);
          variations.push({ name: value });
        }
      });
      
      // 5. Botões ou links de variação
      doc.querySelectorAll('.variant-option, .variation-item, .product-variant').forEach((el) => {
        const text = el.textContent?.trim();
        if (text && !text.includes('{{') && !variationNames.has(text)) {
          variationNames.add(text);
          variations.push({ name: text });
        }
      });
      
      // Filtrar placeholders finais
      const cleaned = variations.filter(v => 
        v.name && 
        v.name.length > 0 && 
        v.name.length < 100 && 
        !v.name.includes("' + ") && 
        !v.name.includes('value.value') &&
        !v.name.includes('{{') &&
        !v.name.includes('}}') &&
        !v.name.match(/^[\d\s\-\.]+$/)
      );
      
      console.log(`  🎯 ${cleaned.length} variações válidas`);
      return cleaned.length > 0 ? cleaned : undefined;
    };
    
    const extractImagesGallery = (jsonLdData?: any, mainImageUrl?: string, doc?: Document) => {
      console.log('🖼️ Extraindo galeria de imagens...');
      const images = new Set<string>();
      const gallery: Array<{ url: string; alt: string; order: number; is_main: boolean }> = [];

      if (mainImageUrl) images.add(mainImageUrl);

      // 1. JSON-LD
      if (jsonLdData?.image) {
        const jsonImages = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
        jsonImages.forEach((img: string) => {
          try {
            const normalizedUrl = new URL(img, url).href;
            images.add(normalizedUrl);
          } catch {
            if (img) images.add(img);
          }
        });
      }

      if (!doc) {
        images.forEach((imgUrl, index) => {
          gallery.push({ url: imgUrl, alt: 'Imagem do produto', order: index, is_main: index === 0 });
        });
        return gallery;
      }

      // 2. Meta tags og:image e link[rel="image_src"]
      doc.querySelectorAll('meta[property="og:image"], link[rel="image_src"]').forEach((meta) => {
        const content = meta.getAttribute('content') || meta.getAttribute('href');
        if (content) images.add(content);
      });

      // 3. Imagens no DOM
      doc.querySelectorAll('img[itemprop="image"], .product-image img, .product-gallery img, img[data-zoom-image], .imagem-produto img').forEach((img) => {
        const src = img.getAttribute('src') || 
                    img.getAttribute('data-src') || 
                    img.getAttribute('data-zoom-image') ||
                    img.getAttribute('data-image');
        if (src) images.add(src);
      });

      // 4. Links CDN
      doc.querySelectorAll('a[href*="cdn.awsli.com.br"], a[href*="/produtos/"]').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(href)) {
          images.add(href);
        }
      });

      // 5. JSON embutido
      const scripts = doc.querySelectorAll('script[type="application/ld+json"], script');
      scripts.forEach((script) => {
        const content = script.textContent || '';
        const imageMatches = content.match(/(https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif))/gi);
        if (imageMatches) {
          imageMatches.forEach(imgUrl => images.add(imgUrl));
        }
      });

      // Filtrar e normalizar
      const validImages = Array.from(images).filter(imgUrl => {
        if (!imgUrl || imgUrl.length < 10) return false;
        
        if (imgUrl.includes('placeholder') || 
            imgUrl.includes('--PRODUTO_IMAGEM--') ||
            imgUrl.includes('no-image') ||
            imgUrl === '/64x64/') {
          return false;
        }

        const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(imgUrl);
        const hasSizePattern = /\/\d+x\d+\//i.test(imgUrl);
        
        return hasImageExtension || hasSizePattern || imgUrl.startsWith('http');
      }).map(imgUrl => {
        if (imgUrl.startsWith('//')) return `https:${imgUrl}`;
        if (imgUrl.startsWith('/') && !imgUrl.startsWith('//')) {
          const baseUrl = new URL(url);
          return `${baseUrl.protocol}//${baseUrl.host}${imgUrl}`;
        }
        return imgUrl;
      });

      validImages.forEach((imgUrl, index) => {
        gallery.push({ url: imgUrl, alt: 'Imagem do produto', order: index, is_main: index === 0 });
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

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (jsonLdMatches && jsonLdMatches.length > 0) {
      for (const match of jsonLdMatches) {
        try {
          const jsonData = JSON.parse(match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, ''));
          
          if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData['@graph']) && jsonData['@graph'].find((item: any) => item['@type'] === 'Product'))) {
            const product = jsonData['@type'] === 'Product' ? jsonData : jsonData['@graph'].find((item: any) => item['@type'] === 'Product');
            
            productData.name = product.name || '';
            
            if (product.offers) {
              const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
              const priceStr = offers.price?.toString() || '';
              const lowPriceStr = offers.lowPrice?.toString() || '';
              
              const regularPrice = parsePriceBRL(priceStr);
              const promoPrice = parsePriceBRL(lowPriceStr);
              
              if (promoPrice > 0 && promoPrice < regularPrice) {
                productData.price = regularPrice;
                productData.promo_price = promoPrice;
              } else {
                productData.price = regularPrice;
              }
              
              productData.availability = offers.availability?.includes('InStock') ? 'in stock' : 'out of stock';
            }
            
            let description = product.description || '';
            if (isInvalidDescription(description, productData.name)) {
              description = extractDescriptionFromDOM(doc!, productData.name);
            }
            productData.description = description;
            
            productData.image = product.image?.[0] || product.image || '';
            productData.brand = product.brand?.name || product.brand || '';
            productData.gtin = product.gtin13 || product.gtin || '';
            productData.ean = product.gtin13 || product.ean || '';
            productData.mpn = product.mpn || product.sku || '';
            
            const physicalSpecs = extractPhysicalSpecs();
            productData = { ...productData, ...physicalSpecs };
            
            productData.variations = extractVariations(product, doc);
            productData.images_gallery = extractImagesGallery(product, productData.image, doc);
            
            console.log('✅ Dados extraídos do JSON-LD');
            break;
          }
        } catch (e) {
          console.log('Erro ao processar JSON-LD:', e);
        }
      }
    }

    // Fallbacks
    if (!productData.name) {
      const nameMatch = html.match(/<h1[^>]*class="[^"]*(?:product|nome|title)[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<title>([^<|]+)/i);
      if (nameMatch) productData.name = nameMatch[1].trim();
    }

    if (!productData.price || productData.price === 0) {
      const pricePatterns = [
        /[R\$]\s*([0-9.,]+)/i,
        /<span[^>]*itemprop="price"[^>]*>([^<]+)<\/span>/i,
        /<meta[^>]*property="og:price:amount"[^>]*content="([^"]+)"/i,
        /price["\s:]+([0-9.,]+)/i
      ];
      
      for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          productData.price = parsePriceBRL(match[1]);
          if (productData.price > 0) break;
        }
      }
    }

    if (!productData.description || isInvalidDescription(productData.description, productData.name)) {
      productData.description = extractDescriptionFromDOM(doc!, productData.name);
    }

    if (!productData.variations) {
      productData.variations = extractVariations(undefined, doc);
    }

    if (!productData.images_gallery || productData.images_gallery.length === 0) {
      productData.images_gallery = extractImagesGallery(undefined, productData.image, doc);
    }

    console.log('Dados extraídos:', {
      name: productData.name,
      price: productData.price,
      description: productData.description,
      available: productData.available,
      condition: productData.condition,
      availability: productData.availability,
      brand: productData.brand,
      variations: productData.variations?.map(v => v.name),
      images_gallery: productData.images_gallery?.map(i => i.url)
    });

    return new Response(
      JSON.stringify({ success: true, data: productData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na extração:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
