import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText, Search, MessageSquare, Video, Zap } from 'lucide-react';

const EDGE_FUNCTIONS = [
  {
    id: 'ai-content-generator',
    name: 'AI Content Generator',
    description: 'Gera conteúdo principal, títulos SEO e meta descriptions',
    icon: Brain,
    status: 'active',
    prompts: ['blog_content', 'seo_title', 'meta_description', 'structured_data'],
    dataSources: ['products', 'company_profile', 'reviews']
  },
  {
    id: 'ai-seo-generator', 
    name: 'AI SEO Generator',
    description: 'Gera keywords, schema markup e otimizações SEO',
    icon: Search,
    status: 'active',
    prompts: ['keywords_generation', 'schema_markup', 'seo_optimization'],
    dataSources: ['products', 'categories', 'target_audience']
  },
  {
    id: 'generate-product-ai-content',
    name: 'Generate Product AI Content',
    description: 'Gera keywords, benefícios e features para produtos',
    icon: Zap,
    status: 'active',
    prompts: ['product_benefits', 'product_keywords', 'product_features'],
    dataSources: ['products_repository', 'categories_config']
  },
  {
    id: 'generate-product-blog',
    name: 'Generate Product Blog',
    description: 'Gera blogs comerciais e técnicos para produtos',
    icon: FileText,
    status: 'active',
    prompts: ['commercial_blog', 'technical_blog'],
    dataSources: ['products', 'company_profile', 'kols', 'testimonials']
  },
  {
    id: 'extract-youtube-captions',
    name: 'Extract YouTube Captions',
    description: 'Extrai e processa legendas de vídeos do YouTube',
    icon: Video,
    status: 'active',
    prompts: ['caption_extraction', 'content_summarization'],
    dataSources: ['youtube_videos', 'video_metadata']
  },
  {
    id: 'moderate-reviews',
    name: 'Moderate Reviews',
    description: 'Modera e analisa avaliações com IA',
    icon: MessageSquare,
    status: 'active',
    prompts: ['review_moderation', 'sentiment_analysis'],
    dataSources: ['raw_reviews', 'approved_reviews']
  }
];

export const PromptsAIManager = () => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {EDGE_FUNCTIONS.map((func) => {
          const IconComponent = func.icon;
          return (
            <Card key={func.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{func.name}</CardTitle>
                      <Badge 
                        variant={func.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {func.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {func.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Prompts ({func.prompts.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {func.prompts.map((prompt) => (
                      <Badge key={prompt} variant="outline" className="text-xs">
                        {prompt}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Fontes de Dados ({func.dataSources.length})</h4>
                  <div className="flex flex-wrap gap-1">
                    {func.dataSources.map((source) => (
                      <Badge key={source} variant="secondary" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium">Sistema de Prompts IA</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Fase 1 concluída: Estrutura base criada. Próximas fases incluirão edição de prompts, 
              controle granular de dados e sistema de backup automático.
            </p>
            <div className="flex justify-center space-x-2 mt-4">
              <Badge variant="outline">✅ Fase 1: Estrutura Base</Badge>
              <Badge variant="secondary">⏳ Fase 2: Leitura de Prompts</Badge>
              <Badge variant="secondary">⏳ Fase 3: Sistema de Backup</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};