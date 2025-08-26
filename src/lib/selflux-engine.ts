import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
}

// Mapeamento completo e preciso de todas as classes do template original
const createClassMap = (namespace: string) => ({
  // Header e navegação
  "header": `${namespace}-header`,
  "header-menu": `${namespace}-header-menu`,
  "header-menu-container": `${namespace}-header-menu-container`,
  "nav": `${namespace}-nav`,
  "nav-logo": `${namespace}-nav-logo`,
  "nav-links": `${namespace}-nav-links`,
  "nav-menu": `${namespace}-nav-menu`,
  "nav-menu-item": `${namespace}-nav-menu-item`,
  "menu-item": `${namespace}-menu-item`,
  "logo-img": `${namespace}-logo-img`,
  
  // Banner principal  
  "main-banner": `${namespace}-main-banner`,
  "banner": `${namespace}-banner`,
  "banner-content": `${namespace}-banner-content`,
  "banner-text": `${namespace}-banner-text`,
  "banner-title": `${namespace}-banner-title`,
  "banner-subtitle": `${namespace}-banner-subtitle`,
  "banner-images": `${namespace}-banner-images`,
  "banner-image": `${namespace}-banner-image`,
  "banner-description": `${namespace}-banner-description`,
  
  // Hero section
  "hero": `${namespace}-hero`,
  "hero-content": `${namespace}-hero-content`,
  "hero-text": `${namespace}-hero-text`,
  "hero-title": `${namespace}-hero-title`,
  "hero-subtitle": `${namespace}-hero-subtitle`,
  "hero-buttons": `${namespace}-hero-buttons`,
  "hero-image": `${namespace}-hero-image`,
  
  // Container e layout principal
  "container": `${namespace}-container`,
  "main-container": `${namespace}-main-container`,
  "content-container": `${namespace}-content-container`,
  
  // Seções de controle
  "control-section": `${namespace}-control-section`,
  "control-grid": `${namespace}-control-grid`,
  "control-item": `${namespace}-control-item`,
  "control-item-side": `${namespace}-control-item-side`,
  "control-item-text": `${namespace}-control-item-text`,
  "control-item-image": `${namespace}-control-item-image`,
  
  // Solutions/Soluções
  "solutions": `${namespace}-solutions`,
  "solutions-section": `${namespace}-solutions-section`,
  "solutions-grid": `${namespace}-solutions-grid`,
  "solution-card": `${namespace}-solution-card`,
  "solution-icon": `${namespace}-solution-icon`,
  "solution-title": `${namespace}-solution-title`,
  "solution-description": `${namespace}-solution-description`,
  
  // Services/Serviços
  "service": `${namespace}-service`,
  "service-section": `${namespace}-service-section`,
  "service-content": `${namespace}-service-content`,
  "service-grid": `${namespace}-service-grid`,
  "service-card": `${namespace}-service-card`,
  "service-icon": `${namespace}-service-icon`,
  "service-title": `${namespace}-service-title`,
  "service-description": `${namespace}-service-description`,
  "service-text": `${namespace}-service-text`,
  "service-image": `${namespace}-service-image`,
  "service-image-container": `${namespace}-service-image-container`,
  
  // Advisory/Consultoria
  "advisory": `${namespace}-advisory`,
  "advisory-section": `${namespace}-advisory-section`,
  "advisory-content": `${namespace}-advisory-content`,
  "advisory-text": `${namespace}-advisory-text`,
  "advisory-image": `${namespace}-advisory-image`,
  "personalized-service": `${namespace}-personalized-service`,
  
  // FAQ
  "faq": `${namespace}-faq`,
  "faq-section": `${namespace}-faq-section`,
  "faq-accordion": `${namespace}-faq-accordion`,
  "faq-item": `${namespace}-faq-item`,
  "faq-question": `${namespace}-faq-question`,
  "faq-answer": `${namespace}-faq-answer`,
  
  // CTA
  "cta": `${namespace}-cta`,
  "cta-section": `${namespace}-cta-section`,
  "cta-content": `${namespace}-cta-content`,
  "cta-text": `${namespace}-cta-text`,
  "cta-button": `${namespace}-cta-button`,
  
  // Footer
  "footer": `${namespace}-footer`,
  "footer-content": `${namespace}-footer-content`,
  "footer-grid": `${namespace}-footer-grid`,
  "footer-info": `${namespace}-footer-info`,
  "footer-links": `${namespace}-footer-links`,
  "footer-social": `${namespace}-footer-social`,
  "footer-link": `${namespace}-footer-link`,
  
  // Buttons
  "btn": `${namespace}-btn`,
  "btn-primary": `${namespace}-btn-primary`,
  "btn-secondary": `${namespace}-btn-secondary`,
  "button": `${namespace}-button`,
  "button-primary": `${namespace}-button-primary`,
  "button-secondary": `${namespace}-button-secondary`,
  "cta-btn": `${namespace}-cta-btn`,
  
  // Seções genéricas
  "section": `${namespace}-section`,
  "section-header": `${namespace}-section-header`,
  "section-title": `${namespace}-section-title`,
  "section-subtitle": `${namespace}-section-subtitle`,
  "section-content": `${namespace}-section-content`,
  "section-description": `${namespace}-section-description`,
  
  // Grid e layout
  "grid": `${namespace}-grid`,
  "grid-cols-1": `${namespace}-grid-cols-1`,
  "grid-cols-2": `${namespace}-grid-cols-2`,
  "grid-cols-3": `${namespace}-grid-cols-3`,
  "md:grid-cols-2": `${namespace}-md-grid-cols-2`,
  "md:grid-cols-3": `${namespace}-md-grid-cols-3`,
  "lg:grid-cols-3": `${namespace}-lg-grid-cols-3`,
  "lg:grid-cols-4": `${namespace}-lg-grid-cols-4`,
  
  // Cards genéricos
  "card": `${namespace}-card`,
  "card-content": `${namespace}-card-content`,
  "card-header": `${namespace}-card-header`,
  "card-title": `${namespace}-card-title`,
  "card-description": `${namespace}-card-description`,
  
  // Imagens
  "image": `${namespace}-image`,
  "image-container": `${namespace}-image-container`,
  "img": `${namespace}-img`,
  
  // Layout utilities mais específicos
  "w-full": `${namespace}-w-full`,
  "h-full": `${namespace}-h-full`,
  "w-auto": `${namespace}-w-auto`,
  "h-auto": `${namespace}-h-auto`,
  "w-64": `${namespace}-w-64`,
  "h-64": `${namespace}-h-64`,
  
  // Spacing utilities comuns
  "max-w-7xl": `${namespace}-max-w-7xl`,
  "max-w-6xl": `${namespace}-max-w-6xl`,
  "max-w-4xl": `${namespace}-max-w-4xl`,
  "mx-auto": `${namespace}-mx-auto`,
  "px-4": `${namespace}-px-4`,
  "px-6": `${namespace}-px-6`,
  "px-8": `${namespace}-px-8`,
  "py-8": `${namespace}-py-8`,
  "py-12": `${namespace}-py-12`,
  "py-16": `${namespace}-py-16`,
  "py-20": `${namespace}-py-20`,
  "py-24": `${namespace}-py-24`,
  "py-32": `${namespace}-py-32`,
  "mb-4": `${namespace}-mb-4`,
  "mb-6": `${namespace}-mb-6`,
  "mb-8": `${namespace}-mb-8`,
  "mb-12": `${namespace}-mb-12`,
  "mt-4": `${namespace}-mt-4`,
  "mt-8": `${namespace}-mt-8`,
  "mt-12": `${namespace}-mt-12`,
  "space-y-4": `${namespace}-space-y-4`,
  "space-y-6": `${namespace}-space-y-6`,
  "space-y-8": `${namespace}-space-y-8`,
  "space-y-12": `${namespace}-space-y-12`,
  "gap-4": `${namespace}-gap-4`,
  "gap-6": `${namespace}-gap-6`,
  "gap-8": `${namespace}-gap-8`,
  "gap-12": `${namespace}-gap-12`,
  
  // Typography
  "text-center": `${namespace}-text-center`,
  "text-left": `${namespace}-text-left`,
  "text-right": `${namespace}-text-right`,
  "text-xs": `${namespace}-text-xs`,
  "text-sm": `${namespace}-text-sm`,
  "text-base": `${namespace}-text-base`,
  "text-lg": `${namespace}-text-lg`,
  "text-xl": `${namespace}-text-xl`,
  "text-2xl": `${namespace}-text-2xl`,
  "text-3xl": `${namespace}-text-3xl`,
  "text-4xl": `${namespace}-text-4xl`,
  "text-5xl": `${namespace}-text-5xl`,
  "text-6xl": `${namespace}-text-6xl`,
  "font-normal": `${namespace}-font-normal`,
  "font-medium": `${namespace}-font-medium`,
  "font-semibold": `${namespace}-font-semibold`,
  "font-bold": `${namespace}-font-bold`,
  "leading-tight": `${namespace}-leading-tight`,
  "leading-relaxed": `${namespace}-leading-relaxed`,
  
  // Colors
  "text-white": `${namespace}-text-white`,
  "text-black": `${namespace}-text-black`,
  "text-gray-500": `${namespace}-text-gray-500`,
  "text-gray-600": `${namespace}-text-gray-600`,
  "text-gray-700": `${namespace}-text-gray-700`,
  "text-gray-800": `${namespace}-text-gray-800`,
  "text-gray-900": `${namespace}-text-gray-900`,
  "text-blue-600": `${namespace}-text-blue-600`,
  "text-blue-700": `${namespace}-text-blue-700`,
  "bg-white": `${namespace}-bg-white`,
  "bg-gray-50": `${namespace}-bg-gray-50`,
  "bg-gray-100": `${namespace}-bg-gray-100`,
  "bg-blue-600": `${namespace}-bg-blue-600`,
  "bg-blue-700": `${namespace}-bg-blue-700`,
  "hover:bg-blue-700": `${namespace}-hover-bg-blue-700`,
  "hover:bg-gray-50": `${namespace}-hover-bg-gray-50`,
  
  // Flexbox e layout
  "flex": `${namespace}-flex`,
  "inline-flex": `${namespace}-inline-flex`,
  "flex-col": `${namespace}-flex-col`,
  "flex-row": `${namespace}-flex-row`,
  "items-start": `${namespace}-items-start`,
  "items-center": `${namespace}-items-center`,
  "items-end": `${namespace}-items-end`,
  "justify-start": `${namespace}-justify-start`,
  "justify-center": `${namespace}-justify-center`,
  "justify-end": `${namespace}-justify-end`,
  "justify-between": `${namespace}-justify-between`,
  "space-x-2": `${namespace}-space-x-2`,
  "space-x-4": `${namespace}-space-x-4`,
  "space-x-6": `${namespace}-space-x-6`,
  
  // Borders e visual
  "rounded": `${namespace}-rounded`,
  "rounded-lg": `${namespace}-rounded-lg`,
  "rounded-xl": `${namespace}-rounded-xl`,
  "rounded-full": `${namespace}-rounded-full`,
  "border": `${namespace}-border`,
  "border-gray-200": `${namespace}-border-gray-200`,
  "border-gray-300": `${namespace}-border-gray-300`,
  "shadow": `${namespace}-shadow`,
  "shadow-sm": `${namespace}-shadow-sm`,
  "shadow-md": `${namespace}-shadow-md`,
  "shadow-lg": `${namespace}-shadow-lg`,
  "shadow-xl": `${namespace}-shadow-xl`,
  
  // Interactive states
  "hover:shadow-lg": `${namespace}-hover-shadow-lg`,
  "transition": `${namespace}-transition`,
  "transition-all": `${namespace}-transition-all`,
  "duration-200": `${namespace}-duration-200`,
  "duration-300": `${namespace}-duration-300`,
  "transform": `${namespace}-transform`,
  "hover:scale-105": `${namespace}-hover-scale-105`,
  
  // Responsive utilities
  "sm:text-xl": `${namespace}-sm-text-xl`,
  "md:text-2xl": `${namespace}-md-text-2xl`,
  "lg:text-3xl": `${namespace}-lg-text-3xl`,
  "xl:text-4xl": `${namespace}-xl-text-4xl`,
  "sm:py-12": `${namespace}-sm-py-12`,
  "md:py-16": `${namespace}-md-py-16`,
  "lg:py-20": `${namespace}-lg-py-20`,
  "sm:px-6": `${namespace}-sm-px-6`,
  "md:px-8": `${namespace}-md-px-8`,
  "lg:px-8": `${namespace}-lg-px-8`,
  
  // Position
  "relative": `${namespace}-relative`,
  "absolute": `${namespace}-absolute`,
  "fixed": `${namespace}-fixed`,
  "sticky": `${namespace}-sticky`,
  "top-0": `${namespace}-top-0`,
  "bottom-0": `${namespace}-bottom-0`,
  "left-0": `${namespace}-left-0`,
  "right-0": `${namespace}-right-0`,
  
  // Display
  "block": `${namespace}-block`,
  "inline": `${namespace}-inline`,
  "inline-block": `${namespace}-inline-block`,
  "hidden": `${namespace}-hidden`,
  "sm:block": `${namespace}-sm-block`,
  "md:block": `${namespace}-md-block`,
  "lg:block": `${namespace}-lg-block`,
  "sm:hidden": `${namespace}-sm-hidden`,
  "md:hidden": `${namespace}-md-hidden`,
  "lg:hidden": `${namespace}-lg-hidden`
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

// Renomear classes no HTML - SUBSTITUIR ao invés de adicionar
const renameClassesInHtml = (html: string, classMap: Record<string, string>): string => {
  let processedHtml = html;
  
  // Ordenar classes por tamanho decrescente para evitar conflitos de substring
  const sortedEntries = Object.entries(classMap).sort(([a], [b]) => b.length - a.length);
  
  for (const [from, to] of sortedEntries) {
    // Escapar caracteres especiais regex
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Substituir class="from" por class="to"
    const exactClassRegex = new RegExp(`class\\s*=\\s*"\\s*${escapedFrom}\\s*"`, 'g');
    processedHtml = processedHtml.replace(exactClassRegex, `class="${to}"`);
    
    // Substituir class='from' por class='to'
    const exactClassRegexSingle = new RegExp(`class\\s*=\\s*'\\s*${escapedFrom}\\s*'`, 'g');
    processedHtml = processedHtml.replace(exactClassRegexSingle, `class='${to}'`);
    
    // Substituir class="other-classes from" por class="other-classes to"
    const withinClassRegex = new RegExp(`(class\\s*=\\s*"[^"]*?)\\b${escapedFrom}\\b([^"]*")`, 'g');
    processedHtml = processedHtml.replace(withinClassRegex, `$1${to}$2`);
    
    // Substituir class='other-classes from' por class='other-classes to'
    const withinClassRegexSingle = new RegExp(`(class\\s*=\\s*'[^']*?)\\b${escapedFrom}\\b([^']*')`, 'g');
    processedHtml = processedHtml.replace(withinClassRegexSingle, `$1${to}$2`);
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
  
  // Renomear classes no CSS primeiro (ordenar por tamanho para evitar conflitos)
  let processedCss = inlineCss;
  const sortedClassEntries = Object.entries(classMap).sort(([a], [b]) => b.length - a.length);
  
  sortedClassEntries.forEach(([oldClass, newClass]) => {
    // Escapar caracteres especiais para uso em regex
    const escapedOldClass = oldClass.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&');
    const classRegex = new RegExp(`\\.${escapedOldClass}\\b`, 'g');
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