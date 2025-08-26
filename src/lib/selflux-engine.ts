import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
}

// Mapeamento exato baseado no template original
const createClassMap = (namespace: string) => ({
  // Header e navegação - classes exatas do template
  "header-menu": `${namespace}-header-menu`,
  "header-menu-container": `${namespace}-header-menu-container`,
  "container": `${namespace}-container`,
  "nav-logo": `${namespace}-nav-logo`,
  "nav-menu": `${namespace}-nav-menu`,
  "menu-item": `${namespace}-menu-item`,
  "logo-img": `${namespace}-logo-img`,
  
  // Banner principal - classes exatas do template
  "main-banner": `${namespace}-main-banner`,
  "banner-content": `${namespace}-banner-content`,
  "banner-text": `${namespace}-banner-text`,
  "banner-images": `${namespace}-banner-images`,
  
  // Control/Solutions section - classes exatas do template
  "control-section": `${namespace}-control-section`,
  "control-grid": `${namespace}-control-grid`,
  "control-item": `${namespace}-control-item`,
  "control-item-side": `${namespace}-control-item-side`,
  "control-item-text": `${namespace}-control-item-text`,
  "control-item-image": `${namespace}-control-item-image`,
  "image-container": `${namespace}-image-container`,
  "full-height": `${namespace}-full-height`,
  
  // Service/Advisory section - classes exatas do template
  "personalized-service": `${namespace}-personalized-service`,
  "service-content": `${namespace}-service-content`,
  "service-text": `${namespace}-service-text`,
  "service-image-container": `${namespace}-service-image-container`,
  "service-image": `${namespace}-service-image`,
  
  // FAQ - classes exatas do template
  "faq-section": `${namespace}-faq-section`,
  "faq-accordion": `${namespace}-faq-accordion`,
  "faq-item": `${namespace}-faq-item`,
  "faq-question": `${namespace}-faq-question`,
  "faq-answer": `${namespace}-faq-answer`,
  "faq-icon": `${namespace}-faq-icon`,
  
  // CTA - classes exatas do template
  "cta-section": `${namespace}-cta-section`,
  "cta-content": `${namespace}-cta-content`,
  
  // Footer - classes exatas do template
  "footer": `${namespace}-footer`,
  "footer-grid": `${namespace}-footer-grid`,
  "footer-info": `${namespace}-footer-info`,
  "footer-links": `${namespace}-footer-links`,
  "footer-social": `${namespace}-footer-social`,
  
  // Buttons - classes exatas do template
  "button": `${namespace}-button`,
  "button-primary": `${namespace}-button-primary`,
  "button-secondary": `${namespace}-button-secondary`
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

// CSS SelFlux idêntico ao template original com namespace
const generateSelFluxCSS = (namespace: string): string => {
  return `
    /* Variáveis CSS para o namespace ${namespace} */
    .${namespace}-root {
      --primary: #0a84ff;
      --text: #0b1220;
      --muted: #3b4556;
      --bg: #f5f7fb;
      --white: #fff;
    }

    /* Reset e base */
    .${namespace}-root * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .${namespace}-root {
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--text);
      background: var(--bg);
    }

    /* Container */
    .${namespace}-container {
      width: min(100%, 1200px);
      margin: 0 auto;
      padding: 0 16px;
    }

    /* Header */
    .${namespace}-header-menu {
      background: var(--white);
      border-bottom: 1px solid #eef2f7;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .${namespace}-header-menu-container {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .${namespace}-logo-img {
      height: 40px;
      width: auto;
    }

    .${namespace}-header-menu nav {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .${namespace}-header-menu nav a {
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      color: #555;
      font-weight: 600;
      text-decoration: none;
    }

    .${namespace}-header-menu nav a:hover {
      background: #f1f5f9;
      color: #111;
    }

    /* Banner principal */
    .${namespace}-main-banner {
      background: var(--white);
      padding: 3rem 0 2rem;
    }

    .${namespace}-banner-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .${namespace}-banner-text p:first-child {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: var(--primary);
      margin-bottom: 0.5rem;
    }

    .${namespace}-banner-text h1 {
      font-size: 2.2rem;
      margin: 0.25rem 0 0.75rem;
      color: var(--text);
      line-height: 1.2;
    }

    .${namespace}-banner-text p:nth-child(3) {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .${namespace}-banner-images {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .${namespace}-banner-images img {
      border-radius: 0.75rem;
      max-width: 100%;
      height: auto;
      display: block;
    }

    /* Buttons */
    .${namespace}-button {
      display: inline-block;
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      margin: 0 0.25rem;
    }

    .${namespace}-button-primary {
      background: var(--primary);
      color: #fff;
    }

    .${namespace}-button-secondary {
      background: #e9ecef;
      color: #111;
    }

    /* Control/Solutions section */
    .${namespace}-control-section {
      padding: 2.5rem 0;
    }

    .${namespace}-control-section h2 {
      text-align: center;
      margin: 0 0 1.5rem;
      font-size: 1.9rem;
      color: var(--text);
    }

    .${namespace}-control-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .${namespace}-control-item {
      background: var(--white);
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.07);
    }

    .${namespace}-control-item-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
    }

    .${namespace}-control-item-text {
      padding: 1.25rem;
    }

    .${namespace}-control-item-text p {
      color: var(--muted);
      font-weight: 500;
    }

    /* Service/Advisory section */
    .${namespace}-personalized-service {
      padding: 2.5rem 0;
    }

    .${namespace}-service-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      align-items: center;
    }

    .${namespace}-service-text h2 {
      text-align: left;
      margin-bottom: 0.5rem;
      font-size: 1.9rem;
      color: var(--text);
    }

    .${namespace}-service-text p {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .${namespace}-service-image {
      border-radius: 1rem;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.09);
      max-width: 100%;
      height: auto;
      display: block;
    }

    /* FAQ */
    .${namespace}-faq-section {
      padding: 2.5rem 0;
    }

    .${namespace}-faq-section h2 {
      text-align: center;
      margin-bottom: 1rem;
      font-size: 1.9rem;
      color: var(--text);
    }

    .${namespace}-faq-accordion {
      display: grid;
      gap: 0.75rem;
    }

    .${namespace}-faq-item {
      background: var(--white);
      border: 1px solid #eef2f7;
      border-radius: 0.75rem;
      overflow: hidden;
    }

    .${namespace}-faq-question {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
    }

    .${namespace}-faq-answer {
      display: none;
      padding: 0 1rem 1rem;
      color: #555;
      line-height: 1.6;
    }

    .${namespace}-faq-item.active .${namespace}-faq-answer {
      display: block;
    }

    .${namespace}-faq-icon {
      font-size: 1.25rem;
      transform: rotate(180deg);
      transition: 0.2s;
    }

    .${namespace}-faq-item.active .${namespace}-faq-icon {
      transform: rotate(0deg);
    }

    /* CTA final */
    .${namespace}-cta-section {
      padding: 2.5rem 0;
      text-align: center;
      background: var(--white);
    }

    .${namespace}-cta-content h2 {
      margin-bottom: 0.5rem;
      font-size: 1.9rem;
      color: var(--text);
    }

    .${namespace}-cta-content p {
      color: var(--muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    /* Footer */
    .${namespace}-footer {
      background: #0b1220;
      color: #d0d8e0;
      padding: 2rem 0;
    }

    .${namespace}-footer-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .${namespace}-footer-links ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .${namespace}-footer-links li {
      margin: 0.5rem 0;
    }

    .${namespace}-footer a {
      color: #d0d8e0;
      text-decoration: none;
    }

    .${namespace}-footer-social a {
      margin-right: 0.5rem;
      display: inline-block;
      color: #d0d8e0;
      transition: color 0.2s;
    }

    .${namespace}-footer-social a:hover {
      color: #fff;
    }

    /* Media queries */
    @media (min-width: 768px) {
      .${namespace}-banner-content {
        flex-direction: row;
        align-items: center;
      }

      .${namespace}-control-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .${namespace}-service-content {
        grid-template-columns: 1.2fr 0.8fr;
      }

      .${namespace}-footer-grid {
        grid-template-columns: repeat(3, 1fr);
      }
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
    document.addEventListener('DOMContentLoaded', () => {
      const faqQuestions = document.querySelectorAll('.${config.namespace}-root .${config.namespace}-faq-question');
      faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
          const faqItem = question.closest('.${config.namespace}-faq-item');
          faqItem.classList.toggle('active');
        });
      });
    });
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