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

    // Security: No logging of sensitive data
    console.log(`Secret configuration requested for: ${secretName}`);
    
    // Secret configuration is managed via Supabase dashboard
    // This function confirms the configuration request
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Secret ${secretName} configuration requested successfully. Please ensure it's configured in Supabase dashboard.` 
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
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});