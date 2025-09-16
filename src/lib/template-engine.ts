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
    <meta name="robots" content="{{meta_robots}}">
    <title>{{seo_title}}</title>
    
    <!-- Canonical URL -->
    {{#canonical_url}}<link rel="canonical" href="{{canonical_url}}">{{/canonical_url}}
    
    <!-- Hreflang Tags -->
    {{#hreflang}}
    <link rel="alternate" hreflang="{{lang}}" href="{{url}}">
    {{/hreflang}}
    
    <!-- Open Graph Tags -->
    {{#og_title}}<meta property="og:title" content="{{og_title}}">{{/og_title}}
    {{#og_description}}<meta property="og:description" content="{{og_description}}">{{/og_description}}
    {{#og_image_url}}<meta property="og:image" content="{{og_image_url}}">{{/og_image_url}}
    {{#og_type}}<meta property="og:type" content="{{og_type}}">{{/og_type}}
    {{#og_site_name}}<meta property="og:site_name" content="{{og_site_name}}">{{/og_site_name}}
    {{#canonical_url}}<meta property="og:url" content="{{canonical_url}}">{{/canonical_url}}
    
    <!-- Twitter Cards -->
    {{#twitter_card}}<meta name="twitter:card" content="{{twitter_card}}">{{/twitter_card}}
    {{#twitter_title}}<meta name="twitter:title" content="{{twitter_title}}">{{/twitter_title}}
    {{#twitter_description}}<meta name="twitter:description" content="{{twitter_description}}">{{/twitter_description}}
    {{#twitter_image_url}}<meta name="twitter:image" content="{{twitter_image_url}}">{{/twitter_image_url}}
    {{#twitter_site}}<meta name="twitter:site" content="{{twitter_site}}">{{/twitter_site}}
    {{#twitter_creator}}<meta name="twitter:creator" content="{{twitter_creator}}">{{/twitter_creator}}
    
    <!-- Publication Dates -->
    {{#publish_date}}<meta name="publish_date" content="{{publish_date}}">{{/publish_date}}
    {{#lastmod}}<meta name="lastmod" content="{{lastmod}}">{{/lastmod}}
    
    <!-- Schema Markup JSON-LD -->
    {{#schema_json_ld}}
    <script type="application/ld+json">
    {{{schema_json_ld}}}
    </script>
    {{/schema_json_ld}}
    
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
            {{#columnVars}}
            --col-1: {{col1}};
            --col-2: {{col2}};
            --col-3: {{col3}};
            --col-4: {{col4}};
            {{/columnVars}}
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

        /* Menu hamburger mobile */
        .mobile-menu-btn {
            display: none;
            flex-direction: column;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            gap: 4px;
        }
        .mobile-menu-btn span {
            width: 25px;
            height: 3px;
            background: #333;
            transition: all 0.3s ease;
            border-radius: 2px;
        }
        .mobile-menu-btn.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        .mobile-menu-btn.active span:nth-child(2) {
            opacity: 0;
        }
        .mobile-menu-btn.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }

        /* Mobile menu overlay */
        .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .mobile-menu-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        /* Mobile menu */
        .mobile-menu {
            position: fixed;
            top: 0;
            right: -100%;
            width: 280px;
            height: 100vh;
            background: var(--white);
            z-index: 1000;
            transition: right 0.3s ease;
            padding: 2rem 1.5rem;
            box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
        }
        .mobile-menu.active {
            right: 0;
        }
        .mobile-menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #eee;
        }
        .mobile-menu-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .mobile-menu nav {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .mobile-menu nav a {
            padding: 1rem 0;
            border-bottom: 1px solid #f0f0f0;
            color: #333;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        .mobile-menu nav a:hover {
            color: var(--primary-color);
        }

        @media (max-width: 768px) {
            .header-menu nav {
                display: none;
            }
            .mobile-menu-btn {
                display: flex;
            }
        }

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
            transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .banner-images a {
            display: block;
            cursor: pointer;
        }
        .banner-images a:hover img {
            transform: scale(1.02);
            opacity: 0.9;
        }

        /* Seção soluções / controle */
        .control-section { padding: 2.5rem 0 0.5rem 0; }
        
        @media (min-width: 768px) {
          .control-section {
            padding-bottom: 0.1rem;
          }
        }
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
            text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.9), 1px 1px 4px rgba(0, 0, 0, 1);
            font-weight: 700;
            padding: 1rem;
            background: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.8) 100%);
        }
        
        @media (max-width: 768px) {
            .control-item-text-overlay {
                padding: 1.5rem;
                background: linear-gradient(transparent 0%, rgba(0, 0, 0, 0.5) 60%, rgba(0, 0, 0, 0.85) 100%);
                font-size: 1rem;
                line-height: 1.4;
                text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.9), 1px 1px 4px rgba(0, 0, 0, 1);
            }
            
            .control-item-text-overlay h2 {
                font-size: 1.25rem;
                line-height: 1.3;
                margin-bottom: 0.5rem;
            }
            
            .control-item-text-overlay p {
                font-size: 0.95rem;
                line-height: 1.4;
            }
            
            .image-container-large {
                aspect-ratio: 4/3;
            }
            
            .image-container-medium {
                aspect-ratio: 4/3;
            }
            
            .image-container-small {
                aspect-ratio: 4/3;
            }
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
            height: 100%;
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
                grid-template-columns: var(--col-1, 1fr) var(--col-2, 1fr) var(--col-3, 1fr) var(--col-4, 1fr);
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
        
        @media (max-width: 767px) {
            .control-item:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }
        }
        
        @media (min-width: 768px) {
            .control-item:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            }
            
            /* Fixed font sizes for text overlays */
            .control-item-large .control-item-text-overlay {
                font-size: 1.25rem;
                line-height: 1.4;
                padding: 1.5rem;
            }
            
            .control-item-medium .control-item-text-overlay {
                font-size: 1rem;
                line-height: 1.4;
                padding: 1.25rem;
            }
            
            .control-item-small .control-item-text-overlay {
                font-size: 0.875rem;
                line-height: 1.4;
                padding: 1rem;
            }
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
            height: auto;
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
        
        @media (min-width: 768px) {
            .control-item,
            .image-container,
            .image-container-large,
            .image-container-medium,
            .image-container-small {
                height: 100%;
                aspect-ratio: auto;
            }
            
            .control-item .control-item-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
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
        }
        
        /* Failsafe para garantir responsividade no grid de soluções */
        .control-grid .image-container {
            height: auto;
        }
        
        .control-grid .control-item-image {
            height: 100%;
        }

        /* Mobile/Desktop visibility controls */
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        
        @media (max-width: 767px) {
            .desktop-only { display: none; }
            .mobile-only { display: block; }
            .control-grid { display: none !important; }
        }

        /* Mobile Carousel Styles */
        .mobile-carousel {
            position: relative;
            width: 100%;
            overflow: hidden;
        }
        
        .carousel-container {
            position: relative;
            overflow: hidden;
            border-radius: 1rem;
        }
        
        .carousel-track {
            display: flex;
            transition: transform 0.3s ease;
            width: 100%;
        }
        
        .carousel-slide {
            flex: 0 0 100%;
            width: 100%;
        }
        
        .carousel-slide .image-container {
            aspect-ratio: 4/3;
            position: relative;
            overflow: hidden;
            border-radius: 1rem;
        }
        
        .carousel-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.9);
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            color: hsl(192, 95%, 35%);
            cursor: pointer;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
        }
        
        .carousel-btn:hover {
            background: white;
            transform: translateY(-50%) scale(1.1);
        }
        
        .carousel-prev {
            left: 10px;
        }
        
        .carousel-next {
            right: 10px;
        }
        
        .carousel-indicators {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 1rem;
        }
        
        .carousel-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: none;
            background: hsl(220, 13%, 91%);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .carousel-dot.active {
            background: hsl(192, 95%, 35%);
            transform: scale(1.2);
        }

        /* Desktop Info Section */
        .desktop-info {
            padding: 2.5rem 0;
            background: var(--background-color);
            text-align: center;
        }
        
        @media (min-width: 768px) {
          .desktop-info {
            padding-top: 1.5rem;
          }
        }

        .desktop-info-content h2 {
            margin-bottom: 1rem;
            color: var(--text-color);
        }

        .desktop-info-content p {
            color: var(--text-color);
            max-width: 800px;
            margin: 0 auto;
        }

        /* Desktop Table Styles */
        .desktop-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 2rem;
            background: var(--white);
            border-radius: .75rem;
            overflow: hidden;
            border: 1px solid #eee;
            box-shadow: none;
        }

        .desktop-table-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 1rem;
            text-align: center;
        }

        .desktop-table thead th {
            background: var(--white);
            color: var(--text-color);
            padding: 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 1rem;
            border-bottom: 1px solid #eee;
        }

        .desktop-table tbody td {
            padding: 1rem;
            border-bottom: 1px solid #eee;
            color: #555;
            font-size: 1rem;
        }

        .desktop-table tbody tr:nth-child(even) {
            background: var(--white);
        }

        .desktop-table tbody tr:hover {
            background: #f9fafb;
        }

        .desktop-table tbody tr:last-child td {
            border-bottom: none;
        }

        /* Desktop-only visibility */
        @media (max-width: 767px) {
            .desktop-only {
                display: none !important;
            }
        }

        /* Consultoria */
        .personalized-service { background: var(--white); padding: 1.25rem 0 2.5rem 0; }
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
        @media (max-width: 767px) {
            .footer { font-size: 0.875rem; }
            .footer-grid { 
                grid-template-columns: 1fr 1fr; 
                position: relative; 
            }
            .footer-social { 
                position: absolute; 
                top: 0; 
                right: 0; 
                grid-column: unset; 
            }
        }
    </style>
    <script>
        // Mobile menu functionality
        function toggleMobileMenu() {
            const btn = document.querySelector('.mobile-menu-btn');
            const overlay = document.querySelector('.mobile-menu-overlay');
            const menu = document.querySelector('.mobile-menu');
            
            btn.classList.toggle('active');
            overlay.classList.toggle('active');
            menu.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (menu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
        
        function closeMobileMenu() {
            const btn = document.querySelector('.mobile-menu-btn');
            const overlay = document.querySelector('.mobile-menu-overlay');
            const menu = document.querySelector('.mobile-menu');
            
            btn.classList.remove('active');
            overlay.classList.remove('active');
            menu.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        // Close menu on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });
        
        // Close menu on window resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });
    </script>
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
            <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </header>

    <!-- Mobile menu overlay -->
    <div class="mobile-menu-overlay" onclick="closeMobileMenu()"></div>
    
    <!-- Mobile menu -->
    <div class="mobile-menu">
        <div class="mobile-menu-header">
            <img class="logo-img" src="{{logo_url}}" alt="{{logo_alt}}">
            <button class="mobile-menu-close" onclick="closeMobileMenu()" aria-label="Fechar menu">&times;</button>
        </div>
        <nav>
            {{#menu}}
            <a href="{{href}}" onclick="closeMobileMenu()">{{label}}</a>
            {{/menu}}
        </nav>
    </div>

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
                {{#href}}
                <a href="{{href}}" target="_blank" rel="noopener noreferrer">
                    <img src="{{src}}" alt="{{alt}}" style="transform: scale({{scale}})">
                </a>
                {{/href}}
                {{^href}}
                <img src="{{src}}" alt="{{alt}}" style="transform: scale({{scale}})">
                {{/href}}
                {{/banner.images}}
            </div>
        </div>
    </header>

    <!-- Soluções / Controle -->
    <section class="control-section">
        <div class="container">
            <h2>{{solutions_title}}</h2>
            
            <!-- Desktop Grid -->
            <div class="control-grid">
                {{#solutions}}
                <div class="control-item {{size}}" {{#gridColumn}}style="{{gridColumn}}"{{/gridColumn}}>
                    <div class="image-container image-container-{{sizeType}}">
                        <img src="{{image.src}}" alt="{{image.alt}}" class="control-item-image">
                        <div class="control-item-text-overlay">
                            <p>{{text}}</p>
                        </div>
                    </div>
                </div>
                {{/solutions}}
            </div>
            
            <!-- Mobile Carousel -->
            <div class="mobile-carousel mobile-only">
                <div class="carousel-container">
                    <div class="carousel-track" id="solutions-carousel">
                        {{#solutions}}
                        <div class="carousel-slide">
                            <div class="image-container">
                                <img src="{{image.src}}" alt="{{image.alt}}" class="control-item-image" {{#image.scale}}style="transform: scale({{image.scale}})"{{/image.scale}}>
                                <div class="control-item-text-overlay">
                                    <p>{{text}}</p>
                                </div>
                            </div>
                        </div>
                        {{/solutions}}
                    </div>
                    <button class="carousel-btn carousel-prev" onclick="moveCarousel(-1)">‹</button>
                    <button class="carousel-btn carousel-next" onclick="moveCarousel(1)">›</button>
                </div>
                        <div class="carousel-indicators">
                            {{#solutions}}
                            <button class="carousel-dot" onclick="goToSlide({{slideIndex}})"></button>
                            {{/solutions}}
                        </div>
            </div>
        </div>
    </section>

    <!-- Desktop Info Section -->
    {{#desktop_info.visible_any}}
    <section class="desktop-info {{desktop_info.visibility_class}}">
        <div class="container">
            <div class="desktop-info-content">
                <h2>{{desktop_info.title}}</h2>
                <p>{{desktop_info.text}}</p>
                
                {{#desktop_info.show_table}}
                <h3 class="desktop-table-title">{{desktop_info.table_title}}</h3>
                <table class="desktop-table">
                        <thead>
                            <tr>
                                {{#desktop_info.table_headers}}
                                <th>{{.}}</th>
                                {{/desktop_info.table_headers}}
                            </tr>
                        </thead>
                        <tbody>
                            {{#desktop_info.table_rows}}
                            <tr>
                                {{#.}}
                                <td>{{.}}</td>
                                {{/.}}
                            </tr>
                            {{/desktop_info.table_rows}}
                        </tbody>
                    </table>
                {{/desktop_info.show_table}}
            </div>
        </div>
    </section>
    {{/desktop_info.visible_any}}

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
            // FAQ functionality
            const faqQuestions = document.querySelectorAll('.faq-question');
            faqQuestions.forEach(question => {
                question.addEventListener('click', () => {
                    const faqItem = question.closest('.faq-item');
                    faqItem.classList.toggle('active');
                });
            });
            
            // Mobile Carousel functionality
            let currentSlide = 0;
            const totalSlides = document.querySelectorAll('.carousel-slide').length;
            let autoplayInterval = null;
            let isAutoplayActive = false;
            
            function updateCarousel() {
                const track = document.querySelector('.carousel-track');
                const dots = document.querySelectorAll('.carousel-dot');
                
                if (track && dots.length > 0) {
                    track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
                    
                    dots.forEach((dot, index) => {
                        dot.classList.toggle('active', index === currentSlide);
                    });
                }
            }
            
            function startAutoplay() {
                if (totalSlides > 1 && !isAutoplayActive) {
                    isAutoplayActive = true;
                    autoplayInterval = setInterval(() => {
                        currentSlide = (currentSlide + 1) % totalSlides;
                        updateCarousel();
                    }, 3000);
                }
            }
            
            function stopAutoplay() {
                if (autoplayInterval) {
                    clearInterval(autoplayInterval);
                    autoplayInterval = null;
                    isAutoplayActive = false;
                }
            }
            
            function resetAutoplay() {
                stopAutoplay();
                setTimeout(startAutoplay, 100);
            }
            
            window.moveCarousel = function(direction) {
                currentSlide += direction;
                
                if (currentSlide >= totalSlides) {
                    currentSlide = 0;
                } else if (currentSlide < 0) {
                    currentSlide = totalSlides - 1;
                }
                
                updateCarousel();
                resetAutoplay();
            };
            
            window.goToSlide = function(index) {
                currentSlide = index;
                updateCarousel();
                resetAutoplay();
            };
            
            // Initialize carousel
            updateCarousel();
            
            // Start autoplay
            startAutoplay();
            
            // Add touch/swipe support
            let startX = 0;
            let currentX = 0;
            let isSwipping = false;
            
            const carousel = document.querySelector('.carousel-container');
            
            if (carousel) {
                carousel.addEventListener('touchstart', function(e) {
                    startX = e.touches[0].clientX;
                    isSwipping = true;
                    stopAutoplay();
                });
                
                carousel.addEventListener('touchmove', function(e) {
                    if (!isSwipping) return;
                    currentX = e.touches[0].clientX;
                });
                
                carousel.addEventListener('touchend', function(e) {
                    if (!isSwipping) return;
                    isSwipping = false;
                    
                    const diffX = startX - currentX;
                    const threshold = 50;
                    
                    if (Math.abs(diffX) > threshold) {
                        if (diffX > 0) {
                            window.moveCarousel(1); // Swipe left - next slide
                        } else {
                            window.moveCarousel(-1); // Swipe right - previous slide
                        }
                    } else {
                        resetAutoplay();
                    }
                });
            }
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

// 🔧 FUNÇÃO SANITIZAÇÃO APRIMORADA - Evita URLs duplicadas
const sanitizeDomain = (domain: string): string => {
  if (!domain) return '';
  
  // Log para debugging
  console.log('🔧 Sanitizando domain:', domain);
  
  let cleaned = domain
    .trim()
    .replace(/^https?:\/\/+/g, '') // Remove protocolos múltiplos
    .replace(/^www\.+/g, '') // Remove www múltiplos
    .replace(/\/+$/g, '') // Remove barras finais
    .replace(/\/+/g, '/'); // Normaliza barras múltiplas
  
  // Detectar e corrigir duplicações específicas
  if (cleaned.includes('https://')) {
    console.warn('⚠️ Domain contém protocolo residual:', cleaned);
    cleaned = cleaned.replace(/https?:\/\/+/g, '');
  }
  
  console.log('✅ Domain sanitizado:', cleaned);
  return cleaned;
};

// 🔧 NOVA: Função para detectar URLs de placeholder
const isPlaceholderUrl = (url: string): boolean => {
  if (!url) return true;
  return url.includes('via.placeholder.com') || 
         url.includes('placeholder') || 
         url.trim() === '';
};

// Função para gerar hreflang automático
const generateAutoHreflang = (pageName: string, domain: string = 'smartdent.com.br'): Array<{ lang: string; url: string }> => {
  if (!pageName) return [];
  
  const slug = pageName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, ''); // Remove hífens do início e fim
  
  const cleanDomain = sanitizeDomain(domain);
  const baseUrl = `https://${cleanDomain}`;
  
  return [
    { lang: 'pt-BR', url: `${baseUrl}/${slug}` },
    { lang: 'pt-PT', url: `${baseUrl}/pt/${slug}` },
    { lang: 'en-US', url: `${baseUrl}/en/${slug}` },
    { lang: 'es-ES', url: `${baseUrl}/es/${slug}` },
    { lang: 'x-default', url: `${baseUrl}/${slug}` }
  ];
};

export const generateHTML = (data: any): string => {
  // Calcular larguras dinâmicas das colunas baseado na presença e escala das imagens
  const calculateColumnWidths = (solutions: any[]) => {
    const columnWeights = [0, 0, 0, 0]; // Inicial: começar em 0 para permitir colapso/expansão reais
    
    // Verificar se apenas a solução 1 tem conteúdo
    const onlySolution1 = solutions[0]?.image?.src && 
                         (!solutions[1]?.image?.src) && 
                         (!solutions[2]?.image?.src) && 
                         (!solutions[3]?.image?.src) && 
                         (!solutions[4]?.image?.src);
    
    // Verificar se a coluna 3 está completamente vazia (solutions[2], solutions[4] e solutions[8] são todos vazios)
    const isColumn3Empty = (!solutions[2] || !solutions[2].image?.src) && 
                          (!solutions[4] || !solutions[4].image?.src) &&
                          (!solutions[8] || !solutions[8].image?.src);
    
    // Verificar se a coluna 2 está completamente vazia (solutions[1], solutions[3] e solutions[7] são todos vazios)
    const isColumn2Empty = (!solutions[1] || !solutions[1].image?.src) && 
                          (!solutions[3] || !solutions[3].image?.src) &&
                          (!solutions[7] || !solutions[7].image?.src);
    
    
    // Se apenas solução 1 tem conteúdo, ela ocupa toda a largura
    if (onlySolution1) {
      return [1, 0, 0, 0];
    }
    
    // Mapear solutions para suas colunas (corrigido para corresponder ao grid-template-areas)
    const columnAssignments = [
      { solution: solutions[0], columns: [0, 1] }, // large ocupa colunas 0 e 1
      { solution: solutions[1], columns: [2] },     // med1 em coluna 2
      { solution: solutions[2], columns: [3] },     // small1 em coluna 3
      { solution: solutions[3], columns: [2] },     // med2 em coluna 2  
      { solution: solutions[4], columns: [3] },     // small2 em coluna 3
      { solution: solutions[5], columns: [0] },     // med3 em coluna 0
      { solution: solutions[6], columns: [1] },     // med4 em coluna 1
      { solution: solutions[7], columns: [2] },     // med5 em coluna 2
      { solution: solutions[8], columns: [3] }      // small3 em coluna 3
    ];
    
    // Calcular pesos baseado na presença e escala das imagens
    columnAssignments.forEach(({ solution, columns }, index) => {
      if (solution && solution.image && solution.image.src) {
        const scale = solution.containerScale || 1.0;
        // Nova fórmula: Solução 1 usa weight = scale * 2, outras usam scale * 1
        const weight = index === 0 ? scale * 2 : scale * 1;
        
        columns.forEach(col => {
          if (col < 4) columnWeights[col] = Math.max(columnWeights[col], weight);
        });
      }
      // Removido o else que zerava as colunas - deixar que apenas colunas realmente vazias sejam 0
    });
    
    // Colapsar colunas 0 e 1 quando a solução 1 não tem imagem
    const isLargeEmpty = (!solutions[0] || !solutions[0].image?.src);
    if (isLargeEmpty) {
      columnWeights[0] = 0;
      columnWeights[1] = 0;
    }
    
    // Se a coluna 2 está completamente vazia, definir peso 0 para colapsar
    if (isColumn2Empty) {
      columnWeights[2] = 0;
    }
    
    // Se a coluna 3 está completamente vazia, definir peso 0 para colapsar
    if (isColumn3Empty) {
      columnWeights[3] = 0;
    }
    
    // Aplicar peso mínimo apenas para colunas com conteúdo
    const minWeight = 0.2;
    const processedWeights = columnWeights.map(w => {
      if (w === 0) return 0; // Manter colunas vazias em 0
      return Math.max(w, minWeight); // Aplicar mínimo apenas para colunas com conteúdo
    });
    
    // Nova normalização baseada em soma fixa de 4.0
    const targetSum = 4.0;
    const currentSum = processedWeights.reduce((sum, weight) => sum + weight, 0);
    
    if (currentSum === 0) {
      // Fallback: distribuir igualmente se tudo está vazio
      return [1, 1, 1, 1];
    }
    
    if (currentSum < targetSum) {
      // Redistribuir espaço extra proporcionalmente entre colunas não vazias
      const extraSpace = targetSum - currentSum;
      const nonEmptyColumns = processedWeights.filter(w => w > 0).length;
      const extraPerColumn = extraSpace / nonEmptyColumns;
      
      return processedWeights.map(w => w === 0 ? 0 : w + extraPerColumn);
    } else {
      // Reduzir proporcionalmente se soma excede target
      const scaleFactor = targetSum / currentSum;
      return processedWeights.map(w => w * scaleFactor);
    }
  };
  
  // Processa os dados para adicionar os ícones SVG corretos e lógica de duas colunas
  const processedData = {
    ...data,
    solutions: data.solutions?.map((solution: any, index: number) => {
      // Define tamanhos para layout assimétrico
      let size, sizeType, gridColumn = '';
      if (index === 0) {
        size = 'control-item-large';
        sizeType = 'large';
      } else if (index < 6) {
        size = 'control-item-medium';
        sizeType = 'medium';
        
        // Verificar se coluna adjacente está vazia para spanning
        if (index === 1 && (!data.solutions[2] || !data.solutions[2].image?.src)) {
          gridColumn = 'grid-column: span 2;'; // med1 expande para small1
        } else if (index === 3 && (!data.solutions[4] || !data.solutions[4].image?.src)) {
          gridColumn = 'grid-column: span 2;'; // med2 expande para small2
        }
      } else {
        size = 'control-item-small';
        sizeType = 'small';
      }
      
      return {
        ...solution,
        index: index + 1,
        size,
        sizeType,
        slideIndex: index,
        isFirst3: index < 3,
        isLast2: index >= 3,
        containerScale: solution.containerScale || 1.0,
        gridColumn
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

  // Process desktop info section
  if (data.desktop_info && (data.desktop_info.visible_desktop || data.desktop_info.visible_mobile)) {
    // Pre-process table data to be arrays ordered by headers
    const table_rows = data.desktop_info.table_data?.map((row: any) => 
      data.desktop_info.table_headers?.map((header: string) => row[header] || '') || []
    ) || [];
    
    // Determine visibility class
    let visibility_class = '';
    if (data.desktop_info.visible_desktop && !data.desktop_info.visible_mobile) {
      visibility_class = 'desktop-only';
    } else if (!data.desktop_info.visible_desktop && data.desktop_info.visible_mobile) {
      visibility_class = 'mobile-only';
    }
    
    processedData.desktop_info = {
      ...data.desktop_info,
      visible_any: true,
      visibility_class: visibility_class,
      table_rows: table_rows
    };
  }
  
  // Calcular e adicionar variáveis CSS para larguras das colunas
  if (processedData.solutions) {
    const columnWeights = calculateColumnWidths(processedData.solutions);
    // calculateColumnWidths já retorna frações normalizadas, usar diretamente
    const columnFractions = columnWeights.map(w => w === 0 ? '0fr' : `${w.toFixed(3)}fr`);
    
    // Adicionar variáveis CSS ao processedData
    processedData.columnVars = {
      col1: columnFractions[0],
      col2: columnFractions[1], 
      col3: columnFractions[2],
      col4: columnFractions[3]
    };
  }

  // 🔧 PROCESSAR HREFLANG COM DOMAIN SANITIZADO
  if (data.seo?.hreflang_auto && (data.seo?.seo_title || data.name)) {
    const pageName = data.seo?.seo_title || data.name;
    const domain = data.seo?.domain || 'www.smartdent.com.br';
    const cleanDomain = sanitizeDomain(domain);
    processedData.hreflang = generateAutoHreflang(pageName, cleanDomain);
    console.log('🔧 Hreflang auto-gerado para domain:', cleanDomain);
  } else {
    processedData.hreflang = data.seo?.hreflang || [];
  }

  // Processar URLs de imagens para SEO
  const processImageUrl = (image: any) => {
    if (!image) return '';
    if (image.mode === 'cloudflare' && image.cf_id) {
      const variant = image.variant || 'w-1200';
      return `https://imagedelivery.net/oWuZOWwUTsYPJBr84OqTgQ/${image.cf_id}/${variant}`;
    }
    return image.src || '';
  };

  // 🔧 CORREÇÃO CRÍTICA: Melhorar lógica para evitar imagens placeholder
  let ogImageUrl = data.seo?.og_image?.src || '';
  
  // Se og_image é placeholder ou vazio, tentar usar imagem da Solução 1
  if (isPlaceholderUrl(ogImageUrl) && data.solutions?.[0]?.image?.src) {
    const solution1Image = data.solutions[0].image.src;
    if (!isPlaceholderUrl(solution1Image)) {
      ogImageUrl = processImageUrl(data.solutions[0].image);
      console.log('🔧 OG Image: usando Solução 1 em vez de placeholder');
    }
  }
  
  // Se ainda é placeholder, usar banner_image se válido
  if (isPlaceholderUrl(ogImageUrl) && data.banner_image?.src) {
    const bannerImage = data.banner_image.src;
    if (!isPlaceholderUrl(bannerImage)) {
      ogImageUrl = processImageUrl(data.banner_image);
      console.log('🔧 OG Image: usando banner em vez de placeholder');
    }
  }
  
  // Se ainda é placeholder, deixar vazio para evitar placeholders no OG
  if (isPlaceholderUrl(ogImageUrl)) {
    ogImageUrl = '';
    console.warn('⚠️ OG Image removida (era placeholder)');
  }
  
  processedData.og_image_url = ogImageUrl;
  processedData.twitter_image_url = ogImageUrl; // Usar mesma lógica para Twitter

  // 🔧 GARANTIR CANONICAL URL SEM DUPLICAÇÃO
  if (!processedData.canonical_url && data.seo?.domain && (data.seo?.seo_title || data.name)) {
    const slug = (data.seo?.seo_title || data.name)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const cleanDomain = sanitizeDomain(data.seo.domain);
    if (cleanDomain) {
      processedData.canonical_url = `https://${cleanDomain}/${slug}`;
      console.log('🔧 Canonical URL gerada:', processedData.canonical_url);
    }
  }
  
  // Validar e corrigir canonical_url existente
  if (processedData.canonical_url) {
    const original = processedData.canonical_url;
    // Detectar e corrigir https://https://
    if (processedData.canonical_url.includes('https://https://')) {
      processedData.canonical_url = processedData.canonical_url.replace(/https:\/\/https:\/\/+/g, 'https://');
      console.warn('⚠️ Canonical URL duplicada corrigida:', original, '→', processedData.canonical_url);
    }
    // Garantir que inicia com https://
    if (!processedData.canonical_url.startsWith('https://') && !processedData.canonical_url.startsWith('http://')) {
      processedData.canonical_url = `https://${processedData.canonical_url}`;
    }
  }

  // 🔧 CORREÇÃO CRÍTICA: Garantir fallbacks para Meta Robots
  if (!processedData.meta_robots || processedData.meta_robots.trim() === '') {
    processedData.meta_robots = 'index, follow';
  }

  // 🔧 CORREÇÃO CRÍTICA: Garantir fallbacks completos para Open Graph
  if (!processedData.og_title || processedData.og_title.trim() === '') {
    processedData.og_title = data.seo_title || data.name || '';
  }
  if (!processedData.og_description || processedData.og_description.trim() === '') {
    processedData.og_description = data.seo_description || '';
  }
  if (!processedData.og_type || processedData.og_type.trim() === '') {
    processedData.og_type = 'website';
  }
  if (!processedData.og_site_name || processedData.og_site_name.trim() === '') {
    processedData.og_site_name = data.brand?.name || data.name || '';
  }

  // 🔧 CORREÇÃO CRÍTICA: Garantir fallbacks completos para Twitter Cards
  if (!processedData.twitter_card || processedData.twitter_card.trim() === '') {
    processedData.twitter_card = 'summary_large_image';
  }
  if (!processedData.twitter_title || processedData.twitter_title.trim() === '') {
    processedData.twitter_title = processedData.og_title || data.seo_title || data.name || '';
  }
  if (!processedData.twitter_description || processedData.twitter_description.trim() === '') {
    processedData.twitter_description = processedData.og_description || data.seo_description || '';
  }

  // Gerar Schema Markup automaticamente se habilitado
  if (data.seo?.hreflang_auto) {
    const schemaGraph = [];

    // Combinar reviews manuais e do Google para agregateRating e reviews
    const manualReviews = data.schema?.manual_reviews || [];
    const googleReviews = data.schema?.google_reviews?.reviews || [];
    const allReviews = [...manualReviews, ...googleReviews];
    
    // Calcular rating agregado das reviews reais
    let aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    };
    
    if (allReviews.length > 0) {
      const totalRating = allReviews.reduce((sum: number, review: any) => sum + (review.rating || 5), 0);
      const avgRating = (totalRating / allReviews.length).toFixed(1);
      aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": allReviews.length.toString()
      };
      console.info('🎯 Schema atualizado com reviews reais:', { 
        totalReviews: allReviews.length, 
        manualReviews: manualReviews.length,
        googleReviews: googleReviews.length,
        avgRating 
      });
    }

    // Schema para Software Application
    schemaGraph.push({
      "@type": "SoftwareApplication",
      "name": data.schema?.software_app?.name || data.banner?.title?.split(':')[0] || "Smart Dent",
      "applicationCategory": data.schema?.software_app?.application_category || "HealthApplication",
      "description": data.seo_description,
      "url": processedData.canonical_url,
      "operatingSystem": data.schema?.software_app?.operating_system || "Web",
      "aggregateRating": aggregateRating,
      ...(allReviews.length > 0 && {
        "review": allReviews.slice(0, 10).map((review: any) => ({
          "@type": "Review",
          "author": {
            "@type": "Person",
            "name": review.author_name || "Cliente"
          },
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": review.rating || 5,
            "bestRating": 5
          },
          "reviewBody": review.review_text || review.text || "Excelente serviço!"
        }))
      }),
      ...(data.schema?.offers?.length > 0 && {
        "offers": data.schema.offers.map((offer: any) => ({
          "@type": "Offer",
          "name": offer.name,
          "description": offer.description,
          "price": offer.price,
          "priceCurrency": offer.currency,
          "availability": offer.availability === "InStock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          ...(offer.valid_through && { "validThrough": offer.valid_through })
        }))
      })
    });

    // Adicionar FAQ Schema se existir FAQ
    if (data.faq && data.faq.length > 0 && data.seo?.faq_enable !== false) {
      schemaGraph.push({
        "@type": "FAQPage",
        "mainEntity": data.faq.map((faq: any) => ({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
      });
    }

    // Adicionar Organization Schema
    if (data.brand?.legal_name) {
      schemaGraph.push({
        "@type": "Organization",
        "name": data.brand.legal_name,
        "legalName": data.brand.legal_name,
        "url": processedData.canonical_url,
        "logo": processImageUrl(data.logo_url),
        "sameAs": data.brand.same_as?.map((sa: any) => sa.url) || [],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": ["Portuguese", "English", "Spanish"]
        }
      });
    }

    // Adicionar Breadcrumb Schema se configurado
    if (data.schema?.breadcrumb?.length > 0) {
      schemaGraph.push({
        "@type": "BreadcrumbList",
        "itemListElement": data.schema.breadcrumb.map((crumb: any, index: number) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": crumb.url
        }))
      });
    }

    // Adicionar WebPage Schema
    schemaGraph.push({
      "@type": "WebPage",
      "name": data.seo_title,
      "description": data.seo_description,
      "url": processedData.canonical_url,
      "datePublished": data.seo?.publish_date,
      "dateModified": data.seo?.lastmod,
      "isPartOf": {
        "@type": "WebSite",
        "name": data.seo?.og_site_name || "Smart Dent",
        "url": `https://${sanitizeDomain(data.seo?.domain || 'www.smartdent.com.br')}`
      }
    });

    processedData.schema_json_ld = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": schemaGraph
    });
  }

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
  "desktop_info": {
    "title": "Excelência em Odontologia Digital",
    "text": "Com mais de 10 anos de experiência no mercado, a Smart Dent se consolidou como referência em soluções tecnológicas para clínicas odontológicas. Nossa missão é democratizar o acesso à tecnologia de ponta, oferecendo equipamentos, materiais e consultoria especializada para profissionais que buscam excelência.",
    "visible": true
  },
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