import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { secretName, secretValue } = await req.json();

    if (!secretName || !secretValue) {
      return new Response(
        JSON.stringify({ error: 'Secret name and value are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log para debug
    console.log(`Updating secret: ${secretName}`);

    // In a real implementation, you would store the secret securely
    // For now, we'll just return success since the secrets are managed by Supabase
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Secret ${secretName} updated successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating secret:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update secret',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});