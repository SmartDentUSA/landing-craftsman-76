import { generateHTML as originalGenerateHTML, generateEmailHTML as originalGenerateEmailHTML } from './template-engine';
import * as Mustache from 'mustache';

// Mapeamento de ícones SVG para redes sociais
const SOCIAL_ICONS: Record<string, string> = {
  instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="m16 11.37A4 4 0 1 1 12.06 8H12a4 4 0 1 1 4 4z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
  twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>',
  linkedin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>',
  tiktok: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>',
  website: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>'
};

// Configuração para SelFlux-safe build
interface EmbedConfig {
  mode: 'default' | 'selflux';
  namespace: string;
  accountHash?: string;
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
  "button-secondary": `${namespace}-button-secondary`,
  
  // Estado ativo - classe exata do template
  "active": `${namespace}-active`
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
  
  console.log('🔍 HTML ANTES da renomeação (primeiros 1000 chars):', html.substring(0, 1000));
  console.log('🔍 Mapeamento de classes:', Object.keys(classMap).slice(0, 10));
  
  // Ordenar classes por tamanho decrescente para evitar conflitos de substring
  const sortedEntries = Object.entries(classMap).sort(([a], [b]) => b.length - a.length);
  
  for (const [from, to] of sortedEntries) {
    const beforeLength = processedHtml.length;
    
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
    
    const afterLength = processedHtml.length;
    if (afterLength !== beforeLength) {
      console.log(`🔄 Classe '${from}' → '${to}' substituída (delta: ${afterLength - beforeLength})`);
    }
  }
  
  console.log('🔍 HTML DEPOIS da renomeação (primeiros 1000 chars):', processedHtml.substring(0, 1000));
  
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

// CSS SelFlux IDÊNTICO ao template original com namespace
const generateSelFluxCSS = (namespace: string): string => {
  return `
    /* Variáveis CSS EXATAS do template original */
    .${namespace}-root {
      --primary-color: #007bff;
      --secondary-color: #6c757d;
      --text-color: #333;
      --background-color: #f8f9fa;
      --white: #fff;
    }

    /* Reset e base IDÊNTICOS ao template */
    .${namespace}-root * {
      box-sizing: border-box;
    }

    .${namespace}-root {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      color: var(--text-color);
      background: var(--background-color);
    }

    .${namespace}-root a {
      text-decoration: none;
      color: inherit;
    }

    .${namespace}-root img {
      max-width: 100%;
      display: block;
    }

    /* Container EXATO do template original */
    .${namespace}-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    /* Header EXATO do template original */
    .${namespace}-header-menu {
      background: var(--white);
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 1px solid #eee;
    }

    .${namespace}-header-menu-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
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
      padding: .5rem .75rem;
      border-radius: .5rem;
      color: #555;
      font-weight: 500;
    }

    .${namespace}-header-menu nav a:hover {
      background: #f1f5f9;
      color: #111;
    }

    /* Banner principal EXATO do template original */
    .${namespace}-main-banner {
      background: var(--white);
      padding: 3rem 0 2rem;
    }

    .${namespace}-banner-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .${namespace}-banner-text p {
      margin: 0.25rem 0 0.75rem;
    }

    .${namespace}-banner-text h1 {
      font-size: 2rem;
      margin: 0 0 .5rem;
    }

    .${namespace}-banner-images {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .75rem;
    }

    /* Buttons EXATOS do template original */
    .${namespace}-button {
      display: inline-block;
      padding: .75rem 1rem;
      border-radius: .75rem;
      font-weight: 600;
      margin-right: .5rem;
    }

    .${namespace}-button-primary {
      background: var(--primary-color);
      color: #fff;
    }

    .${namespace}-button-secondary {
      background: #e9ecef;
      color: #111;
    }

    /* Seção soluções / controle EXATA do template original */
    .${namespace}-control-section {
      padding: 2.5rem 0;
    }

    .${namespace}-control-section h2 {
      text-align: center;
      margin-bottom: 1.5rem;
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
      box-shadow: 0 4px 6px rgba(0,0,0,.08);
      display: grid;
      grid-template-columns: 1fr;
    }

    .${namespace}-control-item-text {
      padding: 1.25rem;
      font-weight: 500;
    }

    .${namespace}-image-container {
      width: 100%;
      height: 220px;
      overflow: hidden;
    }

    .${namespace}-control-item-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Consultoria EXATA do template original */
    .${namespace}-personalized-service {
      background: var(--white);
      padding: 2.5rem 0;
    }

    .${namespace}-service-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      align-items: center;
    }

    .${namespace}-service-image {
      border-radius: 1rem;
      box-shadow: 0 8px 16px rgba(0,0,0,.1);
    }

    /* FAQ EXATO do template original */
    .${namespace}-faq-section {
      padding: 2.5rem 0;
    }

    .${namespace}-faq-section h2 {
      text-align: center;
      margin-bottom: 1rem;
    }

    .${namespace}-faq-accordion {
      display: grid;
      gap: .75rem;
    }

    .${namespace}-faq-item {
      background: var(--white);
      border-radius: .75rem;
      overflow: hidden;
      border: 1px solid #eee;
    }

    .${namespace}-faq-question {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .${namespace}-faq-answer {
      display: none;
      padding: 0 1rem 1rem;
      color: #555;
    }

    .${namespace}-faq-item.${namespace}-active .${namespace}-faq-answer {
      display: block;
    }

    .${namespace}-faq-icon {
      font-size: 1.25rem;
      transform: rotate(180deg);
      transition: .2s;
    }

    .${namespace}-faq-item.${namespace}-active .${namespace}-faq-icon {
      transform: rotate(0deg);
    }

    /* CTA final EXATO do template original */
    .${namespace}-cta-section {
      padding: 2.5rem 0;
      text-align: center;
      background: var(--white);
    }

    .${namespace}-cta-content a {
      margin: 0 .25rem;
    }

    /* Footer EXATO do template original */
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
      margin: .5rem 0;
    }

    .${namespace}-footer-links a {
      color: #d0d8e0;
    }

    .${namespace}-footer-social a {
      margin-right: .5rem;
      display: inline-block;
      color: #d0d8e0;
      transition: color 0.2s;
    }

    .${namespace}-footer-social a:hover {
      color: #fff;
    }

    /* Media queries EXATOS do template original */
    @media (min-width: 768px) {
      .${namespace}-banner-content {
        flex-direction: row;
        align-items: center;
      }

      .${namespace}-banner-text {
        flex: 1;
        padding-right: 2rem;
      }

      .${namespace}-banner-images {
        flex: 1;
        grid-template-columns: repeat(3, 1fr);
      }

      .${namespace}-control-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .${namespace}-image-container {
        height: 100%;
      }

      .${namespace}-footer-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (min-width: 992px) {
      .${namespace}-service-content {
        grid-template-columns: 1.2fr .8fr;
      }
    }
  `;
};

// Template SelFlux otimizado baseado no código do usuário
const OPTIMIZED_SELFLUX_TEMPLATE = `
<div id="lpcontent">
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --card-bg: #f8f9fa;
            --yellow: #ffc107;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Poppins', sans-serif;
            color: var(--text-color);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }

        /* Cabeçalho com links */
        .header-menu {
            display: none;
            background-color: var(--white);
            padding: 1rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .header-menu-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header-menu a {
            text-decoration: none;
            color: var(--text-color);
            font-weight: 500;
            margin: 0 10px;
            transition: color 0.3s ease;
        }

        .header-menu a:hover {
            color: var(--primary-color);
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .logo-img {
            max-height: 40px; 
            width: auto;
        }

        @media (min-width: 768px) {
            .header-menu {
                display: block;
            }
        }

        /* Bloco 1: Banner Principal */
        .main-banner {
            background-color: var(--white);
            padding: 4rem 0 2rem;
        }

        .banner-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .banner-text {
            padding: 2rem 0;
        }

        .banner-text p {
            font-size: 1rem;
            color: var(--secondary-color);
            margin-bottom: 1.5rem;
        }

        .button {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 600;
            transition: background-color 0.3s ease;
        }

        .button-primary {
            background-color: var(--primary-color);
            color: var(--white);
            border: 1px solid var(--primary-color);
        }

        .button-secondary {
            background-color: transparent;
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
            margin-left: 1rem;
        }

        .banner-images {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 2rem;
        }

        .banner-images img {
            width: 100%;
            max-width: 200px;
            border-radius: 8px;
            object-fit: cover;
        }

        @media (min-width: 768px) {
            .banner-content {
                flex-direction: row;
                text-align: left;
                align-items: center;
            }

            .banner-text {
                flex: 1;
                padding-right: 2rem;
            }

            .banner-text h1 {
                font-size: 3.5rem;
            }

            .banner-images {
                flex: 1;
                justify-content: flex-end;
            }
        }

        /* Bloco 2: Controle de vendas */
        .sales-control {
            background-color: var(--background-color);
            padding: 4rem 0;
        }

        .sales-control h2 {
            font-size: 2rem;
            text-align: center;
            margin-bottom: 3rem;
            font-weight: 600;
        }

        .control-grid {
            display: grid;
            gap: 1.5rem;
        }

        .control-item {
            background-color: var(--white);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .control-item-text {
            padding: 1.5rem;
            font-size: 1rem;
            font-weight: 500;
        }

        .control-item-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .image-container {
            width: 100%;
            height: 200px;
            overflow: hidden;
        }

        @media (min-width: 768px) {
            .control-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            .control-item-image.full-height {
                height: 100%;
            }
        }

        .control-item-side {
            display: flex;
            flex-direction: row;
            align-items: center;
        }

        .control-item-side .image-container {
            flex: 1;
            height: auto;
        }
        .control-item-side .control-item-text {
            flex: 1;
        }

        /* Bloco 3: Atendimento Personalizado */
        .personalized-service {
            background-color: #000;
            color: var(--white);
            padding: 4rem 0;
        }

        .service-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }

        .service-text {
            padding: 2rem 0;
        }

        .service-text h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }

        .service-text p {
            font-size: 1rem;
            color: rgba(255,255,255,0.7);
            margin-bottom: 1.5rem;
        }

        .service-image {
            width: 100%;
            max-width: 600px;
            border-radius: 8px;
            object-fit: cover;
        }

        @media (min-width: 768px) {
            .service-content {
                flex-direction: row;
                align-items: center;
                text-align: left;
            }

            .service-text {
                flex: 1;
                padding-right: 2rem;
            }

            .service-image {
                flex: 1;
                height: auto;
            }
        }
        
        /* Seção de Perguntas Frequentes */
        .faq-section {
            padding: 4rem 0;
            text-align: center;
        }
        
        .faq-section h2 {
            font-size: 2rem;
            margin-bottom: 2rem;
            font-weight: 600;
        }
        
        .faq-item {
            border-bottom: 1px solid #ccc;
            text-align: left;
        }
        
        .faq-question {
            font-weight: 500;
            padding: 1.5rem 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .faq-question:hover {
            background-color: #f8f9fa;
        }

        .faq-question::after {
            content: '+';
            font-size: 1.5rem;
            font-weight: bold;
            transition: transform 0.3s ease;
        }

        .faq-question.active::after {
            transform: rotate(45deg);
        }
        
        .faq-answer {
            padding: 0 1rem 1.5rem;
            color: var(--secondary-color);
            display: none;
        }
        
        /* Seção CTA de Teste Grátis */
        .cta-section {
            background-color: var(--background-color);
            padding: 4rem 0;
            text-align: center;
        }
        
        .cta-content {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .cta-content h2 {
            font-size: 2rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        
        .cta-content p {
            font-size: 1.1rem;
            color: var(--secondary-color);
            margin-bottom: 2rem;
        }
        
        /* Rodapé */
        .footer {
            background-color: #1a1a1a;
            color: #ccc;
            padding: 4rem 0;
            font-size: 0.9rem;
        }
        
        .footer-grid {
            display: grid;
            gap: 2rem;
        }
        
        .footer-grid h3 {
            color: var(--white);
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }
        
        .footer-grid ul {
            list-style: none;
        }
        
        .footer-grid a {
            color: #ccc;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        
        .footer-grid a:hover {
            color: var(--primary-color);
        }
        
        .footer-social-icons {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .footer-social-icons img {
            width: 24px;
            height: 24px;
        }
        
        @media (min-width: 768px) {
            .footer-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }
    </style>

    {{#headerMenu.enabled}}
    <header class="header-menu">
        <div class="container header-menu-container">
            {{#logo.image}}
            <img class="logo-img" src="{{{logo.image}}}" alt="{{logo.alt}}">
            {{/logo.image}}
            {{^logo.image}}
            <div class="logo">{{logo.text}}</div>
            {{/logo.image}}
            <nav>
                {{#headerMenu.links}}
                <a href="{{{url}}}">{{text}}</a>
                {{/headerMenu.links}}
            </nav>
        </div>
    </header>
    {{/headerMenu.enabled}}

    <header class="main-banner">
        <div class="container banner-content">
            <div class="banner-text">
                {{#banner.subtitle}}
                <p>{{banner.subtitle}}</p>
                {{/banner.subtitle}}
                <h1>{{banner.title}}</h1>
                {{#banner.description}}
                <p>{{banner.description}}</p>
                {{/banner.description}}
                {{#banner.primaryButton}}
                <a href="{{{banner.primaryButton.url}}}" class="button button-primary">{{banner.primaryButton.text}}</a>
                {{/banner.primaryButton}}
                {{#banner.secondaryButton}}
                <a href="{{{banner.secondaryButton.url}}}" class="button button-secondary">{{banner.secondaryButton.text}}</a>
                {{/banner.secondaryButton}}
            </div>
            <div class="banner-images">
                {{#banner.images}}
                <img src="{{{src}}}" alt="{{alt}}">
                {{/banner.images}}
            </div>
        </div>
    </header>

    <section class="sales-control">
        <div class="container">
            <h2>{{solutions.title}}</h2>
            <div class="control-grid">
                {{#solutions.items}}
                <div class="control-item control-item-side">
                    <div class="control-item-text">
                        <p>{{description}}</p>
                    </div>
                    <div class="image-container">
                        <img src="{{{image}}}" alt="{{title}}" class="control-item-image full-height">
                    </div>
                </div>
                {{/solutions.items}}
            </div>
        </div>
    </section>

    <section class="personalized-service">
        <div class="container service-content">
            <div class="service-text">
                <h2>{{advisory.title}}</h2>
                <p>{{advisory.description}}</p>
                {{#advisory.button}}
                <a href="{{{advisory.button.url}}}" class="button button-primary">{{advisory.button.text}}</a>
                {{/advisory.button}}
            </div>
            <div class="service-image-container">
                <img src="{{{advisory.image}}}" alt="{{advisory.imageAlt}}" class="service-image">
            </div>
        </div>
    </section>
    
    <section class="faq-section">
        <div class="container">
            <h2>{{faq.title}}</h2>
            <div class="faq-accordion">
                {{#faq.items}}
                <div class="faq-item">
                    <div class="faq-question">
                        <span>{{question}}</span>
                    </div>
                    <div class="faq-answer">
                        <p>{{answer}}</p>
                    </div>
                </div>
                {{/faq.items}}
            </div>
        </div>
    </section>
    
    <section class="cta-section">
        <div class="container cta-content">
            <h2>{{cta.title}}</h2>
            {{#cta.description}}
            <p>{{cta.description}}</p>
            {{/cta.description}}
            {{#cta.primaryButton}}
            <a href="{{{cta.primaryButton.url}}}" class="button button-primary">{{cta.primaryButton.text}}</a>
            {{/cta.primaryButton}}
            {{#cta.secondaryButton}}
            <a href="{{{cta.secondaryButton.url}}}" class="button button-secondary">{{cta.secondaryButton.text}}</a>
            {{/cta.secondaryButton}}
        </div>
    </section>

    <footer class="footer">
        <div class="container footer-grid">
            <div class="footer-info">
                {{#footer.company}}
                <h3>{{footer.company.name}}</h3>
                <p>{{footer.company.address}}</p>
                {{#footer.company.secondAddress}}
                <br>
                <h3>{{footer.company.secondName}}</h3>
                <p>{{footer.company.secondAddress}}</p>
                {{/footer.company.secondAddress}}
                {{/footer.company}}
            </div>
            <div class="footer-links">
                <h3>{{footer.linksTitle}}</h3>
                <ul>
                    {{#footer.links}}
                    <li><a href="{{{url}}}">{{text}}</a></li>
                    {{/footer.links}}
                </ul>
            </div>
            <div class="footer-social">
                <h3>{{footer.socialTitle}}</h3>
                <div class="footer-social-icons">
                    {{#footer.socialLinks}}
                    <a href="{{{url}}}">
                        {{{socialIcons.[platform]}}}
                    </a>
                    {{/footer.socialLinks}}
                </div>
            </div>
        </div>
    </footer>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // FAQ Accordion functionality
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpen = answer.style.display === 'block';
                
                // Close all other FAQs
                faqItems.forEach(otherItem => {
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    const otherQuestion = otherItem.querySelector('.faq-question');
                    if (otherAnswer && otherQuestion && otherItem !== item) {
                        otherAnswer.style.display = 'none';
                        otherQuestion.classList.remove('active');
                    }
                });
                
                // Toggle current FAQ
                answer.style.display = isOpen ? 'none' : 'block';
                question.classList.toggle('active', !isOpen);
            });
        }
    });
});
</script>
`;

// Função principal para gerar HTML safe para SelFlux
export const generateSafeHTML = (data: any, embedConfig?: EmbedConfig): string => {
  const config = embedConfig || { mode: 'default', namespace: 'sd' };
  
  console.log('🎯 IMPLEMENTAÇÃO SELFLUX OTIMIZADA');
  console.log('🔧 Config:', config);
  
  // Resolver imagens primeiro
  const processedData = resolveImagesInData(data, config.accountHash);
  
  // Se não for modo SelFlux, retornar HTML normal
  if (config.mode !== 'selflux') {
    console.log('🔧 Modo não é selflux, retornando HTML original');
    return originalGenerateHTML(processedData);
  }
  
  console.log('🎯 MODO SELFLUX ATIVO - Template otimizado');
  
  // Usar template otimizado para SelFlux
  const html = Mustache.render(OPTIMIZED_SELFLUX_TEMPLATE, {
    ...processedData,
    socialIcons: SOCIAL_ICONS,
  });
  
  console.log('✅ HTML SelFlux otimizado gerado com sucesso');
  return html;
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