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

    // Validate URL format
    if (url.includes('/wp-admin') || url.includes('/blog')) {
      return {
        success: false,
        error: 'A URL não deve conter /wp-admin ou outros caminhos. Use apenas o domínio (ex.: https://dentala.com.br)'
      };
    }

    // Testar conexão com WordPress REST API
    const testWordPressAPI = async () => {
      try {
        // Normalizar URL - manter apenas o origin
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = `https://${normalizedUrl}`;
        }
        
        // Extrair apenas o origin (protocolo + domínio)
        try {
          const urlObj = new URL(normalizedUrl);
          normalizedUrl = `${urlObj.protocol}//${urlObj.host}`;
        } catch {
          // Se falhar, remover barras finais manualmente
          normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        }

        console.log(`🌐 Testando URL normalizada: ${normalizedUrl}`);

        // Primeiro: verificar se a REST API existe (sem autenticação)
        const apiCheckUrl = `${normalizedUrl}/wp-json/`;
        console.log(`🔍 Verificando REST API: ${apiCheckUrl}`);
        
        try {
          const apiCheckResponse = await fetch(apiCheckUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!apiCheckResponse.ok) {
            console.log(`❌ REST API não encontrada: ${apiCheckResponse.status}`);
            return { 
              success: false, 
              error: 'WordPress REST API não está disponível neste domínio. Verifique se é um site WordPress válido.' 
            };
          }
        } catch (error) {
          console.log(`❌ Erro ao verificar REST API: ${error}`);
          return { 
            success: false, 
            error: 'Não foi possível acessar o site. Verifique a URL e conectividade.' 
          };
        }

        // Segundo: tentar autenticar com /users/me
        const usersApiUrl = `${normalizedUrl}/wp-json/wp/v2/users/me`;
        console.log(`🔐 Testando autenticação: ${usersApiUrl}`);
        
        const usersResponse = await fetch(usersApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
            'Content-Type': 'application/json',
          },
        });

        if (usersResponse.ok) {
          const userData = await usersResponse.json();
          console.log('✅ Usuário WordPress autenticado via /users/me:', userData.name || userData.username);
          return { success: true, user: userData.name || userData.username };
        }

        // Terceiro: se /users/me falhar com 404, tentar /posts (endpoint alternativo)
        if (usersResponse.status === 404) {
          console.log('⚠️ Endpoint /users/me bloqueado, tentando /posts...');
          
          const postsApiUrl = `${normalizedUrl}/wp-json/wp/v2/posts?per_page=1&context=edit`;
          const postsResponse = await fetch(postsApiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
              'Content-Type': 'application/json',
            },
          });

          if (postsResponse.ok) {
            console.log('✅ Usuário WordPress autenticado via /posts');
            return { success: true, user: user };
          } else if (postsResponse.status === 401) {
            return { 
              success: false, 
              error: 'Credenciais inválidas. Verifique o usuário e Application Password.' 
            };
          }
        }

        // Análise dos erros
        if (usersResponse.status === 401) {
          return { 
            success: false, 
            error: 'Credenciais inválidas. Verifique o usuário e Application Password.' 
          };
        } else {
          const errorText = await usersResponse.text();
          console.log('❌ Erro na autenticação WordPress:', usersResponse.status, errorText);
          return { 
            success: false, 
            error: `Erro de autenticação HTTP ${usersResponse.status}. Verifique as credenciais.` 
          };
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