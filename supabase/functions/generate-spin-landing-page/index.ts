import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const seoDescription = `${solution.title}: Solução completa com ${products.map(p => p.name).join(', ')}. ${successCases.length} casos de sucesso comprovados. ${painMetrics.frequency || 'Alta'} frequência no mercado.`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${solution.title} | ${company?.company_name || 'Landing Page'}</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${seoDescription.substring(0, 160)}">
  <meta name="keywords" content="${keywords}">
  <meta name="author" content="${company?.company_name || ''}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${solution.title}">
  <meta property="og:description" content="${seoDescription.substring(0, 160)}">
  <meta property="og:image" content="${mainProduct.image_url || ''}">
  <meta property="og:type" content="website">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${solution.title}">
  <meta name="twitter:description" content="${seoDescription.substring(0, 160)}">
  <meta name="twitter:image" content="${mainProduct.image_url || ''}">
  
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --primary: #8b5cf6;
      --primary-dark: #7c3aed;
      --secondary: #ec4899;
      --accent: #06b6d4;
      --dark: #1e293b;
      --light: #f8fafc;
      --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gradient-alt: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: var(--dark);
      background: var(--light);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    /* Hero Section with 16:9 Banner */
    .hero {
      background: white;
      padding: 0;
      position: relative;
    }
    
    .hero-image-container {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
    }
    
    .hero-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    
    .hero-image-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(139, 92, 246, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      backdrop-filter: blur(10px);
    }
    
    .hero-content-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      padding: 60px 20px 40px;
      color: white;
    }
    
    .hero-content {
      position: relative;
      z-index: 1;
    }
    
    .hero h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 800;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
      animation: fadeInUp 0.8s ease;
    }
    
    .hero p {
      font-size: clamp(1.1rem, 2vw, 1.4rem);
      margin-bottom: 40px;
      opacity: 0.95;
      animation: fadeInUp 0.8s ease 0.2s both;
    }
    
    .cta-button {
      display: inline-block;
      background: white;
      color: var(--primary);
      padding: 18px 40px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 700;
      font-size: 1.2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      animation: fadeInUp 0.8s ease 0.4s both;
    }
    
    .cta-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(0,0,0,0.4);
    }
    
    /* Products Grid */
    .products-section {
      padding: 80px 0;
      background: white;
    }
    
    .section-title {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      text-align: center;
      margin-bottom: 60px;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      margin-top: 40px;
    }
    
    .product-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .product-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.15);
      border-color: var(--primary);
    }
    
    .product-image {
      width: 100%;
      height: 250px;
      object-fit: cover;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    
    .product-content {
      padding: 30px;
    }
    
    .product-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 15px;
      color: var(--dark);
    }
    
    .product-description {
      color: #64748b;
      margin-bottom: 20px;
      line-height: 1.8;
    }
    
    .product-benefits {
      list-style: none;
      margin-top: 20px;
    }
    
    .product-benefits li {
      padding: 8px 0;
      padding-left: 30px;
      position: relative;
      color: #475569;
    }
    
    .product-benefits li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--primary);
      font-weight: 700;
      font-size: 1.2rem;
    }
    
    /* Success Cases Carousel */
    .success-section {
      padding: 80px 0;
      background: var(--gradient);
      color: white;
      overflow: hidden;
    }
    
    .carousel-wrapper {
      overflow: hidden;
      margin-top: 40px;
      position: relative;
    }
    
    .carousel-track {
      display: flex;
      gap: 30px;
      animation: scroll-carousel 40s linear infinite;
      width: fit-content;
    }
    
    .carousel-track:hover {
      animation-play-state: paused;
    }
    
    @keyframes scroll-carousel {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    
    .success-card {
      min-width: 400px;
      background: rgba(255,255,255,0.95);
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      color: var(--dark);
      flex-shrink: 0;
    }
    
    .success-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .success-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    
    .success-info h4 {
      font-size: 1.2rem;
      margin-bottom: 5px;
      color: var(--dark);
    }
    
    .success-info p {
      font-size: 0.9rem;
      color: #64748b;
      margin: 2px 0;
    }
    
    .success-results {
      font-style: italic;
      line-height: 1.8;
      color: #475569;
      border-left: 4px solid var(--primary);
      padding-left: 20px;
      margin-top: 20px;
    }
    
    /* SPIN Journey */
    .journey-section {
      padding: 80px 0;
      background: white;
    }
    
    .journey-timeline {
      max-width: 900px;
      margin: 60px auto 0;
      position: relative;
    }
    
    .journey-timeline::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, var(--primary), var(--secondary));
      transform: translateX(-50%);
    }
    
    .journey-item {
      position: relative;
      margin-bottom: 60px;
      display: flex;
      gap: 40px;
      align-items: center;
    }
    
    .journey-item:nth-child(even) {
      flex-direction: row-reverse;
    }
    
    .journey-content {
      flex: 1;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }
    
    .journey-icon {
      width: 60px;
      height: 60px;
      background: var(--gradient);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      z-index: 1;
      flex-shrink: 0;
    }
    
    .journey-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    
    .journey-text {
      font-size: 1.1rem;
      color: var(--dark);
      line-height: 1.8;
    }
    
    .journey-author {
      margin-top: 15px;
      font-size: 0.9rem;
      color: #64748b;
      font-style: italic;
    }
    
    /* Metrics Section */
    .metrics-section {
      padding: 80px 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      margin-top: 60px;
    }
    
    .metric-card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 40px 30px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .metric-card:hover {
      background: rgba(255,255,255,0.2);
      transform: translateY(-5px);
    }
    
    .metric-icon {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 10px;
    }
    
    .metric-label {
      font-size: 1rem;
      opacity: 0.9;
    }
    
    /* CTA Final */
    .cta-final {
      padding: 100px 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      text-align: center;
    }
    
    .cta-final h2 {
      font-size: clamp(2rem, 4vw, 3rem);
      margin-bottom: 30px;
      font-weight: 800;
    }
    
    .cta-final p {
      font-size: 1.3rem;
      margin-bottom: 40px;
      opacity: 0.95;
    }
    
    /* Footer */
    footer {
      background: var(--dark);
      color: white;
      padding: 40px 0;
      text-align: center;
    }
    
    footer a {
      color: var(--accent);
      text-decoration: none;
    }
    
    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .journey-timeline::before {
        left: 30px;
      }
      
      .journey-item,
      .journey-item:nth-child(even) {
        flex-direction: row;
      }
      
      .journey-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }
      
      .success-card {
        min-width: 320px;
      }
    }
  </style>
</head>
<body>
  
  <!-- Hero Section with 16:9 Banner -->
  <section class="hero">
    <div class="hero-image-container">
      <img 
        src="${heroImageSrc}" 
        alt="${heroImageAlt}"
        class="hero-image"
        loading="eager"
      />
      ${heroImageBadge ? `
        <div class="hero-image-badge">${heroImageBadge}</div>
      ` : ''}
      
      <div class="hero-content-overlay">
        <div class="container">
          <div class="hero-content">
            <h1 style="font-size: clamp(2rem, 5vw, 3.5rem); margin-bottom: 20px; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
              ${solution.title}
            </h1>
            <p style="font-size: clamp(1.1rem, 2vw, 1.4rem); margin-bottom: 30px; opacity: 0.95;">
              ${products.length} Produto${products.length > 1 ? 's' : ''} Incluído${products.length > 1 ? 's' : ''}
            </p>
            <a href="${solution.custom_url?.url || mainProduct.product_url || '#contato'}" 
               style="display: inline-block; background: white; color: #8b5cf6; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); transition: all 0.3s ease;"
               onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 15px 40px rgba(0,0,0,0.4)'"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 30px rgba(0,0,0,0.3)'">
              ${solution.custom_url?.label || 'Solicitar Demonstração'} →
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Products Section -->
  <section class="products-section">
    <div class="container">
      <h2 class="section-title">Soluções Incluídas</h2>
      <div class="products-grid">
        ${products.map(product => `
          <div class="product-card">
            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="product-image" loading="lazy">` : ''}
            <div class="product-content">
              <h3 class="product-title">${product.name}</h3>
              <p class="product-description">${product.description || ''}</p>
              ${product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0 ? `
                <ul class="product-benefits">
                  ${product.benefits.slice(0, 4).map((benefit: string) => `<li>${benefit}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  
  ${successCases.length > 0 ? `
  <!-- Success Cases Carousel -->
  <section class="success-section">
    <div class="container">
      <h2 class="section-title" style="color: white;">💬 Casos Reais de Transformação</h2>
      <div class="carousel-wrapper">
        <div class="carousel-track">
          ${[...successCases, ...successCases].map((sc: any) => `
            <article class="success-card">
              <div class="success-header">
                <div class="success-avatar">${sc.client_name ? sc.client_name.charAt(0).toUpperCase() : 'C'}</div>
                <div class="success-info">
                  <h4>${sc.client_name || 'Cliente'}</h4>
                  ${sc.specialty ? `<p><strong>${sc.specialty}</strong></p>` : ''}
                  ${sc.city && sc.state ? `<p>${sc.city}/${sc.state}</p>` : ''}
                  ${sc.clinic_name ? `<p>${sc.clinic_name}</p>` : ''}
                </div>
              </div>
              <div class="success-results">
                "${sc.results_achieved || 'Resultados excepcionais alcançados'}"
              </div>
              ${sc.instagram ? `
                <p style="margin-top: 15px; color: var(--primary); font-size: 0.9rem;">
                  📱 <a href="https://instagram.com/${sc.instagram}" target="_blank" style="color: var(--primary); text-decoration: none;">@${sc.instagram}</a>
                </p>
              ` : ''}
            </article>
          `).join('')}
        </div>
      </div>
    </div>
  </section>
  ` : ''}
  
  ${realQuotes.length > 0 ? `
  <!-- SPIN Journey -->
  <section class="journey-section">
    <div class="container">
      <h2 class="section-title">Jornada de Transformação</h2>
      <div class="journey-timeline">
        ${realQuotes.map((quote: any, index: number) => {
          const icons = ['🎯', '⚠️', '✅', '🚀'];
          const labels = ['DESEJO', 'DOR', 'SOLUÇÃO', 'RESULTADO'];
          return `
            <div class="journey-item">
              <div class="journey-content">
                <div class="journey-label">${labels[index % 4]}</div>
                <p class="journey-text">${
                  index % 4 === 0 ? quote.desire :
                  index % 4 === 1 ? quote.pain :
                  index % 4 === 2 ? solution.title :
                  quote.expected_result
                }</p>
                ${quote.client_name ? `<p class="journey-author">— ${quote.client_name}</p>` : ''}
              </div>
              <div class="journey-icon">${icons[index % 4]}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </section>
  ` : ''}
  
  ${Object.keys(painMetrics).length > 0 ? `
  <!-- Metrics Section -->
  <section class="metrics-section">
    <div class="container">
      <h2 class="section-title" style="color: white;">📊 Impacto Comprovado</h2>
      <div class="metrics-grid">
        ${painMetrics.roi ? `
          <div class="metric-card">
            <div class="metric-icon">💰</div>
            <div class="metric-value">${painMetrics.roi}</div>
            <div class="metric-label">Retorno sobre Investimento</div>
          </div>
        ` : ''}
        ${painMetrics.delivery_time ? `
          <div class="metric-card">
            <div class="metric-icon">⚡</div>
            <div class="metric-value">${painMetrics.delivery_time}</div>
            <div class="metric-label">Tempo de Entrega</div>
          </div>
        ` : ''}
        ${painMetrics.patient_loss_avoided ? `
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-value">${painMetrics.patient_loss_avoided}</div>
            <div class="metric-label">Perda de Pacientes Evitada</div>
          </div>
        ` : ''}
        ${painMetrics.monthly_savings ? `
          <div class="metric-card">
            <div class="metric-icon">💵</div>
            <div class="metric-value">${painMetrics.monthly_savings}</div>
            <div class="metric-label">Economia Mensal</div>
          </div>
        ` : ''}
      </div>
    </div>
  </section>
  ` : ''}
  
  <!-- CTA Final -->
  <section class="cta-final">
    <div class="container">
      <h2>Pronto para Transformar Seu Negócio?</h2>
      <p>Solicite uma demonstração gratuita e veja como podemos ajudar</p>
      <a href="${solution.custom_url?.url || mainProduct.product_url || '#contato'}" class="cta-button">
        ${solution.custom_url?.label || 'Falar com Especialista'} →
      </a>
    </div>
  </section>
  
  <!-- Footer -->
  <footer>
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} ${company?.company_name || 'Landing Page'}. Todos os direitos reservados.</p>
      ${company?.instagram ? `<p style="margin-top: 10px;"><a href="https://instagram.com/${company.instagram}" target="_blank">📱 Instagram</a></p>` : ''}
      ${company?.phone ? `<p style="margin-top: 5px;"><a href="tel:${company.phone}">📞 ${company.phone}</a></p>` : ''}
    </div>
  </footer>
  
  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${solution.title}",
    "description": "${seoDescription}",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "BRL",
      "offerCount": "${products.length}"
    }
    ${successCases.length > 0 ? `,
    "review": ${JSON.stringify(successCases.map((sc: any) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": sc.client_name || "Cliente"
      },
      "reviewBody": sc.results_achieved || "",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5"
      }
    })))}` : ''}
  }
  </script>
  
</body>
</html>`;

  return html;
}
