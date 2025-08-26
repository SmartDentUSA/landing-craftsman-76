import Mustache from 'mustache';

// Mapeamento de ícones SVG para redes sociais
const SOCIAL_ICONS: Record<string, string> = {
  instagram: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="m16 11.37A4 4 0 1 1 12.06 8H12a4 4 0 1 1 4 4z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
  facebook: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  youtube: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>',
  twitter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>',
  linkedin: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>',
  website: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>'
};

// Template HTML base
const TEMPLATE_HTML = `<!DOCTYPE html>
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
        .banner-images img { 
            width: 100%; 
            aspect-ratio: 2/3; 
            object-fit: cover; 
            border-radius: 8px; 
        }

        /* Seção soluções / controle */
        .control-section { padding: 4rem 0 1rem 0; }
        .control-section h2 { text-align: center; margin-bottom: 1.5rem; }
        .control-grid { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 1rem; 
        }
        .control-item {
            background: var(--white); border-radius: 1rem; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,.08);
            display: grid; grid-template-columns: 1fr; 
        }
        .control-item-text { padding: 1.25rem; font-weight: 500; }
        .image-container { 
            width: 100%; 
            overflow: hidden; 
            position: relative;
        }
        .control-item-image { 
            width: 100%; 
            height: 100%;
            object-fit: cover; 
            display: block;
        }
        .control-item-text-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            color: white;
            text-shadow: 2px 2px 6px rgba(0, 0, 0, 1);
            font-weight: 700;
            padding: 1rem;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
        }
        .control-item-text-overlay p {
            margin: 0;
        }
        
        /* Mesma abordagem das imagens do banner */
        .image-container {
            width: 100%;
            overflow: hidden;
        }
        
        .control-item-image {
            width: 100%;
            aspect-ratio: 2/3;
            object-fit: cover;
            display: block;
        }
        
        /* Grid assimétrico para soluções */
        .control-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin: 2rem 0;
        }
        
        @media (min-width: 768px) {
            .control-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                grid-template-rows: repeat(3, minmax(200px, auto));
                gap: 1.5rem;
                grid-template-areas: 
                    "large large med1 small1"
                    "large large med2 small2"
                    "med3 med4 med5 small3";
            }
        }
        
        @media (min-width: 1200px) {
            .control-grid {
                grid-template-rows: repeat(3, minmax(250px, auto));
                gap: 2rem;
            }
        }
        
        .control-item {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
        }
        
        .control-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        
        /* Tamanhos específicos para layout assimétrico */
        .control-item-large {
            grid-area: large;
        }
        
        .control-item-medium:nth-child(2) { grid-area: med1; }
        .control-item-medium:nth-child(3) { grid-area: med2; }
        .control-item-medium:nth-child(6) { grid-area: med3; }
        .control-item-medium:nth-child(7) { grid-area: med4; }
        .control-item-medium:nth-child(8) { grid-area: med5; }
        
        .control-item-small:nth-child(4) { grid-area: small1; }
        .control-item-small:nth-child(5) { grid-area: small2; }
        .control-item-small:nth-child(9) { grid-area: small3; }
        
        .image-container {
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
        }
        
        .image-container-large {
            aspect-ratio: 3/2;
        }
        
        .image-container-medium {
            aspect-ratio: 4/3;
        }
        
        .image-container-small {
            aspect-ratio: 1/1;
        }
        
        @media (max-width: 767px) {
            .image-container-large,
            .image-container-medium,
            .image-container-small {
                aspect-ratio: 4/3;
            }
        }
        
        .control-item-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: transform 0.3s ease;
        }
        @media (min-width: 768px) {
            .banner-content { flex-direction: row; align-items: center; }
            .banner-text { flex: 1; padding-right: 2rem; }
            .banner-images { flex: 1; grid-template-columns: repeat(3, 1fr); }
            .control-grid { grid-template-columns: repeat(2, 1fr); }
            .image-container { width: 100%; }
        }

        /* Consultoria */
        .personalized-service { background: var(--white); padding: 2.5rem 0; }
        .service-content { display: grid; grid-template-columns: 1fr; gap: 1.5rem; align-items: center; }
        
        .service-item {
            background: white;
            border-radius: 1rem;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            position: relative;
        }
        
        .service-item:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        
        .service-image-container { 
            width: 100%; 
            aspect-ratio: 1200/343.2;
            overflow: hidden; 
            position: relative;
        }
        
        .service-image { 
            width: 100%; 
            height: 100%;
            object-fit: cover; 
            display: block;
            transition: transform 0.3s ease;
        }
        
        .service-text-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            color: white;
            text-shadow: 2px 2px 6px rgba(0, 0, 0, 1);
            font-weight: 700;
            padding: 1rem;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
        }
        
        .service-text-overlay h2,
        .service-text-overlay p {
            margin: 0;
        }
        
        @media (min-width: 992px) {
            .service-content { grid-template-columns: 1fr; }
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
        .footer-social a { 
            margin-right: .5rem; 
            display: inline-block; 
            color: #d0d8e0; 
            transition: color 0.2s; 
        }
        .footer-social a:hover { color: #fff; }
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
                {{#visible}}
                <a href="{{href}}" class="button button-primary">{{label}}</a>
                {{/visible}}
                {{/banner.cta_primary}}
                {{#banner.cta_secondary}}
                {{#visible}}
                <a href="{{href}}" class="button button-secondary">{{label}}</a>
                {{/visible}}
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
                <div class="control-item {{size}}">
                    <div class="image-container image-container-{{sizeType}}">
                        <img src="{{image.src}}" alt="{{image.alt}}" class="control-item-image" style="transform: scale({{image.scale}})">
                        <div class="control-item-text-overlay">
                            <p>{{text}}</p>
                        </div>
                    </div>
                </div>
                {{/solutions}}
            </div>
        </div>
    </section>

    <!-- Consultoria -->
    <section class="personalized-service">
        <div class="container service-content">
            <div class="service-item">
                <div class="service-image-container">
                    <img src="{{advisory.image.src}}" alt="{{advisory.image.alt}}" class="service-image" style="transform: scale({{advisory.image.scale}})">
                    <div class="service-text-overlay">
                        <h2>{{advisory.title}}</h2>
                        <p>{{advisory.paragraph}}</p>
                        {{#advisory.cta}}
                        <a href="{{advisory.cta.href}}" class="button button-primary">{{advisory.cta.label}}</a>
                        {{/advisory.cta}}
                    </div>
                </div>
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
            {{#visible}}
            <a href="{{href}}" class="button button-primary">{{label}}</a>
            {{/visible}}
            {{/cta_final.primary}}
            {{#cta_final.secondary}}
            {{#visible}}
            <a href="{{href}}" class="button button-secondary">{{label}}</a>
            {{/visible}}
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
                <a href="{{href}}" title="{{platform}}">
                    {{{iconSvg}}}
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

// Template HTML base para e-mail
const EMAIL_TEMPLATE_HTML = `<!doctype html>
<html lang="pt-br" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>{{assunto_email}}</title>
  <!-- Preheader (texto breve que aparece na lista de e-mails) -->
  <style>
    .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
    @media screen and (max-width:600px){
      .container{ width:100% !important; }
      .stack{ display:block !important; width:100% !important; max-width:100% !important; }
      .p-xs{ padding:16px !important; }
      .center-xs{ text-align:center !important; }
      .btn{ width:100% !important; }
    }
  </style>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background:#f2f4f6;">
  <div class="preheader">
    {{preheader_texto}}
  </div>

  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f4f6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden;">
          
          <!-- Header / Logo -->
          <tr>
            <td align="left" style="padding:20px 24px; border-bottom:1px solid #eef2f7;">
              <a href="{{url_site}}" target="_blank" style="text-decoration:none;">
                <img src="{{logo_src}}" width="140" height="" alt="{{logo_alt}}" style="display:block; border:0; outline:none; text-decoration:none;">
              </a>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td align="left" class="p-xs" style="padding:32px 32px 8px 32px; font-family:Arial, Helvetica, sans-serif;">
              <div style="font-size:12px; font-weight:600; letter-spacing:.4px; text-transform:uppercase; color:#0a84ff;">{{selo}}</div>
              <h1 style="margin:8px 0 8px; font-size:24px; line-height:1.25; color:#0b1220;">
                {{titulo_principal}}
              </h1>
              <p style="margin:0; font-size:16px; line-height:1.6; color:#3b4556;">
                {{subtitulo}}
              </p>
            </td>
          </tr>

          <!-- CTA principal (botão com VML para Outlook) -->
          <tr>
            <td align="left" class="p-xs" style="padding:12px 32px 24px 32px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta_href}}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="12%" stroke="f" fillcolor="#0a84ff">
                <w:anchorlock/>
                <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:16px; font-weight:bold;">{{cta_label}}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="{{cta_href}}" target="_blank"
                 style="display:inline-block; background:#0a84ff; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:bold; text-decoration:none; border-radius:6px; padding:14px 22px;"
                 class="btn">{{cta_label}}</a>
              <!--<![endif]-->
              <div style="height:8px; line-height:8px;">&nbsp;</div>
              <p style="margin:0; font-size:12px; color:#6b7280; font-family:Arial, Helvetica, sans-serif;">
                {{cta_subcopy}}
              </p>
            </td>
          </tr>

          <!-- Destaques (2 colunas responsivas) -->
          <tr>
            <td align="center" style="padding:8px 16px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="stack" valign="top" style="width:50%; max-width:50%; padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eef2f7; border-radius:10px;">
                      <tr>
                        <td style="padding:16px; font-family:Arial, Helvetica, sans-serif;">
                          <h3 style="margin:0 0 6px; font-size:16px; color:#0b1220;">{{bloco1_titulo}}</h3>
                          <p style="margin:0; font-size:14px; color:#3b4556; line-height:1.5;">
                            {{bloco1_texto}}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="stack" valign="top" style="width:50%; max-width:50%; padding:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eef2f7; border-radius:10px;">
                      <tr>
                        <td style="padding:16px; font-family:Arial, Helvetica, sans-serif;">
                          <h3 style="margin:0 0 6px; font-size:16px; color:#0b1220;">{{bloco2_titulo}}</h3>
                          <p style="margin:0; font-size:14px; color:#3b4556; line-height:1.5;">
                            {{bloco2_texto}}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Lista de benefícios -->
          <tr>
            <td align="left" class="p-xs" style="padding:8px 32px 8px 32px; font-family:Arial, Helvetica, sans-serif;">
              <h3 style="margin:0 0 8px; font-size:16px; color:#0b1220;">Por que vale a pena?</h3>
              <ul style="margin:0; padding-left:18px; color:#3b4556; font-size:14px; line-height:1.6;">
                <li>{{beneficio_1}}</li>
                <li>{{beneficio_2}}</li>
                <li>{{beneficio_3}}</li>
              </ul>
            </td>
          </tr>

          <!-- Imagem (opcional) -->
          <tr>
            <td align="center" style="padding:8px 32px 16px 32px;">
              <a href="{{imagem_href}}" target="_blank" style="text-decoration:none;">
                <img src="{{imagem_src}}" alt="{{imagem_alt}}" width="536" style="width:100%; max-width:536px; height:auto; border:0; display:block;">
              </a>
            </td>
          </tr>

          <!-- CTA secundário -->
          <tr>
            <td align="left" class="p-xs" style="padding:0 32px 24px 32px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{cta2_href}}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="#0b1220">
                <w:anchorlock/>
                <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:14px; font-weight:bold;">{{cta2_label}}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="{{cta2_href}}" target="_blank"
                 style="display:inline-block; background:#0b1220; color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:bold; text-decoration:none; border-radius:6px; padding:12px 18px;"
                 class="btn">{{cta2_label}}</a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="height:1px; line-height:1px; background:#eef2f7;">&nbsp;</td></tr>

          <!-- Rodapé -->
          <tr>
            <td align="left" style="padding:18px 24px 28px 24px; font-family:Arial, Helvetica, sans-serif; color:#6b7280; font-size:12px; line-height:1.6;">
              <p style="margin:0 0 6px;"><strong>{{brand_name}}</strong></p>
              <p style="margin:0 0 6px;">{{endereco_completo}}</p>
              <p style="margin:0 0 10px;">
                Dúvidas? <a href="{{link_suporte}}" target="_blank" style="color:#0a84ff; text-decoration:none;">Fale com nosso time</a>.
              </p>
              <p style="margin:0;">
                <a href="{{link_descadastro}}" target="_blank" style="color:#6b7280; text-decoration:underline;">Descadastrar</a>
                &nbsp;&middot;&nbsp;
                <a href="{{link_preferencias}}" target="_blank" style="color:#6b7280; text-decoration:underline;">Gerenciar preferências</a>
              </p>
            </td>
          </tr>
        </table>
        <!-- /Container -->
      </td>
    </tr>
  </table>
  <!-- /Wrapper -->
</body>
</html>`;

export const generateHTML = (data: any): string => {
  // Processa os dados para adicionar os ícones SVG corretos e lógica de duas colunas
  const processedData = {
    ...data,
    solutions: data.solutions?.map((solution: any, index: number) => {
      // Define tamanhos para layout assimétrico
      let size, sizeType;
      if (index === 0) {
        size = 'control-item-large';
        sizeType = 'large';
      } else if (index < 6) {
        size = 'control-item-medium';
        sizeType = 'medium';
      } else {
        size = 'control-item-small';
        sizeType = 'small';
      }
      
      return {
        ...solution,
        index: index + 1,
        size,
        sizeType,
        isFirst3: index < 3,
        isLast2: index >= 3
      };
    }),
    footer: {
      ...data.footer,
      social: data.footer.social.map((social: any) => ({
        ...social,
        iconSvg: SOCIAL_ICONS[social.platform] || SOCIAL_ICONS.website
      }))
    }
  };

  return Mustache.render(TEMPLATE_HTML, processedData);
};

export const generateEmailHTML = (emailData: any): string => {
  return Mustache.render(EMAIL_TEMPLATE_HTML, emailData);
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
    "cta_primary": { "label": "Falar com comercial", "href": "https://wa.me/5516993831794?text=Ol%C3%A1!Gostaria+de+mais+informa%C3%A7%C3%B5es", "visible": true },
    "cta_secondary": { "label": "Loja online", "href": "https://loja.smartdent.com.br/", "visible": true },
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
      { "platform": "instagram", "href": "https://www.instagram.com/smartdentoficial/" },
      { "platform": "youtube", "href": "https://www.youtube.com/@smartdentcadcam" },
      { "platform": "facebook", "href": "https://www.facebook.com/smartdentoficial/" }
    ]
  }
};