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
    const { url, user, password } = await req.json();

    if (!url || !user || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'URL, usuário e password são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Testando conexão WordPress: ${user}@${url}`);

    // Testar conexão com WordPress REST API
    const testWordPressAPI = async () => {
      try {
        // Validar e normalizar URL
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = `https://${normalizedUrl}`;
        }
        normalizedUrl = normalizedUrl.replace(/\/+$/, ''); // Remove barras no final

        const wpApiUrl = `${normalizedUrl}/wp-json/wp/v2/users/me`;
        console.log(`🌐 Testando URL normalizada: ${wpApiUrl}`);
        
        const response = await fetch(wpApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ Usuário WordPress autenticado:', userData.name || userData.username);
          return { success: true, user: userData.name || userData.username };
        } else {
          const errorText = await response.text();
          console.log('❌ Erro na autenticação WordPress:', response.status, errorText);
          
          if (response.status === 401) {
            return { 
              success: false, 
              error: 'Credenciais inválidas. Verifique o usuário e Application Password.' 
            };
          } else if (response.status === 404) {
            return { 
              success: false, 
              error: 'WordPress REST API não encontrada. Verifique a URL.' 
            };
          } else {
            return { 
              success: false, 
              error: `Erro HTTP ${response.status}: ${errorText}` 
            };
          }
        }
      } catch (error) {
        console.log('❌ Erro de conexão WordPress:', error);
        return { 
          success: false, 
          error: 'Erro de conexão. Verifique a URL e conectividade.' 
        };
      }
    };

    const result = await testWordPressAPI();

    if (result.success) {
      console.log('✅ Conexão WordPress estabelecida com sucesso');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Conexão WordPress estabelecida com sucesso. Usuário: ${result.user}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
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
    console.error('❌ Erro no teste de conexão WordPress:', error);
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