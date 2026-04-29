/* Smart Dent Navigation Data - Auto-generated */
window.__NAV_DATA__ = [
  {
    "name": "Comparativo Scanners Intraorais — Smart Dent",
    "url": "https://smartdent.com.br/comparativo-scanners-intraorais",
    "isHome": false,
    "brand": null
  },
  {
    "name": "Do Escaneamento à Cimentação com Vitality em 2 Horas — Caso Clínico Dr. Weber Ricci",
    "url": "https://smartdent.com.br/blog/caso-clinico-dr-weber-ricci-coroa-posterior-vitality-2-horas-chairside",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Imersão 3 Dias Chairside Print",
    "url": "https://smartdent.com.br/blog/onbording",
    "isHome": false,
    "brand": "Imersão 3 Dias"
  },
  {
    "name": "Parâmetros anycubic photon-mono-se | Smart Dent",
    "url": "https://smartdent.com.br/es/blog/parametros-anycubic-photon-mono-se-smart-dent-smart-print-model-precision-es",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Parâmetros creality hallot-one-pro/plus | Smart Dent",
    "url": "https://smartdent.com.br/blog/parametros-creality-hallot-one-proplus-smart-dent-smart-print-bio-vitality",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "QRCode",
    "url": "https://smartdent.com.br/suport-resurces ",
    "isHome": false,
    "brand": null
  },
  {
    "name": "Quais produtos Smart Dent usar para cimentação de facetas e laminados cerâmicos?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-cimentacao-de-facetas-e-laminados-ceramicos",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para colagem de bráquetes ortodônticos?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-colagem-de-braquetes-ortodonticos",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para coroa provisória de longa duração?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-coroa-provisoria-de-longa-duracao",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para coroa sobre implante unitária?",
    "url": "https://smartdent.com.br/blog/uais-produtos-mart-ent-usar-para-coroa-sobre-implante-unitaria",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para facetas dentais digitais?",
    "url": "https://smartdent.com.br/blog/uais-produtos-mart-ent-usar-para-facetas-dentais-digitais",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para fluxo chairside completo no consultório?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-fluxo-chairside-completo-no-consultorio",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para guia cirúrgico de implante impresso em 3D?",
    "url": "https://smartdent.com.br/en/blog/uais-produtos-mart-ent-usar-para-guia-circrgico-de-implante-impresso-em-3-en",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para inlays e onlays digitais?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-inlays-e-onlays-digitais",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para modelos odontológicos digitais?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-modelos-odontologicos-digitais",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para ortodontia digital e alinhadores?",
    "url": "https://smartdent.com.br/blog/quais-produtos-smart-dent-usar-para-ortodontia-digital-e-alinhadores",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para prótese total digital?",
    "url": "https://smartdent.com.br/en/blog/uais-produtos-mart-ent-usar-para-protese-total-digital-en",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Quais produtos Smart Dent usar para protocolo all-on sobre implantes?",
    "url": "https://smartdent.com.br/blog/uais-produtos-mart-ent-usar-para-protocolo-allon-sobre-implantes",
    "isHome": false,
    "brand": "Smart Dent"
  },
  {
    "name": "Rayshape Edge Mini a Impressora 3D para Odontologia",
    "url": "https://smartdent.com.br/linknabio",
    "isHome": false,
    "brand": "Smart Dent"
  }
];
(function() {
  var data = window.__NAV_DATA__;
  if (!data || data.length < 2) return;
  var nav = document.createElement('nav');
  nav.id = 'smartdent-nav-footer';
  nav.style.cssText = 'background:#1a1a2e;padding:24px 16px;text-align:center;';
  var title = document.createElement('p');
  title.style.cssText = 'color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 12px 0;';
  title.textContent = 'Navegue por nossas páginas:';
  nav.appendChild(title);
  var links = document.createElement('div');
  links.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;';
   var currentUrl = window.location.href.replace(/\/$/, '');
   data.forEach(function(item) {
    if (item.url.replace(/\/$/, '') === currentUrl) return;
    var a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.isHome ? '🏠 Home' : item.name;
    a.style.cssText = 'color:#60a5fa;text-decoration:none;font-size:13px;padding:4px 10px;background:#16213e;border-radius:4px;transition:background 0.2s;';
    a.onmouseover = function() { this.style.background = '#1e3a5f'; };
    a.onmouseout = function() { this.style.background = '#16213e'; };
    links.appendChild(a);
  });
  nav.appendChild(links);
  var existing = document.getElementById('smartdent-nav-footer');
  if (existing) existing.remove();
  var footer = document.querySelector('footer');
  if (footer) {
    var copyright = null;
    var allEls = footer.querySelectorAll('*');
    for (var i = 0; i < allEls.length; i++) {
      var txt = allEls[i].textContent || '';
      if ((txt.indexOf('©') !== -1 || txt.toLowerCase().indexOf('direitos') !== -1) && allEls[i].children.length === 0) {
        copyright = allEls[i];
        break;
      }
    }
    if (!copyright) {
      var directChildren = footer.children;
      for (var j = directChildren.length - 1; j >= 0; j--) {
        var t = directChildren[j].textContent || '';
        if (t.indexOf('©') !== -1 || t.toLowerCase().indexOf('direitos') !== -1) {
          copyright = directChildren[j];
          break;
        }
      }
    }
    if (copyright) {
      copyright.parentNode.insertBefore(nav, copyright);
    } else {
      footer.appendChild(nav);
    }
  } else {
    document.body.appendChild(nav);
  }
})();