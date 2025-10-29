// Função auxiliar para gerar o HTML da Landing Page com CSS padronizado
export function generateLandingPageHTML(solution: any, products: any[], company: any): string {
  const mainProduct = products[0] || {};
  const successCases = solution.success_cases || [];
  const pain_metrics = solution.pain_metrics || {};
  const faqs = solution.faq || [];
  
  // HERO IMAGE (prioridade: manual > IA > produto)
  let heroImageSrc = mainProduct.image_url || '';
  let heroImageAlt = mainProduct.name || 'Banner';
  
  if (solution.ai_generated_images?.hero_banner) {
    const banner = solution.ai_generated_images.hero_banner;
    if (banner.mode === 'manual_upload' && banner.manual_upload?.src) {
      heroImageSrc = banner.manual_upload.src;
      heroImageAlt = banner.manual_upload.alt || 'Banner hero personalizado';
    } else if (banner.mode === 'ai_generated' && banner.ai_generated?.src) {
      heroImageSrc = banner.ai_generated.src;
      heroImageAlt = `Banner hero - ${solution.title}`;
    }
  }

  // Gerar subtítulo do hero baseado no sales_pitch (resumido)
  const heroSubtitle = solution.sales_pitch 
    ? solution.sales_pitch.substring(0, 120) + (solution.sales_pitch.length > 120 ? '...' : '')
    : `Solução completa com ${products.map(p => p.name).join(', ')}`;

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
  const seoDescription = heroSubtitle.substring(0, 160);

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
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  
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
      font-family: 'Poppins', system-ui, -apple-system, sans-serif;
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
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
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
      text-shadow: none;
    }

    .text-overlay h1 {
      font-size: 28px;
      line-height: 1.1;
      letter-spacing: -0.2px;
      font-weight: 700;
      color: white;
      margin: 12px 0;
    }

    .text-overlay p {
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255,255,255,0.95);
      margin: 0;
      max-width: 600px;
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
      background: linear-gradient(180deg, #ffffff, #fbfeff);
      border: 1px solid rgba(15,23,42,0.03);
      border-radius: 12px;
      padding: 24px;
      flex: 1 1 30%;
      min-width: 200px;
      max-width: 256px;
      aspect-ratio: 1/1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
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
    <div class="image1-container">
      ${heroImageSrc ? `<img src="${escapeHtml(heroImageSrc)}" alt="${escapeHtml(heroImageAlt)}">` : ''}
      <div class="text-overlay">
        <small>${escapeHtml(badge)}</small>
        <h1>${escapeHtml(solution.title)}</h1>
        <p>${escapeHtml(heroSubtitle)}</p>
      </div>
    </div>
  </div>

  ${metricsArray.length > 0 ? `
  <!-- Seção de Métricas -->
  <div class="container">
    <section class="metrics-section">
      <h2>Métricas de Impacto Comprovadas</h2>
      <p>Resultados reais de clínicas que implementaram esta solução</p>
      <div class="metrics-cards">
        ${metricsArray.map(([key, value]) => `
          <div class="metric-card">
            <strong>${escapeHtml(String(value))}</strong>
            <span>${escapeHtml(key)}</span>
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
      <h3>Perguntas Frequentes</h3>
      ${faqs.map((faq: any) => `
        <details>
          <summary>${escapeHtml(faq.question)}</summary>
          <p>${escapeHtml(faq.answer)}</p>
        </details>
      `).join('')}
    </section>
  </div>
  ` : ''}

  <!-- Call to Action -->
  <div class="container">
    <section class="cta">
      <p>Fale agora com nossos especialistas e transforme sua clínica</p>
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
