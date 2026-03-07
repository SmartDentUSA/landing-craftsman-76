import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface HandbookParams {
  format?: 'markdown' | 'json' | 'html';
  include_company?: boolean;
  include_products?: boolean;
  include_categories?: boolean;
  include_kols?: boolean;
  include_spin?: boolean;
  include_links?: boolean;
  include_landing_pages?: boolean;
  include_testimonials?: boolean;
  include_reviews?: boolean;
  include_blogs?: boolean;
  include_milestones?: boolean;
  include_external_videos?: boolean;
  approved_only?: boolean;
}

// ============= UTILITY FUNCTIONS =============

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number | null): string {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============= MARKDOWN GENERATORS =============

function generateCompanyMarkdown(company: any): string {
  if (!company) return '';
  
  let md = `## 1. PERFIL DA EMPRESA\n\n`;
  
  md += `### Informações Gerais\n`;
  md += `- **Nome:** ${company.company_name || 'N/A'}\n`;
  md += `- **Descrição:** ${stripHtml(company.company_description) || 'N/A'}\n`;
  md += `- **Setor:** ${company.business_sector || 'N/A'}\n`;
  md += `- **Website:** ${company.website_url || 'N/A'}\n`;
  md += `- **Fundação:** ${company.founded_year || 'N/A'}\n`;
  md += `- **Tamanho da Equipe:** ${company.team_size || 'N/A'}\n\n`;
  
  md += `### Contato\n`;
  md += `- **Email:** ${company.contact_email || 'N/A'}\n`;
  md += `- **Telefone:** ${company.contact_phone || 'N/A'}\n`;
  
  if (company.street_address || company.city) {
    md += `- **Endereço:** ${[company.street_address, company.address_number, company.city, company.state, company.postal_code].filter(Boolean).join(', ')}\n`;
  } else if (company.location) {
    md += `- **Localização:** ${company.location}\n`;
  }
  md += `\n`;
  
  if (company.mission_statement || company.vision_statement || company.brand_values) {
    md += `### Missão, Visão e Valores\n`;
    if (company.mission_statement) md += `- **Missão:** ${company.mission_statement}\n`;
    if (company.vision_statement) md += `- **Visão:** ${company.vision_statement}\n`;
    if (company.brand_values) md += `- **Valores:** ${company.brand_values}\n`;
    md += `\n`;
  }
  
  if (company.differentiators || company.target_audience) {
    md += `### Posicionamento\n`;
    if (company.target_audience) md += `- **Público-alvo:** ${company.target_audience}\n`;
    if (company.differentiators) md += `- **Diferenciais:** ${company.differentiators}\n`;
    md += `\n`;
  }
  
  if (company.founder_name) {
    md += `### Fundador\n`;
    md += `- **Nome:** ${company.founder_name}\n`;
    if (company.founder_title) md += `- **Cargo:** ${company.founder_title}\n`;
    if (company.founder_linkedin) md += `- **LinkedIn:** ${company.founder_linkedin}\n`;
    md += `\n`;
  }
  
  if (company.social_media_links && Array.isArray(company.social_media_links) && company.social_media_links.length > 0) {
    md += `### Redes Sociais\n`;
    company.social_media_links.forEach((link: any) => {
      md += `- **${link.platform || 'Link'}:** ${link.url}\n`;
    });
    md += `\n`;
  }
  
  if (company.google_aggregate_rating) {
    md += `### Avaliação Google\n`;
    md += `- **Rating:** ${company.google_aggregate_rating.ratingValue || '5.0'}⭐\n`;
    md += `- **Total de Reviews:** ${company.google_aggregate_rating.reviewCount || 0}\n`;
    md += `\n`;
  }
  
  if (company.legal_name || company.tax_id) {
    md += `### Dados Jurídicos\n`;
    if (company.legal_name) md += `- **Razão Social:** ${company.legal_name}\n`;
    if (company.tax_id) md += `- **CNPJ:** ${company.tax_id}\n`;
    md += `\n`;
  }
  
  md += `---\n\n`;
  return md;
}

function generateProductsMarkdown(products: any[]): string {
  if (!products || products.length === 0) return '';
  
  let md = `## 2. CATÁLOGO DE PRODUTOS (${products.length} produtos)\n\n`;
  
  // Agrupar por categoria
  const byCategory: Record<string, any[]> = {};
  products.forEach(p => {
    const cat = p.category || 'Sem Categoria';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });
  
  Object.entries(byCategory).forEach(([category, prods]) => {
    md += `### ${category} (${prods.length})\n\n`;
    
    prods.forEach((p, idx) => {
      md += `#### ${idx + 1}. ${p.name}\n\n`;
      
      // Informações básicas
      md += `| Campo | Valor |\n`;
      md += `|-------|-------|\n`;
      md += `| SKU | ${p.ean || p.mpn || 'N/A'} |\n`;
      md += `| Preço | ${formatCurrency(p.price)} |\n`;
      if (p.promo_price) md += `| Preço Promocional | ${formatCurrency(p.promo_price)} |\n`;
      md += `| Marca | ${p.brand || 'N/A'} |\n`;
      md += `| Subcategoria | ${p.subcategory || 'N/A'} |\n`;
      md += `| Disponibilidade | ${p.availability || (p.active ? 'Em Estoque' : 'Indisponível')} |\n`;
      if (p.product_url) md += `| URL | ${p.product_url} |\n`;
      md += `\n`;
      
      // Descrição
      if (p.description) {
        md += `**Descrição:**\n${stripHtml(p.description)}\n\n`;
      }
      
      // Benefícios
      if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
        md += `**Benefícios:**\n`;
        p.benefits.forEach((b: any) => {
          if (typeof b === 'string') {
            md += `- ${b}\n`;
          } else if (b.title || b.description) {
            md += `- **${b.title || ''}:** ${b.description || ''}\n`;
          }
        });
        md += `\n`;
      }
      
      // Especificações Técnicas
      if (p.technical_specifications && Array.isArray(p.technical_specifications) && p.technical_specifications.length > 0) {
        md += `**Especificações Técnicas:**\n`;
        md += `| Atributo | Valor |\n`;
        md += `|----------|-------|\n`;
        p.technical_specifications.forEach((spec: any) => {
          md += `| ${spec.name || spec.attribute || 'N/A'} | ${spec.value || 'N/A'} |\n`;
        });
        md += `\n`;
      }
      
      // FAQ
      if (p.faq && Array.isArray(p.faq) && p.faq.length > 0) {
        md += `**FAQ:**\n`;
        p.faq.forEach((faq: any) => {
          md += `- **P:** ${faq.question || faq.pergunta || ''}\n`;
          md += `  **R:** ${faq.answer || faq.resposta || ''}\n`;
        });
        md += `\n`;
      }
      
      // Keywords
      if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
        const kwList = p.keywords.map((k: any) => typeof k === 'string' ? k : k.keyword).filter(Boolean);
        if (kwList.length > 0) {
          md += `**Keywords:** ${kwList.join(', ')}\n\n`;
        }
      }
      
      md += `---\n\n`;
    });
  });
  
  return md;
}

function generateCategoriesMarkdown(categories: any[]): string {
  if (!categories || categories.length === 0) return '';
  
  let md = `## 3. CATEGORIAS E SUBCATEGORIAS (${categories.length})\n\n`;
  
  // Agrupar por categoria principal
  const byMain: Record<string, any[]> = {};
  categories.forEach(c => {
    const main = c.category || 'Outros';
    if (!byMain[main]) byMain[main] = [];
    byMain[main].push(c);
  });
  
  Object.entries(byMain).forEach(([main, subs]) => {
    md += `### ${main}\n`;
    subs.forEach(sub => {
      md += `- **${sub.subcategory}**`;
      if (sub.clinical_tone) md += ` (Tom: ${sub.clinical_tone})`;
      md += `\n`;
      
      if (sub.keywords && Array.isArray(sub.keywords) && sub.keywords.length > 0) {
        const kwList = sub.keywords.map((k: any) => typeof k === 'string' ? k : k.keyword).filter(Boolean);
        if (kwList.length > 0) {
          md += `  - Keywords: ${kwList.slice(0, 5).join(', ')}${kwList.length > 5 ? '...' : ''}\n`;
        }
      }
    });
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateKOLsMarkdown(kols: any[]): string {
  if (!kols || kols.length === 0) return '';
  
  let md = `## 4. ESPECIALISTAS E KEY OPINION LEADERS (${kols.length})\n\n`;
  
  kols.forEach((kol, idx) => {
    md += `### ${idx + 1}. ${kol.full_name}\n`;
    md += `- **Especialidade:** ${kol.specialty || 'N/A'}\n`;
    if (kol.mini_cv) md += `- **Mini CV:** ${stripHtml(kol.mini_cv)}\n`;
    if (kol.website_url) md += `- **Website:** ${kol.website_url}\n`;
    if (kol.instagram_url) md += `- **Instagram:** ${kol.instagram_url}\n`;
    if (kol.youtube_url) md += `- **YouTube:** ${kol.youtube_url}\n`;
    if (kol.lattes_url) md += `- **Lattes:** ${kol.lattes_url}\n`;
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateSpinMarkdown(solutions: any[]): string {
  if (!solutions || solutions.length === 0) return '';
  
  let md = `## 5. SOLUÇÕES SPIN SELLING (${solutions.length})\n\n`;
  
  solutions.forEach((sol, idx) => {
    md += `### ${idx + 1}. ${sol.title || sol.name || 'Solução'}\n`;
    
    if (sol.situation) md += `- **Situação (S):** ${sol.situation}\n`;
    if (sol.problem) md += `- **Problema (P):** ${sol.problem}\n`;
    if (sol.implication) md += `- **Implicação (I):** ${sol.implication}\n`;
    if (sol.need_payoff) md += `- **Necessidade (N):** ${sol.need_payoff}\n`;
    
    if (sol.products && Array.isArray(sol.products) && sol.products.length > 0) {
      md += `- **Produtos Relacionados:** ${sol.products.map((p: any) => p.name || p).join(', ')}\n`;
    }
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateLinksMarkdown(links: any[]): string {
  if (!links || links.length === 0) return '';
  
  let md = `## 6. LINKS E RECURSOS EXTERNOS (${links.length})\n\n`;
  
  // Agrupar por categoria
  const byCategory: Record<string, any[]> = {};
  links.forEach(l => {
    const cat = l.category || 'Outros';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(l);
  });
  
  Object.entries(byCategory).forEach(([category, lks]) => {
    md += `### ${category} (${lks.length})\n`;
    lks.forEach(l => {
      md += `- **${l.name}:** ${l.url}`;
      if (l.description) md += ` - ${l.description}`;
      md += `\n`;
    });
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateLandingPagesMarkdown(pages: any[]): string {
  if (!pages || pages.length === 0) return '';
  
  let md = `## 7. LANDING PAGES (${pages.length})\n\n`;
  
  pages.forEach((page, idx) => {
    md += `### ${idx + 1}. ${page.name}\n`;
    md += `- **ID:** ${page.id}\n`;
    md += `- **Template:** ${page.template || 'N/A'}\n`;
    md += `- **Status:** ${page.status || 'N/A'}\n`;
    md += `- **Última atualização:** ${formatDate(page.updated_at)}\n`;
    
    if (page.selected_product_ids && Array.isArray(page.selected_product_ids) && page.selected_product_ids.length > 0) {
      md += `- **Produtos selecionados:** ${page.selected_product_ids.length}\n`;
    }
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateTestimonialsMarkdown(testimonials: any[]): string {
  if (!testimonials || testimonials.length === 0) return '';
  
  let md = `## 8. DEPOIMENTOS EM VÍDEO (${testimonials.length})\n\n`;
  
  testimonials.forEach((t, idx) => {
    md += `### ${idx + 1}. ${t.client_name || 'Depoimento'}\n`;
    if (t.profession) md += `- **Profissão:** ${t.profession}\n`;
    if (t.video_url) md += `- **Vídeo:** ${t.video_url}\n`;
    if (t.testimonial_text) md += `- **Depoimento:** "${stripHtml(t.testimonial_text)}"\n`;
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateReviewsMarkdown(reviews: any[]): string {
  if (!reviews || reviews.length === 0) return '';
  
  let md = `## 9. AVALIAÇÕES DE CLIENTES (${reviews.length})\n\n`;
  
  reviews.forEach((r, idx) => {
    md += `${idx + 1}. **${r.author_name}** - ${'⭐'.repeat(r.rating || 5)}\n`;
    if (r.review_text) md += `   "${stripHtml(r.review_text)}"\n`;
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateBlogsMarkdown(blogs: any[]): string {
  if (!blogs || blogs.length === 0) return '';
  
  let md = `## 10. BLOG POSTS (${blogs.length})\n\n`;
  
  blogs.forEach((b, idx) => {
    md += `### ${idx + 1}. ${b.title}\n`;
    md += `- **Status:** ${b.status || 'rascunho'}\n`;
    md += `- **Criado em:** ${formatDate(b.created_at)}\n`;
    if (b.meta_description) md += `- **Meta Description:** ${b.meta_description}\n`;
    if (b.keywords && Array.isArray(b.keywords) && b.keywords.length > 0) {
      md += `- **Keywords:** ${b.keywords.join(', ')}\n`;
    }
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateMilestonesMarkdown(milestones: any[]): string {
  if (!milestones || milestones.length === 0) return '';
  
  let md = `## 11. MARCOS HISTÓRICOS (${milestones.length})\n\n`;
  
  // Ordenar por ano
  const sorted = [...milestones].sort((a, b) => (a.year || 0) - (b.year || 0));
  
  sorted.forEach(m => {
    md += `### ${m.year}${m.month ? `/${String(m.month).padStart(2, '0')}` : ''} - ${m.title}\n`;
    if (m.description) md += `${stripHtml(m.description)}\n`;
    if (m.impact) md += `- **Impacto:** ${m.impact}\n`;
    if (m.legacy) md += `- **Legado:** ${m.legacy}\n`;
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

function generateExternalVideosMarkdown(videos: any[]): string {
  if (!videos || videos.length === 0) return '';
  
  let md = `## 12. VÍDEOS EXTERNOS (${videos.length})\n\n`;
  
  videos.forEach((v, idx) => {
    md += `### ${idx + 1}. ${v.title || 'Vídeo'}\n`;
    if (v.platform) md += `- **Plataforma:** ${v.platform}\n`;
    if (v.video_url) md += `- **URL:** ${v.video_url}\n`;
    if (v.description) md += `- **Descrição:** ${stripHtml(v.description)}\n`;
    if (v.transcription) md += `- **Transcrição disponível:** Sim\n`;
    md += `\n`;
  });
  
  md += `---\n\n`;
  return md;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  console.log("📚 export-complete-handbook: Iniciando...");
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse parameters
    let params: HandbookParams = {
      format: 'markdown',
      include_company: true,
      include_products: true,
      include_categories: true,
      include_kols: true,
      include_spin: true,
      include_links: true,
      include_landing_pages: true,
      include_testimonials: true,
      include_reviews: true,
      include_blogs: true,
      include_milestones: true,
      include_external_videos: true,
      approved_only: true
    };
    
    if (req.method === 'POST') {
      const body = await req.json();
      params = { ...params, ...body };
    }
    
    console.log("📚 Parâmetros:", params);
    
    // Collect all data
    const data: Record<string, any> = {};
    
    // Company Profile
    if (params.include_company) {
      const { data: company } = await supabase
        .from('company_profile')
        .select('*')
        .limit(1)
        .single();
      data.company = company;
    }
    
    // Products
    if (params.include_products) {
      let query = supabase.from('products_repository').select('*');
      if (params.approved_only) {
        query = query.eq('approved', true);
      }
      const { data: products } = await query.order('category', { ascending: true });
      data.products = products || [];
    }
    
    // Categories
    if (params.include_categories) {
      const { data: categories } = await supabase
        .from('categories_config')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      data.categories = categories || [];
    }
    
    // KOLs
    if (params.include_kols) {
      let query = supabase.from('key_opinion_leaders').select('*');
      if (params.approved_only) {
        query = query.eq('approved', true);
      }
      const { data: kols } = await query.order('display_order', { ascending: true });
      data.kols = kols || [];
    }
    
    // SPIN Solutions
    if (params.include_spin) {
      const { data: spin } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .order('created_at', { ascending: false });
      data.spin = spin || [];
    }
    
    // External Links
    if (params.include_links) {
      let query = supabase.from('external_links').select('*');
      if (params.approved_only) {
        query = query.eq('approved', true);
      }
      const { data: links } = await query.order('category', { ascending: true });
      data.links = links || [];
    }
    
    // Landing Pages
    if (params.include_landing_pages) {
      const { data: pages } = await supabase
        .from('landing_pages')
        .select('id, name, template, status, updated_at, selected_product_ids')
        .order('updated_at', { ascending: false });
      data.landing_pages = pages || [];
    }
    
    // Video Testimonials
    if (params.include_testimonials) {
      let query = supabase.from('video_testimonials').select('*');
      if (params.approved_only) {
        query = query.eq('approved', true);
      }
      const { data: testimonials } = await query.order('display_order', { ascending: true });
      data.testimonials = testimonials || [];
    }
    
    // Manual Reviews
    if (params.include_reviews) {
      let query = supabase.from('manual_reviews').select('*');
      if (params.approved_only) {
        query = query.eq('approved', true);
      }
      const { data: reviews } = await query.order('rating', { ascending: false });
      data.reviews = reviews || [];
    }
    
    // Blog Posts
    if (params.include_blogs) {
      const { data: blogs } = await supabase
        .from('blog_posts')
        .select('id, title, status, created_at, meta_description, keywords')
        .order('created_at', { ascending: false });
      data.blogs = blogs || [];
    }
    
    // Milestones
    if (params.include_milestones) {
      let query = supabase.from('company_milestones').select('*');
      if (params.approved_only) {
        query = query.eq('is_published', true);
      }
      const { data: milestones } = await query.order('year', { ascending: true });
      data.milestones = milestones || [];
    }
    
    // External Videos
    if (params.include_external_videos) {
      const { data: videos } = await supabase
        .from('external_videos')
        .select('*')
        .order('created_at', { ascending: false });
      data.external_videos = videos || [];
    }
    
    // Generate output based on format
    let output: string;
    let contentType: string;
    let filename: string;
    
    const companyName = data.company?.company_name || 'Empresa';
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (params.format === 'json') {
      output = JSON.stringify({
        meta: {
          generated_at: new Date().toISOString(),
          company_name: companyName,
          version: '1.0.0',
          sections_included: Object.keys(data).filter(k => data[k] && (Array.isArray(data[k]) ? data[k].length > 0 : true))
        },
        data
      }, null, 2);
      contentType = 'application/json';
      filename = `apostila-${dateStr}.json`;
    } else if (params.format === 'html') {
      // Generate HTML version
      let md = generateMarkdown(data, companyName, dateStr);
      output = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apostila Completa - ${companyName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
    h1 { color: #1a1a2e; border-bottom: 3px solid #4a90d9; padding-bottom: 10px; }
    h2 { color: #16213e; margin-top: 40px; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; }
    h3 { color: #1f4068; margin-top: 25px; }
    h4 { color: #2c5282; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f8f9fa; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    hr { border: none; border-top: 1px solid #e8e8e8; margin: 30px 0; }
    ul, ol { padding-left: 25px; }
    li { margin: 5px 0; }
    strong { color: #2d3748; }
    .toc { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .toc a { color: #4a90d9; text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    @media print { body { font-size: 11pt; } }
  </style>
</head>
<body>
${convertMarkdownToHtml(md)}
</body>
</html>`;
      contentType = 'text/html';
      filename = `apostila-${dateStr}.html`;
    } else {
      // Default: Markdown
      output = generateMarkdown(data, companyName, dateStr);
      contentType = 'text/markdown';
      filename = `apostila-${dateStr}.md`;
    }
    
    console.log(`📚 Apostila gerada: ${output.length} caracteres em formato ${params.format}`);
    
    return new Response(output, {
      headers: {
        ...corsHeaders,
        'Content-Type': `${contentType}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Erro ao gerar apostila:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      details: 'Erro ao gerar apostila completa'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function generateMarkdown(data: any, companyName: string, dateStr: string): string {
  let md = `# APOSTILA COMPLETA - ${companyName.toUpperCase()}\n\n`;
  md += `**Data de Geração:** ${formatDate(dateStr)}\n\n`;
  md += `---\n\n`;
  
  // Sumário
  md += `## SUMÁRIO\n\n`;
  const sections = [];
  if (data.company) sections.push('1. Perfil da Empresa');
  if (data.products?.length > 0) sections.push(`2. Catálogo de Produtos (${data.products.length})`);
  if (data.categories?.length > 0) sections.push(`3. Categorias (${data.categories.length})`);
  if (data.kols?.length > 0) sections.push(`4. Especialistas (${data.kols.length})`);
  if (data.spin?.length > 0) sections.push(`5. Soluções SPIN Selling (${data.spin.length})`);
  if (data.links?.length > 0) sections.push(`6. Links Externos (${data.links.length})`);
  if (data.landing_pages?.length > 0) sections.push(`7. Landing Pages (${data.landing_pages.length})`);
  if (data.testimonials?.length > 0) sections.push(`8. Depoimentos (${data.testimonials.length})`);
  if (data.reviews?.length > 0) sections.push(`9. Avaliações (${data.reviews.length})`);
  if (data.blogs?.length > 0) sections.push(`10. Blog Posts (${data.blogs.length})`);
  if (data.milestones?.length > 0) sections.push(`11. Marcos Históricos (${data.milestones.length})`);
  if (data.external_videos?.length > 0) sections.push(`12. Vídeos Externos (${data.external_videos.length})`);
  
  sections.forEach(s => md += `- ${s}\n`);
  md += `\n---\n\n`;
  
  // Gerar cada seção
  md += generateCompanyMarkdown(data.company);
  md += generateProductsMarkdown(data.products);
  md += generateCategoriesMarkdown(data.categories);
  md += generateKOLsMarkdown(data.kols);
  md += generateSpinMarkdown(data.spin);
  md += generateLinksMarkdown(data.links);
  md += generateLandingPagesMarkdown(data.landing_pages);
  md += generateTestimonialsMarkdown(data.testimonials);
  md += generateReviewsMarkdown(data.reviews);
  md += generateBlogsMarkdown(data.blogs);
  md += generateMilestonesMarkdown(data.milestones);
  md += generateExternalVideosMarkdown(data.external_videos);
  
  md += `\n---\n\n`;
  md += `*Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}*\n`;
  
  return md;
}

function convertMarkdownToHtml(md: string): string {
  return md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\| (.+) \|$/gm, (match, content) => {
      const cells = content.split(' | ').map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .replace(/^\|[-\s|]+\|$/gm, '')
    .replace(/(<tr>.*<\/tr>\n)+/g, (match) => `<table>${match}</table>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h|<ul|<table|<hr)/g, '$1')
    .replace(/(<\/h\d>|<\/ul>|<\/table>|<hr>)<\/p>/g, '$1');
}
