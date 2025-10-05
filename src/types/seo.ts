/**
 * SEO Types
 * Tipos para o sistema de SEO Inteligente com IA
 */

export interface KeywordSuggestion {
  term: string;
  relevance?: number;
  category?: 'estratégico' | 'comercial' | 'técnico';
}

export interface LinkKeyword {
  term: string;
  url: string;
  source: 'Repository' | 'Products' | 'Manual';
  autoLink?: boolean;
}

export interface KeywordResolution {
  source: 'AI' | 'Repository' | 'Both';
  term: string;
  matched: boolean;
  status: 'approved' | 'needs_review' | 'new_candidate';
  url?: string;
  chosenAlias?: string;
}

export interface SEOContext {
  id: string;
  landingPageId: string;
  baseTextMarkdown: string;
  aiKeywords: KeywordSuggestion[];
  resolvedKeywords: KeywordResolution[];
  createdAt: string;
  updatedAt: string;
  locale?: 'pt_BR';
}

// Interface para SEO Inteligente persistido em landing_pages.data
export interface SEOIntelligentContext {
  enabled: boolean;
  generated_at: string;
  base_text_markdown: string;
  ai_keywords: KeywordSuggestion[];
  resolved_keywords: KeywordResolution[];
  locale: 'pt_BR';
}
