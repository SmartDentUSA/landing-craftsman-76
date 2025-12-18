/**
 * Mustache Template Engine for Product Blog HTML Generation
 * Enterprise SaaS Design System with Dark Mode and Schema.org
 */

// Simple Mustache-like template engine
export interface TemplateData {
  product: ProductTemplateData;
  company: CompanyTemplateData;
  author?: AuthorTemplateData;
  blogType: 'commercial' | 'technical';
  generatedAt: string;
}

export interface ProductTemplateData {
  id: string;
  name: string;
  slug: string;
  description: string;
  sales_pitch?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  image_url?: string;
  images_gallery?: Array<{ url: string; alt?: string; is_main?: boolean }>;
  price?: number;
  promo_price?: number;
  currency?: string;
  gtin?: string;
  mpn?: string;
  ean?: string;
  availability?: string;
  features?: string[];
  benefits?: string[];
  applications?: string[];
  target_audience?: string[];
  technical_specifications?: Array<{ key: string; value: string }>;
  faq?: Array<{ question: string; answer: string }>;
  videos?: Array<{ url: string; title?: string; thumbnail?: string; duration?: string }>;
  warranty_info?: string;
  workflow_stages?: Record<string, any>;
  keywords?: string[];
  canonical_url?: string;
  product_url?: string;
}

export interface CompanyTemplateData {
  company_name: string;
  company_description?: string;
  company_logo_url?: string;
  website_url?: string;
  contact_email?: string;
  contact_phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  social_profiles?: string[];
  founded_year?: number;
  founder_name?: string;
  google_aggregate_rating?: { ratingValue: number; reviewCount: number };
  tracking_pixels?: {
    gtm_id?: string;
    meta_pixel_id?: string;
    tiktok_pixel_id?: string;
  };
  seo_domains?: Array<{ domain: string; name: string }>;
}

export interface AuthorTemplateData {
  full_name: string;
  specialty?: string;
  mini_cv?: string;
  photo_url?: string;
  lattes_url?: string;
  instagram_url?: string;
  youtube_url?: string;
}

// Helper functions
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeJsonString(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function toJson(obj: any): string {
  return JSON.stringify(obj);
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `PT${mins}M${secs}S`;
}

export function formatPrice(price: number, currency = 'BRL'): string {
  if (!price) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(price);
}

export function topMetrics(specs: Array<{ key: string; value: string }>, n: number): Array<{ key: string; value: string }> {
  if (!specs || !Array.isArray(specs)) return [];
  return specs.slice(0, n);
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

// Schema.org Generators
export function generateOrganizationSchema(company: CompanyTemplateData): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": company.company_name,
    "url": company.website_url,
    "logo": company.company_logo_url,
    "description": company.company_description
  };

  if (company.social_profiles?.length) {
    schema.sameAs = company.social_profiles;
  }

  if (company.contact_email) {
    schema.email = company.contact_email;
  }

  if (company.contact_phone) {
    schema.telephone = company.contact_phone;
  }

  if (company.founded_year) {
    schema.foundingDate = company.founded_year.toString();
  }

  return JSON.stringify(schema, null, 2);
}

export function generateProductSchema(product: ProductTemplateData, company: CompanyTemplateData): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": product.brand || company.company_name
    },
    "category": product.category
  };

  // Images
  const images: string[] = [];
  if (product.image_url) images.push(product.image_url);
  if (product.images_gallery?.length) {
    product.images_gallery.forEach(img => {
      if (img.url && !images.includes(img.url)) images.push(img.url);
    });
  }
  if (images.length) schema.image = images;

  // Identifiers
  if (product.gtin) schema.gtin13 = product.gtin;
  if (product.mpn) schema.mpn = product.mpn;
  if (product.ean) schema.gtin = product.ean;

  // Offers
  if (product.price) {
    schema.offers = {
      "@type": "Offer",
      "priceCurrency": product.currency || "BRL",
      "price": product.promo_price || product.price,
      "availability": `https://schema.org/${product.availability === 'out_of_stock' ? 'OutOfStock' : 'InStock'}`,
      "url": product.product_url || `${company.website_url}/${product.slug}`
    };
  }

  // Aggregate Rating
  if (company.google_aggregate_rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": company.google_aggregate_rating.ratingValue,
      "reviewCount": company.google_aggregate_rating.reviewCount
    };
  }

  return JSON.stringify(schema, null, 2);
}

export function generateFAQSchema(faq: Array<{ question: string; answer: string }>): string {
  if (!faq?.length) return '';

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": stripHtml(item.answer)
      }
    }))
  };

  return JSON.stringify(schema, null, 2);
}

export function generateBreadcrumbSchema(product: ProductTemplateData, company: CompanyTemplateData): string {
  const items = [
    { name: "Home", url: company.website_url || '/' }
  ];

  if (product.category) {
    items.push({
      name: product.category,
      url: `${company.website_url}/categoria/${slugify(product.category)}`
    });
  }

  if (product.subcategory) {
    items.push({
      name: product.subcategory,
      url: `${company.website_url}/categoria/${slugify(product.category)}/${slugify(product.subcategory)}`
    });
  }

  items.push({
    name: product.name,
    url: `${company.website_url}/${product.slug}`
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return JSON.stringify(schema, null, 2);
}

export function generateLocalBusinessSchema(company: CompanyTemplateData): string {
  if (!company.street_address) return '';

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": company.company_name,
    "url": company.website_url,
    "logo": company.company_logo_url,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": company.street_address,
      "addressLocality": company.city,
      "addressRegion": company.state,
      "postalCode": company.postal_code,
      "addressCountry": company.country || "BR"
    }
  };

  if (company.latitude && company.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      "latitude": company.latitude,
      "longitude": company.longitude
    };
  }

  if (company.contact_phone) {
    schema.telephone = company.contact_phone;
  }

  if (company.google_aggregate_rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": company.google_aggregate_rating.ratingValue,
      "reviewCount": company.google_aggregate_rating.reviewCount
    };
  }

  return JSON.stringify(schema, null, 2);
}

export function generateArticleSchema(
  product: ProductTemplateData,
  company: CompanyTemplateData,
  author: AuthorTemplateData | undefined,
  blogType: 'commercial' | 'technical',
  generatedAt: string
): string {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": blogType === 'technical' ? "TechArticle" : "BlogPosting",
    "headline": product.name,
    "description": product.sales_pitch || product.description,
    "image": product.image_url,
    "datePublished": generatedAt,
    "dateModified": generatedAt,
    "publisher": {
      "@type": "Organization",
      "name": company.company_name,
      "logo": {
        "@type": "ImageObject",
        "url": company.company_logo_url
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${company.website_url}/${product.slug}`
    }
  };

  if (author) {
    schema.author = {
      "@type": "Person",
      "name": author.full_name,
      "jobTitle": author.specialty,
      "description": author.mini_cv
    };
    if (author.photo_url) schema.author.image = author.photo_url;
    if (author.lattes_url) schema.author.sameAs = [author.lattes_url];
  } else {
    schema.author = {
      "@type": "Organization",
      "name": company.company_name
    };
  }

  if (product.keywords?.length) {
    schema.keywords = product.keywords.join(', ');
  }

  return JSON.stringify(schema, null, 2);
}

export function generateVideoSchema(videos: Array<{ url: string; title?: string; thumbnail?: string; duration?: string }>, company: CompanyTemplateData): string {
  if (!videos?.length) return '';

  const videoSchemas = videos.map(video => {
    const schema: any = {
      "@type": "VideoObject",
      "name": video.title || "Video",
      "contentUrl": video.url,
      "uploadDate": new Date().toISOString()
    };

    if (video.thumbnail) schema.thumbnailUrl = video.thumbnail;
    if (video.duration) schema.duration = video.duration;

    return schema;
  });

  if (videoSchemas.length === 1) {
    return JSON.stringify({ "@context": "https://schema.org", ...videoSchemas[0] }, null, 2);
  }

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": videoSchemas.map((v, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": v
    }))
  }, null, 2);
}

export function generateHowToSchema(product: ProductTemplateData): string {
  if (!product.workflow_stages) return '';

  const steps: any[] = [];
  const stageLabels: Record<string, string> = {
    scan: 'Escaneamento Digital',
    design: 'Planejamento CAD/CAM',
    print: 'Impressão 3D',
    mill: 'Fresagem CNC',
    finish: 'Acabamento Final',
    delivery: 'Entrega ao Paciente'
  };

  Object.entries(product.workflow_stages).forEach(([stage, data]: [string, any]) => {
    if (data && typeof data === 'object') {
      steps.push({
        "@type": "HowToStep",
        "name": stageLabels[stage] || stage,
        "text": data.description || `Etapa de ${stageLabels[stage] || stage}`,
        "position": steps.length + 1
      });
    }
  });

  if (!steps.length) return '';

  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `Como utilizar ${product.name}`,
    "description": product.description,
    "step": steps
  };

  return JSON.stringify(schema, null, 2);
}

// Main Template Renderer
export function renderProductBlogTemplate(data: TemplateData): string {
  const { product, company, author, blogType, generatedAt } = data;

  // Generate all schemas
  const schemas = {
    organization: generateOrganizationSchema(company),
    product: generateProductSchema(product, company),
    faq: product.faq?.length ? generateFAQSchema(product.faq) : '',
    breadcrumb: generateBreadcrumbSchema(product, company),
    localBusiness: generateLocalBusinessSchema(company),
    article: generateArticleSchema(product, company, author, blogType, generatedAt),
    video: product.videos?.length ? generateVideoSchema(product.videos, company) : '',
    howTo: generateHowToSchema(product)
  };

  // Render the complete HTML
  return renderFullTemplate(data, schemas);
}

function renderFullTemplate(data: TemplateData, schemas: Record<string, string>): string {
  const { product, company, author, blogType, generatedAt } = data;
  
  const css = getDesignSystemCSS();
  const trackingScripts = getTrackingScripts(company.tracking_pixels);
  
  const pageTitle = product.name + (product.category ? ` | ${product.category}` : '');
  const metaDescription = truncate(stripHtml(product.sales_pitch || product.description || ''), 160);
  const canonicalUrl = product.canonical_url || `${company.website_url}/${product.slug}`;

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDescription)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(product.name)}">
  <meta property="og:description" content="${escapeHtml(metaDescription)}">
  <meta property="og:image" content="${escapeHtml(product.image_url || '')}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="${escapeHtml(company.company_name)}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(product.name)}">
  <meta name="twitter:description" content="${escapeHtml(metaDescription)}">
  <meta name="twitter:image" content="${escapeHtml(product.image_url || '')}">
  
  <!-- Schema.org -->
  <script type="application/ld+json">${schemas.organization}</script>
  <script type="application/ld+json">${schemas.product}</script>
  <script type="application/ld+json">${schemas.article}</script>
  <script type="application/ld+json">${schemas.breadcrumb}</script>
  ${schemas.faq ? `<script type="application/ld+json">${schemas.faq}</script>` : ''}
  ${schemas.localBusiness ? `<script type="application/ld+json">${schemas.localBusiness}</script>` : ''}
  ${schemas.video ? `<script type="application/ld+json">${schemas.video}</script>` : ''}
  ${schemas.howTo ? `<script type="application/ld+json">${schemas.howTo}</script>` : ''}
  
  <!-- Tracking -->
  ${trackingScripts.head}
  
  <style>${css}</style>
</head>
<body>
  ${trackingScripts.bodyStart}
  
  <!-- Header -->
  <header class="site-header">
    <div class="container header-content">
      <a href="${escapeHtml(company.website_url || '/')}" class="logo">
        ${company.company_logo_url 
          ? `<img src="${escapeHtml(company.company_logo_url)}" alt="${escapeHtml(company.company_name)}" height="40">`
          : `<span class="logo-text">${escapeHtml(company.company_name)}</span>`
        }
      </a>
      <nav class="main-nav" aria-label="Navegação principal">
        <a href="#conteudo">Conteúdo</a>
        <a href="#especificacoes">Especificações</a>
        <a href="#faq">FAQ</a>
        ${product.videos?.length ? '<a href="#videos">Vídeos</a>' : ''}
      </nav>
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Alternar tema">
        <span class="theme-icon">🌙</span>
      </button>
    </div>
  </header>

  <main id="main-content">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <div class="container">
        <ol class="breadcrumb-list">
          <li><a href="${escapeHtml(company.website_url || '/')}">Home</a></li>
          ${product.category ? `<li><a href="${escapeHtml(company.website_url)}/categoria/${slugify(product.category)}">${escapeHtml(product.category)}</a></li>` : ''}
          <li aria-current="page">${escapeHtml(product.name)}</li>
        </ol>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero-section" aria-labelledby="hero-title">
      <div class="container hero-grid">
        <div class="hero-image-wrapper">
          ${product.image_url 
            ? `<img 
                src="${escapeHtml(product.image_url)}" 
                alt="${escapeHtml(product.name)}"
                class="hero-image"
                loading="eager"
                fetchpriority="high"
              >`
            : ''
          }
          ${renderImageGallery(product.images_gallery)}
        </div>
        
        <div class="hero-content">
          <div class="hero-badges">
            ${product.category ? `<span class="badge badge-category">${escapeHtml(product.category)}</span>` : ''}
            ${product.brand ? `<span class="badge badge-brand">${escapeHtml(product.brand)}</span>` : ''}
          </div>
          
          <h1 id="hero-title" class="hero-title">${escapeHtml(product.name)}</h1>
          
          ${product.sales_pitch 
            ? `<p class="hero-subtitle">${escapeHtml(product.sales_pitch)}</p>` 
            : ''
          }
          
          ${renderFeaturesList(product.features)}
          
          <div class="hero-actions">
            <a href="${escapeHtml(product.product_url || company.website_url || '#')}" class="btn btn-primary">
              Falar com especialista
            </a>
            <a href="#especificacoes" class="btn btn-secondary">
              Ver especificações
            </a>
          </div>
          
          ${renderQuickMetrics(product.technical_specifications)}
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    ${renderBenefitsSection(product.benefits)}

    <!-- Main Content -->
    <section id="conteudo" class="content-section">
      <div class="container content-grid">
        <article class="main-content">
          <h2>Sobre ${escapeHtml(product.name)}</h2>
          <p class="lead">${escapeHtml(product.description || '')}</p>
          
          ${renderApplicationsSection(product.applications)}
          ${renderTargetAudienceSection(product.target_audience)}
        </article>
        
        ${renderAuthorCard(author)}
      </div>
    </section>

    <!-- Technical Specifications -->
    ${renderSpecificationsSection(product.technical_specifications, product.warranty_info)}

    <!-- FAQ Section -->
    ${renderFAQSection(product.faq)}

    <!-- Videos Section -->
    ${renderVideosSection(product.videos)}

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <h2>Pronto para integrar ${escapeHtml(product.name)} ao seu fluxo digital?</h2>
        <a href="${escapeHtml(product.product_url || company.website_url || '#')}" class="btn btn-primary btn-lg">
          Solicitar contato
        </a>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="site-footer">
    <div class="container footer-content">
      <div class="footer-brand">
        <span class="footer-logo">${escapeHtml(company.company_name)}</span>
        ${company.company_description 
          ? `<p class="footer-description">${escapeHtml(truncate(company.company_description, 200))}</p>` 
          : ''
        }
      </div>
      <div class="footer-contact">
        ${company.contact_email ? `<a href="mailto:${escapeHtml(company.contact_email)}">${escapeHtml(company.contact_email)}</a>` : ''}
        ${company.contact_phone ? `<a href="tel:${escapeHtml(company.contact_phone.replace(/\D/g, ''))}">${escapeHtml(company.contact_phone)}</a>` : ''}
      </div>
      <p class="footer-copy">© ${getCurrentYear()} ${escapeHtml(company.company_name)}. Todos os direitos reservados.</p>
    </div>
  </footer>

  <script>
    // Theme Toggle
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      document.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
    
    // Load saved theme
    (function() {
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') {
        document.querySelector('.theme-icon').textContent = '☀️';
      }
    })();
    
    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  </script>
</body>
</html>`;
}

// Component Renderers
function renderImageGallery(gallery?: Array<{ url: string; alt?: string }>): string {
  if (!gallery?.length) return '';
  
  return `
    <div class="image-gallery">
      ${gallery.slice(0, 4).map(img => `
        <div class="gallery-thumb">
          <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt || '')}" loading="lazy">
        </div>
      `).join('')}
    </div>
  `;
}

function renderFeaturesList(features?: string[]): string {
  if (!features?.length) return '';
  
  return `
    <ul class="features-list">
      ${features.slice(0, 5).map(f => `<li>✅ ${escapeHtml(f)}</li>`).join('')}
    </ul>
  `;
}

function renderQuickMetrics(specs?: Array<{ key: string; value: string }>): string {
  if (!specs?.length) return '';
  
  const top4 = specs.slice(0, 4);
  return `
    <div class="quick-metrics">
      ${top4.map(s => `
        <div class="metric-card">
          <span class="metric-value">${escapeHtml(s.value)}</span>
          <span class="metric-label">${escapeHtml(s.key)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderBenefitsSection(benefits?: string[]): string {
  if (!benefits?.length) return '';
  
  return `
    <section class="benefits-section" aria-labelledby="benefits-title">
      <div class="container">
        <h2 id="benefits-title" class="section-title">Benefícios</h2>
        <div class="benefits-grid">
          ${benefits.map(b => `
            <div class="benefit-card">
              <p>${escapeHtml(b)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderApplicationsSection(applications?: string[]): string {
  if (!applications?.length) return '';
  
  return `
    <div class="applications-section">
      <h3>Aplicações clínicas</h3>
      <ul class="applications-list">
        ${applications.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderTargetAudienceSection(audience?: string[]): string {
  if (!audience?.length) return '';
  
  return `
    <div class="target-section">
      <h3>Indicado para</h3>
      <ul class="target-list">
        ${audience.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderAuthorCard(author?: AuthorTemplateData): string {
  if (!author) return '';
  
  return `
    <aside class="author-card">
      ${author.photo_url 
        ? `<img src="${escapeHtml(author.photo_url)}" alt="${escapeHtml(author.full_name)}" class="author-photo">`
        : ''
      }
      <div class="author-info">
        <span class="author-label">Autor</span>
        <h4 class="author-name">${escapeHtml(author.full_name)}</h4>
        ${author.specialty ? `<span class="author-specialty">${escapeHtml(author.specialty)}</span>` : ''}
        ${author.mini_cv ? `<p class="author-bio">${escapeHtml(truncate(author.mini_cv, 200))}</p>` : ''}
        <div class="author-links">
          ${author.lattes_url ? `<a href="${escapeHtml(author.lattes_url)}" target="_blank" rel="noopener">Lattes</a>` : ''}
          ${author.instagram_url ? `<a href="${escapeHtml(author.instagram_url)}" target="_blank" rel="noopener">Instagram</a>` : ''}
        </div>
      </div>
    </aside>
  `;
}

function renderSpecificationsSection(specs?: Array<{ key: string; value: string }>, warranty?: string): string {
  if (!specs?.length) return '';
  
  return `
    <section id="especificacoes" class="specs-section">
      <div class="container">
        <h2 class="section-title">Especificações técnicas</h2>
        <div class="specs-table-wrapper">
          <table class="specs-table">
            <thead>
              <tr>
                <th>Parâmetro</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${specs.map(s => `
                <tr>
                  <td>${escapeHtml(s.key)}</td>
                  <td>${escapeHtml(s.value)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${warranty ? `<p class="warranty-info">Garantia: ${escapeHtml(warranty)}</p>` : ''}
      </div>
    </section>
  `;
}

function renderFAQSection(faq?: Array<{ question: string; answer: string }>): string {
  if (!faq?.length) return '';
  
  return `
    <section id="faq" class="faq-section">
      <div class="container">
        <h2 class="section-title">Perguntas Frequentes</h2>
        <div class="faq-list">
          ${faq.map((item, index) => `
            <div class="faq-item${index === 0 ? ' open' : ''}">
              <button class="faq-question" aria-expanded="${index === 0 ? 'true' : 'false'}">
                ${escapeHtml(item.question)}
                <span class="faq-icon">+</span>
              </button>
              <div class="faq-answer">
                <p>${escapeHtml(item.answer)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderVideosSection(videos?: Array<{ url: string; title?: string; thumbnail?: string }>): string {
  if (!videos?.length) return '';
  
  return `
    <section id="videos" class="videos-section">
      <div class="container">
        <h2 class="section-title">Vídeos</h2>
        <div class="videos-grid">
          ${videos.map(v => {
            const videoId = extractYouTubeId(v.url);
            const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : v.url;
            const thumbnail = v.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '');
            
            return `
              <div class="video-card">
                <div class="video-wrapper">
                  <iframe 
                    src="${escapeHtml(embedUrl)}" 
                    title="${escapeHtml(v.title || 'Video')}"
                    loading="lazy"
                    allowfullscreen
                  ></iframe>
                </div>
                ${v.title ? `<h3 class="video-title">${escapeHtml(v.title)}</h3>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getTrackingScripts(pixels?: CompanyTemplateData['tracking_pixels']): { head: string; bodyStart: string } {
  if (!pixels) return { head: '', bodyStart: '' };
  
  let head = '';
  let bodyStart = '';
  
  // GTM
  if (pixels.gtm_id) {
    head += `
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${pixels.gtm_id}');</script>`;
    
    bodyStart += `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${pixels.gtm_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
  }
  
  // Meta Pixel
  if (pixels.meta_pixel_id) {
    head += `
    <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixels.meta_pixel_id}');
    fbq('track', 'PageView');
    </script>`;
  }
  
  // TikTok Pixel
  if (pixels.tiktok_pixel_id) {
    head += `
    <script>
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixels.tiktok_pixel_id}');
      ttq.page();
    }(window, document, 'ttq');
    </script>`;
  }
  
  return { head, bodyStart };
}

function getDesignSystemCSS(): string {
  return `
/* ================================================
   DESIGN SYSTEM V2 - Enterprise SaaS
   Dark Mode + CSS Variables + Performance
   ================================================ */

/* CSS Variables */
:root {
  /* Colors - Light Theme */
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-bg-elevated: #ffffff;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;
  
  /* Brand Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-light: #dbeafe;
  --color-secondary: #7c3aed;
  --color-accent: #06b6d4;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Plus Jakarta Sans', var(--font-sans);
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* Dark Theme */
[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-bg-alt: #1e293b;
  --color-bg-elevated: #1e293b;
  --color-text: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-muted: #64748b;
  --color-border: #334155;
  --color-border-light: #1e293b;
  --color-primary: #3b82f6;
  --color-primary-hover: #60a5fa;
  --color-primary-light: #1e3a5f;
}

/* Base Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

body {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text);
}

h1 { font-size: clamp(2rem, 5vw, 3rem); }
h2 { font-size: clamp(1.5rem, 4vw, 2.25rem); }
h3 { font-size: clamp(1.25rem, 3vw, 1.5rem); }

p { margin-bottom: var(--space-md); }

.lead {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-primary-hover);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-decoration: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-bg-alt);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-lg {
  padding: var(--space-md) var(--space-xl);
  font-size: 1rem;
}

/* Badge */
.badge {
  display: inline-block;
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-category {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-brand {
  background: var(--color-bg-alt);
  color: var(--color-text-secondary);
}

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(8px);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo img {
  height: 40px;
  width: auto;
}

.logo-text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--color-text);
}

.main-nav {
  display: flex;
  gap: var(--space-lg);
}

.main-nav a {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  transition: color var(--transition-fast);
}

.main-nav a:hover {
  color: var(--color-primary);
}

.theme-toggle {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

/* Breadcrumb */
.breadcrumb {
  padding: var(--space-md) 0;
  background: var(--color-bg-alt);
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  list-style: none;
  font-size: 0.875rem;
}

.breadcrumb-list li {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.breadcrumb-list li:not(:last-child)::after {
  content: '/';
  color: var(--color-text-muted);
}

.breadcrumb-list a {
  color: var(--color-text-secondary);
}

.breadcrumb-list [aria-current="page"] {
  color: var(--color-text);
  font-weight: 500;
}

/* Hero Section */
.hero-section {
  padding: var(--space-3xl) 0;
  background: var(--color-bg);
}

.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3xl);
  align-items: center;
}

.hero-image-wrapper {
  position: relative;
}

.hero-image {
  width: 100%;
  height: auto;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.image-gallery {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.gallery-thumb {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.gallery-thumb:hover {
  border-color: var(--color-primary);
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.hero-badges {
  display: flex;
  gap: var(--space-sm);
}

.hero-title {
  margin-bottom: var(--space-sm);
}

.hero-subtitle {
  font-size: 1.125rem;
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.features-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.features-list li {
  font-size: 0.9375rem;
  color: var(--color-text-secondary);
}

.hero-actions {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.quick-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-bg-alt);
  border-radius: var(--radius-lg);
  margin-top: var(--space-md);
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.metric-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Benefits Section */
.benefits-section {
  padding: var(--space-3xl) 0;
  background: var(--color-bg-alt);
}

.section-title {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-lg);
}

.benefit-card {
  padding: var(--space-lg);
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition: all var(--transition-base);
}

.benefit-card:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.benefit-card p {
  margin: 0;
  color: var(--color-text-secondary);
}

/* Content Section */
.content-section {
  padding: var(--space-3xl) 0;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--space-2xl);
}

.main-content h2 {
  margin-bottom: var(--space-lg);
}

.applications-section,
.target-section {
  margin-top: var(--space-xl);
}

.applications-section h3,
.target-section h3 {
  margin-bottom: var(--space-md);
  font-size: 1.125rem;
}

.applications-list,
.target-list {
  list-style: disc;
  padding-left: var(--space-lg);
  color: var(--color-text-secondary);
}

.applications-list li,
.target-list li {
  margin-bottom: var(--space-sm);
}

/* Author Card */
.author-card {
  padding: var(--space-lg);
  background: var(--color-bg-alt);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  height: fit-content;
  position: sticky;
  top: 80px;
}

.author-photo {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  object-fit: cover;
  margin-bottom: var(--space-md);
}

.author-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.author-name {
  margin: var(--space-xs) 0;
  font-size: 1.125rem;
}

.author-specialty {
  display: block;
  color: var(--color-primary);
  font-size: 0.875rem;
  margin-bottom: var(--space-sm);
}

.author-bio {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
}

.author-links {
  display: flex;
  gap: var(--space-md);
}

.author-links a {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Specifications Section */
.specs-section {
  padding: var(--space-3xl) 0;
  background: var(--color-bg-alt);
}

.specs-table-wrapper {
  overflow-x: auto;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
}

.specs-table {
  width: 100%;
  border-collapse: collapse;
}

.specs-table th,
.specs-table td {
  padding: var(--space-md) var(--space-lg);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.specs-table th {
  background: var(--color-bg-alt);
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.specs-table td:first-child {
  font-weight: 500;
}

.specs-table td:last-child {
  color: var(--color-text-secondary);
}

.specs-table tr:last-child td {
  border-bottom: none;
}

.warranty-info {
  margin-top: var(--space-lg);
  padding: var(--space-md);
  background: var(--color-primary-light);
  border-radius: var(--radius-md);
  color: var(--color-primary);
  font-weight: 500;
}

/* FAQ Section */
.faq-section {
  padding: var(--space-3xl) 0;
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
  overflow: hidden;
  background: var(--color-bg-elevated);
}

.faq-question {
  width: 100%;
  padding: var(--space-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: none;
  border: none;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.faq-question:hover {
  background: var(--color-bg-alt);
}

.faq-icon {
  font-size: 1.5rem;
  color: var(--color-primary);
  transition: transform var(--transition-base);
}

.faq-item.open .faq-icon {
  transform: rotate(45deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--transition-slow);
}

.faq-item.open .faq-answer {
  max-height: 500px;
}

.faq-answer p {
  padding: 0 var(--space-lg) var(--space-lg);
  color: var(--color-text-secondary);
  margin: 0;
}

/* Videos Section */
.videos-section {
  padding: var(--space-3xl) 0;
  background: var(--color-bg-alt);
}

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-xl);
}

.video-card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.video-wrapper {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-title {
  padding: var(--space-md);
  font-size: 1rem;
  margin: 0;
}

/* CTA Section */
.cta-section {
  padding: var(--space-3xl) 0;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  text-align: center;
}

.cta-section h2 {
  color: white;
  margin-bottom: var(--space-xl);
}

.cta-section .btn-primary {
  background: white;
  color: var(--color-primary);
}

.cta-section .btn-primary:hover {
  background: var(--color-bg-alt);
  transform: translateY(-2px);
}

/* Footer */
.site-footer {
  padding: var(--space-2xl) 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  text-align: center;
}

.footer-logo {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.25rem;
}

.footer-description {
  max-width: 400px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.footer-contact {
  display: flex;
  gap: var(--space-lg);
}

.footer-contact a {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.footer-copy {
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  margin: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2xl);
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .author-card {
    position: static;
    display: flex;
    gap: var(--space-lg);
    align-items: center;
  }
  
  .author-photo {
    margin-bottom: 0;
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .main-nav {
    display: none;
  }
  
  .quick-metrics {
    grid-template-columns: 1fr 1fr;
  }
  
  .hero-actions {
    flex-direction: column;
  }
  
  .hero-actions .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 0 var(--space-md);
  }
  
  .quick-metrics {
    grid-template-columns: 1fr;
  }
  
  .author-card {
    flex-direction: column;
    text-align: center;
  }
  
  .author-links {
    justify-content: center;
  }
}

/* Performance: Content Visibility */
.benefits-section,
.specs-section,
.faq-section,
.videos-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px;
}

/* Print Styles */
@media print {
  .site-header,
  .theme-toggle,
  .hero-actions,
  .cta-section,
  .site-footer {
    display: none;
  }
  
  .hero-grid {
    grid-template-columns: 1fr;
  }
}
`;
}
