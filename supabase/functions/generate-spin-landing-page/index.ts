import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== SECURITY & PERFORMANCE HELPERS ====================

// Sanitização XSS: escapar HTML em conteúdo dinâmico
function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Sanitizar URLs (prevenir javascript: e data:)
function sanitizeUrl(url: string): string {
  if (!url) return '#';
  const lower = url.toLowerCase().trim();
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
    console.warn('⚠️ URL perigosa bloqueada:', url);
    return '#';
  }
  return url;
}

// Gerar srcset responsivo (Cloudflare R2 suporta resize)
function generateSrcset(imageUrl: string): string {
  if (!imageUrl || imageUrl === '#') return '';
  const base = imageUrl.split('?')[0];
  return `${base}?w=400 400w, ${base}?w=800 800w, ${base}?w=1200 1200w`;
}

// Critical CSS minificado (inline no <head>)
function generateCriticalCSS(): string {
  return `*{margin:0;padding:0;box-sizing:border-box}:root{--primary:#8b5cf6;--dark:#1e293b;--light:#f8fafc;--accent:#ec4899}body{font-family:'Segoe UI',system-ui,sans-serif;line-height:1.6;color:var(--dark);overflow-x:hidden}.skip-link{position:absolute;top:-40px;left:0;background:var(--primary);color:#fff;padding:8px 16px;text-decoration:none;border-radius:0 0 8px 0;z-index:1000;transition:top .3s}.skip-link:focus{top:0}.hero{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,var(--primary),var(--accent))}.hero img{width:100%;height:100%;object-fit:cover;display:block}.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.3),rgba(0,0,0,.6));display:flex;align-items:center;justify-content:center;color:#fff;text-align:center}.container{max-width:1200px;margin:0 auto;padding:0 20px}.section-title{text-align:center;font-size:2.5rem;margin:60px 0 40px;color:var(--dark)}@media(max-width:768px){.section-title{font-size:1.8rem}.hero{aspect-ratio:4/3}}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solutionId } = await req.json();

    console.log('🚀 generate-spin-landing-page invoked:', {
      timestamp: new Date().toISOString(),
      solutionId
    });

    if (!solutionId) {
      throw new Error('solutionId é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar solução SPIN completa
    const { data: solution, error: solutionError } = await supabaseClient
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solutionId)
      .single();

    if (solutionError || !solution) {
      throw new Error('Solução SPIN não encontrada');
    }

    // Buscar produtos associados
    const { data: products, error: productsError } = await supabaseClient
      .from('products_repository')
      .select('*')
      .in('id', solution.product_ids || []);

    if (productsError) {
      throw new Error('Erro ao buscar produtos');
    }

    // Buscar perfil da empresa
    const { data: company, error: companyError } = await supabaseClient
      .from('company_profile')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Empresa não encontrada, usando valores padrão');
    }

    // Gerar HTML da landing page
    const html = generateLandingPageHTML(solution, products || [], company);

    // Salvar no banco
    const { error: updateError } = await supabaseClient
      .from('spin_selling_solutions')
      .update({
        landing_page_html: html,
        landing_page_generated_at: new Date().toISOString()
      })
      .eq('id', solutionId);

    if (updateError) {
      throw new Error('Erro ao salvar landing page');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Landing page gerada com sucesso',
        htmlLength: html.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: any) {
    console.error('❌ generate-spin-landing-page error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});

function generateLandingPageHTML(solution: any, products: any[], company: any): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const realQuotes = solution.real_quotes || [];
  const painMetrics = solution.pain_metrics || {};
  
  // ✅ BUSCAR IMAGEM HERO (prioridade: manual > IA > produto)
  let heroImageSrc = mainProduct.image_url || '';
  let heroImageAlt = mainProduct.name || 'Banner';
  let heroImageBadge = '';
  
  console.log('🔍 Verificando configuração do banner hero...');
  
  if (solution.ai_generated_images?.hero_banner) {
    const banner = solution.ai_generated_images.hero_banner;
    console.log('📸 Banner config:', JSON.stringify(banner, null, 2));
    
    if (banner.mode === 'manual_upload' && banner.manual_upload?.src) {
      heroImageSrc = banner.manual_upload.src;
      heroImageAlt = banner.manual_upload.alt || 'Banner hero personalizado';
      heroImageBadge = '📸 Imagem Personalizada';
      console.log('✅ Usando banner manual upload');
    } 
    else if (banner.mode === 'ai_generated' && banner.ai_generated?.src) {
      heroImageSrc = banner.ai_generated.src;
      heroImageAlt = `Banner hero - ${solution.title}`;
      heroImageBadge = '✨ Gerado por IA';
      console.log('✅ Usando banner gerado por IA');
    } else {
      console.warn('⚠️ Banner config existe mas sem imagem válida');
    }
  } else {
    console.log('ℹ️ Sem banner personalizado, usando imagem do produto');
  }
  
  // Construir keywords para SEO
  const keywords = products
    .flatMap(p => p.keywords || [])
    .slice(0, 10)
    .join(', ');

  // Construir descrição SEO
  const seoTitle = `${solution.title} | ${company?.company_name || 'Landing Page'}`;
  const seoDescription = `${solution.title}: Solução completa com ${products.map(p => p.name).join(', ')}. ${successCases.length} casos de sucesso comprovados.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <!-- Complete SEO & Meta Tags -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${sanitizeUrl(solution.custom_url?.url || mainProduct.product_url || '')}">
  <meta name="theme-color" content="#8b5cf6">

  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription.substring(0, 160))}">
  <meta name="keywords" content="${escapeHtml(keywords)}">

  <!-- Open Graph (usar HERO BANNER) -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${escapeHtml(seoDescription)}">
  <meta property="og:image" content="${sanitizeUrl(heroImageSrc)}">
  <meta property="og:url" content="${sanitizeUrl(solution.custom_url?.url || '')}">

  <!-- Twitter Card (usar HERO BANNER) -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seoTitle)}">
  <meta name="twitter:description" content="${escapeHtml(seoDescription)}">
  <meta name="twitter:image" content="${sanitizeUrl(heroImageSrc)}">

  <!-- Preconnect for Performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  ${heroImageSrc ? `<link rel="preconnect" href="${new URL(heroImageSrc).origin}" crossorigin>` : ''}

  <!-- Critical CSS (inline) -->
  <style>${generateCriticalCSS()}</style>

  <!-- Full CSS -->
  <style>
    body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f8f9fa;
  color: #333;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Accessibility Skip Link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #8b5cf6;
  color: white;
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  z-index: 1000;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}

/* Hero Section Styles */
.hero {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-image-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.hero-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.hero-image-container:hover img {
  transform: scale(1.05);
}

.hero-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 0.8em;
    z-index: 2;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.hero-content {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 3em;
  margin-bottom: 0.5em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.hero p {
  font-size: 1.2em;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* General Container Styles */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Section Title Styles */
.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin: 60px 0 40px;
  color: #333;
}

/* Sticky Navigation Styles */
nav {
  position: sticky;
  top: 0;
  background: white;
  z-index: 100;
  padding: 15px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

nav .container {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

nav a {
  color: #8b5cf6;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.3s;
}

nav a:hover {
  color: #ec4899;
}

/* Products Section Styles */
.products-section {
  padding: 40px 0;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.product-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.product-content {
  padding: 20px;
}

.product-content h3 {
  margin-bottom: 0.5em;
  color: #333;
}

.product-content p {
  color: #666;
}

.product-benefits {
  list-style: none;
  padding: 0;
  margin-top: 1em;
}

.product-benefits li {
  padding: 0.5em 0;
  border-bottom: 1px solid #eee;
  color: #4CAF50;
}

.product-benefits li:last-child {
  border-bottom: none;
}

/* Success Section Styles */
.success-section {
    background: linear-gradient(135deg, #6366f1, #d946ef);
    color: white;
    padding: 50px 0;
    overflow: hidden;
}

.carousel-wrapper {
    position: relative;
    max-width: 100%;
    margin: auto;
    overflow: hidden;
}

.carousel-track {
    display: flex;
    transition: transform 0.5s ease-in-out;
    padding-bottom: 20px; /* Espaço para a sombra */
}

.success-card {
    flex: 0 0 80%; /* Largura dos cards */
    margin: 0 1%; /* Espaçamento entre os cards */
    background: rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    text-align: left;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 250px;
    transition: all 0.3s ease;
}

.success-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
}

.success-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
}

.success-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #fff;
    color: #6366f1;
    font-size: 1.5em;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
}

.success-info h4 {
    margin: 0;
    font-size: 1.2em;
    font-weight: 600;
}

.success-info p {
    margin: 5px 0 0;
    font-size: 0.9em;
    color: rgba(255, 255, 255, 0.8);
}

.success-results {
    font-style: italic;
    font-size: 1.1em;
    line-height: 1.4;
    margin: 0;
    padding: 15px;
    border-left: 3px solid #fff;
}

/* CTA Final Section Styles */
.cta-final {
  background-color: #f0f4f8;
  padding: 50px 0;
  text-align: center;
}

.cta-final h2 {
  font-size: 2em;
  margin-bottom: 0.5em;
  color: #333;
}

.cta-final p {
  font-size: 1.2em;
  color: #666;
  margin-bottom: 2em;
}

/* General Button Styles */
.cta-button {
  display: inline-block;
  padding: 12px 30px;
  background-color: #8b5cf6;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: 600;
  transition: background-color 0.3s;
}

.cta-button:hover {
  background-color: #6d28d9;
}

/* Footer Styles */
footer {
  background-color: #333;
  color: #fff;
  text-align: center;
  padding: 20px 0;
}

footer p {
  margin: 0;
  font-size: 0.9em;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .hero {
        aspect-ratio: 4 / 3;
    }

    .hero h1 {
        font-size: 2.5em;
    }

    .section-title {
        font-size: 1.8rem;
    }

    .products-grid {
        grid-template-columns: 1fr;
    }

    .success-card {
        flex: 0 0 95%;
        margin: 0 2.5%;
    }

    .cta-final h2 {
        font-size: 1.7em;
    }

    .cta-final p {
        font-size: 1em;
    }
}
  </style>
</head>
<body>
  
  <!-- Skip Link (Accessibility) -->
  <a href="#main-content" class="skip-link">Pular para conteúdo principal</a>

  <!-- Sticky Navigation -->
  <nav aria-label="Navegação principal" style="position:sticky;top:0;background:white;z-index:100;padding:15px 0;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
    <div class="container" style="display:flex;justify-content:center;gap:30px;flex-wrap:wrap">
      <a href="#produtos" style="color:var(--primary);text-decoration:none;font-weight:600">Produtos</a>
      ${successCases.length > 0 ? '<a href="#casos" style="color:var(--primary);text-decoration:none;font-weight:600">Casos de Sucesso</a>' : ''}
      ${realQuotes.length > 0 ? '<a href="#jornada" style="color:var(--primary);text-decoration:none;font-weight:600">Jornada</a>' : ''}
      <a href="#contato" style="color:var(--primary);text-decoration:none;font-weight:600">Contato</a>
    </div>
  </nav>

  <main id="main-content">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-image-container">
        <img 
          src="${sanitizeUrl(heroImageSrc)}" 
          alt="${escapeHtml(heroImageAlt)}"
          width="1920"
          height="1080"
          fetchpriority="high"
          loading="eager"
          srcset="${generateSrcset(heroImageSrc)}"
          sizes="100vw"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221920%22 height=%221080%22%3E%3Crect fill=%22%238b5cf6%22 width=%221920%22 height=%221080%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2248%22%3E${escapeHtml(solution.title)}%3C/text%3E%3C/svg%3E'"
        />
        ${heroImageBadge ? `<span class="hero-badge" aria-label="Tipo de banner">${escapeHtml(heroImageBadge)}</span>` : ''}
        
        <div class="hero-overlay">
          <div class="container">
            <h1>${escapeHtml(solution.title)}</h1>
            <p>${products.length} Produto${products.length > 1 ? 's' : ''} Incluído${products.length > 1 ? 's' : ''}</p>
            <a 
              href="${sanitizeUrl(solution.custom_url?.url || mainProduct.product_url || '#contato')}" 
              class="cta-button"
              aria-label="Solicitar demonstração do ${escapeHtml(solution.title)}">
              ${escapeHtml(solution.custom_url?.label || 'Solicitar Demonstração')} →
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Produtos -->
    <section id="produtos" class="products-section">
      <div class="container">
        <h2 class="section-title">Soluções Incluídas</h2>
        <div class="products-grid">
          ${products.map(product => `
            <article class="product-card">
              ${product.image_url ? `
                <img 
                  src="${sanitizeUrl(product.image_url)}" 
                  alt="${escapeHtml(product.name)}"
                  width="400"
                  height="300"
                  loading="lazy"
                  onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%2394a3b8%22%3ESem imagem%3C/text%3E%3C/svg%3E'"
                  class="product-image"
                >
              ` : ''}
              <div class="product-content">
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description || '')}</p>
                ${product.benefits?.length > 0 ? `
                  <ul class="product-benefits" role="list">
                    ${product.benefits.slice(0, 4).map((b: string) => 
                      `<li>${escapeHtml(b)}</li>`
                    ).join('')}
                  </ul>
                ` : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>

    ${successCases.length > 0 ? `
    <section id="casos" class="success-section">
      <div class="container">
        <h2 class="section-title" style="color: white;">💬 Casos Reais de Transformação</h2>
        <div class="carousel-wrapper">
          <div class="carousel-track" role="list" aria-label="Casos de sucesso">
            ${successCases.map((sc: any) => `
              <article class="success-card" role="listitem">
                <div class="success-header">
                  <div class="success-avatar" aria-hidden="true">
                    ${sc.client_name ? sc.client_name.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div class="success-info">
                    <h4>${escapeHtml(sc.client_name || 'Cliente')}</h4>
                    ${sc.specialty ? `<p><strong>${escapeHtml(sc.specialty)}</strong></p>` : ''}
                    ${sc.city && sc.state ? `<p>${escapeHtml(sc.city)}/${escapeHtml(sc.state)}</p>` : ''}
                  </div>
                </div>
                <blockquote class="success-results">
                  "${escapeHtml(sc.results_achieved || 'Resultados excepcionais')}"
                </blockquote>
              </article>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- CTA Final -->
    <section class="cta-final">
      <div class="container">
        <h2>Pronto para Transformar Seu Negócio?</h2>
        <p>Solicite uma demonstração gratuita e veja como podemos ajudar</p>
        <a href="${sanitizeUrl(solution.custom_url?.url || mainProduct.product_url || '#contato')}" class="cta-button">
          ${escapeHtml(solution.custom_url?.label || 'Falar com Especialista')} →
        </a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${escapeHtml(company?.company_name || 'Landing Page')}. Todos os direitos reservados.</p>
      ${company?.instagram ? `<p style="margin-top: 10px;"><a href="https://instagram.com/${escapeHtml(company.instagram)}" target="_blank" rel="noopener">📱 Instagram</a></p>` : ''}
    </div>
  </footer>

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": ${JSON.stringify(solution.title)},
    "description": ${JSON.stringify(seoDescription.substring(0, 160))},
    "image": ${JSON.stringify(heroImageSrc)},
    "url": ${JSON.stringify(sanitizeUrl(solution.custom_url?.url || ''))},
    "brand": {
      "@type": "Organization",
      "name": ${JSON.stringify(company?.company_name || '')}
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "BRL",
      "offerCount": ${products.length},
      "availability": "https://schema.org/InStock"
    }
    ${successCases.length > 0 ? `,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "reviewCount": ${successCases.length}
    },
    "review": ${JSON.stringify(successCases.map((sc: any) => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": sc.client_name || "Cliente" },
      "reviewBody": sc.results_achieved || "",
      "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
    })))}` : ''}
  }
  </script>

</body>
</html>`;

  return html;
}
