// Função auxiliar para gerar o HTML da Landing Page com CSS padronizado
export function generateLandingPageHTML(solution: any, products: any[], company: any): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const pain_metrics = solution.pain_metrics || {};
  const faqs = solution.faq || [];
  
  // Usar textos customizados se existirem
  const customText = solution.landing_page_custom_text || {};
  
  const finalMetricsTitle = customText.metrics_title || 'Métricas de Impacto Comprovadas';
  const finalMetricsSubtitle = customText.metrics_subtitle || 'Resultados reais de clínicas que implementaram esta solução';
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* ===== DESIGN SYSTEM PADRONIZADO ===== */
    :root {
      --primary-color: #007bff;
      --accent: #0f766e;
      --accent-2: #0369a1;
      --text-color: #333;
      --foreground: #0f172a;
      --muted: #6b7280;
      --card: #f8fafc;
      --background-color: #f8f9fa;
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
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      padding: 1rem 0;
    }

    .banner {
      width: 150px;
      height: auto;
    }

    /* ===== HERO IMAGE COM OVERLAY ===== */
    .image1-container {
      position: relative;
      width: 100%;
      aspect-ratio: 1200 / 630;
      background-color: var(--card);
      overflow: hidden;
    }

    .image1-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .text-overlay {
      position: absolute;
      top: 20%;
      left: 5%;
      color: #003366;
      max-width: 90%;
    }

    .text-overlay small {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      background: rgba(255,255,255,0.9);
      padding: 4px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 8px;
      display: inline-block;
    }

    .text-overlay h1 {
      font-size: 28px;
      line-height: 1.1;
      letter-spacing: -0.2px;
      font-weight: 700;
      color: #003366;
      margin: 12px 0;
    }

    .text-overlay p {
      font-size: 16px;
      line-height: 1.6;
      color: #444;
      margin: 0;
      max-width: 600px;
    }

    /* ===== SEÇÃO DE CASOS DE SUCESSO COM MARQUEE ===== */
    .success-cases {
      padding: 4rem 0;
      text-align: center;
      background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
      border-radius: 12px;
      margin: 2rem 0;
      overflow: hidden;
    }

    .success-cases h2 {
      font-size: 36px;
      font-weight: 700;
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .success-cases .section-subtitle {
      font-size: 18px;
      color: var(--muted);
      margin-bottom: 3rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Container do Marquee com overflow hidden */
    .testimonials-marquee-container {
      overflow: hidden;
      width: 100%;
      position: relative;
    }

    /* Marquee infinito */
    .testimonials-marquee {
      display: flex;
      gap: 2rem;
      animation: infinite-scroll 60s linear infinite;
      width: fit-content;
    }

    /* Pausar animação ao hover */
    .testimonials-marquee:hover {
      animation-play-state: paused;
    }

    /* Keyframes para scroll infinito */
    @keyframes infinite-scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }

    /* Cards de testemunhos */
    .testimonial-card {
      background: white;
      min-width: 380px;
      max-width: 380px;
      flex-shrink: 0;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
      border: 1px solid rgba(0,0,0,0.05);
      text-align: left;
    }

    .testimonial-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
      border-color: var(--accent);
    }

    .case-avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      margin: 0 auto 1.5rem;
      overflow: hidden;
      border: 4px solid var(--accent);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .case-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .case-avatar.no-photo {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .case-avatar.no-photo span {
      font-size: 36px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .case-content {
      text-align: center;
    }

    .case-content h3 {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .case-meta {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 6px;
      font-weight: 500;
    }

    .case-location {
      font-size: 14px;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .case-instagram {
      margin-bottom: 16px;
    }

    .case-instagram a {
      font-size: 14px;
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .case-instagram a:hover {
      color: var(--accent-2);
      text-decoration: underline;
    }

    .case-results {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      text-align: left;
    }

    .case-results strong {
      display: block;
      font-size: 14px;
      color: var(--accent);
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .case-results p {
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-color);
      margin: 0;
    }

    .case-time {
      font-size: 13px;
      color: var(--muted);
      font-style: italic;
      margin-top: 12px;
    }

    /* ===== SEÇÃO DE MÉTRICAS ===== */
    .metrics-section {
      text-align: center;
      padding: 3rem 0;
    }

    .metrics-section h2 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 0.75rem;
    }

    .metrics-section > p {
      font-size: 16px;
      line-height: 1.6;
      color: var(--muted);
      margin-bottom: 2rem;
    }

    .metrics-cards {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .metric-card {
      background: #ccc;
      flex: 1 1 30%;
      min-width: 100px;
      max-width: 256px;
      height: 256px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      text-align: center;
      padding: 1rem;
      flex-direction: column;
    }

    .metric-card strong {
      font-size: 20px;
      font-weight: 700;
      color: var(--foreground);
      display: block;
      margin-bottom: 8px;
    }

    .metric-card span {
      font-size: 14px;
      color: var(--muted);
    }

    /* ===== FAQs (ACORDEÃO) ===== */
    .faq {
      text-align: center;
      padding: 3rem 0;
    }

    .faq h3 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 2rem;
    }

    .faq details {
      background: #f9f9f9;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
      text-align: left;
    }

    .faq summary {
      font-weight: 600;
      font-size: 16px;
      color: var(--foreground);
      cursor: pointer;
      list-style: none;
      user-select: none;
    }

    .faq summary::-webkit-details-marker {
      display: none;
    }

    .faq summary::before {
      content: "▶ ";
      display: inline-block;
      margin-right: 8px;
      transition: transform 0.2s;
    }

    .faq details[open] summary::before {
      transform: rotate(90deg);
    }

    .faq details p {
      font-size: 16px;
      line-height: 1.6;
      color: #0b1220;
      padding-top: 1rem;
      margin: 0;
    }

    /* ===== CTA ===== */
    .cta {
      text-align: center;
      padding: 3rem 0;
    }

    .cta p {
      font-size: 18px;
      font-weight: 500;
      color: var(--foreground);
      margin-bottom: 1.5rem;
    }

    .cta button {
      background: var(--accent-2);
      color: white;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 16px;
      border: none;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(3,105,161,0.12);
      transition: all 0.3s ease;
    }

    .cta button:hover {
      background: #025a8a;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(3,105,161,0.2);
    }

    /* ===== FOOTER ===== */
    footer {
      background: #101828;
      color: white;
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
      min-width: 200px;
    }

    .footer-columns strong {
      font-weight: 600;
      display: block;
      margin-bottom: 0.5rem;
      font-size: 15px;
    }

    .footer-columns p {
      font-size: 14px;
      line-height: 1.8;
      margin: 0.25rem 0;
    }

    .footer-columns a {
      color: #93c5fd;
      text-decoration: none;
      font-size: 14px;
      display: block;
      margin: 0.5rem 0;
    }

    .footer-columns a:hover {
      text-decoration: underline;
    }

    /* ===== RESPONSIVO ===== */
    @media screen and (max-width: 768px) {
      .text-overlay h1 {
        font-size: 24px;
      }

      .metrics-section h2,
      .faq h3 {
        font-size: 18px;
      }

      .metric-card {
        min-width: 30%;
        padding: 16px;
      }

      .metric-card strong {
        font-size: 18px;
      }

      .cta p {
        font-size: 16px;
      }

      .image1-container {
        aspect-ratio: 4/3;
      }

      .footer-columns {
        flex-direction: column;
      }
    }

    /* ===== HERO SEM IMAGEM (texto em fundo sólido) ===== */
    .hero-text-only {
      background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
      padding: 4rem 2rem;
      text-align: center;
      color: white;
    }

    .hero-text-only small {
      font-size: 13px;
      font-weight: 600;
      color: white;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 8px;
      display: inline-block;
    }

    .hero-text-only h1 {
      font-size: 32px;
      line-height: 1.2;
      font-weight: 700;
      color: white;
      margin: 16px 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .hero-text-only p {
      font-size: 18px;
      line-height: 1.6;
      color: rgba(255,255,255,0.95);
      margin: 0;
      max-width: 700px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .success-cases h2 {
        font-size: 28px;
      }
      
      .testimonials-marquee {
        animation-duration: 30s; /* Mais rápido no mobile */
      }
      
      .testimonial-card {
        min-width: 320px;
        max-width: 320px;
        padding: 1.5rem;
      }
      
      .case-avatar {
        width: 80px;
        height: 80px;
      }
      
      .case-avatar.no-photo span {
        font-size: 32px;
      }
    }
  </style>
</head>
<body>
  <!-- Header com Logo -->
  <div class="container">
    <div class="header">
      <img src="${escapeHtml(company?.logo_url || 'https://via.placeholder.com/150x50?text=Logo')}" alt="Logo ${escapeHtml(company?.company_name || 'Empresa')}" class="banner">
    </div>
  </div>

  <!-- Hero Image com Texto Sobreposto -->
  <div class="container">
    ${heroImageSrc ? `
    <!-- Hero com imagem de fundo -->
    <div class="image1-container">
      <img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(heroImageAlt)}">
      <div class="text-overlay">
        <small>${escapeHtml(badge)}</small>
        <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
        <p data-editable="true" data-field="hero_subtitle">${escapeHtml(finalHeroSubtitle)}</p>
      </div>
    </div>
    ` : `
    <!-- Hero sem imagem (apenas texto em fundo sólido) -->
    <div class="hero-text-only">
      <small>${escapeHtml(badge)}</small>
      <h1 data-editable="true" data-field="hero_title">${escapeHtml(finalHeroTitle)}</h1>
      <p data-editable="true" data-field="hero_subtitle">${escapeHtml(finalHeroSubtitle)}</p>
    </div>
    `}
    </div>
  </div>

  ${metricsArray.length > 0 ? `
  <!-- Seção de Métricas -->
  <div class="container">
    <section class="metrics-section">
      <h2 data-editable="true" data-field="metrics_title">${escapeHtml(finalMetricsTitle)}</h2>
      <p data-editable="true" data-field="metrics_subtitle">${escapeHtml(finalMetricsSubtitle)}</p>
      <div class="metrics-cards">
        ${metricsArray.map(([key, value]) => `
          <div class="metric-card">
            <strong>${escapeHtml(String(value))}</strong>
            <span data-editable="true" data-field="metric_label_${escapeHtml(key)}">${escapeHtml(key)}</span>
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
          <summary data-editable="true" data-field="faq_question_${index}">${escapeHtml(faq.question)}</summary>
          <p data-editable="true" data-field="faq_answer_${index}">${escapeHtml(faq.answer)}</p>
        </details>
      `).join('')}
    </section>
  </div>
  ` : ''}

  ${successCases.length > 0 ? `
  <!-- Seção de Casos de Sucesso com Marquee Infinito -->
  <div class="container">
    <section class="success-cases">
      <h2>Histórias de Transformação</h2>
      <p class="section-subtitle">Veja como outros profissionais transformaram suas clínicas com esta solução</p>
      
      <div class="testimonials-marquee-container">
        <div class="testimonials-marquee">
          ${[...successCases, ...successCases].map((successCase: any) => `
            <div class="testimonial-card">
              ${successCase.client_photo?.src ? `
                <div class="case-avatar">
                  <img src="${escapeHtml(successCase.client_photo.src)}" alt="${escapeHtml(successCase.client_photo.alt || successCase.client_name)}" loading="lazy">
                </div>
              ` : `
                <div class="case-avatar no-photo">
                  <span>${escapeHtml((successCase.client_name || 'C').charAt(0).toUpperCase())}</span>
                </div>
              `}
              
              <div class="case-content">
                <h3>${escapeHtml(successCase.client_name)}</h3>
                <p class="case-meta">
                  🦷 ${escapeHtml(successCase.specialty)}
                </p>
                <p class="case-location">
                  📍 ${escapeHtml(successCase.city)}/${escapeHtml(successCase.state)}
                </p>
                ${successCase.instagram ? `
                  <p class="case-instagram">
                    <a href="https://instagram.com/${escapeHtml(successCase.instagram.replace('@', ''))}" target="_blank" rel="noopener" aria-label="Instagram de ${escapeHtml(successCase.client_name)}">
                      📱 @${escapeHtml(successCase.instagram.replace('@', ''))}
                    </a>
                  </p>
                ` : ''}
                
                <div class="case-results">
                  <strong>Resultados:</strong>
                  <p>${escapeHtml(successCase.results_achieved)}</p>
                </div>
                
                ${successCase.usage_time ? `
                  <p class="case-time">
                    ⏱️ Cliente há ${escapeHtml(successCase.usage_time)}
                  </p>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  </div>
  ` : ''}

  <!-- Call to Action -->
  <div class="container">
    <section class="cta">
      <p data-editable="true" data-field="cta_text">${escapeHtml(finalCtaText)}</p>
      <button onclick="window.location.href='${escapeHtml(solution.custom_url?.url || mainProduct.product_url || '#')}'">
        ${escapeHtml(solution.custom_url?.label || 'Solicitar Demonstração')}
      </button>
    </section>
  </div>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-columns">
        <div>
          <strong>${escapeHtml(company?.company_name || 'Empresa')} - Brasil</strong>
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
