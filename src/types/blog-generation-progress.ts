export interface BlogGenerationStep {
  step: 
    | 'loading-product'
    | 'loading-company'
    | 'generating-content'
    | 'generating-faqs'
    | 'applying-links'
    | 'saving'
    | 'complete'
    | 'error';
  message: string;
  progress: number;
  details?: {
    faqCount?: number;
    linksCount?: number;
    contentLength?: number;
  };
}

export const GENERATION_STEPS: Record<string, { label: string; icon: string; progress: number }> = {
  'loading-product': { label: 'Carregando dados do produto...', icon: '📦', progress: 10 },
  'loading-company': { label: 'Carregando perfil da empresa...', icon: '🏢', progress: 20 },
  'generating-content': { label: 'Gerando conteúdo com IA...', icon: '🤖', progress: 40 },
  'generating-faqs': { label: 'Criando FAQs SEO...', icon: '❓', progress: 60 },
  'applying-links': { label: 'Aplicando links inteligentes...', icon: '🔗', progress: 80 },
  'saving': { label: 'Salvando no banco de dados...', icon: '💾', progress: 95 },
  'complete': { label: 'Geração concluída!', icon: '✅', progress: 100 },
  'error': { label: 'Erro na geração', icon: '❌', progress: 0 }
};
