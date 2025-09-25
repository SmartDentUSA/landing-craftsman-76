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

  // EXPANDED: Collect keywords from ALL product fields
  static collectFromProducts(products: any[] = []): string[] {
    try {
      const allKeywords = products.flatMap(product => {
        const keywords = [
          // Keywords existentes
          ...(product.keywords || []),
          ...(product.market_keywords || []),
          ...(product.search_intent_keywords || []),
          product.category,
          product.subcategory,
          
          // ✨ NOVOS CAMPOS: Expandir coleta completa
          ...(product.features || []),
          ...(product.benefits || []),
          ...(product.target_audience || []),
          ...(product.tags || []),
          
          // Extrair de sales_pitch
          ...(product.sales_pitch ? this.extractKeywordsFromText(product.sales_pitch) : []),
          
          // Extrair de video_captions
          ...(product.video_captions ? this.extractFromVideoCaptions(product.video_captions) : []),
          
          // Extrair de CTAs
          ...(this.extractFromCTAs(product))
        ];
        
        return keywords.filter(Boolean);
      });
      
      return this.normalizeKeywords(allKeywords);
    } catch (error) {
      console.warn('Error processing product keywords:', error);
      return [];
    }
  }

  // NEW: Collect keywords from categories config
  static collectFromCategoriesConfig(categoriesConfig: any[] = [], productCategories: string[] = []): string[] {
    try {
      const relevantConfigs = categoriesConfig.filter(config => 
        productCategories.includes(config.category)
      );
      
      const allKeywords = relevantConfigs.flatMap(config => [
        ...(config.keywords || []),
        ...(config.market_keywords || []),
        ...(config.search_intent_keywords || [])
      ]);
      
      return this.normalizeKeywords(allKeywords);
    } catch (error) {
      console.warn('Error processing categories config keywords:', error);
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
  
  // ✨ NOVAS FUNÇÕES AUXILIARES
  private static extractKeywordsFromText(text: string): string[] {
    if (!text || typeof text !== 'string') return [];
    
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['para', 'com', 'que', 'uma', 'por', 'seu', 'sua', 'mais', 'como', 'onde', 'quando'].includes(word));
    
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
    }
    
    return [...words, ...phrases].slice(0, 15);
  }

  private static extractFromVideoCaptions(videoCaptions: any): string[] {
    if (!videoCaptions || typeof videoCaptions !== 'object') return [];
    
    const allCaptions: string[] = [];
    Object.values(videoCaptions).forEach((caption: any) => {
      if (typeof caption === 'string') {
        allCaptions.push(caption);
      }
    });
    
    return allCaptions
      .flatMap(caption => this.extractKeywordsFromText(caption))
      .slice(0, 20);
  }

  private static extractFromCTAs(product: any): string[] {
    const ctaKeywords: string[] = [];
    
    // Offer discount CTA
    if (product.offer_discount_cta && typeof product.offer_discount_cta === 'object') {
      const cta = product.offer_discount_cta as any;
      if (cta.label && typeof cta.label === 'string') {
        ctaKeywords.push(...this.extractKeywordsFromText(cta.label));
      }
    }
    
    // Resource CTAs
    [product.resource_cta1, product.resource_cta2, product.resource_cta3].forEach(cta => {
      if (cta && typeof cta === 'object') {
        const ctaObj = cta as any;
        if (ctaObj.label && typeof ctaObj.label === 'string') {
          ctaKeywords.push(...this.extractKeywordsFromText(ctaObj.label));
        }
      }
    });
    
    return ctaKeywords;
  }

  static normalizeKeywords(keywords: string[]): string[] {
    return keywords
      .map(k => k.trim().toLowerCase())
      .map(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')) // Remove accents for consistency
      .filter((k, index, arr) => arr.indexOf(k) === index) // Remove duplicates
      .filter(k => k.length > 2); // Minimum length
  }
}