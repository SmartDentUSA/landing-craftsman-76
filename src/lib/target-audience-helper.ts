/**
 * Helper functions for handling target audience data
 * Converts between string and array formats, normalizes and validates data
 */

/**
 * Parse a string into an array of target audiences
 * Handles various separators (comma, semicolon) and normalizes the data
 */
export function parseTargetAudienceString(input: string | string[]): string[] {
  // Se já for array, apenas limpar e normalizar
  if (Array.isArray(input)) {
    return normalizeTargetAudienceArray(input);
  }

  // Se for string vazia ou null/undefined, retornar array vazio
  if (!input || typeof input !== 'string') {
    return [];
  }

  // Dividir por vírgula, ponto-e-vírgula ou quebra de linha
  const items = input
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return normalizeTargetAudienceArray(items);
}

/**
 * Normalize an array of target audiences
 * Removes duplicates (case-insensitive) and sorts alphabetically
 */
export function normalizeTargetAudienceArray(input: string[]): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  // Remover duplicatas (ignorando case)
  const uniqueItems = Array.from(
    new Map(
      input
        .filter(item => item && typeof item === 'string')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => [item.toLowerCase(), item])
    ).values()
  );

  // Ordenar alfabeticamente
  return uniqueItems.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Convert an array of target audiences to a comma-separated string
 */
export function targetAudienceArrayToString(input: string[]): string {
  if (!Array.isArray(input)) {
    return '';
  }

  return input
    .filter(item => item && typeof item === 'string')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .join(', ');
}

/**
 * Validate target audience value
 * Returns true if valid, false otherwise
 */
export function isValidTargetAudience(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  
  // Verificar tamanho mínimo e máximo
  if (trimmed.length < 2 || trimmed.length > 100) {
    return false;
  }

  // Verificar caracteres válidos (letras, números, espaços e alguns caracteres especiais)
  const validPattern = /^[a-zA-ZÀ-ÿ0-9\s\-\(\)\/]+$/;
  return validPattern.test(trimmed);
}

/**
 * Merge two target audience arrays, removing duplicates
 */
export function mergeTargetAudiences(array1: string[], array2: string[]): string[] {
  const combined = [...array1, ...array2];
  return normalizeTargetAudienceArray(combined);
}
