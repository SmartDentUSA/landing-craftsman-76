import { Sitelink } from '@/types/google-ads';

export class SitelinksCollector {
  static collectFromIntelligentLinks(intelligentLinks: Record<string, string> = {}): Sitelink[] {
    const ecommerceKeywords = [
      'loja', 'comprar', 'produto', 'carrinho', 'checkout',
      'catalogo', 'shop', 'store', 'buy'
    ];
    
    return Object.entries(intelligentLinks)
      .filter(([_, url]) => this.isEcommerceUrl(url, ecommerceKeywords))
      .map(([label, url]) => ({
        label: this.formatSitelinkLabel(label),
        url: this.ensureHttps(url)
      }))
      .filter(sitelink => this.isValidSitelink(sitelink));
  }

  static collectFromResourceCTAs(products: any[] = []): Sitelink[] {
    const sitelinks: Sitelink[] = [];
    
    products.forEach(product => {
      // Extract from resource CTAs with descriptions
      [product.resource_cta1, product.resource_cta2, product.resource_cta3].forEach((cta, index) => {
        if (cta && typeof cta === 'object' && cta.visible && cta.url && cta.label) {
          sitelinks.push({
            label: this.formatSitelinkLabel(cta.label),
            url: this.ensureHttps(cta.url)
          });
        }
      });
    });

    return sitelinks.filter(sitelink => this.isValidSitelink(sitelink));
  }
  
  static collectBrandPolicies(baseUrl: string, landingPageUrl?: string): Sitelink[] {
    const extractedBaseUrl = this.extractBaseUrl(baseUrl);
    const normalizedLandingUrl = landingPageUrl ? this.normalizeBaseUrl(landingPageUrl) : null;
    
    const brandSitelinks = [
      { 
        label: 'Sobre Nós', 
        path: '/sobre',
        useCampaignPath: true // Mantém contexto da campanha
      },
      { 
        label: 'Contato', 
        path: '/contato',
        useCampaignPath: false // Usa domínio base
      },
      { 
        label: 'Política de Privacidade', 
        path: '/privacidade',
        useCampaignPath: false // Usa domínio base
      },
      { 
        label: 'Termos de Uso', 
        path: '/termos',
        useCampaignPath: false // Usa domínio base
      }
    ];
    
    return brandSitelinks.map(({ label, path, useCampaignPath }) => {
      const baseUrlToUse = useCampaignPath && normalizedLandingUrl ? normalizedLandingUrl : extractedBaseUrl;
      return {
        label,
        url: `${baseUrlToUse}${path}`
      };
    });
  }
  
  private static extractBaseUrl(url: string): string {
    try {
      const urlObj = new URL(this.ensureHttps(url));
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      // Fallback para normalização básica
      return this.normalizeBaseUrl(url).split('/').slice(0, 3).join('/');
    }
  }
  
  private static isEcommerceUrl(url: string, keywords: string[]): boolean {
    const urlLower = url.toLowerCase();
    return keywords.some(keyword => urlLower.includes(keyword));
  }
  
  private static formatSitelinkLabel(label: string): string {
    // Clean and format the label for sitelinks
    let formatted = label
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
    
    // Limit to recommended length for sitelinks
    if (formatted.length > 25) {
      formatted = formatted.substring(0, 22) + '...';
    }
    
    return formatted;
  }
  
  private static ensureHttps(url: string): string {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    
    return url;
  }
  
  private static normalizeBaseUrl(url: string): string {
    const httpsUrl = this.ensureHttps(url);
    return httpsUrl.endsWith('/') ? httpsUrl.slice(0, -1) : httpsUrl;
  }
  
  private static isValidSitelink(sitelink: Sitelink): boolean {
    // Validate URL format
    try {
      new URL(sitelink.url);
    } catch {
      return false;
    }
    
    // Check label length and content
    return sitelink.label.length > 0 && 
           sitelink.label.length <= 30 && 
           sitelink.url.startsWith('https://');
  }
  
  static validateSitelinks(sitelinks: Sitelink[], finalUrl: string): { valid: Sitelink[]; warnings: string[] } {
    const warnings: string[] = [];
    const valid: Sitelink[] = [];
    
    for (const sitelink of sitelinks) {
      if (!this.isValidSitelink(sitelink)) {
        warnings.push(`Sitelink inválido: ${sitelink.label}`);
        continue;
      }
      
      if (sitelink.url === finalUrl) {
        warnings.push(`Sitelink duplica URL final: ${sitelink.label}`);
        continue;
      }
      
      valid.push(sitelink);
    }
    
    // Google Ads limit of 6 sitelinks per campaign
    if (valid.length > 6) {
      warnings.push(`Muitos sitelinks (${valid.length}). Limite: 6.`);
      return { valid: valid.slice(0, 6), warnings };
    }
    
    return { valid, warnings };
  }
}