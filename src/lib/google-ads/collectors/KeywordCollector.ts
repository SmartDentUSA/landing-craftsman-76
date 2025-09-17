import { Keyword, AdGroup, MatchType } from '@/types/google-ads';

export class KeywordCollector {
  static collectFromAI(aiKeywords: string[] = []): string[] {
    return aiKeywords
      .filter(keyword => keyword && keyword.trim().length > 0)
      .map(keyword => keyword.trim().toLowerCase())
      .filter(keyword => this.isCommercialKeyword(keyword));
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