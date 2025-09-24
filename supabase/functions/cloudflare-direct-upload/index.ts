import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      })
    }

    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')?.trim()
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')?.trim()

    console.log('Checking Cloudflare credentials for direct upload...')
    console.log('Account ID present:', !!CLOUDFLARE_ACCOUNT_ID)
    console.log('API Token present:', !!CLOUDFLARE_API_TOKEN)

    if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
      console.error('Missing Cloudflare credentials')
      return new Response(
        JSON.stringify({ 
          error: 'Credenciais do Cloudflare não configuradas. Configure CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN nas configurações.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate Account ID format (should be 32 characters)
    if (CLOUDFLARE_ACCOUNT_ID.length !== 32) {
      console.error('Invalid Account ID format:', CLOUDFLARE_ACCOUNT_ID)
      return new Response(
        JSON.stringify({ 
          error: 'Account ID do Cloudflare inválido. Deve ter 32 caracteres.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call Cloudflare direct upload endpoint
    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`
    
    console.log('Calling Cloudflare direct upload endpoint:', cloudflareUrl)

    const cloudflareResponse = await fetch(cloudflareUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: { source: 'lovable' },
        requireSignedURLs: false
      })
    })

    console.log('Cloudflare response status:', cloudflareResponse.status)
    
    if (!cloudflareResponse.ok) {
      const errorText = await cloudflareResponse.text()
      console.error('Cloudflare API error:', errorText)
      
      let errorMessage = 'Erro na API do Cloudflare'
      if (cloudflareResponse.status === 400) {
        errorMessage = 'Configuração inválida do Cloudflare. Verifique suas credenciais.'
      } else if (cloudflareResponse.status === 403) {
        errorMessage = 'API Token sem permissões. Verifique se tem permissão "Cloudflare Images:Edit".'
      } else if (cloudflareResponse.status === 404) {
        errorMessage = 'Account ID não encontrado ou Cloudflare Images não está habilitado.'
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText
        }),
        { 
          status: cloudflareResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const cloudflareData = await cloudflareResponse.json()
    
    console.log('Cloudflare direct upload successful')
    console.log('Upload URL generated:', !!cloudflareData.result?.uploadURL)

    return new Response(
      JSON.stringify({
        success: true,
        uploadURL: cloudflareData.result.uploadURL,
        id: cloudflareData.result.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in cloudflare-direct-upload function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})