import { Keyword, AdGroup, MatchType } from '@/types/google-ads';

export class KeywordCollector {
  static collectFromAI(aiKeywords: any = []): string[] {
    try {
      // Normalize ai_keywords from various formats
      const normalizedKeywords = this.normalizeAIKeywords(aiKeywords);
      
      return normalizedKeywords
        .filter(keyword => keyword && keyword.trim().length > 0)
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => this.isCommercialKeyword(keyword));
    } catch (error) {
      console.warn('Error processing AI keywords:', error);
      return [];
    }
  }
  
  private static normalizeAIKeywords(aiKeywords: any): string[] {
    if (!aiKeywords) return [];
    
    // If it's already an array
    if (Array.isArray(aiKeywords)) {
      return aiKeywords.filter(k => typeof k === 'string' && k.trim().length > 0);
    }
    
    // If it's a string (could be JSON or comma-separated)
    if (typeof aiKeywords === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(aiKeywords);
        if (Array.isArray(parsed)) {
          return parsed.filter(k => typeof k === 'string' && k.trim().length > 0);
        }
      } catch {
        // If not JSON, treat as comma-separated string
        return aiKeywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      }
    }
    
    // If it's an object with keywords property
    if (typeof aiKeywords === 'object' && aiKeywords.keywords) {
      return this.normalizeAIKeywords(aiKeywords.keywords);
    }
    
    return [];
  }
  
  static collectFromFAQ(faq: Array<{ question: string; answer: string }>): string[] {
    return faq
      .map(item => this.extractLongTailFromQuestion(item.question))
      .flat()
      .filter(keyword => keyword.length > 0);
  }
  
  static groupByTheme(keywords: string[]): AdGroup[] {
    // Remove duplicates and normalize
    const uniqueKeywords = [...new Set(keywords.map(k => k.trim().toLowerCase()))];
    
    // Simple theme grouping based on common terms
    const themes = new Map<string, string[]>();
    
    for (const keyword of uniqueKeywords) {
      const theme = this.determineTheme(keyword);
      if (!themes.has(theme)) {
        themes.set(theme, []);
      }
      themes.get(theme)!.push(keyword);
    }
    
    return Array.from(themes.entries()).map(([theme, keywords]) => ({
      name: this.formatAdGroupName(theme),
      theme,
      keywords: keywords.map(text => ({
        text,
        match_type: 'PHRASE' as MatchType,
        theme
      }))
    }));
  }
  
  private static isCommercialKeyword(keyword: string): boolean {
    const commercialIntents = [
      'preço', 'valor', 'custo', 'comprar', 'onde', 'melhor', 
      'como', 'qual', 'tipos', 'modelos', 'marca', 'produto'
    ];
    return commercialIntents.some(intent => keyword.includes(intent));
  }
  
  private static extractLongTailFromQuestion(question: string): string[] {
    // Extract meaningful phrases from FAQ questions
    const cleaned = question
      .toLowerCase()
      .replace(/[?!.,]/g, '')
      .replace(/^(como|qual|onde|quando|por que|o que|quais)/, '');
    
    // Split into phrases and filter meaningful ones
    const phrases = cleaned
      .split(' ')
      .filter(word => word.length > 3)
      .join(' ')
      .trim();
    
    if (phrases.length > 10) {
      return [phrases];
    }
    
    return [];
  }
  
  private static determineTheme(keyword: string): string {
    const themeMap = {
      'scanner': ['scanner', 'digitalização', 'digital'],
      'consultoria': ['consultoria', 'consulta', 'atendimento'],
      'tratamento': ['tratamento', 'terapia', 'procedimento'],
      'equipamento': ['equipamento', 'aparelho', 'máquina'],
      'curso': ['curso', 'treinamento', 'capacitação'],
      'software': ['software', 'sistema', 'programa']
    };
    
    for (const [theme, terms] of Object.entries(themeMap)) {
      if (terms.some(term => keyword.includes(term))) {
        return theme;
      }
    }
    
    return 'geral';
  }
  
  private static formatAdGroupName(theme: string): string {
    const nameMap: Record<string, string> = {
      'scanner': 'Scanner Intraoral',
      'consultoria': 'Consultoria',
      'tratamento': 'Tratamentos',
      'equipamento': 'Equipamentos',
      'curso': 'Cursos',
      'software': 'Software',
      'geral': 'Geral'
    };
    
    return nameMap[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
  }
  
  static normalizeKeywords(keywords: string[]): string[] {
    return keywords
      .map(k => k.trim().toLowerCase())
      .map(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) // Remove accents for consistency
      .filter((k, index, arr) => arr.indexOf(k) === index) // Remove duplicates
      .filter(k => k.length > 2); // Minimum length
  }
}