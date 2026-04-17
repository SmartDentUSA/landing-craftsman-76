import { 
  GoogleAdsCampaignConfig, 
  AdGroup, 
  AdCopy, 
  Sitelink, 
  VideoExtension, 
  CSVRow 
} from '@/types/google-ads';

export class GoogleAdsCSVBuilder {
  static buildFullCSV(params: {
    campaignName: string;
    config: GoogleAdsCampaignConfig;
    adGroups: AdGroup[];
    adCopies: AdCopy;
    sitelinks: Sitelink[];
    videos: VideoExtension[];
    finalUrl: string;
  }): string {
    const { campaignName, config, adGroups, adCopies, sitelinks, videos, finalUrl } = params;
    
    const sections = [
      this.buildCampaignsSection(campaignName, config),
      this.buildAdGroupsSection(campaignName, adGroups),
      this.buildAdsSection(campaignName, adGroups, finalUrl, adCopies, config),
      this.buildKeywordsSection(campaignName, adGroups),
      this.buildNegativeKeywordsSection(campaignName, config.negatives),
      this.buildSitelinksSection(campaignName, sitelinks),
      this.buildCalloutsSection(campaignName, config.callouts || []),
      this.buildVideoExtensionsSection(campaignName, videos)
    ].filter(section => section.trim().length > 0);
    
    return sections.join('\n\n');
  }
  
  private static buildCampaignsSection(campaignName: string, config: GoogleAdsCampaignConfig): string {
    const header = 'Campaign,Campaign type,Daily budget,Languages,Locations,Bidding strategy,Start date,End date';
    
    const row = [
      this.csvEscape(campaignName),
      'Search',
      config.daily_budget_brl.toString(),
      this.csvEscape(config.languages.join(';')),
      this.csvEscape(config.locations.join(';')),
      config.bidding.strategy,
      config.schedule?.start || '',
      config.schedule?.end || ''
    ].join(',');
    
    return `${header}\n${row}`;
  }
  
  private static buildAdGroupsSection(campaignName: string, adGroups: AdGroup[]): string {
    if (adGroups.length === 0) return '';
    
    const header = 'Campaign,Ad group,Ad group type,Default max. CPC';
    
    const rows = adGroups.map(group =>
      [
        this.csvEscape(campaignName),
        this.csvEscape(group.name),
        'Search',
        '1.00'
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildAdsSection(
    campaignName: string, 
    adGroups: AdGroup[], 
    finalUrl: string, 
    adCopies: AdCopy,
    config: GoogleAdsCampaignConfig
  ): string {
    if (adGroups.length === 0) return '';
    
    const header = [
      'Campaign', 'Ad group', 'Ad type', 'Final URL', 'Path 1', 'Path 2',
      'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
      'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
      'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
      'Description 1', 'Description 2', 'Description 3', 'Description 4'
    ].join(',');
    
    const finalUrlWithUTM = this.applyUTM(finalUrl, config.utm);
    
    const rows = adGroups.map(group => {
      // ✅ Sanitizar e escapar CADA campo individualmente
      const headlines = adCopies.headlines.slice(0, 15).map(h => this.csvEscape(this.sanitizeForCSV(h, 30)));
      const descriptions = adCopies.descriptions.slice(0, 4).map(d => this.csvEscape(this.sanitizeForCSV(d, 90)));
      const paths = adCopies.paths.slice(0, 2).map(p => this.csvEscape(this.sanitizeForCSV(p, 15)));
      
      const row = [
        this.csvEscape(campaignName),
        this.csvEscape(group.name),
        'Responsive search ad',
        this.csvEscape(finalUrlWithUTM),
        ...paths,
        ...headlines,
        ...descriptions
      ];
      
      return row.join(',');
    });
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildKeywordsSection(campaignName: string, adGroups: AdGroup[]): string {
    if (adGroups.length === 0) return '';
    
    const header = 'Campaign,Ad group,Keyword,Match type';
    
    const rows: string[] = [];
    
    for (const group of adGroups) {
      for (const keyword of group.keywords) {
        rows.push([
          this.csvEscape(campaignName),
          this.csvEscape(group.name),
          this.csvEscape(keyword.text),
          keyword.match_type
        ].join(','));
      }
    }
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildNegativeKeywordsSection(campaignName: string, negatives: string[]): string {
    if (negatives.length === 0) return '';
    
    const header = 'Campaign,Ad group,Negative keyword,Match type';
    
    const rows = negatives.map(negative =>
      [
        this.csvEscape(campaignName),
        '', // Campaign-level negatives don't specify ad group
        this.csvEscape(negative),
        'Phrase'
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildSitelinksSection(campaignName: string, sitelinks: Sitelink[]): string {
    if (sitelinks.length === 0) return '';
    
    const header = 'Campaign,Ad group,Ad extension type,Sitelink text,Sitelink final URL,Sitelink description 1,Sitelink description 2';
    
    const rows = sitelinks.map(sitelink =>
      [
        this.csvEscape(campaignName),
        '', // Campaign-level sitelinks
        'Sitelink',
        this.csvEscape(this.sanitizeForCSV(sitelink.label, 25)),
        this.csvEscape(sitelink.url),
        this.csvEscape(this.sanitizeForCSV(sitelink.description1 || '', 35)),
        this.csvEscape(this.sanitizeForCSV(sitelink.description2 || '', 35))
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildCalloutsSection(campaignName: string, callouts: string[]): string {
    if (!callouts || callouts.length === 0) return '';
    
    const header = 'Campaign,Ad group,Ad extension type,Callout text';
    
    // Google Ads: máx 20 callouts por campanha, 25 caracteres cada
    const validCallouts = callouts
      .map(c => this.sanitizeForCSV(c, 25))
      .filter(c => c.length > 0)
      .slice(0, 20);
    
    if (validCallouts.length === 0) return '';
    
    const rows = validCallouts.map(callout =>
      [
        this.csvEscape(campaignName),
        '', // Campaign-level callouts
        'Callout',
        this.csvEscape(callout)
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static buildVideoExtensionsSection(campaignName: string, videos: VideoExtension[]): string {
    if (videos.length === 0) return '';
    
    const header = 'Campaign,Ad extension type,YouTube video ID';
    
    const rows = videos.map(video =>
      [
        this.csvEscape(campaignName),
        'Video',
        this.csvEscape(video.youtube_id)
      ].join(',')
    );
    
    return `${header}\n${rows.join('\n')}`;
  }
  
  private static applyUTM(url: string, utm: any): string {
    if (!utm || Object.keys(utm).length === 0) return url;
    
    const urlObj = new URL(url);
    
    if (utm.source) urlObj.searchParams.set('utm_source', utm.source);
    if (utm.medium) urlObj.searchParams.set('utm_medium', utm.medium);
    if (utm.campaign) urlObj.searchParams.set('utm_campaign', utm.campaign);
    if (utm.content) urlObj.searchParams.set('utm_content', utm.content);
    if (utm.term) urlObj.searchParams.set('utm_term', utm.term);
    
    return urlObj.toString();
  }
  
  private static sanitizeForCSV(text: string, maxLength: number): string {
    if (!text) return '';
    return text
      .replace(/\n/g, ' ')        // ✅ Remove quebras de linha
      .replace(/\r/g, '')         // ✅ Remove carriage returns
      .replace(/\s+/g, ' ')       // ✅ Múltiplos espaços → um
      .trim()
      .substring(0, maxLength);
  }

  private static csvEscape(value: string): string {
    if (!value) return '';
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
}