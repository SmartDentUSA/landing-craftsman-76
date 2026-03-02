import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, FileText, Search, MessageSquare, Video, Zap, Edit3, Loader2, MessageCircle, PlayCircle, Instagram, Activity, TrendingUp, Users, Coins } from 'lucide-react';
import { PromptEditModal } from './PromptEditModal';
import { SystemMonitoringDashboard } from './SystemMonitoringDashboard';
import { usePromptsConfiguration } from '@/hooks/usePromptsConfiguration';
import sistemaPromptsAI from '@/assets/sistema-prompts-ai.png';
import { TikTokIcon } from './icons/TikTokIcon';
import { AITokenDashboard } from './AITokenDashboard';
import { supabase } from '@/integrations/supabase/client';

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
  },
  {
    id: "generate-ad-copies",
    name: "Gerador de Anúncios Google Ads",
    description: "Cria headlines, descriptions e paths para campanhas RSA no Google Ads",
    icon: Search,
    status: "active" as const,
    prompts: ["Cópias Google Ads"],
    dataSources: ["products_repository", "company_profile", "landing_pages"],
    defaultPrompt: `Você é um especialista em copywriting para Google Ads com foco em campanhas para {targetAudience}, PRIORIZANDO CATEGORIAS E SUBCATEGORIAS.

Gere cópias para um Responsive Search Ad (RSA) baseadas nas seguintes informações:
- SEO Title: {seoTitle}
- SEO Description: {seoDescription}
- Keyword Principal: {primaryKeyword}
- Público-alvo: {targetAudience}

REGRAS OBRIGATÓRIAS:
1. Headlines: 6-10 variações, máximo 30 caracteres cada
2. Descriptions: 2-4 variações, máximo 90 caracteres cada
3. Paths: 2 caminhos, máximo 15 caracteres cada
4. Incluir keyword principal em pelo menos 2 headlines
5. EVITAR: CAPSLOCK, "cura", "milagre", "garantido"

Retorne APENAS JSON: {"headlines": [...], "descriptions": [...], "paths": [...]}`
  },
  {
    id: "generate-tiktok-content",
    name: "Gerador de Conteúdo TikTok",
    description: "Cria scripts virais para TikTok com hooks, transições e CTAs",
    icon: TikTokIcon,
    status: "active" as const,
    prompts: ["Script TikTok Viral"],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "generate-product-faqs",
    name: "Gerador de FAQs de Produtos",
    description: "Gera 10 perguntas frequentes contextualizadas baseadas em dados do produto",
    icon: MessageSquare,
    status: "active" as const,
    prompts: ["10 FAQs Produto"],
    dataSources: ["products_repository"],
    defaultPrompt: `Você é um especialista em produtos e FAQ. Gere EXATAMENTE 10 perguntas frequentes sobre o produto.

PRODUTO: {product.name}
Descrição: {product.description}
Benefícios: {product.benefits}
Recursos: {product.features}
Especificações: {product.technical_specifications}

INSTRUÇÕES:
1. Gere 10 FAQs práticos e relevantes
2. Perguntas devem começar com: "Como", "Qual", "Quais", "O que"
3. Respostas devem ter 60-100 palavras
4. Incorpore keywords naturalmente
5. Use HTML básico: <strong>, <em>, <ul>, <li>

IMPORTANTE: Retorne APENAS JSON válido sem texto adicional.`
  },
  {
    id: "generate-spin-campaign",
    name: "Gerador de Campanhas SPIN",
    description: "Cria sequências WhatsApp baseadas no framework SPIN Selling",
    icon: Zap,
    status: "active" as const,
    prompts: ["Campanha WhatsApp SPIN"],
    dataSources: ["spin_selling_solutions", "products_repository", "company_profile"],
    defaultPrompt: `Você é um copywriter especializado em vendas SPIN. Crie um storytelling ULTRA persuasivo (máx 150 caracteres) para WhatsApp.

SOLUÇÃO: {solution.title}
PITCH: {solution.sales_pitch}
PRODUTOS: {products}
BENEFÍCIOS: {benefits}

REGRAS:
1. Comece com gancho emocional forte
2. Apresente transformação rápida
3. Feche com benefício + emojis (máx 2)
4. Máximo 150 caracteres
5. Tom conversacional e urgente

Exemplo: "Cansado de retrabalho? Imagine sua clínica voando com impressões perfeitas. A Smart Dent te entrega isso! 🚀"`
  },
  {
    id: "generate-spin-faqs",
    name: "Gerador de FAQs SPIN",
    description: "Gera 10 FAQs estratégicas para landing pages SPIN",
    icon: MessageSquare,
    status: "active" as const,
    prompts: ["10 FAQs SPIN"],
    dataSources: ["spin_selling_solutions", "products_repository", "company_profile"],
    defaultPrompt: `Você é um especialista em SPIN Selling e Marketing Odontológico B2B. Gere 10 FAQs estratégicas que conduzam pela Jornada SPIN (Situação → Problema → Implicação → Necessidade).

SOLUÇÃO: {solution.title}
PITCH: {solution.sales_pitch}
MÉTRICAS: {pain_metrics}
PRODUTOS: {products}

DISTRIBUIÇÃO OBRIGATÓRIA:
- 3 FAQs: DESEJO & IDENTIFICAÇÃO
- 3 FAQs: DOR & URGÊNCIA
- 4 FAQs: RESULTADO & IMPLEMENTAÇÃO

REGRAS:
1. Use linguagem do pitch
2. Integre métricas naturalmente
3. Tom profissional mas conversacional
4. 60-180 palavras por resposta
5. Mencione produtos específicos quando relevante`
  },
  {
    id: "generate-spin-hero-banner",
    name: "Gerador de Banners Hero IA",
    description: "Cria imagens hero 16:9 profissionais com múltiplos produtos",
    icon: Edit3,
    status: "active" as const,
    prompts: ["Imagem Hero 16:9"],
    dataSources: ["spin_selling_solutions", "products_repository"],
    defaultPrompt: `CRÍTICO: ABSOLUTAMENTE NENHUM TEXTO NA IMAGEM - apenas fotografia pura.

PRODUTOS: {products}
DIMENSÕES FÍSICAS: {dimensions}

AMBIENTE:
- Consultório odontológico moderno
- Fundo branco puro (#FFFFFF)
- Iluminação profissional (soft box + refletor)

CÂMERA:
- Proporção: 16:9 landscape
- Lente: 50mm f/2.8
- Profundidade de campo: Shallow (foco progressivo)
- Iluminação: 5500K (luz do dia)

COMPOSIÇÃO:
- Produto maior: centro-frontal, sharp focus
- Produtos menores: laterais/fundo, blur progressivo
- Respeitar EXATAMENTE proporções de volume calculadas

SEM TEXTO, SEM MARCAS, SEM OVERLAYS - APENAS FOTOGRAFIA PROFISSIONAL`
  },
  {
    id: "generate-ecommerce-html",
    name: "Gerador de HTML E-commerce",
    description: "Gera HTML completo de página de produto para e-commerce",
    icon: FileText,
    status: "active" as const,
    prompts: ["HTML E-commerce Completo"],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "extract-youtube-captions",
    name: "Extrator de Legendas YouTube",
    description: "Extrai e analisa legendas de vídeos do YouTube com IA",
    icon: Video,
    status: "active" as const,
    prompts: ["Análise de Legendas"],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "generate-instagram-reels-script",
    name: "Gerador de Scripts Reels",
    description: "Gera scripts otimizados para Instagram Reels",
    icon: Instagram,
    status: "active" as const,
    prompts: ["Script Reels"],
    dataSources: ["products_repository", "company_profile"]
  },
  {
    id: "generate-youtube-script",
    name: "Gerador de Scripts YouTube",
    description: "Gera roteiros completos para vídeos do YouTube",
    icon: PlayCircle,
    status: "active" as const,
    prompts: ["Script YouTube"],
    dataSources: ["products_repository", "company_profile"]
  }
];

export const EnhancedPromptsManager = () => {
  const [editingFunction, setEditingFunction] = useState<typeof EDGE_FUNCTIONS[0] | null>(null);
  const { configurations, loading } = usePromptsConfiguration();

  // Fetch real usage counts from ai_token_usage table
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      setUsageLoading(true);
      const { data, error } = await supabase
        .from('ai_token_usage' as any)
        .select('edge_function_id');

      if (!error && data) {
        const counts: Record<string, number> = {};
        (data as any[]).forEach((r: any) => {
          counts[r.edge_function_id] = (counts[r.edge_function_id] || 0) + 1;
        });
        setUsageCounts(counts);
      }
      setUsageLoading(false);
    };
    fetchUsage();
  }, []);

  const isConfigured = (functionId: string) => {
    return configurations.some(config => config.edge_function_id === functionId);
  };

  const getUsageCount = (functionId: string) => {
    return usageCounts[functionId] || 0;
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Prompts IA
          </TabsTrigger>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            💰 Tokens
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

        <TabsContent value="tokens" className="space-y-6">
          <AITokenDashboard />
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