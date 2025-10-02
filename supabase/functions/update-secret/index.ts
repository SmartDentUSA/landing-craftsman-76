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

    const body = await req.json();

    // Support both single secret and batch secrets formats
    // Single: { secretName: "KEY", secretValue: "value" }
    // Batch: { secrets: { KEY1: "value1", KEY2: "value2" } }
    
    let secretsToLog: string[] = [];
    
    if (body.secretName && body.secretValue) {
      // Single secret (backward compatible)
      secretsToLog.push(body.secretName);
      console.log(`🔑 Single secret configuration requested: ${body.secretName}`);
    } else if (body.secrets && typeof body.secrets === 'object') {
      // Batch secrets
      secretsToLog = Object.keys(body.secrets);
      console.log(`🔑 Batch secrets configuration requested: ${secretsToLog.join(', ')}`);
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format. Use { secretName, secretValue } or { secrets: {...} }' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Only log secret names, never values
    console.log(`📝 Secrets to configure: ${secretsToLog.join(', ')}`);
    
    // Secret configuration is managed via Supabase dashboard
    // This function confirms the configuration request
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Secret(s) ${secretsToLog.join(', ')} configuration requested successfully. Please ensure they're configured in Supabase dashboard.`,
        secrets: secretsToLog
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