import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNPSMetrics, NPSMetrics } from '@/hooks/useNPSMetrics';
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
} from 'lucide-react';
import { toast } from 'sonner';

export const NPSInsightsTab = () => {
  const { loading, processing, loadNPSMetrics, processNPSFile, generateContentFromInterests } = useNPSMetrics();
  const [npsMetrics, setNpsMetrics] = useState<NPSMetrics | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  useEffect(() => {
    loadMetrics();
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
    const content = await generateContentFromInterests(action);
    setGeneratedContent({ action, data: content });
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
            Faça upload do arquivo XLSX de respostas NPS para análise automática de satisfação e temas de interesse
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-2">Nenhum dado NPS encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload do arquivo XLSX exportado do Google Forms com as respostas NPS
              </p>
              <Button asChild disabled={processing}>
                <label htmlFor="nps-file-upload" className="cursor-pointer">
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
                </label>
              </Button>
              <input
                id="nps-file-upload"
                type="file"
                accept=".xlsx,.xls"
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes">Temas de Interesse</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="content">Geração de Conteúdo</TabsTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleGenerateContent('suggest-landing-pages')}
                >
                  Sugerir Landing Pages
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateContent('generate-blog-topics')}
                >
                  Gerar Tópicos de Blog
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateContent('map-products-to-interests')}
                >
                  Mapear Produtos
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleGenerateContent('generate-faq-from-interests')}
                >
                  Gerar FAQs
                </Button>
              </div>

              {generatedContent && (
                <Card className="mt-4 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Resultado: {generatedContent.action}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs overflow-auto max-h-96 bg-background p-4 rounded">
                      {JSON.stringify(generatedContent.data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
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
              <Button asChild disabled={processing}>
                <label htmlFor="nps-file-upload-update" className="cursor-pointer">
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
                </label>
              </Button>
              <input
                id="nps-file-upload-update"
                type="file"
                accept=".xlsx,.xls"
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
