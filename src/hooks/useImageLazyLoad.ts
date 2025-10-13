import { useEffect } from 'react';

/**
 * Hook para adicionar lazy loading em todas as imagens
 * Melhora Core Web Vitals (LCP, CLS)
 */
export const useImageLazyLoad = () => {
  useEffect(() => {
    // ✅ Adicionar loading="lazy" em todas <img> sem o atributo
    const images = document.querySelectorAll('img:not([loading])');
    
    images.forEach((element) => {
      const img = element as HTMLImageElement;
      
      // ✅ Exceção: imagens "above the fold" (hero, primeiro banner)
      const isAboveFold = img.closest('.hero-section, .banner-section, [data-priority-image]');
      
      if (!isAboveFold) {
        img.setAttribute('loading', 'lazy');
      } else {
        // ✅ Imagens críticas: loading="eager" + fetchpriority="high"
        img.setAttribute('loading', 'eager');
        img.setAttribute('fetchpriority', 'high');
      }
      
      // ✅ Adicionar dimensões se não tiver (previne CLS)
      if (!img.width && !img.height) {
        console.warn(`Imagem sem width/height (CLS risk): ${img.src}`);
      }
    });
  }, []);
};
