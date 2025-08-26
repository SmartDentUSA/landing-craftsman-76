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
  return css.replace(/(^|\})\s*([^@\}][^{]+)\{/g, (match, brace, selector) => {
    // Não duplique escopo se já existir
    const scoped = selector.split(',').map((s: string) => {
      s = s.trim();
      if (!s || s.startsWith(scope)) return s;
      return `${scope} ${s}`;
    }).join(', ');
    
    return `${brace}${scoped}{`;
  });
};

// Função principal para gerar HTML safe para SelFlux
export const generateSafeHTML = (data: any, embedConfig?: EmbedConfig): string => {
  const config = embedConfig || { mode: 'default', namespace: 'sd' };
  
  // Resolver imagens primeiro
  const processedData = resolveImagesInData(data);
  
  // Gerar HTML normal
  let html = originalGenerateHTML(processedData);
  
  // Se não for modo SelFlux, retornar HTML normal
  if (config.mode !== 'selflux') {
    return html;
  }
  
  // Aplicar transformações SelFlux
  const classMap = createClassMap(config.namespace);
  const scope = `.${config.namespace}-root`;
  
  // Extrair CSS inline se existir
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  let inlineCss = styleMatch ? styleMatch[1] : '';
  
  // Prefixar CSS
  const prefixedCss = prefixCss(inlineCss, scope);
  
  // Remover <style> original e renomear classes
  const strippedHtml = styleMatch ? html.replace(styleMatch[0], '') : html;
  const renamedHtml = renameClassesInHtml(strippedHtml, classMap);
  
  // Montar HTML final com wrapper e CSS prefixado
  return `<div class="${config.namespace}-root">
<style>${prefixedCss}</style>
${renamedHtml}
</div>`;
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