import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, FileText, Search, MessageSquare, Video, Zap, Edit3, Loader2, MessageCircle, PlayCircle, Instagram, Activity, TrendingUp, Users } from 'lucide-react';
import { PromptEditModal } from './PromptEditModal';
import { SystemMonitoringDashboard } from './SystemMonitoringDashboard';
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
    prompts: ["Artigo Estratégico Contextual"],
    dataSources: ["landing_page_banner", "landing_page_solutions_1", "landing_page_solutions_2", "products_repository", "approved_reviews", "company_profile", "key_opinion_leaders", "selected_product_blogs"]
  },
  {
    id: "generate-product-blog",
    name: "Gerador de Blog de Produtos",
    description: "Gera conteúdo de blog comercial e técnico para produtos específicos",
    icon: FileText,
    status: "active" as const,
    prompts: ["Blog Comercial", "Blog Técnico"],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "generate-product-ai-content",
    name: "Gerador de Conteúdo IA para Produtos",
    description: "Gera benefícios, palavras-chave e características usando IA",
    icon: Zap,
    status: "active" as const,
    prompts: ["Benefícios do Produto", "Palavras-chave do Produto", "Características do Produto"],
    dataSources: ["products_repository", "categories_config"]
  },
  {
    id: "ai-seo-generator",
    name: "Gerador de SEO com IA",
    description: "Cria conteúdo otimizado para SEO: meta descriptions, títulos, palavras-chave e conteúdo",
    icon: Search,
    status: "active" as const,
    prompts: ["Meta Description", "Título SEO", "Palavras-chave", "Conteúdo Oculto", "Conteúdo de Blog", "Análise de Depoimento em Vídeo", "Palavras-chave FAQ"],
    dataSources: ["landing_pages", "products_repository", "company_profile", "video_testimonials"]
  },
  {
    id: "generate-social-content",
    name: "Gerador de Conteúdo Social",
    description: "Gera conteúdo para redes sociais (WhatsApp, Instagram, TikTok, YouTube)",
    icon: MessageCircle,
    status: "active" as const,
    prompts: ["WhatsApp", "Instagram", "TikTok", "YouTube", "Sequência de 7 Mensagens WhatsApp"],
    dataSources: ["products_repository", "company_profile"]
  }
];

export const EnhancedPromptsManager = () => {
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

  const getUsageCount = (functionId: string) => {
    const configs = configurations.filter(config => config.edge_function_id === functionId);
    return configs.reduce((total, config) => 
      total + (config.performance_metrics?.usage_count || 0), 0
    );
  };

  const getSuccessRate = (functionId: string) => {
    const configs = configurations.filter(config => config.edge_function_id === functionId);
    const avgSuccessRate = configs.reduce((total, config) => 
      total + (config.performance_metrics?.success_rate || 0), 0
    ) / (configs.length || 1);
    return avgSuccessRate.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Prompts IA
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {EDGE_FUNCTIONS.map((func) => {
              const IconComponent = func.icon;
              const usageCount = getUsageCount(func.id);
              const successRate = getSuccessRate(func.id);
              
              return (
                <Card key={func.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
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
                    
                    {/* Métricas de performance */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Usos</p>
                        <p className="text-sm font-medium">{usageCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
                        <p className="text-sm font-medium">{successRate}%</p>
                      </div>
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
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <SystemMonitoringDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total de Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{configurations.length}</div>
                <p className="text-xs text-muted-foreground">Prompts configurados</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Funções Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {configurations.filter(c => c.is_active !== false).length}
                </div>
                <p className="text-xs text-muted-foreground">De {EDGE_FUNCTIONS.length} disponíveis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Uso Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {configurations.reduce((total, config) => 
                    total + (config.performance_metrics?.usage_count || 0), 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Execuções registradas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Mais Usadas</CardTitle>
              <CardDescription>
                Top 5 prompts por número de execuções
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {configurations
                  .sort((a, b) => (b.performance_metrics?.usage_count || 0) - (a.performance_metrics?.usage_count || 0))
                  .slice(0, 5)
                  .map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{config.prompt_name}</p>
                        <p className="text-xs text-muted-foreground">{config.edge_function_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {config.performance_metrics?.usage_count || 0} usos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {config.performance_metrics?.last_used 
                            ? new Date(config.performance_metrics.last_used).toLocaleDateString('pt-BR')
                            : 'Nunca usado'
                          }
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PromptEditModal
        edgeFunction={editingFunction}
        open={!!editingFunction}
        onOpenChange={(open) => !open && setEditingFunction(null)}
      />
    </div>
  );
};