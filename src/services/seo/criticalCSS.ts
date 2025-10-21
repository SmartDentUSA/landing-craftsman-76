/**
 * Critical CSS - Apenas estilos above-the-fold essenciais para First Paint
 * Será injetado inline no <head> para eliminar render-blocking
 */

export const CRITICAL_CSS = `
/* Poppins Font - Critical Above-the-Fold */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

/* CSS Variables - Design System */
:root{
  --primary:#0f172a;
  --secondary:#1e293b;
  --accent:#14b8a6;
  --accent-2:#3b82f6;
  --bg:#ffffff;
  --bg-subtle:#f8fafc;
  --border:rgba(15,23,42,0.08);
  --text:#334155;
  --text-muted:#64748b;
  --radius:12px;
  --shadow-sm:0 1px 2px rgba(15,23,42,0.05);
  --shadow-md:0 4px 6px rgba(15,23,42,0.07);
  --shadow-lg:0 10px 15px rgba(15,23,42,0.1);
}

/* Reset */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Poppins',system-ui,-apple-system,sans-serif;line-height:1.6;color:var(--text);background:var(--bg)}

/* Container */
.container{max-width:900px;margin:0 auto;padding:24px}

/* Hero Section - Above-the-Fold */
.hero{margin-bottom:48px;padding:32px;background:linear-gradient(135deg,var(--bg-subtle) 0%,#fff 100%);border-radius:var(--radius);border:1px solid var(--border)}
.eyebrow{font-size:0.875rem;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px}
h1{font-size:clamp(1.75rem,5vw,2.5rem);font-weight:700;color:var(--primary);line-height:1.2;margin-bottom:16px}
.lead{font-size:1.125rem;color:var(--text-muted);line-height:1.6}

/* TOC - Above the fold critical styles */
.toc{position:sticky;top:16px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:32px;box-shadow:var(--shadow-sm)}
.toc h4{font-size:0.875rem;font-weight:600;color:var(--primary);margin-bottom:12px}
.toc ul{list-style:none;padding:0;margin:0}
.toc li{margin:0}
.toc a{display:block;padding:8px 12px;color:var(--text);text-decoration:none;border-radius:6px;transition:background 0.2s,color 0.2s;font-size:0.875rem}
.toc a:hover{background:var(--bg-subtle);color:var(--accent)}

/* Mobile First */
@media (max-width:768px){
  .container{padding:16px}
  .hero{padding:24px}
  h1{font-size:1.75rem}
  .lead{font-size:1rem}
  .toc{position:static;margin-bottom:24px}
}
`.trim();

/**
 * Non-Critical CSS - Carregado externamente com preload
 * Contém estilos de interação, decorativos e below-the-fold
 */
export const FULL_CSS = `
/* ============= NOVO CSS MODERNO ============= */

/* Typography */
h2{
  font-size:1.5rem;
  font-weight:600;
  color:var(--primary);
  margin:40px 0 16px 0;
  scroll-margin-top:80px;
}

h3{
  font-size:1.25rem;
  font-weight:600;
  color:var(--secondary);
  margin:32px 0 12px 0;
}

h4{
  font-size:1rem;
  font-weight:600;
  color:var(--primary);
  margin:24px 0 8px 0;
}

/* Paragraphs */
p{
  margin-bottom:16px;
  line-height:1.7;
  color:var(--text);
}

/* Lists */
ul,ol{
  margin:16px 0;
  padding-left:24px;
}

li{
  margin-bottom:8px;
  line-height:1.6;
}

/* Links */
a{
  color:var(--accent);
  text-decoration:none;
  transition:color 0.2s;
}

a:hover{
  color:var(--accent-2);
  text-decoration:underline;
}

/* Card Sections */
.card{
  background:var(--bg);
  border:1px solid var(--border);
  border-radius:var(--radius);
  padding:32px;
  margin-bottom:32px;
  box-shadow:var(--shadow-sm);
}

/* Benefit Cards Grid */
.grid-3{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:24px;
  margin:24px 0;
}

.benefit{
  padding:24px;
  background:linear-gradient(135deg,var(--bg-subtle) 0%,#fff 100%);
  border:1px solid var(--border);
  border-radius:var(--radius);
  transition:transform 0.2s,box-shadow 0.2s;
}

.benefit:hover{
  transform:translateY(-4px);
  box-shadow:var(--shadow-md);
}

.badge{
  display:inline-block;
  padding:4px 12px;
  background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);
  color:#fff;
  border-radius:20px;
  font-size:0.75rem;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:0.05em;
  margin-bottom:12px;
}

/* TOC Full Styles */
.toc .small{
  display:block;
  margin-top:12px;
  padding:8px 12px;
  text-align:center;
  color:var(--text-muted);
  font-size:0.75rem;
  text-decoration:none;
}

/* Blockquote */
blockquote{
  border-left:4px solid var(--accent);
  padding-left:20px;
  margin:24px 0;
  color:var(--text-muted);
  font-style:italic;
}

/* Images */
img{
  max-width:100%;
  height:auto;
  border-radius:var(--radius);
  margin:24px 0;
}

/* Code */
code{
  background:var(--bg-subtle);
  padding:2px 6px;
  border-radius:4px;
  font-family:'Courier New',monospace;
  font-size:0.875em;
}

pre{
  background:var(--bg-subtle);
  padding:16px;
  border-radius:var(--radius);
  overflow-x:auto;
  margin:24px 0;
}

pre code{
  background:none;
  padding:0;
}

/* Tables */
table{
  width:100%;
  border-collapse:collapse;
  margin:24px 0;
}

th,td{
  padding:12px;
  text-align:left;
  border-bottom:1px solid var(--border);
}

th{
  background:var(--bg-subtle);
  font-weight:600;
  color:var(--primary);
}

/* Company Footer */
.company-footer-info,
.company-info{
  margin-top:40px;
  padding:20px;
  background:linear-gradient(135deg,var(--bg-subtle) 0%,#fff 100%);
  border-radius:var(--radius);
  border-left:4px solid var(--accent);
}

.company-footer-info h3,
.company-info h3{
  color:var(--primary);
  margin-bottom:12px;
}

/* Multi-Domain Footer */
.multi-domain-footer{
  margin-top:60px;
  padding:30px 0;
  border-top:1px solid var(--border);
  text-align:center;
}

.multi-domain-footer a{
  display:inline-block;
  margin:0 15px;
  color:var(--accent);
  text-decoration:none;
  font-size:0.95rem;
  transition:color 0.3s ease;
}

.multi-domain-footer a:hover{
  color:var(--accent-2);
  text-decoration:underline;
}

/* Institutional Links */
nav.institutional-links{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  padding:10px;
  background:var(--bg-subtle);
  border-radius:var(--radius);
  margin:20px 0;
}

nav.institutional-links a{
  color:var(--accent);
  text-decoration:none;
  font-size:0.9rem;
}

/* Accessibility */
.sr-only{
  position:absolute;
  width:1px;
  height:1px;
  padding:0;
  margin:-1px;
  overflow:hidden;
  clip:rect(0,0,0,0);
  white-space:nowrap;
  border:0;
}

.skip-link{
  position:absolute;
  top:-40px;
  left:0;
  background:var(--accent);
  color:#fff;
  padding:8px 16px;
  text-decoration:none;
  z-index:100;
}

.skip-link:focus{
  top:0;
}

/* Responsive */
@media (max-width:768px){
  .card{padding:24px}
  .grid-3{grid-template-columns:1fr}
  h2{font-size:1.4rem;margin:20px 0 12px 0}
  h3{font-size:1.2rem}
  .multi-domain-footer a{display:block;margin:10px 0}
  nav.institutional-links{flex-direction:column}
}

@media (min-width:1200px){
  .container{max-width:1000px}
}

/* Print Styles */
@media print{
  body{background:#fff;color:#000}
  a{text-decoration:underline}
  .toc,.skip-link{display:none}
}
`.trim();

/**
 * Gera tags <link> para CSS externo com resource hints
 */
export function generateCSSLinks(cssUrl: string): string {
  return `
  <!-- Preconnect para CDN/Storage -->
  <link rel="preconnect" href="${new URL(cssUrl).origin}" crossorigin>
  
  <!-- Preload CSS Critical -->
  <link rel="preload" href="${cssUrl}" as="style" onload="this.onload=null;this.rel='stylesheet'">
  
  <!-- Fallback para navegadores sem preload -->
  <noscript><link rel="stylesheet" href="${cssUrl}"></noscript>
`.trim();
}

/**
 * Inline Critical CSS no <head>
 */
export function inlineCriticalCSS(): string {
  return `<style>${CRITICAL_CSS}</style>`;
}

/**
 * Gera script de smooth scroll para navegação entre seções
 */
export function generateSmoothScrollScript(): string {
  return `
<script>
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
</script>
`.trim();
}
