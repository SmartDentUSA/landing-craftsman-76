import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
}

// Mapeamento de classes "perigosas" para versões "safe"
const createClassMap = (namespace: string) => ({
  "container": `${namespace}-c`,
  "button": `${namespace}-btn`,
  "button-primary": `${namespace}-btn-primary`,
  "button-secondary": `${namespace}-btn-secondary`,
  "header-menu": `${namespace}-head`,
  "header-menu-container": `${namespace}-head-bar`,
  "logo-img": `${namespace}-logo`,
  "main-banner": `${namespace}-hero`,
  "banner-content": `${namespace}-hero-row`,
  "banner-images": `${namespace}-hero-gallery`,
  "control-section": `${namespace}-sec`,
  "control-grid": `${namespace}-grid2`,
  "control-item": `${namespace}-card`,
  "control-item-text": `${namespace}-card-body`,
  "image-container": `${namespace}-img-wrap`,
  "control-item-image": `${namespace}-card-img`,
  "personalized-service": `${namespace}-sec`,
  "service-content": `${namespace}-consult-grid`,
  "service-image": `${namespace}-consult-img`,
  "faq-section": `${namespace}-sec ${namespace}-faq`,
  "faq-accordion": `${namespace}-accordion`,
  "faq-item": `${namespace}-faq-item`,
  "faq-question": `${namespace}-faq-q`,
  "faq-answer": `${namespace}-faq-a`,
  "cta-section": `${namespace}-cta`,
  "cta-content": `${namespace}-cta-c`,
  "footer": `${namespace}-footer`,
  "footer-grid": `${namespace}-footer-grid`,
  "footer-links": `${namespace}-footer-links`
});

// Resolução de imagens Cloudflare
interface ImageData {
  mode?: 'url' | 'cloudflare';
  src?: string;
  cf_id?: string;
  variant?: string;
  url?: string;
}

const resolveImage = (img: ImageData, accountHash?: string): string => {
  if (!img) return '';
  
  // Se tem src direto, usar
  if (img.src) return img.src;
  
  // Se tem url direto, usar
  if (img.url) return img.url;
  
  // Se é modo cloudflare
  if (img.mode === 'cloudflare' && img.cf_id) {
    const hash = accountHash || localStorage.getItem('cloudflareAccountHash') || 'ACCOUNT_HASH_PLACEHOLDER';
    const variant = img.variant || 'w-768';
    return `https://imagedelivery.net/${hash}/${img.cf_id}/${variant}`;
  }
  
  return '';
};

const buildSrcset = (img: ImageData, accountHash?: string, variants = ['w-480', 'w-768', 'w-1200']): string => {
  if (img.mode !== 'cloudflare' || !img.cf_id) return '';
  
  const hash = accountHash || localStorage.getItem('cloudflareAccountHash') || 'ACCOUNT_HASH_PLACEHOLDER';
  return variants
    .map(v => `https://imagedelivery.net/${hash}/${img.cf_id}/${v} ${v.replace('w-', '')}w`)
    .join(', ');
};

// Função recursiva para resolver imagens no objeto de dados
const resolveImagesInData = (data: any, accountHash?: string): any => {
  if (Array.isArray(data)) {
    return data.map(item => resolveImagesInData(item, accountHash));
  }
  
  if (data && typeof data === 'object') {
    const resolved = { ...data };
    
    // Se tem propriedades de imagem, resolver
    if (data.mode && (data.cf_id || data.url || data.src)) {
      resolved.src = resolveImage(data, accountHash);
      const srcset = buildSrcset(data, accountHash);
      if (srcset) {
        resolved.srcset = srcset;
        resolved.sizes = '(max-width:600px) 480px, (max-width:900px) 768px, 1200px';
      }
    }
    
    // Recursão para propriedades aninhadas
    Object.keys(resolved).forEach(key => {
      resolved[key] = resolveImagesInData(resolved[key], accountHash);
    });
    
    return resolved;
  }
  
  return data;
};

// Renomear classes no HTML
const renameClassesInHtml = (html: string, classMap: Record<string, string>): string => {
  let processedHtml = html;
  
  for (const [from, to] of Object.entries(classMap)) {
    // Procura por class="... from ..." (com bordas de palavra)
    const regex1 = new RegExp(`(class\\s*=\\s*"[^"]*?)\\b${from}\\b`, 'g');
    processedHtml = processedHtml.replace(regex1, `$1 ${to}`);
    
    const regex2 = new RegExp(`(class\\s*=\\s*'[^']*?)\\b${from}\\b`, 'g');
    processedHtml = processedHtml.replace(regex2, `$1 ${to}`);
  }
  
  return processedHtml;
};

// Prefixar CSS com escopo
const prefixCss = (css: string, scope: string): string => {
  console.log('🔧 Prefixing CSS with scope:', scope);
  
  return css.replace(/([^{}]+)\{/g, (match, selector) => {
    // Skip at-rules e comentários
    if (selector.trim().startsWith('@') || selector.trim().startsWith('/*')) {
      return match;
    }
    
    // Processa múltiplos seletores separados por vírgula
    const scoped = selector.split(',').map((s) => {
      s = s.trim();
      
      // Pula vazios
      if (!s) return s;
      
      // Se já tem o escopo, não duplicar
      if (s.startsWith(scope)) return s;
      
      // Para :root, adicionar escopo antes
      if (s === ':root') return `${scope} ${s}`;
      
      // Para outros seletores, adicionar escopo
      return `${scope} ${s}`;
    }).join(', ');
    
    return `${scoped}{`;
  });
};

// Função principal para gerar HTML safe para SelFlux
export const generateSafeHTML = (data: any, embedConfig?: EmbedConfig): string => {
  const config = embedConfig || { mode: 'default', namespace: 'sd' };
  
  console.log('🔧 generateSafeHTML called with config:', config);
  console.log('🔧 Data keys:', Object.keys(data || {}));
  
  // Resolver imagens primeiro
  const processedData = resolveImagesInData(data);
  console.log('🔧 Images resolved, processed data sample:', {
    logo_url: processedData?.logo_url,
    banner_images_count: processedData?.banner?.images?.length
  });
  
  // Gerar HTML normal
  let html = originalGenerateHTML(processedData);
  console.log('🔧 Original HTML generated, length:', html?.length);
  
  // Se não for modo SelFlux, retornar HTML normal
  if (config.mode !== 'selflux') {
    console.log('🔧 Mode is not selflux, returning original HTML');
    return html;
  }
  
  console.log('🔧 SelFlux mode active, applying transformations...');
  
  // Aplicar transformações SelFlux
  const classMap = createClassMap(config.namespace);
  const scope = `.${config.namespace}-root`;
  
  console.log('🔧 Class map sample:', Object.fromEntries(Object.entries(classMap).slice(0, 3)));
  console.log('🔧 Scope:', scope);
  
  // Extrair CSS inline se existir
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let inlineCss = styleMatch ? styleMatch[1] : '';
  console.log('🔧 CSS extracted, length:', inlineCss?.length);
  
  // Remover <style> original primeiro
  const strippedHtml = styleMatch ? html.replace(styleMatch[0], '') : html;
  
  // Renomear classes no CSS primeiro
  let processedCss = inlineCss;
  Object.entries(classMap).forEach(([oldClass, newClass]) => {
    const classRegex = new RegExp(`\\.${oldClass}\\b`, 'g');
    processedCss = processedCss.replace(classRegex, `.${newClass}`);
  });
  console.log('🔧 CSS classes renamed, sample:', processedCss.substring(0, 200));
  
  // Aplicar escopo ao CSS
  const prefixedCss = prefixCss(processedCss, scope);
  console.log('🔧 CSS prefixed, sample:', prefixedCss.substring(0, 200));
  
  // Renomear classes no HTML
  const renamedHtml = renameClassesInHtml(strippedHtml, classMap);
  console.log('🔧 HTML classes renamed, sample:', renamedHtml.substring(0, 300));
  
  // Montar HTML final com wrapper e CSS prefixado
  const finalHtml = `<div class="${config.namespace}-root">
<style>${prefixedCss}</style>
${renamedHtml}
</div>`;
  
  console.log('🔧 Final HTML generated, length:', finalHtml?.length);
  console.log('🔧 Final HTML preview:', finalHtml.substring(0, 500));
  
  return finalHtml;
};

// Função para gerar email HTML safe
export const generateSafeEmailHTML = (emailData: any, embedConfig?: EmbedConfig): string => {
  const config = embedConfig || { mode: 'default', namespace: 'sd' };
  
  // Resolver imagens primeiro
  const processedData = resolveImagesInData(emailData);
  
  // Gerar HTML normal do email
  let html = originalGenerateEmailHTML(processedData);
  
  // Se não for modo SelFlux, retornar HTML normal
  if (config.mode !== 'selflux') {
    return html;
  }
  
  // Para emails, aplicar transformações mais conservadoras
  const classMap = createClassMap(config.namespace);
  const renamedHtml = renameClassesInHtml(html, classMap);
  
  // Para emails, não usar wrapper div (pode quebrar clientes de email)
  // Apenas renomear classes e resolver imagens
  return renamedHtml;
};

// Utilitário para verificar se uma landing page usa modo SelFlux
export const isSelfluxMode = (landingPage: any): boolean => {
  return landingPage?.embed?.mode === 'selflux';
};

// Utilitário para obter configuração de embed com fallbacks
export const getEmbedConfig = (landingPage: any): EmbedConfig => {
  return {
    mode: landingPage?.embed?.mode || 'default',
    namespace: landingPage?.embed?.namespace || 'sd'
  };
};