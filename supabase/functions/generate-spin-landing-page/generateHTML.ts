// Função auxiliar para gerar o HTML da Landing Page com CSS padronizado
export function generateLandingPageHTML(solution: any, products: any[], company: any): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const pain_metrics = solution.pain_metrics || {};
  const faqs = solution.faq || [];
  
  // Usar textos customizados se existirem
  const customText = solution.landing_page_custom_text || {};
  
  const finalMetricsTitle = customText.metrics_title || 'Métricas de Impacto Comprovadas';
  const finalMetricsSubtitle = customText.metrics_subtitle || 
    'Resultados reais e mensuráveis de clínicas odontológicas brasileiras que transformaram seu atendimento, produtividade e lucratividade com esta solução integrada';
  const finalFaqTitle = customText.faq_title || 'Perguntas Frequentes';
  const finalCtaText = customText.cta_text || 'Fale agora com nossos especialistas e transforme sua clínica';
  
  // HERO IMAGE (prioridade CORRETA: manual > IA > NADA)
  let heroImageSrc = '';
  let heroImageAlt = 'Banner hero';

  // 1️⃣ PRIORIDADE MÁXIMA: Upload Manual
  if (solution.ai_generated_images?.hero_banner?.mode === 'manual_upload') {
    const manualUpload = solution.ai_generated_images.hero_banner.manual_upload;
    if (manualUpload?.src) {
      heroImageSrc = manualUpload.src;
      heroImageAlt = manualUpload.alt || 'Banner hero personalizado';
    }
  }

  // 2️⃣ SEGUNDA PRIORIDADE: Imagem Gerada por IA
  else if (solution.ai_generated_images?.hero_banner?.mode === 'ai_generated') {
    const aiGenerated = solution.ai_generated_images.hero_banner.ai_generated;
    if (aiGenerated?.src) {
      heroImageSrc = aiGenerated.src;
      heroImageAlt = `Banner hero - ${solution.title}`;
    }
  }

  // ❌ REMOVIDO: Fallbacks para produto e placeholder
  // Se não configurou banner (mode === null ou 'none'), heroImageSrc fica vazio

  // Gerar subtítulo do hero baseado no sales_pitch (resumido)
  const defaultHeroSubtitle = solution.sales_pitch 
    ? solution.sales_pitch.substring(0, 120) + (solution.sales_pitch.length > 120 ? '...' : '')
    : `Solução completa com ${products.map(p => p.name).join(', ')}`;
  
  const finalHeroTitle = customText.hero_title || solution.title;
  const finalHeroSubtitle = customText.hero_subtitle || defaultHeroSubtitle;

  // Formatação do tipo de dor como badge
  const painTypeLabels: Record<string, string> = {
    delivery_speed: 'Velocidade de Entrega',
    competitive_edge: 'Vantagem Competitiva',
    patient_loss: 'Retenção de Pacientes',
    training_fear: 'Capacitação Profissional',
    high_lab_costs: 'Redução de Custos',
    lab_dependency: 'Independência Operacional',
    financial_roi: 'Retorno Financeiro',
    quality_durability: 'Qualidade Premium'
  };
  const badge = painTypeLabels[solution.pain_type] || 'SOLUÇÃO ODONTOLÓGICA';

  // Selecionar top 3 métricas para exibir
  const metricsArray = Object.entries(pain_metrics).slice(0, 3);

  // Links institucionais do rodapé
  const institutionalLinks = company?.institutional_links || [];

  // SEO
  const seoTitle = `${solution.title} | ${company?.company_name || 'Smart Dent'}`;
  const seoDescription = finalHeroSubtitle.substring(0, 160);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="description" content="${escapeHtml(seoDescription)}">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  
  <style>
    /* ===== DESIGN SYSTEM GEMINI V4.5 ===== */
    :root {
      /* Cores do Logo Smart Dent */
      --primary-dark: #3E4B5E;
      --primary-gradient-dark: #1e293b;
      --cta-bg-color: #3E4B5E;
      --accent-tech: #EE7A3E;
      --accent-glow: #FF9B67;
      
      /* Cores de Uso Geral */
      --text-color: #333333;
      --muted: #64748b;
      --card-bg: #ffffff;
      --background-color: #f8fafc;
      --section-light-bg: #fdfdfd;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      scroll-behavior: smooth;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }

    .section-padding {
      padding: 4rem 0;
    }

    h1, h2, h3 {
      color: var(--primary-dark);
      font-weight: 800;
      letter-spacing: -0.8px;
    }

    /* ===== HEADER COM MENU ===== */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 0;
      position: relative;
      z-index: 10;
    }

    .banner {
      width: 180px;
      height: auto;
    }

    .main-nav a {
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      margin-left: 1.5rem;
      transition: color 0.2s;
    }

    .main-nav a:hover {
      color: var(--accent-tech);
    }

    /* ===== HERO IMAGE - MODERN GLOSSY ===== */
    .image1-container {
      position: relative;
      width: 100%;
      min-height: 400px;
      aspect-ratio: 16 / 9;
      background: linear-gradient(to bottom, var(--primary-dark), var(--primary-gradient-dark));
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      margin-top: -1rem;
    }

    .image1-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.3;
    }

    .text-overlay {
      position: absolute;
      top: 50%;
      left: 7%;
      transform: translateY(-50%);
      max-width: 50%;
      background: rgba(255, 255, 255, 0.1);
      padding: 32px 40px;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .text-overlay small {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .text-overlay h1 {
      font-size: 48px;
      line-height: 1.1;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
      background: none;
      -webkit-text-fill-color: unset;
    }

    .text-overlay p {
      font-size: 20px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      font-weight: 500;
    }

    /* ===== SEÇÃO DE DEPOIMENTOS - CARROSSEL ===== */
    .testimonials-section {
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-top: 1px solid #eee;
    }

    .testimonials-section h2 {
      font-size: 32px;
      margin-bottom: 3rem;
      text-align: center;
    }

    .testimonials-carousel {
      display: flex;
      overflow-x: scroll;
      gap: 2rem;
      padding: 0 2rem 1rem;
      justify-content: flex-start;
      flex-wrap: nowrap;
      scroll-snap-type: x mandatory;
      width: 100%;
      margin: 0 auto;
      -webkit-overflow-scrolling: touch;
    }

    .testimonial-card {
      background: var(--card-bg);
      min-width: 320px;
      max-width: 380px;
      height: auto;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
      scroll-snap-align: center;
      border: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .rating {
      color: var(--accent-tech);
      font-size: 16px;
      margin-bottom: 0.75rem;
    }

    .rating i {
      margin-right: 2px;
    }

    .testimonial-card p {
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-color);
      margin-bottom: 1.5rem;
      font-style: italic;
    }

    .profile-info {
      display: flex;
      align-items: center;
      margin-top: auto;
    }

    .profile-info img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 1rem;
      border: 2px solid var(--accent-tech);
    }

    .details strong {
      display: block;
      font-size: 16px;
      color: var(--primary-dark);
      font-weight: 700;
    }

    .details small {
      display: block;
      font-size: 13px;
      color: var(--muted);
      font-weight: 500;
    }

    .instagram-link {
      margin-left: auto;
      color: var(--accent-tech);
      font-size: 14px;
      text-decoration: none;
      display: flex;
      align-items: center;
      font-weight: 600;
    }

    .instagram-link i {
      margin-left: 0.4rem;
      font-size: 18px;
    }

    /* ===== SEÇÃO DE MÉTRICAS ===== */
    .metrics-section {
      text-align: center;
      background: var(--section-light-bg);
      padding: 4rem 0;
      border-bottom: 1px solid #eee;
    }

    .metrics-section h2 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .metrics-section > p {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .metrics-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0;
    }

    .metric-card {
      background: var(--card-bg);
      height: 250px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 12px;
      text-align: center;
      flex-direction: column;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e0e0e0;
      transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
      padding: 2rem;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px var(--accent-glow);
      border-color: var(--accent-tech);
    }

    .metrics-cards > div:first-child {
      background: linear-gradient(135deg, var(--primary-dark) 0%, #2a3442 100%);
      border: 1px solid var(--accent-tech);
      box-shadow: 0 0 40px rgba(238, 122, 62, 0.4), 0 15px 50px rgba(0, 0, 0, 0.4);
    }

    .metrics-cards > div:first-child .count {
      color: var(--accent-glow);
      text-shadow: 0 0 15px rgba(255, 155, 103, 0.8);
    }

    .metrics-cards > div:first-child span {
      color: #f0f0f0;
    }

    .metric-card .count {
      font-family: 'Montserrat', sans-serif;
      font-size: 64px;
      font-weight: 900;
      color: var(--accent-tech);
      display: block;
      margin-bottom: 4px;
      line-height: 1;
    }

    .metric-card span {
      font-size: 16px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    /* ===== FAQ - ESTILO GEMINI ===== */
    .faq {
      text-align: center;
      padding: 4rem 0;
      background: var(--section-light-bg);
    }

    .faq h3 {
      font-size: 32px;
      margin-bottom: 3rem;
    }

    .faq details {
      background: var(--card-bg);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid #e2e8f0;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      transition: all 0.3s ease;
      text-align: left;
    }

    .faq details[open] {
      background: #fefefe;
      border-color: var(--accent-tech);
      box-shadow: 0 8px 25px rgba(238, 122, 62, 0.1);
    }

    .faq summary {
      font-weight: 700;
      font-size: 18px;
      color: var(--primary-dark);
      cursor: pointer;
      list-style: none;
      user-select: none;
      transition: color 0.2s;
    }

    .faq summary:hover {
      color: var(--accent-tech);
    }

    .faq summary::-webkit-details-marker {
      display: none;
    }

    .faq summary::before {
      content: "▶";
      display: inline-block;
      margin-right: 12px;
      font-size: 12px;
      color: var(--accent-tech);
      font-weight: 900;
      transition: transform 0.2s, color 0.2s;
    }

    .faq details[open] summary::before {
      transform: rotate(90deg);
    }

    .faq details p {
      font-size: 16px;
      line-height: 1.7;
      color: var(--text-color);
      padding-top: 1rem;
      border-top: 1px dashed #e2e8f0;
      margin-top: 1rem;
    }

    .faq details p * {
      all: unset;
      display: inline;
    }

    .biocompatible-note {
      margin-top: 1.5rem;
      padding: 1rem;
      border-left: 4px solid var(--accent-tech);
      background: #fffaf5;
      font-style: italic;
      color: var(--primary-dark);
      font-weight: 600;
      border-radius: 4px;
    }

    /* ===== CTA - GRADIENTE GEMINI ===== */
    .cta {
      text-align: center;
      padding: 4rem 0;
      background: linear-gradient(135deg, var(--accent-tech) 0%, var(--accent-glow) 100%);
      color: white;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.1);
    }

    .cta p {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 2rem;
      line-height: 1.3;
      color: white;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.3);
    }

    .cta button {
      background: linear-gradient(to top, var(--primary-dark), #4a5c73);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 22px;
      border: none;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), inset 0 2px 5px rgba(255,255,255,0.2);
      transition: all 0.1s ease;
    }

    .cta button:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255,255,255,0.3);
    }

    .sticky-cta {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      padding: 10px 20px;
      background: var(--primary-dark);
      color: white;
      box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      text-align: center;
    }

    .sticky-cta button {
      width: 90%;
      padding: 14px 20px;
      font-size: 18px;
      background: var(--accent-tech);
      color: white;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }

    /* ===== FOOTER - CORES DO LOGO ===== */
    footer {
      background: linear-gradient(to bottom, var(--primary-dark), var(--primary-gradient-dark));
      padding: 3rem 0 2rem;
    }

    .footer-columns {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 2rem;
    }

    .footer-columns > div {
      flex: 1;
      min-width: 250px;
    }

    .footer-columns strong {
      font-weight: 700;
      display: block;
      margin-bottom: 0.75rem;
      font-size: 18px;
      color: var(--accent-glow);
    }

    .footer-columns p {
      font-size: 15px;
      line-height: 1.8;
      margin: 0.5rem 0;
      color: #ccc;
    }

    .footer-columns a {
      color: #b0c4de;
      text-decoration: none;
      font-size: 15px;
      display: block;
      margin: 0.6rem 0;
      transition: color 0.2s;
    }

    .footer-columns a:hover {
      color: var(--accent-tech);
      text-decoration: underline;
    }

    /* ===== RESPONSIVO TABLET ===== */
    @media screen and (max-width: 1024px) {
      .text-overlay {
        max-width: 65%;
        padding: 28px 32px;
      }
      .text-overlay h1 {
        font-size: 38px;
      }
      .image1-container {
        aspect-ratio: 4 / 3;
      }
    }

    /* ===== RESPONSIVO MOBILE ===== */
    @media screen and (max-width: 768px) {
      .main-nav {
        display: none;
      }
      .header {
        justify-content: center;
      }

      .image1-container {
        min-height: 300px;
        border-radius: 0;
        aspect-ratio: unset;
      }
      
      .text-overlay {
        position: static;
        transform: none;
        max-width: 100%;
        padding: 24px;
        border-radius: 0;
        box-shadow: none;
        border: none;
        background: var(--primary-dark);
        backdrop-filter: none;
      }

      .text-overlay h1 {
        font-size: 30px;
        margin-top: 0;
        color: white;
      }
      
      .text-overlay p {
        color: #e0e0e0;
      }
      
      .metrics-section {
        padding: 3rem 0;
      }
      
      .cta {
        padding: 3rem 0;
      }
      
      .cta p {
        font-size: 22px;
        margin-bottom: 1.5rem;
      }
      
      .faq {
        padding: 3rem 0;
      }
      
      .testimonials-section {
        padding: 3rem 0;
      }

      /* MANTÉM OS 3 CARDS DE MÉTRICAS EM LINHA */
      .metrics-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        padding: 0 1rem;
      }
      
      .metric-card {
        min-width: unset;
        height: 180px;
        padding: 1rem;
      }
      
      .metric-card .count {
        font-size: 48px;
      }
      
      .metric-card span {
        font-size: 14px;
        line-height: 1.3;
        min-height: 35px;
        text-align: center;
        word-break: break-word;
      }

      /* Carrossel de Depoimentos Mobile */
      .testimonials-carousel {
        padding: 0 1.5rem 1rem;
        gap: 1rem;
      }
      
      .testimonial-card {
        min-width: 85vw;
        height: auto;
        scroll-snap-align: start;
      }

      .sticky-cta {
        display: block;
      }
      
      .cta .container {
        display: none;
      }
      
      .footer-columns {
        flex-direction: column;
        gap: 2rem;
      }
    }

    /* ===== HERO SEM IMAGEM (texto em fundo sólido) ===== */
    .hero-text-only {
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-gradient-dark) 100%);
      padding: 4rem 2rem;
      text-align: center;
      color: white;
    }

    .hero-text-only small {
      font-size: 15px;
      font-weight: 700;
      color: var(--accent-glow);
      background: rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
      display: inline-block;
      box-shadow: 0 0 10px rgba(255, 155, 103, 0.3);
      border: 1px solid var(--accent-tech);
    }

    .hero-text-only h1 {
      font-size: 48px;
      line-height: 1.2;
      font-weight: 900;
      color: white;
      margin: 16px 0;
      text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
    }

    .hero-text-only p {
      font-size: 20px;
      line-height: 1.7;
      color: #e0e0e0;
      margin: 0;
      max-width: 700px;
      margin: 0 auto;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <!-- Header com Logo e Menu -->
  <div class="container">
    <div class="header">
      <img src="${escapeHtml(company?.logo_url || 'https://via.placeholder.com/150x50?text=Logo')}" alt="Logo ${escapeHtml(company?.company_name || 'Empresa')}" class="banner">
      <nav class="main-nav">
        <a href="https://loja.smartdent.com.br/">Loja</a>
        <a href="https://parametros.smartdent.com.br/base-conhecimento">Blog</a>
        <a href="https://api.whatsapp.com/send/?phone=5516993831794&text=Ol%C3%A1+Smart+Dent%2C+gostaria+de+mais+informa%C3%A7%C3%B5es" target="_blank">Fale conosco</a>
      </nav>
    </div>
  </div>

  <!-- Hero Image com Texto Sobreposto -->
  <div class="container">
    ${heroImageSrc ? `
    <!-- Hero com imagem de fundo -->
    <div class="image1-container">
      <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(heroImageAlt)}">
      <div class="text-overlay">
        <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
        <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
        <p data-editable="true" data-field="hero_subtitle">${escapeHtml(finalHeroSubtitle)}</p>
      </div>
    </div>
    ` : `
    <!-- Hero sem imagem (apenas texto em fundo sólido) -->
    <div class="hero-text-only">
      <small><i class="fas fa-microchip"></i> ${escapeHtml(badge)}</small>
      <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
      <p data-editable="true" data-field="hero_subtitle">${escapeHtml(finalHeroSubtitle)}</p>
    </div>
    `}
    </div>
  </div>

  ${metricsArray.length > 0 ? `
  <!-- Seção de Métricas -->
  <div class="container section-padding">
    <section class="metrics-section">
      <h2 data-editable="true" data-field="metrics_title">${escapeHtml(finalMetricsTitle)}</h2>
      <p data-editable="true" data-field="metrics_subtitle">${escapeHtml(finalMetricsSubtitle)}</p>
      <div class="metrics-cards" id="metrics-counter">
        ${metricsArray.map(([key, value]) => `
          <div class="metric-card">
            <span class="count" data-target="${value}">${value}</span>
            <span data-editable="true" data-field="metric_label_${escapeHtml(key)}">${escapeHtml(key.replace(/_/g, ' '))}</span>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
  ` : ''}

  ${faqs.length > 0 ? `
  <!-- Seção de FAQs (Acordeão) -->
  <div class="container">
    <section class="faq">
      <h3 data-editable="true" data-field="faq_title">${escapeHtml(finalFaqTitle)}</h3>
      ${faqs.map((faq: any, index: number) => `
        <details>
          <summary data-editable="true" data-field="faq_question_${index}"><i class="fas fa-chart-line"></i> ${escapeHtml(faq.question)}</summary>
          <p data-editable="true" data-field="faq_answer_${index}">${escapeHtml(faq.answer)}</p>
        </details>
      `).join('')}
    </section>
  </div>
  ` : ''}

  ${successCases.length > 0 ? `
  <!-- Seção de Depoimentos com Carrossel -->
  <section class="testimonials-section">
    <div class="container">
      <h2>O que nossos clientes dizem sobre a Solução</h2>
      <div class="testimonials-carousel">
        ${successCases.map(sc => `
          <div class="testimonial-card">
            <div class="rating">
              <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
            </div>
            <p>"${escapeHtml(sc.results_achieved || 'Resultado não especificado')}"</p>
            <div class="profile-info">
              ${sc.client_photo?.src 
                ? `<img src="${escapeHtml(sc.client_photo.src)}" alt="${escapeHtml(sc.client_name)}">` 
                : `<img src="https://via.placeholder.com/80/${escapeHtml(company?.primary_color?.replace('#', '') || '3E4B5E')}/FFFFFF?text=${escapeHtml(sc.client_name?.charAt(0) || '?')}" alt="${escapeHtml(sc.client_name)}">`
              }
              <div class="details">
                <strong>${escapeHtml(sc.client_name)}</strong>
                <small>${escapeHtml(sc.specialty || 'Cliente')}${sc.city ? ' | ' + escapeHtml(sc.city) + '/' + escapeHtml(sc.state) : ''}</small>
              </div>
              ${sc.instagram 
                ? `<a href="https://instagram.com/${escapeHtml(sc.instagram.replace('@', ''))}" target="_blank" class="instagram-link">
                     <i class="fab fa-instagram"></i>
                   </a>` 
                : ''
              }
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  <!-- Sticky CTA Mobile -->
  <div class="sticky-cta">
    <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
      <i class="fas fa-bolt"></i> FALE CONOSCO E ACELERE SUA CLÍNICA
    </button>
  </div>

  <!-- Call to Action -->
  <div class="container">
    <section class="cta">
      <p data-editable="true" data-field="cta_text">${escapeHtml(finalCtaText)}</p>
      <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
        <i class="fas fa-comment-alt"></i> ${escapeHtml(solution.custom_url?.label || 'SOLICITAR DEMONSTRAÇÃO E PREÇO')}
      </button>
    </section>
  </div>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-columns">
        <div>
          <strong>${escapeHtml(company?.company_name || 'Empresa')} - Brasil</strong>
          <p><i class="fas fa-phone"></i> Atendimento: ${escapeHtml(company?.phone_number || '')}</p>
          <p><i class="fas fa-envelope"></i> Comercial: ${escapeHtml(company?.email || '')}</p>
          <p>${escapeHtml(company?.street_address || '')}, ${escapeHtml(company?.address_number || '')}</p>
          <p>${escapeHtml(company?.city || '')} - ${escapeHtml(company?.state || '')}, ${escapeHtml(company?.postal_code || '')}</p>
        </div>
        ${company?.usa_address ? `
        <div>
          <strong>${escapeHtml(company?.company_name || 'Empresa')} - USA</strong>
          <p>${escapeHtml(company.usa_address)}</p>
        </div>
        ` : ''}
        ${institutionalLinks.length > 0 ? `
        <div>
          <strong>Links Úteis</strong>
          ${institutionalLinks.slice(0, 5).map((link: any) => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
          `).join('')}
        </div>
        ` : ''}
      </div>
    </div>
  </footer>

  <!-- Script para Contador Animado de Métricas -->
  <script>
    const counters = document.querySelectorAll('.count');
    const metricsSection = document.getElementById('metrics-counter');
    let hasCounted = false;

    function startCounter(counter) {
      const target = +counter.getAttribute('data-target');
      const duration = 2000;
      let startTimestamp = null;

      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = timestamp - startTimestamp;
        const currentCount = Math.min(Math.floor(progress / duration * target), target);
        
        counter.textContent = currentCount;

        if (progress < duration) {
          window.requestAnimationFrame(step);
        } else {
          counter.textContent = target;
        }
      };

      window.requestAnimationFrame(step);
    }
    
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasCounted) {
          counters.forEach(startCounter);
          hasCounted = true;
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    if (metricsSection) {
      observer.observe(metricsSection);
    }
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
