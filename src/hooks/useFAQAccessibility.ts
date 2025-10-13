import { useEffect } from 'react';

/**
 * Hook para gerenciar acessibilidade de FAQ Accordions
 * Adiciona atributos ARIA conforme WCAG 2.1 AA
 */
export const useFAQAccessibility = () => {
  useEffect(() => {
    // Encontrar todos os botões de FAQ
    const faqButtons = document.querySelectorAll('[data-faq-trigger]');
    
    faqButtons.forEach((button, index) => {
      const content = button.nextElementSibling;
      
      if (!content) return;
      
      // ✅ IDs únicos para ARIA
      const buttonId = `faq-button-${index}`;
      const contentId = `faq-content-${index}`;
      
      button.setAttribute('id', buttonId);
      button.setAttribute('aria-controls', contentId);
      button.setAttribute('aria-expanded', button.getAttribute('aria-expanded') || 'false');
      
      content.setAttribute('id', contentId);
      content.setAttribute('role', 'region');
      content.setAttribute('aria-labelledby', buttonId);
    });
    
    // Event listener para atualizar aria-expanded
    const handleFAQClick = (event: Event) => {
      const button = (event.target as HTMLElement).closest('[data-faq-trigger]');
      if (!button) return;
      
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!isExpanded));
    };
    
    document.addEventListener('click', handleFAQClick);
    
    return () => {
      document.removeEventListener('click', handleFAQClick);
    };
  }, []);
};
