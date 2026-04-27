import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://esm.sh/hash-wasm@4.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  lpId: string;
  domain: string;
  pagePath: string;
  isHomepage: boolean;
}

interface TrackingPixels {
  google_tag_manager?: { enabled: boolean; container_id: string | null };
  meta_pixel?: { enabled: boolean; pixel_id: string | null };
  tiktok_pixel?: { enabled: boolean; pixel_id: string | null };
  google_analytics?: { enabled: boolean; measurement_id: string | null };
}

// Calculate BLAKE3 hash for Cloudflare Pages Direct Upload API
// Cloudflare uses BLAKE3 on the raw file content, truncated to 32 hex characters
async function calculateBlake3Hash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await blake3(data);
  // Cloudflare Pages uses first 32 characters of the BLAKE3 hash
  return hash.slice(0, 32);
}

// Convert string to base64
function stringToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateTrackingScripts(pixels: TrackingPixels): { headScripts: string; bodyScripts: string } {
  let headScripts = '';
  let bodyScripts = '';

  // Google Tag Manager (head + body)
  if (pixels.google_tag_manager?.enabled && pixels.google_tag_manager.container_id) {
    const gtmId = pixels.google_tag_manager.container_id;
    headScripts += `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->`;
    
    bodyScripts += `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
  }

  // Meta Pixel (head)
  if (pixels.meta_pixel?.enabled && pixels.meta_pixel.pixel_id) {
    const pixelId = pixels.meta_pixel.pixel_id;
    headScripts += `
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
<!-- End Meta Pixel Code -->`;
  }

  // TikTok Pixel (head)
  if (pixels.tiktok_pixel?.enabled && pixels.tiktok_pixel.pixel_id) {
    const pixelId = pixels.tiktok_pixel.pixel_id;
    headScripts += `
<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel Code -->`;
  }

  // Google Analytics 4 (head)
  if (pixels.google_analytics?.enabled && pixels.google_analytics.measurement_id) {
    const measurementId = pixels.google_analytics.measurement_id;
    headScripts += `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>
<!-- End Google Analytics 4 -->`;
  }

  return { headScripts, bodyScripts };
}

function injectTrackingScripts(html: string, pixels: TrackingPixels): string {
  const { headScripts, bodyScripts } = generateTrackingScripts(pixels);
  
  if (!headScripts && !bodyScripts) {
    return html;
  }

  let modifiedHtml = html;

  // Inject head scripts before </head>
  if (headScripts) {
    modifiedHtml = modifiedHtml.replace('</head>', `${headScripts}\n</head>`);
  }

  // Inject body scripts right after <body> or <body ...>
  if (bodyScripts) {
    modifiedHtml = modifiedHtml.replace(/<body([^>]*)>/i, `<body$1>${bodyScripts}`);
  }

  return modifiedHtml;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lpId, domain, pagePath, isHomepage } = await req.json() as PublishRequest;

    console.log(`[publish-cloudflare-pages] Starting publish:`, { lpId, domain, pagePath, isHomepage });

    // Validate required fields
    if (!lpId || !domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'lpId e domain são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get Cloudflare credentials
    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[publish-cloudflare-pages] Checking credentials:', {
      hasApiToken: !!CLOUDFLARE_API_TOKEN,
      hasAccountId: !!CLOUDFLARE_ACCOUNT_ID,
      apiTokenLength: CLOUDFLARE_API_TOKEN?.length || 0,
      accountIdLength: CLOUDFLARE_ACCOUNT_ID?.length || 0
    });

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      console.error('[publish-cloudflare-pages] Missing credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais Cloudflare não configuradas'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Get LP data
    const { data: lp, error: lpError } = await supabase
      .from('cloned_landing_pages')
      .select('*')
      .eq('id', lpId)
      .single();

    if (lpError || !lp) {
      console.error('[publish-cloudflare-pages] LP not found:', lpError);
      return new Response(
        JSON.stringify({ success: false, error: 'Landing Page não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!lp.transformed_html) {
      return new Response(
        JSON.stringify({ success: false, error: 'LP não possui HTML transformado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 2. Get domain config from company_profile
    const { data: companyProfile, error: profileError } = await supabase
      .from('company_profile')
      .select('seo_domains')
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error('[publish-cloudflare-pages] Profile error:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar configuração de domínios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const seoDomains = (companyProfile?.seo_domains || []) as any[];
    const domainConfig = seoDomains.find((d: any) => d.domain === domain);

    if (!domainConfig) {
      return new Response(
        JSON.stringify({ success: false, error: `Domínio "${domain}" não configurado` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!domainConfig.cloudflare_enabled || !domainConfig.cloudflare_project_name) {
      return new Response(
        JSON.stringify({ success: false, error: `Cloudflare não habilitado para "${domain}"` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const projectName = domainConfig.cloudflare_project_name;
    console.log(`[publish-cloudflare-pages] Using Cloudflare project: ${projectName}`);

    // 3. Update LP status to pending
    await supabase
      .from('cloned_landing_pages')
      .update({ 
        publish_status: 'pending',
        target_domain: domain,
        page_path: pagePath || '/',
        is_homepage: isHomepage || false
      })
      .eq('id', lpId);

    // 4. If setting as homepage, unset other homepages for this domain
    if (isHomepage) {
      await supabase
        .from('cloned_landing_pages')
        .update({ is_homepage: false })
        .eq('target_domain', domain)
        .eq('is_homepage', true)
        .neq('id', lpId);
    }

    // 5. Persist routing info on the LP so the bulk deployer picks it up.
    //    The actual Cloudflare deployment is delegated to
    //    `republish-domain-cloudflare-bulk`, which builds a SINGLE manifest
    //    containing every page that should remain online for this domain.
    //    Single-file manifests destroy previously deployed routes — see
    //    republish-domain-cloudflare-bulk/index.ts header for full rationale.
    const computedPath = isHomepage || pagePath === '/' || !pagePath
      ? '/'
      : (pagePath.startsWith('/') ? pagePath : '/' + pagePath);

    await supabase
      .from('cloned_landing_pages')
      .update({
        target_domain: domain,
        page_path: computedPath,
        is_homepage: !!isHomepage,
        publish_status: 'success',
        status: 'published',
        publish_error_message: null,
      })
      .eq('id', lpId);

    console.log(`[publish-cloudflare-pages] Delegating to bulk deployer for ${domain}`);
    const bulkResp = await fetch(
      `${SUPABASE_URL}/functions/v1/republish-domain-cloudflare-bulk`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      }
    );
    const bulkData = await bulkResp.json().catch(() => ({}));

    if (!bulkResp.ok || !bulkData?.success) {
      const errMsg = bulkData?.error || `Bulk deploy HTTP ${bulkResp.status}`;
      console.error('[publish-cloudflare-pages] Bulk deploy failed:', errMsg);
      await supabase
        .from('cloned_landing_pages')
        .update({
          publish_status: 'error',
          publish_error_message: errMsg,
        })
        .eq('id', lpId);
      return new Response(
        JSON.stringify({ success: false, error: errMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const publishedUrl = computedPath === '/'
      ? `https://${domain}`
      : `https://${domain}${computedPath}`;

    console.log(`[publish-cloudflare-pages] Bulk deploy OK:`, {
      deploymentId: bulkData.deploymentId,
      filesDeployed: bulkData.filesDeployed,
      publishedUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        deployment: {
          id: bulkData.deploymentId,
          url: bulkData.deploymentUrl,
          publishedUrl,
          projectName,
          domain,
          pagePath: computedPath,
          isHomepage: !!isHomepage,
          filesDeployed: bulkData.filesDeployed,
          mode: 'bulk-domain-snapshot',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-cloudflare-pages] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro inesperado ao publicar'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
