/**
 * Deep Merge Utility
 * Faz merge profundo de objetos preservando dados existentes
 */

export interface DeepMergeOptions {
  /**
   * Se true, NÃO substitui arrays não-vazios por arrays vazios
   * Previne perda acidental de dados
   * @default true
   */
  protectNonEmptyArrays?: boolean;
  
  /**
   * Arrays específicos a proteger (caminhos como "partners", "table_data")
   * Se definido, apenas esses arrays são protegidos
   */
  protectedArrayPaths?: string[];
}

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
 * - Arrays são SUBSTITUÍDOS (não mesclados), exceto quando protegidos
 * - Valores primitivos são substituídos
 * 
 * @param target - Objeto base (existente)
 * @param source - Objeto com novas atualizações
 * @param options - Opções de merge
 * @returns Novo objeto mesclado
 */
export function deepMerge<T = any>(
  target: T, 
  source: Partial<T>, 
  options: DeepMergeOptions = {}
): T {
  const { 
    protectNonEmptyArrays = true,
    protectedArrayPaths 
  } = options;

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
      const sourceValue = (source as any)[key];
      const targetValue = (target as any)[key];

      // 🛡️ PROTEÇÃO DE ARRAYS
      if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
        // Verificar se deve proteger este array
        const shouldProtect = protectNonEmptyArrays && (
          !protectedArrayPaths || 
          protectedArrayPaths.includes(key)
        );
        
        // Se source é vazio mas target tem dados, preservar target
        if (shouldProtect && sourceValue.length === 0 && targetValue.length > 0) {
          console.warn(`🛡️ [deepMerge] Protegendo array "${key}" de ser zerado`, {
            targetLength: targetValue.length,
            sourceLength: sourceValue.length
          });
          result[key] = targetValue;
          continue;
        }
        
        // Caso contrário, substituir normalmente
        result[key] = sourceValue;
        continue;
      }

      // Se ambos são plain objects, fazer merge recursivo
      if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
        result[key] = deepMerge(targetValue, sourceValue, options);
      } else {
        // Caso contrário, substituir (inclui arrays e primitivos)
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Deep merge SEM proteção de arrays (comportamento original)
 * Use apenas quando realmente precisa substituir arrays vazios
 */
export function deepMergeUnsafe<T = any>(target: T, source: Partial<T>): T {
  return deepMerge(target, source, { protectNonEmptyArrays: false });
}

/**
 * Deep merge COM proteção específica para certos arrays
 */
export function deepMergeProtected<T = any>(
  target: T, 
  source: Partial<T>,
  protectedPaths: string[]
): T {
  return deepMerge(target, source, { 
    protectNonEmptyArrays: true,
    protectedArrayPaths: protectedPaths 
  });
}
