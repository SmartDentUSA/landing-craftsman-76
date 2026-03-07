import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    console.log('Starting robots.txt generation...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get domain from query params or request headers
    const url = new URL(req.url);
    const queryDomain = url.searchParams.get('domain');
    const hostHeader = req.headers.get('host');
    
    // Priority: query param > host header > default
    let domain = queryDomain || hostHeader || 'example.com';
    
    // Clean domain (remove protocol if present, keep just domain)
    domain = domain.replace(/^https?:\/\//, '').split('/')[0];
    
    console.log(`Generating robots.txt for domain: ${domain}`);

    // Fetch publication settings for the domain
    const { data: publicationSettings, error: settingsError } = await supabase
      .from('publication_settings')
      .select('*')
      .or(`domain.eq.${domain},domain.ilike.%${domain}%`)
      .limit(1)
      .single();

    if (settingsError) {
      console.log('No specific publication settings found, using default configuration');
    }

    // Default WordPress paths to block (prevents indexing of cloned WP artifacts)
    const defaultWordPressDisallowPaths = [
      '/wp-admin/',
      '/wp-admin/admin-ajax.php',
      '/wp-json/',
      '/wp-includes/',
      '/wp-content/plugins/',
      '/xmlrpc.php',
      '/*?elementor-preview=*',
      '/*?preview=true',
      '/*.php$',
    ];

    // Get default robots configuration
    let robotsConfig = {
      allowAll: true,
      disallowPaths: defaultWordPressDisallowPaths,
      crawlDelay: null as number | null,
      userAgents: [
        '*', 
        'Googlebot', 
        'Bingbot', 
        'Twitterbot', 
        'facebookexternalhit',
        // AI Crawler Bots — Allow indexing for LLM citation
        'GPTBot',
        'Google-Extended',
        'CCBot',
        'PerplexityBot',
        'ClaudeBot',
        'Applebot-Extended',
        'anthropic-ai',
        'Bytespider',
        'cohere-ai'
      ]
    };

    // Override with publication settings if available
    if (publicationSettings?.seo_settings?.robots_config) {
      robotsConfig = { ...robotsConfig, ...publicationSettings.seo_settings.robots_config };
    }

    // ✅ Build correct sitemap URLs using the REAL domain
    const domainWithProtocol = domain.startsWith('http') ? domain : `https://${domain}`;
    const sitemapUrl = `${domainWithProtocol}/sitemap.xml`;
    const videoSitemapUrl = `${domainWithProtocol}/video-sitemap.xml`;
    
    // Also include the dynamic sitemap from edge function (for domains that use it)
    const supabaseProjectRef = 'pgfgripuanuwwolmtknn';
    const dynamicSitemapUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/generate-sitemap?domain=${encodeURIComponent(domain)}`;

    // Generate robots.txt content
    let robotsContent = '';

    // Add user-agent rules
    for (const userAgent of robotsConfig.userAgents) {
      robotsContent += `User-agent: ${userAgent}\n`;
      
      if (robotsConfig.allowAll) {
        robotsContent += 'Allow: /\n';
      }
      
      // Add disallow paths if any
      if (robotsConfig.disallowPaths && robotsConfig.disallowPaths.length > 0) {
        for (const path of robotsConfig.disallowPaths) {
          robotsContent += `Disallow: ${path}\n`;
        }
      }
      
      // Add crawl delay if specified
      if (robotsConfig.crawlDelay) {
        robotsContent += `Crawl-delay: ${robotsConfig.crawlDelay}\n`;
      }
      
      robotsContent += '\n';
    }

    // Add sitemap references (static files on domain + dynamic from edge function)
    robotsContent += `# Static sitemaps\n`;
    robotsContent += `Sitemap: ${sitemapUrl}\n`;
    robotsContent += `Sitemap: ${videoSitemapUrl}\n`;
    robotsContent += `\n# Dynamic sitemap (edge function)\n`;
    robotsContent += `Sitemap: ${dynamicSitemapUrl}\n`;

    console.log('Generated robots.txt for domain:', domain);

    // Log robots.txt generation for monitoring (optional, don't fail if it errors)
    try {
      await supabase
        .from('system_monitoring')
        .insert({
          event_type: 'robots_txt_generation',
          component_name: 'generate-robots-txt',
          event_data: {
            domain,
            sitemap_url: sitemapUrl,
            dynamic_sitemap_url: dynamicSitemapUrl,
            content_length: robotsContent.length,
            timestamp: new Date().toISOString()
          },
          severity: 'info',
          tags: ['seo', 'robots', 'automation']
        });
    } catch (logError) {
      console.error('Error logging robots.txt generation (non-critical):', logError);
    }

    return new Response(robotsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    // Return a fallback robots.txt in case of errors
    const fallbackRobots = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

# Sitemap not available - please check configuration
`;

    return new Response(fallbackRobots, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Shorter cache for fallback
      },
    });
  }
});
