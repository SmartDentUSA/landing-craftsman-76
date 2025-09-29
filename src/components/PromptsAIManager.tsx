import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Search, MessageSquare, Video, Zap, Edit3, Loader2, MessageCircle, PlayCircle, Instagram } from 'lucide-react';
import { PromptEditModal } from './PromptEditModal';
import { usePromptsConfiguration } from '@/hooks/usePromptsConfiguration';
import sistemaPromptsAI from '@/assets/sistema-prompts-ai.png';
import { TikTokIcon } from './icons/TikTokIcon';

const EDGE_FUNCTIONS = [
  {
    id: "strategic-blog-generator",
    name: "Gerador de Blog Estratégico",
    description: "Gera artigos contextuais combinando dados da landing page com blogs de produtos selecionados",
    icon: Brain,
    status: "active" as const,
    prompts: [
      "Artigo Estratégico Contextual"
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
  },
  {
    id: "generate-whatsapp-messages",
    name: "Gerador de Mensagens WhatsApp",
    description: "Gera mensagens promocionais otimizadas para WhatsApp com emojis e CTAs.",
    icon: MessageCircle,
    status: "active" as const,
    prompts: [
      "Mensagem Promocional WhatsApp"
    ],
    dataSources: [
      "products_repository",
      "company_profile"
    ]
  },
  {
    id: "generate-youtube-descriptions",
    name: "Gerador de Descrições YouTube",
    description: "Gera descrições completas para vídeos no YouTube incluindo informações da empresa.",
    icon: PlayCircle,
    status: "active" as const,
    prompts: [
      "Descrição Completa YouTube"
    ],
    dataSources: [
      "products_repository",
      "company_profile"
    ]
  },
  {
    id: "generate-instagram-copy",
    name: "Gerador de Copy Instagram",
    description: "Gera conteúdo otimizado para Instagram com captions, hashtags e CTAs",
    icon: Instagram,
    status: "active" as const,
    prompts: [
      "Copy Feed (post estático)",
      "Copy Vídeo Reels",
      "Copy Carrossel"
    ],
    dataSources: [
      "products_repository",
      "company_profile"
    ]
  },
  {
    id: "generate-tiktok-content",
    name: "Gerador de Conteúdo TikTok",
    description: "Gera scripts virais, hooks e CTAs otimizados para TikTok",
    icon: () => <TikTokIcon className="h-5 w-5" />,
    status: "active" as const,
    prompts: [
      "Script TikTok"
    ],
    dataSources: [
      "products_repository",
      "company_profile"
    ]
  }
];

export const PromptsAIManager = () => {
  const [editingFunction, setEditingFunction] = useState<typeof EDGE_FUNCTIONS[0] | null>(null);
  const { configurations, loading } = usePromptsConfiguration();

  const isConfigured = (functionId: string) => {
    return configurations.some(config => config.edge_function_id === functionId);
  };

  const getLastUpdated = (functionId: string) => {
    const configs = configurations.filter(config => config.edge_function_id === functionId);
    if (configs.length === 0) return null;
    
    const latestConfig = configs.reduce((latest, current) => 
      new Date(current.updated_at) > new Date(latest.updated_at) ? current : latest
    );
    
    return new Date(latestConfig.updated_at).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {EDGE_FUNCTIONS.map((func) => {
          const IconComponent = func.icon;
          return (
            <Card key={func.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{func.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={func.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {func.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {loading ? (
                          <Badge variant="outline" className="text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Carregando...
                          </Badge>
                        ) : isConfigured(func.id) ? (
                          <Badge variant="secondary" className="text-xs">
                            ✅ Configurado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            ⚙️ Padrão
                          </Badge>
                        )}
                      </div>
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <img 
          src={sistemaPromptsAI} 
          alt="Sistema de Prompts IA" 
          className="max-w-sm w-full h-auto"
        />
      </div>

      <PromptEditModal
        edgeFunction={editingFunction}
        open={!!editingFunction}
        onOpenChange={(open) => !open && setEditingFunction(null)}
      />
    </div>
  );
};