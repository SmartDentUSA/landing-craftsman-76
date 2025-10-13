import { useEffect } from 'react';

/**
 * Hook para gerenciar a funcionalidade "Leia mais" dos blogs
 * Adiciona event listeners para expansão/colapso de conteúdo
 */
export const useBlogReadMore = () => {
  useEffect(() => {
    const handleReadMoreClick = (event: Event) => {
      event.preventDefault();
      const button = event.target as HTMLButtonElement;
      
      if (!button.classList.contains('read-more-btn')) return;
      
      // Encontrar o container do conteúdo (pode ser post-card-content ou featured-post-content)
      const cardContent = button.closest('.post-card-content, .featured-post-content');
      if (!cardContent) return;

      // Encontrar o elemento de conteúdo completo
      const fullContent = cardContent.querySelector('.full-content');
      if (!fullContent) return;

      // Alternar a classe 'expanded'
      const isExpanded = fullContent.classList.contains('expanded');
      fullContent.classList.toggle('expanded');
      
      // ✅ ACESSIBILIDADE: Atualizar ARIA
      button.setAttribute('aria-expanded', String(!isExpanded));
      
      // ✅ ACESSIBILIDADE: Label descritivo
      const blogTitle = cardContent.querySelector('h2, h3')?.textContent || 'artigo';
      button.setAttribute(
        'aria-label', 
        isExpanded ? `Expandir conteúdo completo de ${blogTitle}` : `Fechar conteúdo completo de ${blogTitle}`
      );
      
      // Atualizar o texto do botão
      button.textContent = isExpanded ? 'Leia mais →' : 'Fechar ↑';
    };

    // Adicionar event listener ao document para capturar todos os cliques
    document.addEventListener('click', handleReadMoreClick);

    // Cleanup: remover event listener quando o componente for desmontado
    return () => {
      document.removeEventListener('click', handleReadMoreClick);
    };
  }, []);
};