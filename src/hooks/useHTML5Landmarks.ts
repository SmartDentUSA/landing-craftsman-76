import { useEffect } from 'react';

/**
 * Hook para adicionar HTML5 Landmarks e Skip Links
 * Melhora navegação por leitores de tela (WCAG 2.1 AA)
 */
export const useHTML5Landmarks = () => {
  useEffect(() => {
    // ✅ Adicionar Skip Link (se não existir)
    if (!document.querySelector('.skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-link';
      skipLink.textContent = 'Pular para o conteúdo principal';
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    // ✅ Garantir <main> tenha ID
    const main = document.querySelector('main');
    if (main && !main.id) {
      main.id = 'main-content';
    }
    
    // ✅ Adicionar role="banner" ao header (se não tiver)
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }
    
    // ✅ Adicionar role="contentinfo" ao footer
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
    
    // ✅ Adicionar role="navigation" aos <nav>
    const navs = document.querySelectorAll('nav');
    navs.forEach((nav) => {
      if (!nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
      }
    });
  }, []);
};
