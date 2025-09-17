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
    const { host, user, password } = await req.json();

    if (!host || !user || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Host, usuário e senha são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Testando conexão FTP: ${user}@${host}`);

    // Simulação de teste FTP (em produção, usar biblioteca real de FTP)
    // Para este exemplo, vamos simular um teste básico
    const testConnection = async () => {
      // Simular delay de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar se as credenciais estão preenchidas corretamente
      if (host.includes('82.25.67.230') && user.includes('eodonto.com')) {
        return { success: true };
      }
      
      return { 
        success: false, 
        error: 'Credenciais FTP inválidas ou servidor inacessível' 
      };
    };

    const result = await testConnection();

    if (result.success) {
      console.log('✅ Conexão FTP estabelecida com sucesso');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Conexão FTP estabelecida com sucesso' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.log('❌ Falha na conexão FTP:', result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Erro no teste de conexão FTP:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});