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

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: 'Credenciais Cloudflare não configuradas' }),
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

    // 5. Prepare file for upload
    const fileName = isHomepage || pagePath === '/' ? 'index.html' : `${pagePath.replace(/^\//, '')}/index.html`;
    const htmlContent = lp.transformed_html;

    // 6. Create deployment using Cloudflare Pages Direct Upload API
    // First, create the upload session
    const formData = new FormData();
    formData.append('manifest', JSON.stringify({
      [fileName]: { 
        content_type: 'text/html',
        size: new Blob([htmlContent]).size
      }
    }));

    // Upload the file
    const fileBlob = new Blob([htmlContent], { type: 'text/html' });
    formData.append(fileName, fileBlob, fileName);

    console.log(`[publish-cloudflare-pages] Uploading to Cloudflare...`);

    const deployResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: formData
      }
    );

    const deployData = await deployResponse.json();

    if (!deployResponse.ok || !deployData.success) {
      console.error('[publish-cloudflare-pages] Deploy failed:', deployData);
      
      // Update LP with error
      await supabase
        .from('cloned_landing_pages')
        .update({ 
          publish_status: 'error',
          publish_error_message: deployData.errors?.[0]?.message || 'Falha no deploy'
        })
        .eq('id', lpId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: deployData.errors?.[0]?.message || 'Falha no deploy para Cloudflare' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const deployment = deployData.result;
    const publishedUrl = isHomepage || pagePath === '/' 
      ? `https://${domain}`
      : `https://${domain}${pagePath.startsWith('/') ? pagePath : '/' + pagePath}`;

    console.log(`[publish-cloudflare-pages] Deploy successful:`, {
      deploymentId: deployment.id,
      url: deployment.url,
      publishedUrl
    });

    // 7. Update LP with success
    const deploymentRecord = {
      id: deployment.id,
      url: deployment.url,
      created_at: new Date().toISOString(),
      page_path: pagePath || '/',
      is_homepage: isHomepage
    };

    const existingHistory = (lp.deployment_history || []) as any[];
    
    await supabase
      .from('cloned_landing_pages')
      .update({ 
        publish_status: 'success',
        published_url: publishedUrl,
        cloudflare_deployment_id: deployment.id,
        publish_error_message: null,
        deployment_history: [...existingHistory, deploymentRecord],
        status: 'published'
      })
      .eq('id', lpId);

    return new Response(
      JSON.stringify({
        success: true,
        deployment: {
          id: deployment.id,
          url: deployment.url,
          publishedUrl,
          projectName,
          domain,
          pagePath: pagePath || '/',
          isHomepage
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