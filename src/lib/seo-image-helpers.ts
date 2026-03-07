/**
 * Converte nome de arquivo em alt text SEO-friendly
 * 
 * Exemplos:
 * - "Smart_Dent_Model_Plus.png" → "Smart Dent Model Plus"
 * - "scanner-intraoral_3d.jpg" → "Scanner Intraoral 3D"
 * - "resina_dental_alta_precisão.webp" → "Resina Dental Alta Precisão"
 */
export const sanitizeFileNameToAlt = (fileName: string): string => {
  // Remove extensão (.png, .jpg, .webp, etc)
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Substitui underscores e hífens por espaços
  let cleaned = nameWithoutExt
    .replace(/_/g, ' ')
    .replace(/-/g, ' ');
  
  // Remove caracteres especiais não-alfanuméricos (exceto espaços)
  cleaned = cleaned.replace(/[^a-zA-Z0-9\sÀ-ÿ]/g, '');
  
  // Capitaliza primeira letra de cada palavra
  cleaned = cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Remove espaços extras
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Valida se alt text tem qualidade mínima para SEO
 */
export const validateAltText = (alt: string): { valid: boolean; message?: string } => {
  if (!alt || alt.trim().length === 0) {
    return { valid: false, message: 'Alt text não pode estar vazio' };
  }
  
  if (alt.length < 3) {
    return { valid: false, message: 'Alt text muito curto (mínimo 3 caracteres)' };
  }
  
  if (alt.length > 125) {
    return { valid: false, message: 'Alt text muito longo (máximo 125 caracteres para Google)' };
  }
  
  // Evitar alt genéricos ruins para SEO
  const badAlts = ['imagem', 'foto', 'image', 'picture', 'img', 'untitled'];
  if (badAlts.includes(alt.toLowerCase())) {
    return { valid: false, message: 'Use descrição mais específica' };
  }
  
  return { valid: true };
};

/**
 * Gera alt text com fallback automático para imagens de produto
 * 
 * Prioridade:
 * 1. Alt text específico fornecido (se não for genérico)
 * 2. Fallback: "[Nome do Produto] - Odontologia Digital [Empresa]"
 */
export const getProductImageAlt = (
  alt: string | null | undefined,
  productName: string,
  companyName: string = 'Smart Dent'
): string => {
  // Se alt existe e não é genérico, usar
  if (alt && alt.trim().length >= 3) {
    const badAlts = ['imagem', 'foto', 'image', 'picture', 'img', 'untitled', 'undefined', 'null'];
    if (!badAlts.includes(alt.trim().toLowerCase())) {
      return alt.trim().substring(0, 125);
    }
  }
  
  // Fallback SEO-friendly
  const fallback = `${productName} - Odontologia Digital ${companyName}`;
  return fallback.substring(0, 125);
};
