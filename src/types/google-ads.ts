export type CampaignType = 'search';
export type CampaignObjective = 'leads' | 'sales' | 'traffic';
export type BiddingStrategy = 'MAX_CONV' | 'tCPA' | 'MANUAL_CPC';
export type MatchType = 'BROAD' | 'PHRASE' | 'EXACT';

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface ScheduleConfig {
  start?: string;
  end?: string;
  ad_schedules?: string[];
}

export interface BiddingConfig {
  strategy: BiddingStrategy;
  target?: number;
}

export interface GoogleAdsCampaignConfig {
  enabled: boolean;
  type: CampaignType;
  objective: CampaignObjective;
  daily_budget_brl: number;
  locations: string[];
  languages: string[];
  bidding: BiddingConfig;
  
  // Keywords configuration
  include_ai_keywords: boolean;
  include_faq_longtail: boolean;
  extra_keywords: string[];
  negatives: string[];
  
  // Sitelinks from e-commerce
  ecommerce_links: { label: string; url: string }[];
  include_brand_policies: boolean;
  
  // Video extensions
  youtube_videos: { url: string; label?: string }[];
  
  // UTM parameters
  utm: UTMParams;
  
  // Scheduling
  schedule?: ScheduleConfig;
}

export interface Keyword {
  text: string;
  match_type: MatchType;
  theme?: string;
}

export interface AdGroup {
  name: string;
  keywords: Keyword[];
  theme: string;
}

export interface AdCopy {
  headlines: string[];
  descriptions: string[];
  paths: string[];
}

export interface Sitelink {
  label: string;
  url: string;
}

export interface VideoExtension {
  youtube_id: string;
  label?: string;
}

export interface ValidationWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface AdPreview {
  adCopies: AdCopy;
  sitelinks: Sitelink[];
  videos: VideoExtension[];
  finalUrl: string;
  warnings: ValidationWarning[];
}

export interface CSVRow {
  [key: string]: string;
}

export interface ExportResult {
  csv: string;
  warnings: ValidationWarning[];
  sheetsUrl?: string;
}

export interface GoogleAdsCampaign {
  id: string;
  landing_page_id: string;
  config: GoogleAdsCampaignConfig;
  last_exported?: string;
  created_at: string;
  updated_at: string;
}