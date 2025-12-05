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

interface ClonedLandingPage {
  id: string;
  name: string;
  published_url: string;
  target_domain: string;
  published_at: string;
  page_path: string;
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

    // Get domain filter from query params
    const url = new URL(req.url);
    const filterDomain = url.searchParams.get('domain');
    
    console.log(`🗺️ Generating sitemap${filterDomain ? ` for domain: ${filterDomain}` : ' (all domains)'}`);

    // Buscar landing pages publicadas do banco (tabela original)
    const { data: landingPages, error: lpError } = await supabase
      .from('landing_pages')
      .select('id, name, last_modified, data')
      .eq('status', 'published')
      .order('last_modified', { ascending: false })

    if (lpError) {
      console.error('Erro ao buscar landing pages:', lpError)
    }

    // ✅ NOVO: Buscar cloned_landing_pages publicadas com sucesso
    const { data: clonedPages, error: clonedError } = await supabase
      .from('cloned_landing_pages')
      .select('id, name, published_url, target_domain, published_at, page_path')
      .eq('publish_status', 'success')
      .not('published_url', 'is', null)
      .order('published_at', { ascending: false })

    if (clonedError) {
      console.error('Erro ao buscar cloned landing pages:', clonedError)
    }

    console.log(`📊 Found ${landingPages?.length || 0} landing_pages, ${clonedPages?.length || 0} cloned_landing_pages`);

    // Converter landing pages originais para formato do sitemap
    const originalPages = (landingPages || [])
      .filter((page: LandingPage) => {
        const domain = page.data?.seo?.domain;
        if (!filterDomain) return true;
        return domain && domain.includes(filterDomain);
      })
      .map((page: LandingPage) => {
        const domain = page.data?.seo?.domain || 'https://example.com'
        const canonicalUrl = page.data?.seo?.canonical_url || `${domain}/${page.id}`
        
        return {
          url: canonicalUrl,
          lastmod: new Date(page.last_modified).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.9'
        }
      })

    // ✅ NOVO: Converter cloned_landing_pages para formato do sitemap
    const clonedPagesFormatted = (clonedPages || [])
      .filter((page: ClonedLandingPage) => {
        if (!filterDomain) return true;
        return page.target_domain && page.target_domain.includes(filterDomain);
      })
      .map((page: ClonedLandingPage) => {
        return {
          url: page.published_url,
          lastmod: new Date(page.published_at).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: page.page_path === '/' || page.page_path === '' ? '1.0' : '0.9'
        }
      })

    // ✅ NOVO: Agrupar por domínio para gerar homepage de cada domínio
    const domainHomepages: Map<string, { url: string, lastmod: string }> = new Map();
    
    for (const page of clonedPages || []) {
      if (page.target_domain && !domainHomepages.has(page.target_domain)) {
        // Adicionar homepage do domínio com prioridade máxima
        const homepageUrl = page.target_domain.startsWith('http') 
          ? page.target_domain 
          : `https://${page.target_domain}`;
        
        domainHomepages.set(page.target_domain, {
          url: homepageUrl,
          lastmod: new Date(page.published_at).toISOString().split('T')[0]
        });
      }
    }

    // Converter homepages para formato sitemap
    const homepageEntries = Array.from(domainHomepages.values()).map(hp => ({
      url: hp.url,
      lastmod: hp.lastmod,
      changefreq: 'daily',
      priority: '1.0'
    }));

    // Combinar todas as páginas (remover duplicatas por URL)
    const allPagesMap = new Map<string, any>();
    
    // Homepages primeiro (maior prioridade)
    for (const page of homepageEntries) {
      allPagesMap.set(page.url, page);
    }
    
    // Cloned pages (podem sobrescrever se tiverem mesma URL)
    for (const page of clonedPagesFormatted) {
      if (!allPagesMap.has(page.url)) {
        allPagesMap.set(page.url, page);
      }
    }
    
    // Original pages
    for (const page of originalPages) {
      if (!allPagesMap.has(page.url)) {
        allPagesMap.set(page.url, page);
      }
    }

    const allPages = Array.from(allPagesMap.values());
    
    console.log(`✅ Sitemap generated with ${allPages.length} URLs`);

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
    <loc>${escapeXml(page.url)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlEntries}
</urlset>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateErrorSitemap(): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error generating sitemap - please check logs -->
</urlset>`;
}
