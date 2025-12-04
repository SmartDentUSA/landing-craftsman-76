/**
 * 🎯 TRACKING PIXELS INJECTOR
 * Helper centralizado para injeção de GTM, GA4, Meta Pixel e TikTok Pixel
 * nas Landing Pages SPIN e LP Clone
 */

export interface TrackingPixels {
  google_tag_manager?: {
    enabled: boolean;
    container_id: string | null;
    note?: string;
  };
  google_analytics?: {
    enabled: boolean;
    measurement_id: string | null;
    note?: string;
  };
  meta_pixel?: {
    enabled: boolean;
    pixel_id: string | null;
    note?: string;
  };
  tiktok_pixel?: {
    enabled: boolean;
    pixel_id: string | null;
    note?: string;
  };
}

export interface TrackingInjectionOptions {
  preview?: boolean;
  includeGTMNoScript?: boolean;
}

/**
 * Gera o código de tracking para inserir no <head>
 * Inclui GTM (script), GA4, Meta Pixel e TikTok Pixel
 */
export function generateTrackingHeadScripts(
  trackingPixels: TrackingPixels | null | undefined,
  options: TrackingInjectionOptions = {}
): string {
  const { preview = false } = options;
  
  // Em modo preview, não injetamos tracking
  if (preview || !trackingPixels) {
    return '';
  }

  const scripts: string[] = [];

  // 1. Google Tag Manager (HEAD)
  if (trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager?.container_id) {
    const gtmId = trackingPixels.google_tag_manager.container_id;
    scripts.push(`
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${gtmId}');</script>
  <!-- End Google Tag Manager -->`);
    
    console.log(`✅ [TRACKING] GTM injetado no <head>: ${gtmId}`);
  }

  // 2. Google Analytics 4 (apenas se GTM NÃO estiver ativo - evita duplicação)
  if (!trackingPixels.google_tag_manager?.enabled && 
      trackingPixels.google_analytics?.enabled && 
      trackingPixels.google_analytics?.measurement_id) {
    const gaId = trackingPixels.google_analytics.measurement_id;
    scripts.push(`
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  </script>
  <!-- End Google Analytics 4 -->`);
    
    console.log(`✅ [TRACKING] GA4 injetado no <head>: ${gaId}`);
  }

  // 3. Meta Pixel (Facebook)
  if (trackingPixels.meta_pixel?.enabled && trackingPixels.meta_pixel?.pixel_id) {
    const pixelId = trackingPixels.meta_pixel.pixel_id;
    scripts.push(`
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
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>
  <!-- End Meta Pixel Code -->`);
    
    console.log(`✅ [TRACKING] Meta Pixel injetado no <head>: ${pixelId}`);
  }

  // 4. TikTok Pixel
  if (trackingPixels.tiktok_pixel?.enabled && trackingPixels.tiktok_pixel?.pixel_id) {
    const pixelId = trackingPixels.tiktok_pixel.pixel_id;
    scripts.push(`
  <!-- TikTok Pixel Code -->
  <script>
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  </script>
  <!-- End TikTok Pixel Code -->`);
    
    console.log(`✅ [TRACKING] TikTok Pixel injetado no <head>: ${pixelId}`);
  }

  return scripts.join('\n');
}

/**
 * Gera o noscript do GTM para inserir logo após <body>
 */
export function generateGTMNoScript(
  trackingPixels: TrackingPixels | null | undefined,
  options: TrackingInjectionOptions = {}
): string {
  const { preview = false } = options;
  
  if (preview || !trackingPixels) {
    return '';
  }

  if (trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager?.container_id) {
    const gtmId = trackingPixels.google_tag_manager.container_id;
    console.log(`✅ [TRACKING] GTM noscript injetado no <body>: ${gtmId}`);
    return `
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->`;
  }

  return '';
}

/**
 * Injeta tracking pixels em um HTML completo
 * Útil para LP Clone que precisa modificar HTML existente
 */
export function injectTrackingIntoHTML(
  html: string,
  trackingPixels: TrackingPixels | null | undefined,
  options: TrackingInjectionOptions = {}
): string {
  if (!trackingPixels || options.preview) {
    return html;
  }

  let result = html;

  // Gerar scripts
  const headScripts = generateTrackingHeadScripts(trackingPixels, options);
  const bodyNoscript = generateGTMNoScript(trackingPixels, options);

  // Injetar no <head> (antes de </head>)
  if (headScripts) {
    // Tentar inserir antes do </head>
    if (result.includes('</head>')) {
      result = result.replace('</head>', `${headScripts}\n</head>`);
    } else if (result.includes('</HEAD>')) {
      result = result.replace('</HEAD>', `${headScripts}\n</HEAD>`);
    }
  }

  // Injetar noscript após <body>
  if (bodyNoscript) {
    // Tentar inserir depois da tag <body> (qualquer variante)
    const bodyMatch = result.match(/<body[^>]*>/i);
    if (bodyMatch) {
      result = result.replace(bodyMatch[0], `${bodyMatch[0]}\n${bodyNoscript}`);
    }
  }

  return result;
}

/**
 * Verifica se tracking pixels estão configurados
 */
export function hasTrackingConfigured(trackingPixels: TrackingPixels | null | undefined): boolean {
  if (!trackingPixels) return false;
  
  return !!(
    (trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager?.container_id) ||
    (trackingPixels.google_analytics?.enabled && trackingPixels.google_analytics?.measurement_id) ||
    (trackingPixels.meta_pixel?.enabled && trackingPixels.meta_pixel?.pixel_id) ||
    (trackingPixels.tiktok_pixel?.enabled && trackingPixels.tiktok_pixel?.pixel_id)
  );
}

/**
 * Retorna resumo dos tracking pixels configurados
 */
export function getTrackingSummary(trackingPixels: TrackingPixels | null | undefined): string[] {
  const configured: string[] = [];
  
  if (!trackingPixels) return configured;
  
  if (trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager?.container_id) {
    configured.push(`GTM: ${trackingPixels.google_tag_manager.container_id}`);
  }
  if (trackingPixels.google_analytics?.enabled && trackingPixels.google_analytics?.measurement_id) {
    configured.push(`GA4: ${trackingPixels.google_analytics.measurement_id}`);
  }
  if (trackingPixels.meta_pixel?.enabled && trackingPixels.meta_pixel?.pixel_id) {
    configured.push(`Meta: ${trackingPixels.meta_pixel.pixel_id}`);
  }
  if (trackingPixels.tiktok_pixel?.enabled && trackingPixels.tiktok_pixel?.pixel_id) {
    configured.push(`TikTok: ${trackingPixels.tiktok_pixel.pixel_id}`);
  }
  
  return configured;
}
