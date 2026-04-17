export type CampaignType = 'search';
export type CampaignObjective = 'leads' | 'sales' | 'traffic';
export type BiddingStrategy = 'MAX_CONV' | 'tCPA' | 'MANUAL_CPC';
export type MatchType = 'BROAD' | 'PHRASE' | 'EXACT';
export type KeywordSource = 'external_links' | 'ai' | 'faq' | 'product' | 'review' | 'manual';

export interface KeywordWithMatchType {
  text: string;
  match_type: MatchType;
  source: KeywordSource;
  keyword_type?: string; // tipo semântico original (primary, longtail, etc)
  search_intent?: 'commercial' | 'informational' | 'product' | 'general';
}

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
  custom_institutional_links: { label: string; url: string }[];
  
  // Callouts (Frases de Chamariz) — máx 25 chars cada, máx 20 por campanha
  callouts: string[];
  
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
  theme?: 'commercial' | 'informational' | 'product' | 'general';
}

export interface AdGroup {
  name: string;
  keywords: Keyword[];
  theme: 'commercial' | 'informational' | 'product' | 'general';
}

export interface AdCopy {
  headlines: string[];
  descriptions: string[];
  paths: string[];
}

export interface Sitelink {
  label: string;
  url: string;
  description1?: string;
  description2?: string;
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

// ===== Quality Report (v3) =====
export interface QualityBreakdownItem {
  count: number;
  penalty: number;
}

export interface QualityReport {
  score: number; // 0-100
  breakdown: {
    headlines_truncated: QualityBreakdownItem;
    headlines_duplicated: QualityBreakdownItem;
    descriptions_truncated: QualityBreakdownItem;
    paths_invalid: QualityBreakdownItem;
  };
  warnings: string[];
  validation_errors: string[];
  requires_prompt_revision: boolean;
}

export type CollectorStrategy = 'niche' | 'mass';

// Display Banner Types
export type DisplayStyle = 'modern' | 'minimal' | 'bold' | 'clinical';

export interface DisplayFormat {
  width: number;
  height: number;
  name: string;
  category: 'popular' | 'horizontal' | 'vertical' | 'mobile' | 'square';
}

export interface DisplayBanner {
  format: DisplayFormat;
  html: string;
  sizeKB: number;
}

export interface DisplayBannerConfig {
  formats: DisplayFormat[];
  style: DisplayStyle;
  primaryColor: string;
  secondaryColor: string;
  ctaText: string;
  productImageUrl: string;
  logoUrl?: string;
}