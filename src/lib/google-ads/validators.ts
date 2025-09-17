import { AdCopy, ValidationWarning, GoogleAdsCampaignConfig } from '@/types/google-ads';

export class AdCopyValidator {
  static validateHeadlines(headlines: string[]): { 
    validated: string[]; 
    warnings: ValidationWarning[] 
  } {
    const warnings: ValidationWarning[] = [];
    const validated: string[] = [];
    
    for (let i = 0; i < headlines.length; i++) {
      const headline = headlines[i];
      let processedHeadline = headline;
      
      if (headline.length > 30) {
        processedHeadline = headline.substring(0, 27) + '...';
        warnings.push({
          type: 'warning',
          message: `Headline ${i + 1} ajustado para 30 caracteres`,
          field: `headline_${i + 1}`
        });
      }
      
      if (this.containsProhibitedClaims(headline)) {
        warnings.push({
          type: 'error',
          message: `Headline ${i + 1} contém alegações proibidas`,
          field: `headline_${i + 1}`
        });
      }
      
      if (this.isAllCaps(headline)) {
        processedHeadline = this.normalizeCapitalization(processedHeadline);
        warnings.push({
          type: 'warning',
          message: `Headline ${i + 1} ajustado para capitalização normal`,
          field: `headline_${i + 1}`
        });
      }
      
      validated.push(processedHeadline);
    }
    
    // Check minimum requirements
    if (headlines.length < 3) {
      warnings.push({
        type: 'error',
        message: 'Mínimo de 3 headlines necessário',
        field: 'headlines'
      });
    }
    
    return { validated, warnings };
  }
  
  static validateDescriptions(descriptions: string[]): {
    validated: string[];
    warnings: ValidationWarning[]
  } {
    const warnings: ValidationWarning[] = [];
    const validated: string[] = [];
    
    for (let i = 0; i < descriptions.length; i++) {
      const description = descriptions[i];
      let processedDescription = description;
      
      if (description.length > 90) {
        processedDescription = description.substring(0, 87) + '...';
        warnings.push({
          type: 'warning',
          message: `Description ${i + 1} ajustada para 90 caracteres`,
          field: `description_${i + 1}`
        });
      }
      
      if (this.containsProhibitedClaims(description)) {
        warnings.push({
          type: 'error',
          message: `Description ${i + 1} contém alegações proibidas`,
          field: `description_${i + 1}`
        });
      }
      
      if (this.isAllCaps(description)) {
        processedDescription = this.normalizeCapitalization(processedDescription);
        warnings.push({
          type: 'warning',
          message: `Description ${i + 1} ajustada para capitalização normal`,
          field: `description_${i + 1}`
        });
      }
      
      validated.push(processedDescription);
    }
    
    // Check minimum requirements
    if (descriptions.length < 2) {
      warnings.push({
        type: 'error',
        message: 'Mínimo de 2 descriptions necessário',
        field: 'descriptions'
      });
    }
    
    return { validated, warnings };
  }
  
  static validatePaths(paths: string[]): {
    validated: string[];
    warnings: ValidationWarning[]
  } {
    const warnings: ValidationWarning[] = [];
    const validated: string[] = [];
    
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      let processedPath = path;
      
      if (path.length > 15) {
        processedPath = path.substring(0, 15);
        warnings.push({
          type: 'warning',
          message: `Path ${i + 1} ajustado para 15 caracteres`,
          field: `path_${i + 1}`
        });
      }
      
      // Remove special characters and spaces
      processedPath = processedPath.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      validated.push(processedPath);
    }
    
    return { validated, warnings };
  }
  
  static validateUrls(urls: string[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    for (const url of urls) {
      if (!url.startsWith('https://')) {
        warnings.push({
          type: 'error',
          message: `URL deve usar HTTPS: ${url}`,
          field: 'urls'
        });
      }
      
      try {
        new URL(url);
      } catch {
        warnings.push({
          type: 'error',
          message: `URL inválida: ${url}`,
          field: 'urls'
        });
      }
    }
    
    return warnings;
  }
  
  static validateCampaignConfig(config: GoogleAdsCampaignConfig): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    if (config.daily_budget_brl < 10) {
      warnings.push({
        type: 'warning',
        message: 'Orçamento diário muito baixo (mínimo recomendado: R$ 10)',
        field: 'daily_budget_brl'
      });
    }
    
    if (config.locations.length === 0) {
      warnings.push({
        type: 'error',
        message: 'Pelo menos uma localização é necessária',
        field: 'locations'
      });
    }
    
    if (config.languages.length === 0) {
      warnings.push({
        type: 'error',
        message: 'Pelo menos um idioma é necessário',
        field: 'languages'
      });
    }
    
    return warnings;
  }
  
  private static containsProhibitedClaims(text: string): boolean {
    const prohibitedTerms = [
      'cura', 'cura definitiva', 'milagre', 'garantido',
      'sem dor', 'sem riscos', 'melhor do mundo',
      'revolucionário', 'único', 'exclusivo'
    ];
    
    const textLower = text.toLowerCase();
    return prohibitedTerms.some(term => textLower.includes(term));
  }
  
  private static isAllCaps(text: string): boolean {
    return text === text.toUpperCase() && text !== text.toLowerCase();
  }
  
  private static normalizeCapitalization(text: string): string {
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}