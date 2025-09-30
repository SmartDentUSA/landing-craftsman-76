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
  variations?: { name: string; price?: number; promo_price?: number; sku?: string; stock?: number; color?: string; size?: string }[];
  package_size?: string;
  weight?: number;
  height?: number;
  width?: number;
  depth?: number;
  store_category?: string;
}

function parsePriceBRL(priceStr: string | number): number {
  if (!priceStr) return 0;
  
  // Se for número
  if (typeof priceStr === 'number') {
    // Se >= 10000, assume centavos (ex: 185900 → 1859)
    return priceStr >= 10000 ? priceStr / 100 : priceStr;
  }
  
  let cleaned = priceStr.trim().replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/R\$|BRL/gi, '').trim();
  
  // Formato brasileiro: 1.869,00 ou 1869,00 → 1869
  if (cleaned.includes(',')) {
    // Remove pontos de milhar e troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // Formato com apenas ponto: pode ser milhar (1.869) ou decimal (18.69)
  else if (cleaned.includes('.')) {
    // Se tem mais de um ponto, remove todos exceto o último
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    }
    // Se ponto está a 3 dígitos do fim (ex: 1.869), é separador de milhar
    else if (parts[1]?.length === 3) {
      cleaned = cleaned.replace('.', '');
    }
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function isInvalidDescription(desc: string, productName: string): boolean {
  if (!desc || desc.trim().length < 10) return true;
  
  const lowerDesc = desc.toLowerCase().trim();
  const lowerName = productName.toLowerCase().trim();
  
  // Se a descrição é igual ao nome, é inválida
  if (lowerDesc === lowerName) return true;
  
  // Se a descrição contém apenas o nome, é inválida
  if (lowerDesc.replace(/[^\w\s]/g, '') === lowerName.replace(/[^\w\s]/g, '')) return true;
  
  // Placeholders comuns
  const placeholders = [
    'descrição do produto',
    'sem descrição',
    'produto sem descrição',
    'em breve',
    'lorem ipsum',
    'adicionar descrição',
    'insira a descrição'
  ];
  
  return placeholders.some(p => lowerDesc.includes(p));
}

function extractDescriptionFromDOM(doc: Document, productName: string): string {
  const selectors = [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
    '.product-description',
    '.produto-descricao',
    '[itemprop="description"]',
    '#product-description',
    '.descricao-produto',
    '.product-details-description',
    '.description-content',
    '[data-description]'
  ];

  console.info('🔍 Buscando descrição com', selectors.length, 'seletores...');

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const content = element.getAttribute('content') || 
                     element.getAttribute('data-description') ||
                     element.textContent || '';
      const cleaned = content.trim();
      
      if (!isInvalidDescription(cleaned, productName)) {
        console.info(`✅ Descrição extraída de ${selector}`);
        return cleaned;
      }
    }
  }

  console.warn('⚠️ Nenhuma descrição válida encontrada');
  return '';
}

function extractPhysicalSpecs(doc: Document | null, jsonLdData?: any) {
  const specs: any = {};
  
  if (!doc) return specs;
  
  const html = doc.documentElement?.outerHTML || '';
  
  const isPlaceholderData = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;
    const lower = value.toLowerCase().trim();
    const placeholderPatterns = [
      /^ex[:\s.]/i, /^exemplo[:\s.]/i, /^digite/i, /^preencha/i,
      /^informe/i, /^\[/, /^{/, /exemplo\s*:/i, /\(exemplo\)/i
    ];
    return placeholderPatterns.some(pattern => pattern.test(lower));
  };
  
  // Buscar em tabelas estruturadas
  const tables = doc.querySelectorAll('table');
  tables.forEach(table => {
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td');
      if (cells.length >= 2) {
        const label = cells[0].textContent?.trim().toLowerCase() || '';
        const value = cells[1].textContent?.trim() || '';
        
        if (value && !isPlaceholderData(value)) {
          // Peso (kg)
          if (label.includes('peso') && !specs.weight) {
            const match = value.match(/([0-9.,]+)\s*(?:kg|g|gramas?)?/i);
            if (match) {
              const weightValue = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(weightValue) && weightValue > 0) {
                specs.weight = value.toLowerCase().includes('g') && !value.toLowerCase().includes('kg')
                  ? weightValue / 1000
                  : weightValue;
              }
            }
          }
          // Altura (cm)
          if (label.includes('altura') && !specs.height) {
            const match = value.match(/([0-9.,]+)\s*(?:cm|mm)?/i);
            if (match) {
              const heightValue = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(heightValue) && heightValue > 0) {
                specs.height = value.toLowerCase().includes('mm') ? heightValue / 10 : heightValue;
              }
            }
          }
          // Largura (cm)
          if (label.includes('largura') && !specs.width) {
            const match = value.match(/([0-9.,]+)\s*(?:cm|mm)?/i);
            if (match) {
              const widthValue = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(widthValue) && widthValue > 0) {
                specs.width = value.toLowerCase().includes('mm') ? widthValue / 10 : widthValue;
              }
            }
          }
          // Profundidade (cm)
          if ((label.includes('profundidade') || label.includes('comprimento')) && !specs.depth) {
            const match = value.match(/([0-9.,]+)\s*(?:cm|mm)?/i);
            if (match) {
              const depthValue = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(depthValue) && depthValue > 0) {
                specs.depth = value.toLowerCase().includes('mm') ? depthValue / 10 : depthValue;
              }
            }
          }
          // Tamanho da Embalagem
          if (label.includes('embalagem') || label.includes('dimensões') || label.includes('dimensoes')) {
            specs.package_size = value;
          }
        }
      }
    });
  });
  
  // Fallback: buscar no HTML bruto se não encontrou nas tabelas
  if (!specs.weight) {
    const weightPatterns = [
      /peso[\s:]*([0-9.,]+)\s*(?:kg|g|gramas?)/i,
      /<dt[^>]*>[^<]*peso[^<]*<\/dt>[\s\S]*?<dd[^>]*>([0-9.,]+)\s*(?:kg|g)/i
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
  }
  
  const dimensionPatterns = {
    height: [/altura[\s:]*([0-9.,]+)\s*(?:cm|mm)/i],
    width: [/largura[\s:]*([0-9.,]+)\s*(?:cm|mm)/i],
    depth: [/(?:profundidade|comprimento)[\s:]*([0-9.,]+)\s*(?:cm|mm)/i]
  };
  
  for (const [key, patterns] of Object.entries(dimensionPatterns)) {
    if (specs[key]) continue; // Já encontrou na tabela
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
  
  console.info('📏 Specs físicas extraídas:', specs);
  return specs;
}

function extractVariations(jsonLdData?: any, doc?: Document, html?: string): Array<{
  name: string;
  price?: number;
  promo_price?: number;
  sku?: string;
  stock?: number;
  color?: string;
  size?: string;
}> | undefined {
  console.info('🎨 Iniciando extração de variações...');
  const variations: Array<{
    name: string;
    price?: number;
    promo_price?: number;
    sku?: string;
    stock?: number;
    color?: string;
    size?: string;
  }> = [];

  // 1. JSON-LD
  if (jsonLdData?.offers) {
    const offers = Array.isArray(jsonLdData.offers) ? jsonLdData.offers : [jsonLdData.offers];
    offers.forEach((offer: any) => {
      if (offer.itemOffered?.name || offer.name) {
        variations.push({
          name: offer.itemOffered?.name || offer.name,
          price: offer.price ? parsePriceBRL(offer.price) : undefined,
          sku: offer.sku || offer.itemOffered?.sku,
          stock: offer.availability === 'https://schema.org/InStock' ? 999 : 0
        });
      }
    });
  }

  if (!doc) {
    console.info(`  🎯 ${variations.length} variações do JSON-LD`);
    return variations.length > 0 ? variations : undefined;
  }

  // 2. Buscar JSON embutido em scripts - MELHORADO para Loja Integrada
  const scripts = doc.querySelectorAll('script:not([src])');
  scripts.forEach(script => {
    const content = script.textContent || '';
    
    // Padrões específicos da Loja Integrada
    const lojaIntegradaPatterns = [
      /var\s+skuJson\s*=\s*(\[[\s\S]*?\]);/gi,
      /var\s+product_variations\s*=\s*(\[[\s\S]*?\]);/gi,
      /"skus"\s*:\s*(\[[\s\S]*?\])/gi,
    ];
    
    lojaIntegradaPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const varName = item.nome || item.name || item.titulo || item.title || item.label;
              if (varName && varName.trim().length > 0) {
                variations.push({
                  name: varName,
                  price: item.preco || item.price ? parsePriceBRL(item.preco || item.price) : undefined,
                  promo_price: item.preco_promocional || item.promo_price ? parsePriceBRL(item.preco_promocional || item.promo_price) : undefined,
                  sku: item.sku || item.codigo || item.id?.toString(),
                  stock: item.estoque || item.stock,
                  color: item.cor || item.color,
                  size: item.tamanho || item.size
                });
              }
            });
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
    });
    
    // Padrões genéricos
    const patterns = [
      /"variacoes"\s*:\s*(\[[\s\S]*?\])/gi,
      /"variations"\s*:\s*(\[[\s\S]*?\])/gi,
      /"opcoes"\s*:\s*(\[[\s\S]*?\])/gi,
      /"options"\s*:\s*(\[[\s\S]*?\])/gi,
    ];

    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.nome || item.name || item.titulo || item.title) {
                variations.push({
                  name: item.nome || item.name || item.titulo || item.title,
                  price: item.preco || item.price ? parsePriceBRL(item.preco || item.price) : undefined,
                  promo_price: item.preco_promocional || item.promo_price ? parsePriceBRL(item.preco_promocional || item.promo_price) : undefined,
                  sku: item.sku || item.codigo,
                  color: item.cor || item.color,
                  size: item.tamanho || item.size
                });
              }
            });
          }
        } catch (e) {
          // Ignora erros de parse
        }
      }
    });
  });

  // 3. Loja Integrada: data-attributes específicos
  const lojaIntegradaSelectors = [
    '[data-variacao-id]',
    '[data-variacao]',
    '[data-variacao-nome]',
    '[data-sku-id]',
    'input[name="sku"]',
    'select[name="sku"]'
  ];
  
  lojaIntegradaSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      const varName = el.getAttribute('data-variacao-nome') || 
                     el.getAttribute('data-variacao') || 
                     el.getAttribute('data-label') ||
                     el.getAttribute('value') ||
                     el.textContent?.trim();
      const varPrice = el.getAttribute('data-preco') || el.getAttribute('data-price');
      const varSku = el.getAttribute('data-variacao-id') || el.getAttribute('data-sku-id') || el.getAttribute('data-sku');
      
      if (varName && varName.trim().length > 0 && !varName.includes('{{')) {
        variations.push({
          name: varName,
          price: varPrice ? parsePriceBRL(varPrice) : undefined,
          sku: varSku || undefined
        });
      }
    });
  });

  // 4. Selects e Radios
  const selectElements = doc.querySelectorAll('select[name*="variacao"], select[name*="opcao"], select[name*="sku"], select.product-variant');
  selectElements.forEach(select => {
    const options = select.querySelectorAll('option');
    options.forEach(option => {
      const value = option.getAttribute('value');
      const text = option.textContent?.trim();
      const dataPrice = option.getAttribute('data-price') || option.getAttribute('data-preco');
      const dataSku = option.getAttribute('data-sku') || option.getAttribute('data-codigo');
      
      if (value && text && value !== '' && text !== 'Selecione') {
        variations.push({ 
          name: text,
          price: dataPrice ? parsePriceBRL(dataPrice) : undefined,
          sku: dataSku || undefined
        });
      }
    });
  });

  const radioElements = doc.querySelectorAll('input[type="radio"][name*="variacao"], input[type="radio"][name*="opcao"]');
  radioElements.forEach(radio => {
    const label = doc.querySelector(`label[for="${radio.id}"]`)?.textContent?.trim();
    const dataPrice = radio.getAttribute('data-price') || radio.getAttribute('data-preco');
    const dataSku = radio.getAttribute('data-sku') || radio.getAttribute('data-codigo');
    
    if (label) {
      variations.push({ 
        name: label,
        price: dataPrice ? parsePriceBRL(dataPrice) : undefined,
        sku: dataSku || undefined
      });
    }
  });

  // 4. Data attributes (Loja Integrada e similares)
  const dataSelectors = [
    '[data-value]',
    '[data-option]',
    '[data-variant]',
    '[data-titulo]',
    '[data-nome]',
    '[data-valor]'
  ];
  
  dataSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      const value = el.getAttribute('data-value') || 
                   el.getAttribute('data-option') ||
                   el.getAttribute('data-variant') ||
                   el.getAttribute('data-titulo') ||
                   el.getAttribute('data-nome') ||
                   el.getAttribute('data-valor');
      const text = el.textContent?.trim();
      const dataPrice = el.getAttribute('data-price') || el.getAttribute('data-preco');
      const dataSku = el.getAttribute('data-sku') || el.getAttribute('data-codigo');
      
      if ((value && value !== '') || (text && text.length > 0)) {
        const name = text || value || '';
        if (name.length > 0 && !name.includes('{{') && !name.includes('<%')) {
          variations.push({ 
            name,
            price: dataPrice ? parsePriceBRL(dataPrice) : undefined,
            sku: dataSku || undefined
          });
        }
      }
    });
  });

  // 5. CSS classes comuns
  const cssSelectors = [
    '.variacoes__lista li',
    '.variacao-item',
    '.atributos .atributo__opcao',
    '.option-item',
    '.product-variant',
    '.variant-option label'
  ];
  
  cssSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent?.trim();
      const dataPrice = el.getAttribute('data-price') || el.getAttribute('data-preco');
      const dataSku = el.getAttribute('data-sku') || el.getAttribute('data-codigo');
      
      if (text && text.length > 0 && !text.includes('{{') && !text.includes('<%')) {
        variations.push({ 
          name: text,
          price: dataPrice ? parsePriceBRL(dataPrice) : undefined,
          sku: dataSku || undefined
        });
      }
    });
  });

  // Sanitização e deduplicação
  const seen = new Set<string>();
  const validVariations = variations.filter(v => {
    const normalized = v.name.trim().toLowerCase();
    if (normalized.length < 2 || seen.has(normalized)) return false;
    if (normalized.includes('selecione') || normalized.includes('escolha')) return false;
    if (/^\d+$/.test(normalized)) return false; // apenas números
    seen.add(normalized);
    return true;
  });

  console.info(`  🎯 ${validVariations.length} variações válidas de ${variations.length} encontradas`);
  return validVariations.length > 0 ? validVariations : undefined;
}

function extractImagesGallery(
  jsonLdData?: any,
  mainImageUrl?: string,
  doc?: Document
): Array<{ url: string; alt: string; order: number; is_main: boolean }> {
  console.info('🖼️ Extraindo galeria de imagens...');
  const images = new Map<string, { url: string; alt: string; order: number; is_main: boolean }>();
  let order = 0;

  // Helper para normalizar URLs
  const normalizeUrl = (url: string): string => {
    if (!url) return '';
    const cleaned = url.split('?')[0];
    return cleaned.replace(/\/(thumbnail|small|medium)\//, '/large/')
                 .replace(/_thumbnail|_small|_medium/, '_large');
  };

  // Helper para extrair maior URL de srcset
  const extractLargestFromSrcset = (srcset: string): string | null => {
    if (!srcset) return null;
    const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    return urls[urls.length - 1] || null;
  };

  // Helper para verificar se elemento está em container de produtos relacionados
  const isInRelatedProducts = (element: Element): boolean => {
    let parent = element.parentElement;
    while (parent) {
      const classList = parent.className?.toLowerCase() || '';
      const id = parent.id?.toLowerCase() || '';
      
      if (
        classList.includes('relacionados') ||
        classList.includes('related-products') ||
        classList.includes('produtos-relacionados') ||
        classList.includes('compre-junto') ||
        classList.includes('recomendados') ||
        classList.includes('recommendations') ||
        id.includes('relacionados') ||
        id.includes('related')
      ) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  };

  // 1. Imagem principal do JSON-LD
  if (jsonLdData?.image) {
    const imageUrls = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
    imageUrls.forEach((url: string) => {
      const normalized = normalizeUrl(url);
      if (normalized && !images.has(normalized)) {
        images.set(normalized, {
          url: normalized,
          alt: jsonLdData.name || 'Product image',
          order: order++,
          is_main: images.size === 0
        });
      }
    });
  }

  // 2. Meta tags OG
  if (doc) {
    const ogImages = doc.querySelectorAll('meta[property="og:image"], meta[property="og:image:secure_url"]');
    ogImages.forEach(meta => {
      const url = meta.getAttribute('content');
      if (url) {
        const normalized = normalizeUrl(url);
        if (!images.has(normalized)) {
          images.set(normalized, {
            url: normalized,
            alt: 'Product image',
            order: order++,
            is_main: images.size === 0
          });
        }
      }
    });
  }

  // 3. Imagem principal fornecida
  if (mainImageUrl) {
    const normalized = normalizeUrl(mainImageUrl);
    if (!images.has(normalized)) {
      images.set(normalized, {
        url: normalized,
        alt: 'Product image',
        order: order++,
        is_main: images.size === 0
      });
    }
  }

  // 4. Galeria do DOM (SOMENTE do container principal do produto)
  if (doc) {
    // Primeiro, tentar encontrar o container principal do produto
    const productContainerSelectors = [
      '#produto',
      '.produto',
      '.product',
      '.product-page',
      '.product-main',
      '[data-product-id]',
      'main'
    ];
    
    let productContainer: Element | null = null;
    for (const selector of productContainerSelectors) {
      productContainer = doc.querySelector(selector);
      if (productContainer) break;
    }
    
    const gallerySelectors = [
      '.product-images img',
      '.produto-imagens img',
      '[itemprop="image"]',
      '.gallery-image',
      '.product-gallery img',
      '.imagens-produto img',
      '[data-large_image]',
      '[data-zoom-image]',
      'picture source',
      '.thumbs img',
      '.product-image img'
    ];

    gallerySelectors.forEach(selector => {
      const container = productContainer || doc;
      const elements = container.querySelectorAll(selector);
      elements.forEach((img) => {
        // SKIP se estiver em produtos relacionados
        if (isInRelatedProducts(img)) {
          return;
        }
        
        // Tentar pegar a maior versão disponível
        let url = img.getAttribute('data-large_image') ||
                 img.getAttribute('data-zoom-image') ||
                 img.getAttribute('data-src') ||
                 img.getAttribute('src') ||
                 img.getAttribute('srcset');

        // Se for srcset, extrair a maior
        if (url?.includes(',')) {
          url = extractLargestFromSrcset(url) || url;
        }

        // Filtrar apenas imagens do produto (se temos li_product_id)
        if (url && url.startsWith('http') && belongsToProduct(url)) {
          const normalized = normalizeUrl(url);
          const alt = img.getAttribute('alt') || img.getAttribute('title') || 'Product image';
          
          if (!images.has(normalized)) {
            images.set(normalized, {
              url: normalized,
              alt,
              order: order++,
              is_main: false
            });
          }
        }
      });
    });
  }

  // 5. Link tags
  if (doc) {
    const linkImages = doc.querySelectorAll('link[rel="image_src"]');
    linkImages.forEach(link => {
      const url = link.getAttribute('href');
      if (url) {
        const normalized = normalizeUrl(url);
        if (!images.has(normalized)) {
          images.set(normalized, {
            url: normalized,
            alt: 'Product image',
            order: order++,
            is_main: images.size === 0
          });
        }
      }
    });
  }

  const gallery = Array.from(images.values()).sort((a, b) => {
    if (a.is_main) return -1;
    if (b.is_main) return 1;
    return a.order - b.order;
  });

  console.info(`✅ Galeria final: ${gallery.length} imagens`);
  return gallery;
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

    console.info('Extraindo dados da URL:', url);

    // Fetch da página com headers adequados
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar a URL: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);

    let productData: ProductData = {
      name: '',
      price: 0,
      description: '',
      available: true,
      condition: 'new',
      availability: 'in stock'
    };

    // Processar JSON-LD
    if (jsonLdMatches && jsonLdMatches.length > 0) {
      for (const match of jsonLdMatches) {
        try {
          const jsonData = JSON.parse(match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, ''));
          
          if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData['@graph']) && jsonData['@graph'].find((item: any) => item['@type'] === 'Product'))) {
            const product = jsonData['@type'] === 'Product' ? jsonData : jsonData['@graph'].find((item: any) => item['@type'] === 'Product');
            
            productData.name = product.name || '';
            
            // Extrair preço
            let price = 0;
            let promo_price: number | undefined;

            if (product.offers) {
              const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
              const mainOffer = offers[0];
              
              if (mainOffer?.price) {
                price = parsePriceBRL(mainOffer.price);
              }
              
              // Buscar preço promocional
              if (mainOffer?.priceValidUntil) {
                promo_price = price;
              }
              
              productData.availability = mainOffer.availability?.includes('InStock') ? 'in stock' : 'out of stock';
            }

            productData.price = price;
            productData.promo_price = promo_price;
            
            // Extrair descrição
            let description = product.description || '';
            
            if (!description || isInvalidDescription(description, productData.name)) {
              description = extractDescriptionFromDOM(doc!, productData.name);
            }

            // Se ainda não tiver descrição válida, deixar vazio
            if (isInvalidDescription(description, productData.name)) {
              description = '';
            }
            
            productData.description = description;
            productData.image = product.image?.[0] || product.image || '';
            productData.brand = product.brand?.name || product.brand || '';
            
            // Extrair EAN/GTIN
            let ean: string | undefined;
            let gtin: string | undefined;
            
            if (product.gtin13) {
              ean = product.gtin13;
              gtin = product.gtin13;
            } else if (product.gtin) {
              gtin = product.gtin;
              if (product.gtin.length === 13) {
                ean = product.gtin;
              }
            }
            
            productData.gtin = gtin;
            productData.ean = ean;
            productData.mpn = product.mpn || product.sku || '';
            
            // Extrair dados físicos
            const physicalSpecs = extractPhysicalSpecs(doc, product);
            productData = { ...productData, ...physicalSpecs };
            
            // Extrair variações (passando html também)
            productData.variations = extractVariations(product, doc, html);
            
            // Extrair galeria de imagens (passando URL também)
            productData.images_gallery = extractImagesGallery(product, productData.image, doc, url);
            
            console.info('✅ Dados extraídos do JSON-LD');
            break;
          }
        } catch (e) {
          console.error('Erro ao processar JSON-LD:', e);
        }
      }
    }

    // Fallbacks DOM
    if (!productData.name) {
      const nameMatch = html.match(/<h1[^>]*class="[^"]*(?:product|nome|title)[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<title>([^<|]+)/i);
      if (nameMatch) productData.name = nameMatch[1].trim();
    }

    // Buscar EAN no DOM se não encontrou
    if (!productData.ean && doc) {
      const eanElement = doc.querySelector('[itemprop="gtin13"], [itemprop="gtin"], [data-ean], [data-gtin]');
      if (eanElement) {
        const value = eanElement.getAttribute('content') || 
                     eanElement.getAttribute('data-ean') ||
                     eanElement.getAttribute('data-gtin') ||
                     eanElement.textContent?.trim();
        if (value && /^\d{13}$/.test(value)) {
          productData.ean = value;
          productData.gtin = value;
        }
      }
    }

    // Extrair categoria da loja (breadcrumb)
    if (doc && !productData.store_category) {
      const breadcrumbSelectors = [
        '.breadcrumb a',
        '[typeof="BreadcrumbList"] a',
        '.breadcrumbs a',
        'nav[aria-label="breadcrumb"] a',
        '[itemtype*="BreadcrumbList"] a'
      ];
      
      for (const selector of breadcrumbSelectors) {
        const breadcrumbLinks = doc.querySelectorAll(selector);
        if (breadcrumbLinks.length > 0) {
          const categories: string[] = [];
          breadcrumbLinks.forEach((link, index) => {
            const text = link.textContent?.trim();
            // Skip "Home" e última categoria (que geralmente é o produto)
            if (text && text.toLowerCase() !== 'home' && text.toLowerCase() !== 'início' && index < breadcrumbLinks.length - 1) {
              categories.push(text);
            }
          });
          if (categories.length > 0) {
            productData.store_category = categories.join(' > ');
            console.info(`✅ Categoria da loja extraída: ${productData.store_category}`);
            break;
          }
        }
      }
    }

    // Fallback preço DOM
    if (!productData.price || productData.price === 0) {
      const priceSelectors = [
        '[itemprop="price"]',
        '.price',
        '.preco',
        '.product-price',
        '.preco-atual',
        '[data-price]',
        'meta[property="product:price:amount"]'
      ];

      for (const selector of priceSelectors) {
        const element = doc!.querySelector(selector);
        if (element) {
          const priceText = element.getAttribute('content') || 
                           element.getAttribute('data-price') ||
                           element.textContent || '';
          const parsedPrice = parsePriceBRL(priceText);
          if (parsedPrice > 0) {
            productData.price = parsedPrice;
            break;
          }
        }
      }
      
      // Buscar preço promocional
      const promoSelectors = ['.preco-promocional', '.price-promo', '.sale-price', '[data-promo-price]'];
      for (const selector of promoSelectors) {
        const element = doc!.querySelector(selector);
        if (element) {
          const priceText = element.getAttribute('data-promo-price') || element.textContent || '';
          const parsedPrice = parsePriceBRL(priceText);
          if (parsedPrice > 0 && parsedPrice < productData.price) {
            productData.promo_price = parsedPrice;
            break;
          }
        }
      }
    }

    // Fallback descrição DOM
    if (!productData.description || isInvalidDescription(productData.description, productData.name)) {
      const desc = extractDescriptionFromDOM(doc!, productData.name);
      if (desc && !isInvalidDescription(desc, productData.name)) {
        productData.description = desc;
      }
    }

    // Fallback variações (passando html)
    if (!productData.variations) {
      productData.variations = extractVariations(undefined, doc, html);
    }

    // Fallback galeria (passando url)
    if (!productData.images_gallery || productData.images_gallery.length === 0) {
      productData.images_gallery = extractImagesGallery(undefined, productData.image, doc, url);
    }

    // Extrair li_product_id da URL
    let li_product_id: string | null = null;
    const urlMatch = url.match(/\/produto\/(\d+)\//i) || url.match(/product[_-]?id[=:](\d+)/i);
    if (urlMatch) li_product_id = urlMatch[1];

    console.info('Dados extraídos:', productData);

    return new Response(
      JSON.stringify({ success: true, data: productData, li_product_id }),
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
