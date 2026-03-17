/* Smart Dent Navigation Data - Auto-generated */
window.__NAV_DATA__ = [
  {
    "name": "#1 - Institucional ",
    "url": "https://smartdent.com.br",
    "isHome": true,
    "brand": null
  },
  {
    "name": "Comparativo Scanners intraorais ",
    "url": "https://smartdent.com.br/comparativo-scanners-intraorais",
    "isHome": false,
    "brand": null
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
  data.forEach(function(item) {
    if (item.url === window.location.href) return;
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