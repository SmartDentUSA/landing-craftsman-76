// Template engine for generating HTML from the base template
import Mustache from 'mustache';

// HTML Base Template with placeholders
export const HTML_BASE_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{seo_description}}">
    <title>{{seo_title}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Poppins', sans-serif;
            color: var(--text-color);
            background: var(--background-color);
        }
        a { text-decoration: none; color: inherit; }
        img { max-width: 100%; display: block; }
        .container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }

        /* Header */
        .header-menu {
            background: var(--white);
            position: sticky; top: 0; z-index: 100;
            border-bottom: 1px solid #eee;
        }
        .header-menu-container {
            display: flex; align-items: center; justify-content: space-between;
            height: 64px; gap: 1rem;
        }
        .logo-img { height: 40px; width: auto; }
        .header-menu nav { display: flex; gap: 1rem; flex-wrap: wrap; }
        .header-menu nav a {
            padding: .5rem .75rem; border-radius: .5rem; color: #555; font-weight: 500;
        }
        .header-menu nav a:hover { background: #f1f5f9; color: #111; }

        /* Banner principal */
        .main-banner { background: var(--white); padding: 3rem 0 2rem; }
        .banner-content { display: flex; flex-direction: column; gap: 1.5rem; }
        .banner-text p { margin: 0.25rem 0 0.75rem; }
        .banner-text h1 { font-size: 2rem; margin: 0 0 .5rem; }
        .button {
            display: inline-block; padding: .75rem 1rem; border-radius: .75rem; font-weight: 600; margin-right: .5rem;
        }
        .button-primary { background: var(--primary-color); color: #fff; }
        .button-secondary { background: #e9ecef; color: #111; }
        .banner-images { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }

        /* Seção soluções / controle */
        .control-section { padding: 2.5rem 0; }
        .control-section h2 { text-align: center; margin-bottom: 1.5rem; }
        .control-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .control-item {
            background: var(--white); border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.08);
            display: grid; grid-template-columns: 1fr; 
        }
        .control-item-text { padding: 1.25rem; font-weight: 500; }
        .image-container { width: 100%; height: 220px; overflow: hidden; }
        .control-item-image { width: 100%; height: 100%; object-fit: cover; }
        @media (min-width: 768px) {
            .banner-content { flex-direction: row; align-items: center; }
            .banner-text { flex: 1; padding-right: 2rem; }
            .banner-images { flex: 1; grid-template-columns: repeat(3, 1fr); }
            .control-grid { grid-template-columns: repeat(2, 1fr); }
            .image-container { height: 100%; }
        }

        /* Consultoria */
        .personalized-service { background: var(--white); padding: 2.5rem 0; }
        .service-content { display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: center; }
        .service-image { border-radius: 1rem; box-shadow: 0 8px 16px rgba(0,0,0,.1); }
        @media (min-width: 992px) {
            .service-content { grid-template-columns: 1.2fr .8fr; }
        }

        /* FAQ */
        .faq-section { padding: 2.5rem 0; }
        .faq-section h2 { text-align: center; margin-bottom: 1rem; }
        .faq-accordion { display: grid; gap: .75rem; }
        .faq-item { background: var(--white); border-radius: .75rem; overflow: hidden; border: 1px solid #eee; }
        .faq-question {
            padding: 1rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer;
        }
        .faq-answer { display: none; padding: 0 1rem 1rem; color: #555; }
        .faq-item.active .faq-answer { display: block; }
        .faq-icon { font-size: 1.25rem; transform: rotate(180deg); transition: .2s; }
        .faq-item.active .faq-icon { transform: rotate(0deg); }

        /* CTA final */
        .cta-section { padding: 2.5rem 0; text-align: center; background: var(--white); }
        .cta-content a { margin: 0 .25rem; }

        /* Footer */
        .footer { background: #0b1220; color: #d0d8e0; padding: 2rem 0; }
        .footer-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        .footer-links ul { list-style: none; padding: 0; margin: 0; }
        .footer-links li { margin: .5rem 0; }
        .footer-links a { color: #d0d8e0; }
        .footer-social a { margin-right: .5rem; display: inline-block; }
        @media (min-width: 768px) {
            .footer-grid { grid-template-columns: repeat(3, 1fr); }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header-menu">
        <div class="container header-menu-container">
            <img class="logo-img" src="{{logo_url}}" alt="{{logo_alt}}">
            <nav>
                {{#menu}}
                <a href="{{href}}">{{label}}</a>
                {{/menu}}
            </nav>
        </div>
    </header>

    <!-- Banner principal -->
    <header class="main-banner">
        <div class="container banner-content">
            <div class="banner-text">
                <p>{{banner.badge_text}}</p>
                <h1>{{banner.title}}</h1>
                <p>{{banner.subtitle}}</p>
                {{#banner.cta_primary}}
                <a href="{{banner.cta_primary.href}}" class="button button-primary">{{banner.cta_primary.label}}</a>
                {{/banner.cta_primary}}
                {{#banner.cta_secondary}}
                <a href="{{banner.cta_secondary.href}}" class="button button-secondary">{{banner.cta_secondary.label}}</a>
                {{/banner.cta_secondary}}
            </div>
            <div class="banner-images">
                {{#banner.images}}
                <img src="{{src}}" alt="{{alt}}">
                {{/banner.images}}
            </div>
        </div>
    </header>

    <!-- Soluções / Controle -->
    <section class="control-section">
        <div class="container">
            <h2>{{solutions_title}}</h2>
            <div class="control-grid">
                {{#solutions}}
                <div class="control-item control-item-side">
                    <div class="control-item-text">
                        <p>{{text}}</p>
                    </div>
                    <div class="image-container">
                        <img src="{{image.src}}" alt="{{image.alt}}" class="control-item-image full-height">
                    </div>
                </div>
                {{/solutions}}
            </div>
        </div>
    </section>

    <!-- Consultoria -->
    <section class="personalized-service">
        <div class="container service-content">
            <div class="service-text">
                <h2>{{advisory.title}}</h2>
                <p>{{advisory.paragraph}}</p>
                {{#advisory.cta}}
                <a href="{{advisory.cta.href}}" class="button button-primary">{{advisory.cta.label}}</a>
                {{/advisory.cta}}
            </div>
            <div class="service-image-container">
                <img src="{{advisory.image.src}}" alt="{{advisory.image.alt}}" class="service-image">
            </div>
        </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
        <div class="container">
            <h2>{{faq_title}}</h2>
            <div class="faq-accordion">
                {{#faq}}
                <div class="faq-item">
                    <div class="faq-question">
                        <span>{{question}}</span>
                        <span class="faq-icon">&#x2304;</span>
                    </div>
                    <div class="faq-answer">
                        <p>{{answer}}</p>
                    </div>
                </div>
                {{/faq}}
            </div>
        </div>
    </section>

    <!-- CTA final -->
    <section class="cta-section">
        <div class="container cta-content">
            <h2>{{cta_final.title}}</h2>
            <p>{{cta_final.paragraph}}</p>
            {{#cta_final.primary}}
            <a href="{{cta_final.primary.href}}" class="button button-primary">{{cta_final.primary.label}}</a>
            {{/cta_final.primary}}
            {{#cta_final.secondary}}
            <a href="{{cta_final.secondary.href}}" class="button button-secondary">{{cta_final.secondary.label}}</a>
            {{/cta_final.secondary}}
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container footer-grid">
            <div class="footer-info">
                {{#footer.locations}}
                <h3>{{title}}</h3>
                <p>{{address}}</p>
                <br>
                {{/footer.locations}}
            </div>
            <div class="footer-links">
                <h3>{{footer_links_title}}</h3>
                <ul>
                    {{#footer.links}}
                    <li><a href="{{href}}">{{label}}</a></li>
                    {{/footer.links}}
                </ul>
            </div>
            <div class="footer-social">
                {{#footer.social}}
                <a href="{{href}}">
                    <img src="{{icon_src}}" alt="{{icon_alt}}">
                </a>
                {{/footer.social}}
            </div>
        </div>
    </footer>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const faqQuestions = document.querySelectorAll('.faq-question');
            faqQuestions.forEach(question => {
                question.addEventListener('click', () => {
                    const faqItem = question.closest('.faq-item');
                    faqItem.classList.toggle('active');
                });
            });
        });
    </script>
</body>
</html>`;

// Function to generate HTML from template and data
export const generateHTML = (data: any): string => {
  return Mustache.render(HTML_BASE_TEMPLATE, data);
};

// Sample data for testing
export const SAMPLE_DATA = {
  "seo_title": "Smart Dent - Sistema de Gestão Odontológica",
  "seo_description": "Odontologia digital simples, eficiente e lucrativa. Resinas 3D, scanners intraorais, impressoras 3D e consultoria especializada.",
  "logo_url": "https://via.placeholder.com/140x40?text=LOGO",
  "logo_alt": "Smart Dent Logo",
  "menu": [
    { "label": "Institucional", "href": "https://smartdent.com.br/institucional" },
    { "label": "Resinas", "href": "https://smartdent.com.br/resinas3d" },
    { "label": "Scanner intraoral", "href": "https://smartdent.com.br/odontologia-digital-scanners-intraorais" },
    { "label": "Contato", "href": "https://smartdent.com.br/#institucional" }
  ],
  "banner": {
    "badge_text": "Smart Dent 16 anos de inovação",
    "title": "Odontologia Digital: simples, eficiente e lucrativa",
    "subtitle": "A Smart Dent é uma referência em odontologia digital no Brasil, combinando tecnologia avançada, automação eficiente e qualidade.",
    "cta_primary": { "label": "Falar com comercial", "href": "https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es" },
    "cta_secondary": { "label": "Loja online", "href": "https://loja.smartdent.com.br/" },
    "images": [
      { "src": "https://via.placeholder.com/200x300?text=Imagem1", "alt": "Pessoa sorrindo" },
      { "src": "https://via.placeholder.com/200x300?text=Imagem2", "alt": "Pessoa escrevendo no caderno" },
      { "src": "https://via.placeholder.com/200x300?text=Imagem3", "alt": "Pessoa feliz" }
    ]
  },
  "solutions_title": "Soluções completas para todos os fluxos de trabalho",
  "solutions": [
    {
      "text": "Resinas de alta performance para fluxos digitais precisos, tecnologia em cada detalhe.",
      "image": { "src": "https://via.placeholder.com/800x600?text=Resinas", "alt": "Resinas de alta performance" }
    },
    {
      "text": "Melhores scanners intraorais do mundo para otimizar sua rotina clínica.",
      "image": { "src": "https://via.placeholder.com/800x600?text=Scanner", "alt": "Scanners intraorais" }
    },
    {
      "text": "Impressoras 3D para transformar seu fluxo digital",
      "image": { "src": "https://via.placeholder.com/800x600?text=Impressora", "alt": "Impressoras 3D" }
    },
    {
      "text": "Automação de processos que reduz retrabalho e acelera entregas.",
      "image": { "src": "https://via.placeholder.com/800x600?text=Automacao", "alt": "Automação de processos" }
    }
  ],
  "advisory": {
    "title": "Consultoria especializada para você investir de forma consciente e segura",
    "paragraph": "Nossa consultoria especializada ajuda você a implantar soluções digitais com foco em previsibilidade e escala, reduzindo riscos e maximizando o retorno do seu investimento.",
    "cta": { "label": "Falar com consultor", "href": "https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es" },
    "image": { "src": "https://via.placeholder.com/600x400?text=Consultoria", "alt": "Homem sorrindo com fone de ouvido" }
  },
  "faq_title": "Perguntas frequentes",
  "faq": [
    {
      "question": "Sobre a Smart Dent",
      "answer": "Foi da evolução da odontologia digital no Brasil que nasceu a Smart Dent. Em parceria com a USP São Carlos, seguimos impulsionando a odontologia digital e definindo novos padrões de excelência."
    },
    {
      "question": "Qual é o principal objetivo da Smart Dent com seus clientes?",
      "answer": "Auxiliar dentistas e laboratórios a realizarem uma transformação digital segura e eficiente, adotando soluções integradas para aumentar a produtividade e reduzir custos operacionais."
    },
    {
      "question": "Vocês oferecem suporte e treinamento?",
      "answer": "Sim. Oferecemos consultoria, implantação assistida e treinamentos práticos para garantir que a equipe utilize todo o potencial das tecnologias."
    }
  ],
  "cta_final": {
    "title": "Mais que tecnologia e materiais, entregamos um novo modelo de negócio para seu consultório.",
    "paragraph": "Acesse nosso portfólio de produtos",
    "primary": { "label": "Atendimento digital", "href": "https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es" },
    "secondary": { "label": "Fale com o consultor", "href": "https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es" }
  },
  "footer_links_title": "Links Úteis",
  "footer": {
    "locations": [
      { "title": "Smart Dent BR", "address": "R. Dr. Procópio de Toledo Malta, 62 — Morada dos Deuses, São Carlos — SP, 13562-293" },
      { "title": "Smart Dent USA", "address": "University City Blvd - Charlotte, NC" }
    ],
    "links": [
      { "label": "Institucional", "href": "https://smartdent.com.br/institucional" },
      { "label": "Resinas", "href": "https://smartdent.com.br/resinas3d" },
      { "label": "Scanner intraoral", "href": "https://smartdent.com.br/odontologia-digital-scanners-intraorais" }
    ],
    "social": [
      { "href": "https://www.instagram.com/smartdentoficial/", "icon_src": "https://via.placeholder.com/24x24?text=IG", "icon_alt": "Ícone do Instagram" },
      { "href": "https://www.youtube.com/@smartdentcadcam", "icon_src": "https://via.placeholder.com/24x24?text=YT", "icon_alt": "Ícone do YouTube" },
      { "href": "https://www.facebook.com/smartdentoficial/", "icon_src": "https://via.placeholder.com/24x24?text=FB", "icon_alt": "Ícone do Facebook" }
    ]
  }
};