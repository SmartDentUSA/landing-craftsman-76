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

  // HTTP 410 Gone - Feature permanently removed
  return new Response(
    JSON.stringify({ 
      error: 'Cloudflare Images foi removido',
      message: 'Este recurso foi migrado para Supabase Storage. Use a nova funcionalidade de upload no ImageUploader.',
      migration_date: '2025-01-15',
      alternative: 'Supabase Storage (bucket: product-images)'
    }),
    { 
      status: 410, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
})
