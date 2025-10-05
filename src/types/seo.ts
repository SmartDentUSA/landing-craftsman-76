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
