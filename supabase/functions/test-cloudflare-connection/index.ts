import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectName } = await req.json();

    if (!projectName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome do projeto é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      console.error('[test-cloudflare-connection] Missing Cloudflare credentials');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais Cloudflare não configuradas. Configure CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[test-cloudflare-connection] Testing project: ${projectName}`);

    // Try to get project info from Cloudflare Pages API
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[test-cloudflare-connection] API error:', data);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Projeto "${projectName}" não encontrado no Cloudflare Pages. Verifique se o projeto foi criado.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      if (response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'API Token sem permissão para Cloudflare Pages. Verifique as permissões do token.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.errors?.[0]?.message || 'Erro ao conectar com Cloudflare' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const project = data.result;
    
    console.log(`[test-cloudflare-connection] Project found:`, {
      name: project.name,
      subdomain: project.subdomain,
      domains: project.domains,
      created_on: project.created_on
    });

    return new Response(
      JSON.stringify({
        success: true,
        project: {
          name: project.name,
          subdomain: project.subdomain,
          domains: project.domains || [],
          production_branch: project.production_branch,
          created_on: project.created_on,
          latest_deployment: project.latest_deployment ? {
            id: project.latest_deployment.id,
            url: project.latest_deployment.url,
            created_on: project.latest_deployment.created_on,
          } : null
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-cloudflare-connection] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});