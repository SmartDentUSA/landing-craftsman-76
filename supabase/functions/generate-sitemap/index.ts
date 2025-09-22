import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=14400' // Cache por 4 horas
}

interface LandingPage {
  id: string;
  name: string;
  last_modified: string;
  data?: {
    seo?: {
      domain?: string;
      canonical_url?: string;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Buscar landing pages publicadas do banco
    const { data: landingPages, error } = await supabase
      .from('landing_pages')
      .select('id, name, last_modified, data')
      .eq('status', 'published')
      .order('last_modified', { ascending: false })

    if (error) {
      console.error('Erro ao buscar landing pages:', error)
      throw error
    }

    // Páginas estáticas do sistema
    const staticPages = [
      {
        url: 'https://example.com/',
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        url: 'https://example.com/sobre',
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: 'https://example.com/contato',
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7'
      }
    ]

    // Converter landing pages para formato do sitemap
    const dynamicPages = (landingPages || []).map((page: LandingPage) => {
      const domain = page.data?.seo?.domain || 'https://example.com'
      const canonicalUrl = page.data?.seo?.canonical_url || `${domain}/${page.id}`
      
      return {
        url: canonicalUrl,
        lastmod: new Date(page.last_modified).toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.9'
      }
    })

    // Combinar todas as páginas
    const allPages = [...staticPages, ...dynamicPages]

    // Gerar XML do sitemap
    const sitemap = generateSitemapXML(allPages)

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200
    })

  } catch (error) {
    console.error('Erro ao gerar sitemap:', error)
    
    // Retornar sitemap básico em caso de erro
    const errorSitemap = generateErrorSitemap()
    return new Response(errorSitemap, {
      headers: corsHeaders,
      status: 500
    })
  }
})

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