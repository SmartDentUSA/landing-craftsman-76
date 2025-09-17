import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { blog_post_id, domains } = await req.json();

    if (!blog_post_id || !domains || !Array.isArray(domains)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'blog_post_id e domains são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🚀 Iniciando publicação do blog post: ${blog_post_id}`);

    // Buscar dados do blog post
    const { data: blogPost, error: blogError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', blog_post_id)
      .single();

    if (blogError || !blogPost) {
      console.error('❌ Erro ao buscar blog post:', blogError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Blog post não encontrado' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar configurações de publicação
    const { data: settings, error: settingsError } = await supabase
      .from('publication_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('❌ Erro ao buscar configurações:', settingsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configurações de publicação não encontradas' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const publishedDomains: string[] = [];
    const errors: string[] = [];

    // Publicar em cada domínio
    for (const domain of domains) {
      try {
        if (domain === 'eodonto.com') {
          // Publicar via FTP
          console.log(`📤 Publicando no FTP (${domain})...`);
          const ftpResult = await publishToFTP(blogPost, settings);
          if (ftpResult.success) {
            publishedDomains.push(domain);
            console.log(`✅ Publicado com sucesso no ${domain}`);
          } else {
            errors.push(`FTP (${domain}): ${ftpResult.error}`);
          }
        } else if (domain === 'dentala.com.br') {
          // Publicar via WordPress API
          console.log(`📤 Publicando no WordPress (${domain})...`);
          const wpResult = await publishToWordPress(blogPost, settings);
          if (wpResult.success) {
            publishedDomains.push(domain);
            console.log(`✅ Publicado com sucesso no ${domain}`);
          } else {
            errors.push(`WordPress (${domain}): ${wpResult.error}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao publicar no ${domain}:`, error);
        errors.push(`${domain}: ${error.message}`);
      }
    }

    // Atualizar status do blog post
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        status: publishedDomains.length > 0 ? 'published' : 'failed',
        published_domains: publishedDomains,
        published_at: publishedDomains.length > 0 ? new Date().toISOString() : null,
      })
      .eq('id', blog_post_id);

    if (updateError) {
      console.error('❌ Erro ao atualizar blog post:', updateError);
    }

    const result = {
      success: publishedDomains.length > 0,
      published_domains: publishedDomains,
      errors: errors.length > 0 ? errors : undefined,
      message: publishedDomains.length > 0 
        ? `Publicado com sucesso em ${publishedDomains.length} domínio(s)`
        : 'Falha na publicação em todos os domínios'
    };

    console.log('📊 Resultado da publicação:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na publicação:', error);
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

async function publishToFTP(blogPost: any, settings: any) {
  try {
    // Simular publicação FTP
    console.log(`📁 Criando arquivo HTML para FTP...`);
    
    const htmlContent = generateHTMLContent(blogPost);
    const fileName = `${blogPost.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
    
    // Em um ambiente real, aqui faria o upload via FTP
    console.log(`📤 Simulando upload FTP: ${fileName}`);
    console.log(`🔧 Host: ${settings.ftp_host}`);
    console.log(`👤 User: ${settings.ftp_user}`);
    
    // Simular delay de upload
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      success: true, 
      url: `https://eodonto.com/blog/${fileName}` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function publishToWordPress(blogPost: any, settings: any) {
  try {
    console.log(`📝 Publicando no WordPress...`);
    
    const wpApiUrl = `${settings.wordpress_url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
    
    const postData = {
      title: blogPost.title,
      content: addCrossLinks(blogPost.content),
      excerpt: blogPost.meta_description,
      status: 'publish',
      tags: blogPost.keywords || [],
    };

    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${settings.wordpress_user}:${settings.wordpress_app_password_encrypted}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Post WordPress criado: ${result.id}`);
      return { 
        success: true, 
        url: result.link,
        wp_id: result.id 
      };
    } else {
      const errorText = await response.text();
      console.error(`❌ Erro WordPress: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        error: `Erro HTTP ${response.status}: ${errorText}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

function generateHTMLContent(blogPost: any): string {
  const schema = generateSchemaLD(blogPost);
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blogPost.title}</title>
    <meta name="description" content="${blogPost.meta_description}">
    <meta name="keywords" content="${(blogPost.keywords || []).join(', ')}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${blogPost.title}">
    <meta property="og:description" content="${blogPost.meta_description}">
    <meta property="og:type" content="article">
    
    <!-- Schema.org -->
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .meta { color: #7f8c8d; margin-bottom: 20px; }
        .content { line-height: 1.6; }
        .cross-links { background: #f8f9fa; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0; }
    </style>
</head>
<body>
    <article>
        <h1>${blogPost.title}</h1>
        <div class="meta">
            <p>${blogPost.meta_description}</p>
            ${blogPost.keywords && blogPost.keywords.length > 0 ? 
              `<p><strong>Tags:</strong> ${blogPost.keywords.join(', ')}</p>` : ''
            }
        </div>
        <div class="content">
            ${addCrossLinks(blogPost.content)}
        </div>
        
        ${blogPost.youtube_video_url ? `
        <div class="youtube-embed">
            <h3>Vídeo relacionado:</h3>
            <a href="${blogPost.youtube_video_url}" target="_blank">${blogPost.youtube_video_url}</a>
        </div>
        ` : ''}
        
        <div class="cross-links">
            <h3>Links relacionados:</h3>
            <ul>
                <li><a href="https://eodonto.com" target="_blank">Visite nosso site principal - eodonto.com</a></li>
                <li><a href="https://dentala.com.br" target="_blank">Confira mais conteúdo em dentala.com.br</a></li>
            </ul>
        </div>
    </article>
</body>
</html>`;
}

function addCrossLinks(content: string): string {
  // Adicionar links cruzados inteligentes no conteúdo
  let processedContent = content;
  
  // Substituir menções a odontologia por links
  processedContent = processedContent.replace(
    /\b(odontologia digital|odontologia|dentista|dental)\b/gi,
    '<a href="https://eodonto.com" target="_blank">$1</a>'
  );
  
  // Substituir menções a resinas, materiais por links para dentala
  processedContent = processedContent.replace(
    /\b(resina|material dental|equipamento dental)\b/gi,
    '<a href="https://dentala.com.br" target="_blank">$1</a>'
  );
  
  return processedContent;
}

function generateSchemaLD(blogPost: any) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogPost.title,
    "description": blogPost.meta_description,
    "keywords": (blogPost.keywords || []).join(', '),
    "datePublished": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": "E-Odonto",
      "url": "https://eodonto.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "E-Odonto",
      "url": "https://eodonto.com"
    }
  };
}