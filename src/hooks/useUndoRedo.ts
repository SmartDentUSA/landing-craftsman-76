import { useState, useCallback } from 'react';

/**
 * Hook para implementar funcionalidade Undo/Redo
 * Mantém histórico de até 50 versões do estado
 */
export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const current = history[currentIndex];
  
  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const currentState = prevHistory[currentIndex];
      
      // Calcular o novo estado
      const stateToAdd = typeof newState === 'function'
        ? (newState as (prev: T) => T)(currentState)
        : newState;
      
      // Validação: não aceitar undefined/null
      if (stateToAdd === undefined || stateToAdd === null) {
        console.error('❌ [useUndoRedo] Tentativa de adicionar estado inválido:', stateToAdd);
        return prevHistory;
      }
      
      const newIndex = currentIndex + 1;
      const newHistory = prevHistory.slice(0, newIndex);
      newHistory.push(stateToAdd);
      
      // Limitar histórico a 50 versões
      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(currentIndex); // Index não muda pois removemos do início
      } else {
        setCurrentIndex(newIndex);
      }
      
      return newHistory;
    });
  }, [currentIndex]);
  
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);
  
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history]);
  
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  const reset = useCallback(() => {
    setHistory([initialState]);
    setCurrentIndex(0);
  }, [initialState]);
  
  return { 
    current, 
    set, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset,
    historyLength: history.length
  };
}
