import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

interface LandingPage {
  id: string;
  name: string;
  lastModified: string;
  data: {
    seo: {
      domain?: string;
      canonical_url?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🗺️ Generating sitemap XML...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, we'll use localStorage data since landing pages are stored locally
    // In a real implementation, you'd fetch from the database
    const defaultDomain = 'https://seudominio.com';
    
    // Generate sitemap for common pages
    const pages = [
      {
        url: defaultDomain,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        url: `${defaultDomain}/dashboard`,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8'
      }
    ];

    // TODO: Add dynamic landing pages when they're stored in the database
    // This would fetch actual landing page data and generate URLs

    const xml = generateSitemapXML(pages);
    
    console.log('✅ Sitemap generated successfully');

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    
    return new Response(
      generateErrorSitemap(), 
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});

function generateSitemapXML(pages: Array<{url: string, lastmod: string, changefreq: string, priority: string}>): string {
  const urlEntries = pages.map(page => `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlEntries}
</urlset>`;
}

function generateErrorSitemap(): string {
  const defaultDomain = 'https://seudominio.com';
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${defaultDomain}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
}