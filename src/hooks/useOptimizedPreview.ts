import { useCallback, useRef } from 'react';

interface Solution {
  text: string;
  image: any;
  containerScale?: number;
  gridSpan?: number;
}

export const useOptimizedPreview = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const updateVisualStyles = useCallback((solutions: Solution[]) => {
    try {
      const iframe = document.querySelector('iframe[title="Landing Page Preview"]') as HTMLIFrameElement;
      
      if (!iframe) {
        console.error('❌ Iframe não encontrado no DOM');
        return false;
      }
      
      if (!iframe.contentDocument) {
        console.error('❌ contentDocument é null - verifique sandbox attribute');
        console.log('Iframe sandbox:', iframe.getAttribute('sandbox'));
        return false;
      }
      
      console.log('✅ Iframe encontrado e acessível');
      iframeRef.current = iframe;

      solutions.forEach((solution, index) => {
        const element = iframe.contentDocument?.querySelector(
          `.control-item[data-solution-index="${index}"]`
        ) as HTMLElement;
        
        if (element) {
          // Aplicar scale instantaneamente
          const scale = solution.containerScale || 1.0;
          element.style.transform = `scale(${scale})`;
          element.style.transformOrigin = 'center';
          
          // Aplicar gridSpan instantaneamente
          const gridSpan = solution.gridSpan || 2;
          if (gridSpan === 4) {
            element.style.gridColumn = '1 / -1';
          } else if (gridSpan === 3) {
            element.style.gridColumn = 'span 3';
          } else if (gridSpan === 1) {
            element.style.gridColumn = 'span 1';
          } else {
            element.style.gridColumn = 'span 2';
          }
          
          console.log(`✅ [HOT-SWAP] Solução ${index} atualizada: scale=${scale}, gridSpan=${gridSpan}`);
        } else {
          console.warn(`⚠️ Elemento .control-item[data-solution-index="${index}"] não encontrado`);
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Erro no hot-swap CSS:', error);
      return false;
    }
  }, []);

  const isVisualChange = useCallback((prevSolutions: Solution[], nextSolutions: Solution[]): boolean => {
    if (prevSolutions.length !== nextSolutions.length) return false;

    for (let i = 0; i < prevSolutions.length; i++) {
      const prev = prevSolutions[i];
      const next = nextSolutions[i];

      // Verificar mudanças visuais (containerScale, gridSpan)
      if (
        prev.containerScale !== next.containerScale ||
        prev.gridSpan !== next.gridSpan
      ) {
        return true;
      }

      // Se houver mudança de texto ou imagem, não é apenas visual
      if (
        prev.text !== next.text ||
        prev.image?.src !== next.image?.src
      ) {
        return false;
      }
    }

    return false;
  }, []);

  return {
    updateVisualStyles,
    isVisualChange,
  };
};
