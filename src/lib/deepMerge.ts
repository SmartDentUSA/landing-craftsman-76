/**
 * Deep Merge Utility
 * Faz merge profundo de objetos preservando dados existentes
 */

/**
 * Verifica se um valor é um objeto plain (não array, não null, não Date, etc)
 */
function isPlainObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Deep merge de dois objetos
 * - Objetos são mesclados recursivamente
 * - Arrays são SUBSTITUÍDOS (não mesclados)
 * - Valores primitivos são substituídos
 * 
 * @param target - Objeto base (existente)
 * @param source - Objeto com novas atualizações
 * @returns Novo objeto mesclado
 */
export function deepMerge<T = any>(target: T, source: Partial<T>): T {
  // Se target não é objeto, retorna source
  if (!isPlainObject(target)) {
    return source as T;
  }

  // Se source não é objeto, retorna target
  if (!isPlainObject(source)) {
    return target;
  }

  // Criar novo objeto resultado
  const result = { ...target } as any;

  // Iterar sobre as chaves do source
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];

      // Se ambos são plain objects, fazer merge recursivo
      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Caso contrário, substituir (inclui arrays e primitivos)
        result[key] = sourceValue;
      }
    }
  }

  return result;
}
