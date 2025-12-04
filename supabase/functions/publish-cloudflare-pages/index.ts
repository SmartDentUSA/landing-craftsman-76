import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Calculate SHA-256 hash of content (required by Cloudflare Pages Direct Upload API)
async function calculateSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
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
      .single();

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

    // 5. Inject tracking pixels into HTML
    const trackingPixels: TrackingPixels = domainConfig.tracking_pixels || {};
    let htmlContent = lp.transformed_html;
    
    // Count active pixels for logging
    const activePixels = [
      trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager.container_id ? 'GTM' : null,
      trackingPixels.meta_pixel?.enabled && trackingPixels.meta_pixel.pixel_id ? 'Meta' : null,
      trackingPixels.tiktok_pixel?.enabled && trackingPixels.tiktok_pixel.pixel_id ? 'TikTok' : null,
      trackingPixels.google_analytics?.enabled && trackingPixels.google_analytics.measurement_id ? 'GA4' : null,
    ].filter(Boolean);

    if (activePixels.length > 0) {
      console.log(`[publish-cloudflare-pages] Injecting tracking pixels: ${activePixels.join(', ')}`);
      htmlContent = injectTrackingScripts(htmlContent, trackingPixels);
    } else {
      console.log(`[publish-cloudflare-pages] No tracking pixels configured for domain`);
    }

    // 6. Prepare file path
    const filePath = isHomepage || pagePath === '/' ? '/index.html' : `/${pagePath.replace(/^\//, '')}/index.html`;

    // ============================================
    // CLOUDFLARE PAGES DIRECT UPLOAD - 3 STEP PROCESS
    // ============================================

    // STEP 1: Calculate SHA-256 hash of the content
    const contentHash = await calculateSHA256(htmlContent);
    console.log(`[publish-cloudflare-pages] Content hash calculated:`, { 
      filePath, 
      hash: contentHash,
      contentLength: htmlContent.length 
    });

    // STEP 2: Create deployment with manifest (file path → hash mapping)
    const manifest = {
      [filePath]: contentHash
    };

    console.log(`[publish-cloudflare-pages] Creating deployment with manifest:`, manifest);

    const createDeploymentResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ manifest })
      }
    );

    const createDeploymentData = await createDeploymentResponse.json();
    console.log(`[publish-cloudflare-pages] Create deployment response:`, {
      status: createDeploymentResponse.status,
      success: createDeploymentData.success,
      errors: createDeploymentData.errors,
      hasResult: !!createDeploymentData.result
    });

    if (!createDeploymentResponse.ok || !createDeploymentData.success) {
      console.error('[publish-cloudflare-pages] Failed to create deployment:', createDeploymentData);
      
      await supabase
        .from('cloned_landing_pages')
        .update({ 
          publish_status: 'error',
          publish_error_message: createDeploymentData.errors?.[0]?.message || 'Falha ao criar deployment'
        })
        .eq('id', lpId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: createDeploymentData.errors?.[0]?.message || 'Falha ao criar deployment no Cloudflare' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const deployment = createDeploymentData.result;
    const missingHashes = deployment.required_files || [];

    console.log(`[publish-cloudflare-pages] Deployment created:`, {
      deploymentId: deployment.id,
      missingHashes: missingHashes.length,
      hashes: missingHashes
    });

    // STEP 3: Upload missing files if any
    if (missingHashes.length > 0 && missingHashes.includes(contentHash)) {
      console.log(`[publish-cloudflare-pages] Uploading missing file with hash: ${contentHash}`);

      // Upload file content as binary
      const encoder = new TextEncoder();
      const contentBytes = encoder.encode(htmlContent);

      const uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments/${deployment.id}/files/${contentHash}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/octet-stream',
          },
          body: contentBytes
        }
      );

      const uploadData = await uploadResponse.json();
      console.log(`[publish-cloudflare-pages] File upload response:`, {
        status: uploadResponse.status,
        success: uploadData.success,
        errors: uploadData.errors
      });

      if (!uploadResponse.ok || !uploadData.success) {
        console.error('[publish-cloudflare-pages] Failed to upload file:', uploadData);
        
        await supabase
          .from('cloned_landing_pages')
          .update({ 
            publish_status: 'error',
            publish_error_message: uploadData.errors?.[0]?.message || 'Falha ao fazer upload do arquivo'
          })
          .eq('id', lpId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: uploadData.errors?.[0]?.message || 'Falha ao fazer upload do arquivo' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`[publish-cloudflare-pages] File uploaded successfully`);
    } else {
      console.log(`[publish-cloudflare-pages] No missing files to upload (content already exists in Cloudflare)`);
    }

    // Wait a moment for deployment to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch deployment status to get the URL
    const statusResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments/${deployment.id}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        }
      }
    );

    const statusData = await statusResponse.json();
    const finalDeployment = statusData.result || deployment;

    const publishedUrl = isHomepage || pagePath === '/' 
      ? `https://${domain}`
      : `https://${domain}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`;

    console.log(`[publish-cloudflare-pages] Deploy successful:`, {
      deploymentId: finalDeployment.id,
      url: finalDeployment.url,
      publishedUrl,
      injectedPixels: activePixels,
      stage: finalDeployment.latest_stage
    });

    // 8. Update LP with success
    const deploymentRecord = {
      id: finalDeployment.id,
      url: finalDeployment.url,
      created_at: new Date().toISOString(),
      page_path: pagePath || '/',
      is_homepage: isHomepage,
      injected_pixels: activePixels,
      content_hash: contentHash
    };

    const existingHistory = (lp.deployment_history || []) as any[];
    
    await supabase
      .from('cloned_landing_pages')
      .update({ 
        publish_status: 'success',
        published_url: publishedUrl,
        cloudflare_deployment_id: finalDeployment.id,
        publish_error_message: null,
        deployment_history: [...existingHistory, deploymentRecord],
        status: 'published'
      })
      .eq('id', lpId);

    return new Response(
      JSON.stringify({
        success: true,
        deployment: {
          id: finalDeployment.id,
          url: finalDeployment.url,
          publishedUrl,
          projectName,
          domain,
          pagePath: pagePath || '/',
          isHomepage,
          injectedPixels: activePixels,
          contentHash
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[publish-cloudflare-pages] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
