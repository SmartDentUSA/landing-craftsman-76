import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
}

// Mapeamento completo de classes do template
const createClassMap = (namespace: string) => ({
  // Layout principal
  "container": `${namespace}-c`,
  "header": `${namespace}-h`,
  "nav": `${namespace}-n`,
  "nav-logo": `${namespace}-nl`,
  "nav-links": `${namespace}-nli`,
  "nav-menu": `${namespace}-nm`,
  "nav-menu-item": `${namespace}-nmi`,
  "footer": `${namespace}-f`,
  "footer-content": `${namespace}-fc`,
  "footer-links": `${namespace}-fl`,
  "footer-social": `${namespace}-fs`,
  
  // Banner/Hero
  "hero": `${namespace}-he`,
  "hero-content": `${namespace}-hc`,
  "hero-text": `${namespace}-ht`,
  "hero-title": `${namespace}-hti`,
  "hero-subtitle": `${namespace}-hs`,
  "hero-buttons": `${namespace}-hb`,
  "hero-image": `${namespace}-hi`,
  "banner": `${namespace}-ban`,
  "banner-content": `${namespace}-bc`,
  "banner-text": `${namespace}-bt`,
  "banner-title": `${namespace}-bti`,
  "banner-subtitle": `${namespace}-bst`,
  "banner-images": `${namespace}-bi`,
  
  // Solutions
  "solutions": `${namespace}-sol`,
  "solutions-grid": `${namespace}-sg`,
  "solution-card": `${namespace}-sc`,
  "solution-icon": `${namespace}-si`,
  "solution-title": `${namespace}-sti`,
  "solution-description": `${namespace}-sde`,
  
  // Services
  "service": `${namespace}-ser`,
  "service-content": `${namespace}-sec`,
  "service-grid": `${namespace}-segr`,
  "service-card": `${namespace}-seca`,
  "service-icon": `${namespace}-sei`,
  "service-title": `${namespace}-set`,
  "service-description": `${namespace}-sed`,
  
  // Advisory/Consultoria
  "advisory": `${namespace}-adv`,
  "advisory-content": `${namespace}-ac`,
  "advisory-text": `${namespace}-at`,
  "advisory-image": `${namespace}-ai`,
  "personalized-service": `${namespace}-psv`,
  
  // FAQ
  "faq": `${namespace}-faq`,
  "faq-section": `${namespace}-fse`,
  "faq-accordion": `${namespace}-facc`,
  "faq-item": `${namespace}-fi`,
  "faq-question": `${namespace}-fq`,
  "faq-answer": `${namespace}-fa`,
  
  // CTA
  "cta": `${namespace}-cta`,
  "cta-section": `${namespace}-cs`,
  "cta-content": `${namespace}-cc`,
  "cta-text": `${namespace}-ct`,
  "cta-button": `${namespace}-cb`,
  
  // Buttons
  "btn": `${namespace}-btn`,
  "btn-primary": `${namespace}-bp`,
  "btn-secondary": `${namespace}-bs`,
  "button": `${namespace}-bu`,
  "button-primary": `${namespace}-bup`,
  "button-secondary": `${namespace}-bus`,
  
  // Seções genéricas
  "section": `${namespace}-sec`,
  "section-header": `${namespace}-she`,
  "section-title": `${namespace}-sti`,
  "section-subtitle": `${namespace}-ssu`,
  "section-content": `${namespace}-sco`,
  "control-section": `${namespace}-csec`,
  
  // Grid e layout
  "grid": `${namespace}-gr`,
  "control-grid": `${namespace}-cgr`,
  "grid-cols-1": `${namespace}-gc1`,
  "grid-cols-2": `${namespace}-gc2`,
  "grid-cols-3": `${namespace}-gc3`,
  "md:grid-cols-2": `${namespace}-mdgc2`,
  "md:grid-cols-3": `${namespace}-mdgc3`,
  "lg:grid-cols-3": `${namespace}-lgc3`,
  
  // Cards
  "card": `${namespace}-ca`,
  "control-item": `${namespace}-ci`,
  "control-item-text": `${namespace}-cit`,
  "control-item-image": `${namespace}-cii`,
  
  // Imagens
  "image-container": `${namespace}-ic`,
  "logo-img": `${namespace}-li`,
  "service-image": `${namespace}-si`,
  
  // Utilities Tailwind comuns
  "max-w-7xl": `${namespace}-mw7`,
  "mx-auto": `${namespace}-mxa`,
  "px-4": `${namespace}-px4`,
  "py-8": `${namespace}-py8`,
  "py-16": `${namespace}-py16`,
  "py-20": `${namespace}-py20`,
  "sm:px-6": `${namespace}-smpx6`,
  "lg:px-8": `${namespace}-lgpx8`,
  "text-center": `${namespace}-tc`,
  "text-4xl": `${namespace}-t4xl`,
  "text-6xl": `${namespace}-t6xl`,
  "font-bold": `${namespace}-fb`,
  "font-semibold": `${namespace}-fsb`,
  "text-white": `${namespace}-tw`,
  "text-gray-600": `${namespace}-tg6`,
  "bg-blue-600": `${namespace}-bb6`,
  "bg-white": `${namespace}-bw`,
  "hover:bg-blue-700": `${namespace}-hbb7`,
  "rounded-lg": `${namespace}-rlg`,
  "shadow-lg": `${namespace}-slg`,
  "mb-8": `${namespace}-mb8`,
  "mt-8": `${namespace}-mt8`,
  "space-y-8": `${namespace}-sy8`,
  "gap-8": `${namespace}-g8`,
  "flex": `${namespace}-fl`,
  "items-center": `${namespace}-ic`,
  "justify-center": `${namespace}-jc`,
  "space-x-4": `${namespace}-sx4`
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