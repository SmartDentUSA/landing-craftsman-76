import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Nenhum arquivo fornecido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!file.type.startsWith('image/')) {
      return new Response(
        JSON.stringify({ error: 'Apenas imagens são permitidas' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Tamanho máximo: 10MB' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`

    console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ 
          error: 'Erro no upload',
          details: uploadError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)

    console.log('Upload successful:', publicUrl)

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        filename: fileName,
        path: uploadData.path
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in upload-image function:', error)
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
