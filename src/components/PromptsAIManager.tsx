import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Search, MessageSquare, Video, Zap, Edit3 } from 'lucide-react';
import { PromptEditModal } from './PromptEditModal';

const EDGE_FUNCTIONS = [
  {
    id: "strategic-blog-generator",
    name: "Gerador de Blog Estratégico",
    description: "Gera artigos contextuais combinando dados da landing page com blogs de produtos selecionados",
    icon: Brain,
    status: "active" as const,
    prompts: [
      "Artigo Estratégico Contextual",
      "Blog Consolidado com Ofertas",
      "Conteúdo Híbrido LP + Produtos"
    ],
    dataSources: [
      "landing_page_banner", 
      "landing_page_solutions_1", 
      "landing_page_solutions_2", 
      "landing_page_solutions_3", 
      "landing_page_solutions_4", 
      "landing_page_solutions_5", 
      "landing_page_desktop_info", 
      "landing_page_consulting", 
      "landing_page_faq", 
      "products_repository", 
      "approved_reviews", 
      "company_profile", 
      "key_opinion_leaders", 
      "selected_product_blogs"
    ]
  },
  {
    id: "generate-product-blog",
    name: "Gerador de Blog de Produtos",
    description: "Gera conteúdo de blog comercial e técnico para produtos específicos",
    icon: FileText,
    status: "active" as const,
    prompts: [
      "Blog Comercial",
      "Blog Técnico"
    ],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "generate-product-ai-content",
    name: "Gerador de Conteúdo IA para Produtos",
    description: "Gera benefícios, palavras-chave e características usando IA",
    icon: Zap,
    status: "active" as const,
    prompts: [
      "Benefícios do Produto",
      "Palavras-chave do Produto",
      "Características do Produto"
    ],
    dataSources: ["products_repository", "categories_config"]
  },
  {
    id: "ai-seo-generator",
    name: "Gerador de SEO com IA",
    description: "Cria conteúdo otimizado para SEO: meta descriptions, títulos, palavras-chave e conteúdo",
    icon: Search,
    status: "active" as const,
    prompts: [
      "Meta Description",
      "Título SEO",
      "Palavras-chave",
      "Conteúdo Oculto",
      "Conteúdo de Blog",
      "Análise de Depoimento em Vídeo",
      "Palavras-chave FAQ"
    ],
    dataSources: ["landing_pages", "products_repository", "company_profile", "video_testimonials"]
  },
  {
    id: "generate-ad-copies",
    name: "Gerador de Anúncios Google",
    description: "Cria cópias de anúncios otimizadas para Google Ads",
    icon: MessageSquare,
    status: "active" as const,
    prompts: [
      "Cópias Google Ads"
    ],
    dataSources: ["landing_pages", "keywords", "target_audience"]
  },
  {
    id: "extract-youtube-captions",
    name: "Extrator de Legendas YouTube",
    description: "Extrai e analisa legendas de vídeos do YouTube com IA",
    icon: Video,
    status: "active" as const,
    prompts: [
      "Análise de Vídeo Promocional",
      "Análise de Depoimento",
      "Análise de Vídeo Técnico"
    ],
    dataSources: ["products_repository", "company_videos", "video_captions"]
  }
];

export const PromptsAIManager = () => {
  const [editingFunction, setEditingFunction] = useState<typeof EDGE_FUNCTIONS[0] | null>(null);

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingFunction(func)}
                    className="flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" />
                    Editar
                  </Button>
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

      <PromptEditModal
        edgeFunction={editingFunction}
        open={!!editingFunction}
        onOpenChange={(open) => !open && setEditingFunction(null)}
      />
    </div>
  );
};