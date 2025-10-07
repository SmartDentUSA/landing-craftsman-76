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

    // Get domain from request URL or headers
    const url = new URL(req.url);
    const hostHeader = req.headers.get('host');
    const domain = hostHeader || url.hostname;
    
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

    // Get default robots configuration
    let robotsConfig = {
      allowAll: true,
      disallowPaths: [],
      crawlDelay: null,
      userAgents: ['*', 'Googlebot', 'Bingbot', 'Twitterbot', 'facebookexternalhit']
    };

    // Override with publication settings if available
    if (publicationSettings?.seo_settings?.robots_config) {
      robotsConfig = { ...robotsConfig, ...publicationSettings.seo_settings.robots_config };
    }

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

    // Add sitemap references
    const sitemapUrl = `https://${domain}/functions/v1/generate-sitemap`;
    const videoSitemapUrl = `https://${domain}/functions/v1/generate-video-sitemap`;
    robotsContent += `Sitemap: ${sitemapUrl}\n`;
    robotsContent += `Sitemap: ${videoSitemapUrl}\n`;

    console.log('Generated robots.txt content:', robotsContent);

    // Log robots.txt generation for monitoring
    const { error: logError } = await supabase
      .from('system_monitoring')
      .insert({
        event_type: 'robots_txt_generation',
        component_name: 'generate-robots-txt',
        event_data: {
          domain,
          robots_config: robotsConfig,
          sitemap_url: sitemapUrl,
          content_length: robotsContent.length,
          timestamp: new Date().toISOString()
        },
        severity: 'info',
        tags: ['seo', 'robots', 'automation']
      });

    if (logError) {
      console.error('Error logging robots.txt generation:', logError);
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

Sitemap: https://pgfgripuanuwwolmtknn.supabase.co/functions/v1/generate-sitemap
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