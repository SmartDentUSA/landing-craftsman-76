import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

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

  // Sanitização e deduplicação com blacklist expandida
  const BLACKLIST = [
    "r$", "comprar", "estoque", "até", "qtde",
    "parcelamento", "selecione", "escolha", "adicionar", "frete"
  ];
  const MAX_LEN = 50;
  const seen = new Set<string>();

  const validVariations = variations.filter(v => {
    const normalized = (v.name ?? "").trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.length < 2 || normalized.length > MAX_LEN) return false;
    if (BLACKLIST.some(term => normalized.includes(term))) return false;
    if (/^\d+$/.test(normalized)) return false; // só números
    if (seen.has(normalized)) return false;     // dedupe
    seen.add(normalized);
    return true;
  });

  console.info(`  🎯 ${validVariations.length} variações válidas de ${variations.length} encontradas`);
  return validVariations.length > 0 ? validVariations : undefined;
}

// ============= INTELLIGENT IMAGE EXTRACTION WITH FALLBACK =============
const LI_GALLERY_SELECTORS = [
  ".product-images-thumbs img",
  ".product-images img",
  ".gallery-thumbs img",
  ".thumbs img",
  ".js-product-gallery img",
  ".product-gallery img",
  "#gallery img",
  ".produto-imagens img",
  ".galeria-imagens img",
  ".product__gallery img",
];

const CDN_HOST_HINTS = ["cdn.awsli.com.br", "cdn.awsli.com"];
const SIZE_HINTS_DESC = ["1600x1600", "1200x1200", "1000x1000", "800x800", "600x600", "400x400", "200x200"];

function toAbsoluteUrl(baseUrl: string, url?: string | null): string {
  if (!url) return "";
  try {
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function extractFromSrcset(srcset?: string | null): string[] {
  if (!srcset) return [];
  return srcset
    .split(",")
    .map(s => s.trim().split(" ")[0])
    .filter(Boolean);
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const key = u.replace(/(\?|#).*$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(u);
    }
  }
  return out;
}

function guessSlug(url: string): string | undefined {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1];
  } catch {
    return undefined;
  }
}

function isLogo(url: string): boolean {
  try {
    const u = url.toLowerCase();
    return /(^|\/)(logo|brand|marca)(\/|\.|-|_)/i.test(u) || u.includes("/logo/");
  } catch {
    return /logo|brand|marca/i.test(String(url));
  }
}

function scoreBySize(u: string): number {
  const url = u.toLowerCase();
  let score = 0;

  SIZE_HINTS_DESC.forEach((hint, idx) => {
    if (url.includes(`/${hint}/`) || url.includes(hint)) {
      score += (SIZE_HINTS_DESC.length - idx) * 10;
    }
  });

  if (/-grande\b/.test(url) || url.includes("_grande")) score += 15;
  if (url.includes("media")) score += 7;
  if (url.includes("pequena") || url.includes("thumb")) score -= 5;
  if (CDN_HOST_HINTS.some(h => url.includes(h))) score += 5;

  // ✅ PATCH: nunca permitir logo como principal
  if (isLogo(url)) score -= 100;

  return score;
}

function extractCandidateIdsFromText(html: string): string[] {
  const ids = new Set<string>();
  const re = /\b(\d{6,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    ids.add(m[1]);
  }
  return Array.from(ids);
}

function belongsToProduct(url: string, opts: { productId?: string; slug?: string; candidateIds?: string[] }): boolean {
  const u = url.toLowerCase();
  const { productId, slug, candidateIds } = opts;

  if (productId) {
    if (
      u.includes(`/produto/${productId}/`) ||
      u.includes(`/produto-${productId}`) ||
      u.includes(`_${productId}_`) ||
      u.includes(`/${productId}/`) ||
      u.includes(`${productId}-`) ||
      u.includes(`-${productId}`)
    ) return true;
  }

  if (candidateIds && candidateIds.length) {
    for (const id of candidateIds) {
      if (
        u.includes(`/produto/${id}/`) ||
        u.includes(`/produto-${id}`) ||
        u.includes(`_${id}_`) ||
        u.includes(`/${id}/`) ||
        u.includes(`${id}-`) ||
        u.includes(`-${id}`)
      ) return true;
    }
  }

  if (slug) {
    if (u.includes(slug.toLowerCase())) return true;
  }

  if (u.includes("/produto/")) return true;

  return false;
}

function extractImagesFromLiProduct(html: string, ctx: { productUrl: string; productId?: string; knownCdnIds?: string[]; minImagesThreshold?: number; verbose?: boolean }): string[] {
  const {
    productUrl,
    productId,
    knownCdnIds = [],
    minImagesThreshold = 3,
    verbose = true,
  } = ctx;

  const $ = cheerio.load(html);
  const slug = guessSlug(productUrl);

  const raw: string[] = [];
  const push = (u?: string | null) => { if (u) raw.push(toAbsoluteUrl(productUrl, u)); };

  LI_GALLERY_SELECTORS.forEach(sel => {
    $(sel).each((_, el) => {
      const $el = $(el);
      push($el.attr("data-zoom"));
      push($el.attr("data-src"));
      push($el.attr("src"));
      extractFromSrcset($el.attr("srcset")).forEach(s => push(s));
    });
  });

  $("img").each((_, el) => {
    const $el = $(el);
    push($el.attr("data-zoom"));
    push($el.attr("data-src"));
    push($el.attr("src"));
    extractFromSrcset($el.attr("srcset")).forEach(s => push(s));
  });

  const before = dedupe(raw);
  const inferredIds = extractCandidateIdsFromText(html);
  const candidateIds = dedupe([...(knownCdnIds || []), ...(inferredIds || [])]);

  const filtered = before.filter(u =>
    belongsToProduct(u, { productId, slug, candidateIds })
  );

  const chosen = filtered.length >= minImagesThreshold ? filtered : before;
  const final = dedupe(chosen).sort((a, b) => scoreBySize(b) - scoreBySize(a));

  if (verbose) {
    console.debug("[LI Images] slug:", slug, "productId:", productId);
    console.debug("[LI Images] raw:", raw.length, "unique:", before.length);
    console.debug("[LI Images] candidateIds:", candidateIds.slice(0, 8));
    console.debug("[LI Images] filtered:", filtered.length, "chosen:", chosen.length, "final:", final.length);
    if (final.length < minImagesThreshold) {
      const rejected = before.filter(u => !filtered.includes(u)).slice(0, 15);
      console.debug("[LI Images] few images → relaxed filter. Sample rejected URLs:", rejected);
    }
    console.debug("[LI Images] sample:", final.slice(0, 6));
  }

  return final;
}

function extractImagesGallery(
  jsonLdData?: any,
  mainImageUrl?: string,
  doc?: Document,
  productUrl?: string,
  html?: string
): Array<{ url: string; alt: string; order: number; is_main: boolean }> {
  console.info('🖼️ Extraindo galeria de imagens...');
  
  // Extract product ID from URL or HTML
  let productId: string | undefined;
  
  if (productUrl) {
    const urlPatterns = [
      /\/produto\/(\d+)\//i,
      /product[_-]?id[=:](\d+)/i,
      /\/p\/(\d+)/i,
      /\/(\d{6,})\//i
    ];
    
    for (const pattern of urlPatterns) {
      const match = productUrl.match(pattern);
      if (match && match[1]) {
        productId = match[1];
        break;
      }
    }
  }
  
  // Use intelligent extraction if we have HTML
  if (html && productUrl) {
    console.info('🚀 Using intelligent image extraction with fallback...');
    const imageUrls = extractImagesFromLiProduct(html, {
      productUrl,
      productId,
      minImagesThreshold: 3,
      verbose: true,
    });
    
    // Convert to expected format
    return imageUrls.map((url, index) => ({
      url,
      alt: jsonLdData?.name || 'Product image',
      order: index,
      is_main: index === 0
    }));
  }
  
  // Fallback to legacy extraction
  console.info('⚠️ Using legacy image extraction (no HTML provided)');
  const images = new Map<string, { url: string; alt: string; order: number; is_main: boolean }>();
  let order = 0;
  
  if (jsonLdData?.image) {
    const imageUrls = Array.isArray(jsonLdData.image) ? jsonLdData.image : [jsonLdData.image];
    imageUrls.forEach((url: string) => {
      if (url && !images.has(url)) {
        images.set(url, {
          url,
          alt: jsonLdData.name || 'Product image',
          order: order++,
          is_main: images.size === 0
        });
      }
    });
  }
  
  if (mainImageUrl && !images.has(mainImageUrl)) {
    images.set(mainImageUrl, {
      url: mainImageUrl,
      alt: 'Product image',
      order: order++,
      is_main: images.size === 0
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
            console.log('🎯 Variations extracted:', {
              count: productData.variations?.length || 0,
              sample: productData.variations?.slice(0, 2) || []
            });
            
            // Extrair galeria de imagens (passando URL e HTML)
            productData.images_gallery = extractImagesGallery(product, productData.image, doc, url, html);
            
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

    // ✅ Fallback preço DOM (melhorado com lógica max/min)
    if (!productData.price || productData.price === 0) {
      const selectors = [
        '[itemprop="price"]',
        '.valor-por', '.valor-de',
        '.preco', '.price', '.product-price', '.preco-atual',
        '[data-price]',
        'meta[property="product:price:amount"]'
      ];

      const rawPrices: number[] = [];
      for (const sel of selectors) {
        const nodes = Array.from(doc!.querySelectorAll(sel));
        for (const el of nodes) {
          const text = el.getAttribute?.("content")
            ?? el.getAttribute?.("data-price")
            ?? (el.textContent || "");
          const val = parsePriceBRL(text || "");
          if (val > 0) rawPrices.push(val);
        }
      }

      if (rawPrices.length >= 2) {
        const max = Math.max(...rawPrices);
        const min = Math.min(...rawPrices);
        productData.price = max;
        if (min < max) {
          productData.promo_price = min;
        }
        console.info(`💰 Preços detectados (DOM): { original: ${max}, promocional: ${min} }`);
      } else if (rawPrices.length === 1) {
        productData.price = rawPrices[0];
        console.info(`💰 Preço único detectado (DOM): ${rawPrices[0]}`);
      }

      // sanity check
      if (productData.promo_price && productData.price && productData.promo_price >= productData.price) {
        console.warn("⚠️ Ajuste: promo_price >= price — removendo promo_price.");
        delete productData.promo_price;
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

    // Fallback galeria (passando url e html)
    if (!productData.images_gallery || productData.images_gallery.length === 0) {
      productData.images_gallery = extractImagesGallery(undefined, productData.image, doc, url, html);
    }

    // Extrair li_product_id da URL e HTML
    let li_product_id: string | null = null;
    
    // Patterns for URL
    const urlPatterns = [
      /\/produto\/(\d+)\//i,
      /product[_-]?id[=:](\d+)/i,
      /\/p\/(\d+)/i,
      /\/(\d{6,})\//i
    ];
    
    for (const pattern of urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        li_product_id = match[1];
        break;
      }
    }
    
    // Try HTML if URL didn't work
    if (!li_product_id && doc) {
      const htmlPatterns = [
        /data-product-id=["'](\d{6,})["']/i,
        /data-produto-id=["'](\d{6,})["']/i,
        /"product_id"\s*:\s*(\d{6,})/i,
        /"produto_id"\s*:\s*"?(\d{6,})"?/i,
        /var\s+productId\s*=\s*['"]*(\d{6,})['"]*;/i
      ];
      
      for (const pattern of htmlPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          li_product_id = match[1];
          break;
        }
      }
    }
    
    if (li_product_id) {
      console.info(`🆔 Loja Integrada Product ID extracted: ${li_product_id}`);
    }

    console.info('Dados extraídos:', productData);
    console.log('📦 Scraping response final:', {
      has_name: !!productData.name,
      variations_count: productData.variations?.length || 0,
      images_count: productData.images_gallery?.length || 0,
      li_product_id: li_product_id || 'not_found'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: productData, 
        li_product_id,
        variations_count: productData.variations?.length || 0
      }),
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
