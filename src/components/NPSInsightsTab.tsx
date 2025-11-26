import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNPSMetrics, NPSMetrics } from '@/hooks/useNPSMetrics';
import { useNPSGeneratedContent } from '@/hooks/useNPSGeneratedContent';
import { NPSFormattedResults } from './NPSFormattedResults';
import { 
  Upload, 
  TrendingUp, 
  Users, 
  Star, 
  Lightbulb, 
  Target,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  FileText,
  Package,
  HelpCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

// Action type mapping for consistency
const actionTypeMap: Record<string, string> = {
  'suggest-landing-pages': 'landing-pages',
  'generate-blog-topics': 'blog-topics',
  'map-products-to-interests': 'product-mapping',
  'generate-faq-from-interests': 'faqs',
};

export const NPSInsightsTab = () => {
  const { loading, processing, loadNPSMetrics, processNPSFile, generateContentFromInterests } = useNPSMetrics();
  const { history, loadHistory, loading: historyLoading } = useNPSGeneratedContent();
  const [npsMetrics, setNpsMetrics] = useState<NPSMetrics | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputUpdateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMetrics();
    loadHistory();
  }, []);

  const loadMetrics = async () => {
    const metrics = await loadNPSMetrics();
    setNpsMetrics(metrics);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const success = await processNPSFile(file);
    if (success) {
      await loadMetrics();
    }
  };

  const handleGenerateContent = async (action: string) => {
    try {
      setGeneratedContent(null);
      const content = await generateContentFromInterests(action);
      if (content) {
        setGeneratedContent({ action, data: content });
      }
    } catch (error) {
      console.error('Error generating content:', error);
    }
  };

  const handleContentApplied = () => {
    loadMetrics();
    loadHistory();
    setGeneratedContent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!npsMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Análise NPS & Interesses dos Clientes
          </CardTitle>
          <CardDescription>
            Faça upload do arquivo XLSX ou CSV de respostas NPS para análise automática de satisfação e temas de interesse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-2">Nenhum dado NPS encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload do arquivo XLSX ou CSV exportado do Google Forms com as respostas NPS
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Fazer Upload
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={processing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topThemes = Object.entries(npsMetrics.interest_themes)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header with metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>NPS Score</CardDescription>
            <CardTitle className="text-3xl">{npsMetrics.nps_score}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs">
              <Badge variant="default" className="bg-green-500">
                {npsMetrics.promoters_percentage}% Promotores
              </Badge>
              <Badge variant="secondary">
                {npsMetrics.passives_percentage}% Neutros
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Satisfação Geral</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-1">
              {npsMetrics.satisfaction_score}
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Baseado em {npsMetrics.total_responses} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualidade dos Treinamentos</CardDescription>
            <CardTitle className="text-3xl">{npsMetrics.training_quality_score}/5</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={npsMetrics.training_quality_score * 20} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Respondentes</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-6 w-6" />
              {npsMetrics.unique_respondents}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="themes" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="themes">Temas de Interesse</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="content">Geração de Conteúdo</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Produtos & Cursos Mais Demandados
              </CardTitle>
              <CardDescription>
                Tendências de demanda do mercado odontológico - baseado em {npsMetrics.total_responses} profissionais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topThemes.map(([theme, data]) => (
                <div key={theme} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{theme}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {data.count} respostas
                      </span>
                      <Badge variant={data.percentage >= 40 ? 'default' : 'secondary'}>
                        {data.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={data.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Insights Gerados por IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Padrões de Demanda</h4>
                <ul className="space-y-2">
                  {npsMetrics.insights.common_themes.map((theme, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Keywords Validadas (SEO)</h4>
                <div className="flex flex-wrap gap-2">
                  {npsMetrics.insights.top_keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Oportunidades de Conteúdo</h4>
                <ul className="space-y-2">
                  {npsMetrics.insights.content_opportunities.map((opportunity, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Star className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geração Automática de Conteúdo</CardTitle>
              <CardDescription>
                Use os dados de interesse dos clientes para gerar conteúdo estratégico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedContent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Conteúdo Gerado</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setGeneratedContent(null)}
                    >
                      Gerar Outro
                    </Button>
                  </div>
                  
                  <NPSFormattedResults 
                    actionType={(actionTypeMap[generatedContent.action] || generatedContent.action) as any}
                    data={generatedContent.data}
                    onApplied={handleContentApplied}
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4"
                    onClick={() => handleGenerateContent('suggest-landing-pages')}
                  >
                    <FileText className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Sugerir Landing Pages</div>
                      <div className="text-xs text-muted-foreground">
                        Páginas baseadas nas demandas reais
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4"
                    onClick={() => handleGenerateContent('generate-blog-topics')}
                  >
                    <Lightbulb className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Gerar Tópicos de Blog</div>
                      <div className="text-xs text-muted-foreground">
                        Conteúdo otimizado para SEO
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4"
                    onClick={() => handleGenerateContent('map-products-to-interests')}
                  >
                    <Package className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Mapear Produtos</div>
                      <div className="text-xs text-muted-foreground">
                        Correlacionar produtos × interesses
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4"
                    onClick={() => handleGenerateContent('generate-faq-from-interests')}
                  >
                    <HelpCircle className="h-5 w-5 mb-2 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Gerar FAQs</div>
                      <div className="text-xs text-muted-foreground">
                        Perguntas baseadas nos temas
                      </div>
                    </div>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Conteúdo Gerado</CardTitle>
              <CardDescription>
                Visualize todo o conteúdo gerado a partir dos dados NPS
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center p-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhum conteúdo gerado ainda. Use a aba "Geração de Conteúdo" para começar.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <Card key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={item.applied ? "default" : "secondary"}>
                              {item.applied ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Aplicado
                                </>
                              ) : (
                                "Pendente"
                              )}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <div className="text-sm font-medium mb-1">
                            {item.action_type === 'faqs' && 'FAQs Geradas'}
                            {item.action_type === 'blog-topics' && 'Tópicos de Blog'}
                            {item.action_type === 'landing-pages' && 'Landing Pages Sugeridas'}
                            {item.action_type === 'product-mapping' && 'Mapeamento de Produtos'}
                          </div>
                          
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setGeneratedContent({ 
                            action: actionTypeMap[item.action_type] || item.action_type,
                            data: item.generated_data 
                          })}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atualizar Dados NPS</CardTitle>
              <CardDescription>
                Última atualização: {new Date(npsMetrics.last_updated).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => fileInputUpdateRef.current?.click()} 
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Fazer Upload de Novo Arquivo
                  </>
                )}
              </Button>
              <input
                ref={fileInputUpdateRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
                disabled={processing}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
