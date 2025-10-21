/**
 * Critical CSS - Apenas estilos above-the-fold essenciais para First Paint
 * Será injetado inline no <head> para eliminar render-blocking
 */

export const CRITICAL_CSS = `
:root{
  --bg:#ffffff;
  --muted:#6b7280;
  --accent:#0f766e;
  --accent-2:#0369a1;
  --card:#f8fafc;
  --radius:14px;
  --max-width:1100px;
  --content-padding:22px;
  font-family: 'Poppins', system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}
*{box-sizing:border-box}
body{
  margin:0;
  background:linear-gradient(180deg, #fbfcfd 0%, #ffffff 100%);
  color:#0f172a;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  padding:32px;
  display:flex;
  justify-content:center;
  font-size:16px;
}
.container{
  width:100%;
  max-width:var(--max-width);
  background:var(--bg);
  border-radius:18px;
  box-shadow:0 10px 30px rgba(15,23,42,0.06);
  overflow:hidden;
  border:1px solid rgba(15,23,42,0.04);
}
header.hero{
  padding:40px;
  background:linear-gradient(90deg, rgba(3,105,161,0.06), rgba(15,118,110,0.04));
  display:grid;
  grid-template-columns: 1fr;
  gap:24px;
  align-items:center;
}
header .eyebrow{
  display:inline-block;
  font-weight:600;
  color:var(--accent);
  margin-bottom:8px;
  font-size:13px;
}
header h1{
  margin:0 0 12px 0;
  font-size:28px;
  line-height:1.1;
  letter-spacing:-0.2px;
}
header p.lead{
  margin:0 0 18px 0;
  color:var(--muted);
}
main{
  display:grid;
  grid-template-columns: 280px 1fr;
  gap:28px;
  padding:28px;
}
nav.toc{
  position:sticky;
  top:28px;
  align-self:start;
  background:var(--card);
  padding:18px;
  border-radius:12px;
  border:1px solid rgba(15,23,42,0.03);
}
nav.toc h4{margin:0 0 12px 0;}
nav.toc ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
nav.toc a{color:var(--accent-2);text-decoration:none;font-size:14px}
nav.toc a.small{color:var(--muted);font-weight:500}
article{background:transparent;}
section.card{
  background:linear-gradient(180deg,#ffffff,#fbfeff);
  border-radius:var(--radius);
  padding:var(--content-padding);
  margin-bottom:18px;
  border:1px solid rgba(3,105,161,0.04);
}
h2{font-size:20px;margin-top:8px}
h3{font-size:17px;margin-top:10px}
p{margin:0 0 12px 0;color:#0b1220}
ul{margin:0 0 12px 20px}
li{margin-bottom:6px}
blockquote{
  margin:12px 0;
  padding:12px 16px;
  border-left:4px solid rgba(3,105,161,0.12);
  background:#fbfeff;
  border-radius:8px;
  color:#083344;
}
.grid-3{
  display:grid;
  grid-template-columns: repeat(3,1fr);
  gap:12px;
  margin-top:8px;
}
.benefit{
  padding:12px;
  border-radius:10px;
  background:white;
  text-align:center;
  border:1px solid rgba(15,23,42,0.03);
}
.benefit h4{margin:8px 0 6px 0;font-size:15px}
.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#ecfeff;font-weight:600;color:#036e66;font-size:13px}
@media (max-width:980px){
  header{grid-template-columns:1fr}
  main{grid-template-columns:1fr;padding:18px}
  nav.toc{order:2; position:relative; top:auto; margin-top:12px}
  .grid-3{grid-template-columns:repeat(1,1fr)}
}
`.trim();

/**
 * Full CSS para blogs (carregamento externo ou inline)
 * ✅ VAZIO: Todo CSS está inline no CRITICAL_CSS
 */
export const FULL_CSS = '';

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
 * Gera script de smooth scroll para âncoras
 * ✅ ATUALIZADO: Versão robusta com fallback e history.replaceState
 */
export function generateSmoothScrollScript(): string {
  return `
<script>
(function(){
  function supportsSmoothScroll(){ return 'scrollBehavior' in document.documentElement.style; }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        if(supportsSmoothScroll()){
          target.scrollIntoView({behavior:'smooth', block:'start'});
        } else {
          window.scrollTo(0, target.offsetTop);
        }
        history.replaceState && history.replaceState(null, null, this.getAttribute('href'));
      }
    });
  });
})();
</script>
`.trim();
}
