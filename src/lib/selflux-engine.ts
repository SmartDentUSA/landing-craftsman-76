import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
}

// Mapeamento baseado no exemplo SelFlux fornecido
const createClassMap = (namespace: string) => ({
  // Header e navegação (baseado no exemplo)
  "header-menu": `${namespace}-head`,
  "header-menu-container": `${namespace}-head-bar`,
  "container": `${namespace}-c`,
  "nav-logo": `${namespace}-logo`,
  "nav": `${namespace}-nav`,
  "logo-img": `${namespace}-logo`,
  
  // Banner/Hero principal
  "main-banner": `${namespace}-hero`,
  "banner-content": `${namespace}-hero-row`,
  "banner-text": `${namespace}-hero-content`,
  "banner-title": `${namespace}-h1`,
  "banner-description": `${namespace}-lead`,
  "banner-images": `${namespace}-hero-gallery`,
  "banner-image": `${namespace}-img`,
  
  // Seções principais
  "solutions-section": `${namespace}-sec`,
  "solutions-grid": `${namespace}-grid2`,
  "solution-card": `${namespace}-card`,
  "solution-image": `${namespace}-card-img`,
  "solution-description": `${namespace}-card-body`,
  
  // Advisory/Consultoria
  "advisory-section": `${namespace}-sec`,
  "advisory-content": `${namespace}-consult-grid`,
  "advisory-text": `${namespace}-consult-text`,
  "advisory-image": `${namespace}-consult-img`,
  
  // FAQ
  "faq-section": `${namespace}-faq`,
  "faq-accordion": `${namespace}-accordion`,
  "faq-item": `${namespace}-faq-item`,
  "faq-question": `${namespace}-faq-q`,
  "faq-answer": `${namespace}-faq-a`,
  
  // CTA
  "cta-section": `${namespace}-cta`,
  
  // Footer
  "footer": `${namespace}-footer`,
  "footer-content": `${namespace}-footer-grid`,
  
  // Buttons
  "btn": `${namespace}-btn`,
  "btn-primary": `${namespace}-btn primary`,
  "btn-secondary": `${namespace}-btn secondary`,
  "button": `${namespace}-btn`,
  "button-primary": `${namespace}-btn primary`,
  "button-secondary": `${namespace}-btn secondary`,
  
  // Section headers
  "section-title": `${namespace}-h2`,
  "section-subtitle": `${namespace}-lead`,
  
  // Grid e layout
  "grid": `${namespace}-grid2`,
  "grid-cols-2": `${namespace}-grid2`,
  "md:grid-cols-2": `${namespace}-grid2`,
  
  // Images
  "image": `${namespace}-img`,
  "img": `${namespace}-img`,
  
  // Typography
  "text-center": `${namespace}-text-center`,
  "text-left": `${namespace}-text-left`,
  
  // Layout utilities
  "w-full": `${namespace}-w-full`,
  "h-full": `${namespace}-h-full`,
  "max-w-7xl": `${namespace}-max-w-7xl`,
  "mx-auto": `${namespace}-mx-auto`,
  "px-4": `${namespace}-px-4`,
  "py-8": `${namespace}-py-8`,
  "py-12": `${namespace}-py-12`,
  "py-16": `${namespace}-py-16`,
  "mb-4": `${namespace}-mb-4`,
  "mb-8": `${namespace}-mb-8`,
  "space-y-8": `${namespace}-space-y-8`,
  
  // Responsive utilities básicos
  "md:flex": `${namespace}-md-flex`,
  "md:items-center": `${namespace}-md-items-center`,
  "md:text-left": `${namespace}-md-text-left`
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

// CSS SelFlux baseado no exemplo fornecido
const generateSelFluxCSS = (namespace: string): string => {
  return `
    /* --- NAMESPACE: ${namespace}- (SelFlux-safe) --- */
    .${namespace}-root, .${namespace}-root * { box-sizing: border-box; }
    .${namespace}-root { --${namespace}-primary:#0a84ff; --${namespace}-text:#0b1220; --${namespace}-muted:#3b4556; --${namespace}-bg:#f5f7fb; --${namespace}-white:#fff; }
    .${namespace}-c{width:min(100%,1200px);margin:0 auto;padding:0 16px;}
    .${namespace}-img{max-width:100%;display:block;height:auto;}
    .${namespace}-btn{display:inline-block;padding:.75rem 1rem;border-radius:.75rem;font-weight:700;text-decoration:none}
    .${namespace}-btn.primary{background:var(--${namespace}-primary);color:#fff}
    .${namespace}-btn.secondary{background:#e9ecef;color:#111}
    .${namespace}-h1{font-size:2.2rem;margin:.25rem 0 .75rem;color:var(--${namespace}-text);line-height:1.2}
    .${namespace}-lead{color:var(--${namespace}-muted);line-height:1.6}

    /* Header */
    .${namespace}-head{background:var(--${namespace}-white);border-bottom:1px solid #eef2f7;position:sticky;top:0;z-index:10}
    .${namespace}-head-bar{height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem}
    .${namespace}-logo{height:40px;width:auto}
    .${namespace}-nav{display:flex;gap:1rem;flex-wrap:wrap}
    .${namespace}-nav a{padding:.5rem .75rem;border-radius:.5rem;color:#555;font-weight:600;text-decoration:none}
    .${namespace}-nav a:hover{background:#f1f5f9;color:#111}

    /* Hero */
    .${namespace}-hero{background:var(--${namespace}-white);padding:3rem 0 2rem}
    .${namespace}-hero-row{display:flex;flex-direction:column;gap:1.5rem}
    .${namespace}-hero-badge{font-size:.85rem;font-weight:700;letter-spacing:.3px;color:#0a84ff}
    .${namespace}-hero-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}
    .${namespace}-hero-gallery img{border-radius:.75rem}

    /* Sections */
    .${namespace}-sec{padding:2.5rem 0}
    .${namespace}-h2{text-align:center;margin:0 0 1.5rem;font-size:1.9rem;color:var(--${namespace}-text)}
    .${namespace}-grid2{display:grid;grid-template-columns:1fr;gap:1rem}
    .${namespace}-card{background:var(--${namespace}-white);border-radius:1rem;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.07)}
    .${namespace}-card-img{width:100%;height:220px;object-fit:cover}
    .${namespace}-card-body{padding:1.25rem;color:var(--${namespace}-muted);font-weight:500}

    /* Consultoria */
    .${namespace}-consult-grid{display:grid;grid-template-columns:1fr;gap:1.5rem;align-items:center}
    .${namespace}-consult-img{border-radius:1rem;box-shadow:0 8px 16px rgba(0,0,0,.09)}

    /* FAQ */
    .${namespace}-faq h2{text-align:center;margin-bottom:1rem}
    .${namespace}-accordion{display:grid;gap:.75rem}
    .${namespace}-faq-item{background:var(--${namespace}-white);border:1px solid #eef2f7;border-radius:.75rem;overflow:hidden}
    .${namespace}-faq-q{padding:1rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:600}
    .${namespace}-faq-a{display:none;padding:0 1rem 1rem;color:#555;line-height:1.6}
    .${namespace}-faq-item.active .${namespace}-faq-a{display:block}

    /* CTA final */
    .${namespace}-cta{padding:2.5rem 0;text-align:center;background:var(--${namespace}-white)}

    /* Footer */
    .${namespace}-footer{background:#0b1220;color:#d0d8e0;padding:2rem 0}
    .${namespace}-footer-grid{display:grid;grid-template-columns:1fr;gap:1.5rem}
    .${namespace}-footer a{color:#d0d8e0;text-decoration:none}

    @media (min-width:768px){
      .${namespace}-hero-row{flex-direction:row;align-items:center}
      .${namespace}-grid2{grid-template-columns:repeat(2,1fr)}
      .${namespace}-consult-grid{grid-template-columns:1.2fr .8fr}
      .${namespace}-footer-grid{grid-template-columns:repeat(3,1fr)}
    }
  `;
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
  
  // Renomear classes no HTML
  const renamedHtml = renameClassesInHtml(html, classMap);
  console.log('🔧 Classes renamed in HTML');
  
  // Gerar CSS SelFlux completo baseado no exemplo
  const selfluxCSS = generateSelFluxCSS(config.namespace);
  
  // Gerar JavaScript adaptado para SelFlux
  const selfluxJS = `
    (function(){
      document.querySelectorAll('.${config.namespace}-root .${config.namespace}-faq-q').forEach(function(q){
        q.addEventListener('click', function(){
          q.parentElement.classList.toggle('active');
        });
      });
    })();
  `;
  
  // Montar HTML final com wrapper, CSS e JavaScript SelFlux
  const finalHtml = `<div class="${config.namespace}-root">
<style>${selfluxCSS}</style>
${renamedHtml}
<script>${selfluxJS}</script>
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