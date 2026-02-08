import { useState, useCallback, useRef } from 'react';

/**
 * Hook para implementar funcionalidade Undo/Redo
 * Mantém histórico de até 50 versões do estado
 * Usa useRef para currentIndex para evitar stale closures em chamadas sequenciais
 */
export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  
  const current = history[currentIndex] ?? initialState;
  
  const set = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const idx = currentIndexRef.current;
      const currentState = prevHistory[idx] ?? initialState;
      
      // Calcular o novo estado
      const stateToAdd = typeof newState === 'function'
        ? (newState as (prev: T) => T)(currentState)
        : newState;
      
      // Validação: não aceitar undefined/null
      if (stateToAdd === undefined || stateToAdd === null) {
        console.error('❌ [useUndoRedo] Tentativa de adicionar estado inválido:', stateToAdd);
        return prevHistory;
      }
      
      const newIndex = idx + 1;
      const newHistory = prevHistory.slice(0, newIndex);
      newHistory.push(stateToAdd);
      
      // Limitar histórico a 50 versões
      if (newHistory.length > 50) {
        newHistory.shift();
        const adjustedIndex = newIndex - 1;
        currentIndexRef.current = adjustedIndex;
        setCurrentIndex(adjustedIndex);
      } else {
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }
      
      return newHistory;
    });
  }, [initialState]);
  
  // Função para substituir o estado atual sem adicionar ao histórico
  const setReplace = useCallback((newState: T) => {
    if (newState === undefined || newState === null) {
      console.error('❌ [useUndoRedo] Tentativa de substituir com estado inválido:', newState);
      return;
    }
    
    setHistory(prevHistory => {
      const idx = currentIndexRef.current;
      const newHistory = [...prevHistory];
      newHistory[idx] = newState;
      return newHistory;
    });
  }, []);
  
  const undo = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx > 0) {
      const newIndex = idx - 1;
      currentIndexRef.current = newIndex;
      setCurrentIndex(newIndex);
    }
  }, []);
  
  const redo = useCallback(() => {
    setHistory(prevHistory => {
      const idx = currentIndexRef.current;
      if (idx < prevHistory.length - 1) {
        const newIndex = idx + 1;
        currentIndexRef.current = newIndex;
        setCurrentIndex(newIndex);
      }
      return prevHistory;
    });
  }, []);
  
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  const reset = useCallback(() => {
    setHistory([initialState]);
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, [initialState]);
  
  return { 
    current, 
    set,
    setReplace,
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset,
    historyLength: history.length
  };
}
