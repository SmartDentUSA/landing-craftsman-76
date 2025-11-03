import { supabase } from '@/integrations/supabase/client';

export interface TrackingConfig {
  tracking_pixels?: {
    meta_pixel: { enabled: boolean; pixel_id: string | null; note?: string };
    google_analytics: { enabled: boolean; measurement_id: string | null; note?: string };
    google_tag_manager: { enabled: boolean; container_id: string | null; note?: string };
    tiktok_pixel: { enabled: boolean; pixel_id: string | null; note?: string };
  };
  seo_domains?: Array<{
    name: string;
    domain: string;
    description: string;
    enabled: boolean;
    use_in_seo: boolean;
    use_in_schema: boolean;
    use_in_footer: boolean;
    priority: number;
  }>;
}

// Buscar configurações do banco
export async function getTrackingConfig(): Promise<TrackingConfig | null> {
  try {
    const { data, error } = await supabase
      .from('company_profile')
      .select('tracking_pixels, seo_domains')
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading tracking config:', error);
      return null;
    }

    return data as TrackingConfig;
  } catch (error) {
    console.error('❌ Error in getTrackingConfig:', error);
    return null;
  }
}

// Injetar pixels no <head>
export function injectTrackingPixels(config: TrackingConfig | null): string {
  if (!config?.tracking_pixels) {
    console.log('⚠️ Nenhuma configuração de tracking - HTML puro');
    return '';
  }

  let snippets = '';
  const pixels = config.tracking_pixels;

  // 1. Google Tag Manager (SEMPRE PRIMEIRO)
  if (pixels.google_tag_manager?.enabled && pixels.google_tag_manager.container_id) {
    console.log('✅ Injetando GTM:', pixels.google_tag_manager.container_id);
    snippets += `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${pixels.google_tag_manager.container_id}');</script>
<!-- End Google Tag Manager -->`;
  } else {
    console.log('⚪ GTM desabilitado ou ID ausente');
  }

  // 2. Google Analytics 4
  if (pixels.google_analytics?.enabled && pixels.google_analytics.measurement_id) {
    console.log('✅ Injetando GA4:', pixels.google_analytics.measurement_id);
    
    // Configurar cross-domain se houver domínios habilitados
    const crossDomains = (config.seo_domains || [])
      .filter(d => d.enabled)
      .map(d => d.domain);
    
    snippets += `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${pixels.google_analytics.measurement_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${pixels.google_analytics.measurement_id}'${
    crossDomains.length > 0 
      ? `, {
    'linker': {
      'domains': ${JSON.stringify(crossDomains)}
    }
  }`
      : ''
  });
</script>`;
  } else {
    console.log('⚪ GA4 desabilitado ou ID ausente');
  }

  // 3. Meta Pixel
  if (pixels.meta_pixel?.enabled && pixels.meta_pixel.pixel_id) {
    console.log('✅ Injetando Meta Pixel:', pixels.meta_pixel.pixel_id);
    snippets += `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixels.meta_pixel.pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixels.meta_pixel.pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`;
  } else {
    console.log('⚪ Meta Pixel desabilitado ou ID ausente');
  }

  // 4. TikTok Pixel
  if (pixels.tiktok_pixel?.enabled && pixels.tiktok_pixel.pixel_id) {
    console.log('✅ Injetando TikTok Pixel:', pixels.tiktok_pixel.pixel_id);
    snippets += `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${pixels.tiktok_pixel.pixel_id}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`;
  } else {
    console.log('⚪ TikTok Pixel desabilitado ou ID ausente');
  }

  if (snippets === '') {
    console.log('✅ Nenhum pixel habilitado - HTML 100% puro');
  }

  return snippets;
}

// Injetar GTM noscript no <body>
export function injectGTMNoScript(config: TrackingConfig | null): string {
  if (!config?.tracking_pixels?.google_tag_manager?.enabled ||
      !config.tracking_pixels.google_tag_manager.container_id) {
    return '';
  }

  return `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${config.tracking_pixels.google_tag_manager.container_id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

// Gerar meta tags SEO para domínios
export function generateSEODomainTags(config: TrackingConfig | null): string {
  if (!config?.seo_domains) return '';

  const seoEnabled = config.seo_domains
    .filter(d => d.enabled && d.use_in_seo)
    .sort((a, b) => a.priority - b.priority);

  if (seoEnabled.length === 0) {
    console.log('⚪ Nenhum domínio SEO habilitado');
    return '';
  }

  console.log(`✅ Gerando meta tags para ${seoEnabled.length} domínios SEO`);

  return seoEnabled.map(d => 
    `<link rel="alternate" hreflang="pt-br" href="https://${d.domain}" />`
  ).join('\n  ');
}

// Gerar sameAs para Schema.org
export function generateSchemaSameAs(config: TrackingConfig | null): string[] {
  if (!config?.seo_domains) return [];

  const schemaEnabled = config.seo_domains
    .filter(d => d.enabled && d.use_in_schema)
    .sort((a, b) => a.priority - b.priority);

  if (schemaEnabled.length === 0) {
    console.log('⚪ Nenhum domínio Schema habilitado');
    return [];
  }

  console.log(`✅ Gerando sameAs para ${schemaEnabled.length} domínios`);

  return schemaEnabled.map(d => `https://${d.domain}`);
}

// Gerar rodapé com links de domínios
export function generateFooterLinks(config: TrackingConfig | null): string {
  if (!config?.seo_domains) return '';

  const footerEnabled = config.seo_domains
    .filter(d => d.enabled && d.use_in_footer)
    .sort((a, b) => a.priority - b.priority);

  if (footerEnabled.length === 0) {
    console.log('⚪ Nenhum domínio no rodapé');
    return '';
  }

  console.log(`✅ Gerando rodapé com ${footerEnabled.length} domínios`);

  return `
  <footer class="multi-domain-footer" style="background: #f8f9fa; padding: 30px; margin-top: 40px; border-top: 3px solid #007cba;">
    <h3 style="color: #2c3e50; margin-bottom: 15px;">🌐 Nossos Sites:</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${footerEnabled.map(d => `
        <li style="margin: 10px 0;">
          <a href="https://${d.domain}" 
             title="${d.description}" 
             style="color: #007cba; text-decoration: none; font-weight: bold; display: block;">
            ${d.name}
          </a>
          <small style="color: #6c757d; display: block; margin-top: 3px;">${d.description}</small>
        </li>
      `).join('')}
    </ul>
  </footer>`;
}

/**
 * ✅ FASE 4: Gera footer HTML compacto com links para domínios SEO habilitados
 * Usado para integração em HTML gerado (landing pages, blogs, etc.)
 */
export function generateSEODomainsFooter(config: TrackingConfig | null): string {
  if (!config?.seo_domains || !Array.isArray(config.seo_domains)) {
    return '';
  }
  
  const footerDomains = config.seo_domains
    .filter(d => d.enabled && d.use_in_footer)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  
  if (footerDomains.length === 0) {
    return '';
  }
  
  const linksHtml = footerDomains
    .map(d => `<a href="https://${d.domain}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none; font-size: 0.875rem;">${d.name}</a>`)
    .join(' | ');
  
  console.log(`✅ FASE 4: Footer SEO gerado com ${footerDomains.length} domínios`);
  
  return `
    <div class="seo-domains-footer" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; font-weight: 500;">
        Nossos Sites:
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
        ${linksHtml}
      </div>
    </div>
  `;
}
