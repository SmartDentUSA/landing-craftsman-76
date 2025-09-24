import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { useIntelligentGeneration } from '@/hooks/useIntelligentGeneration';

interface AutoGenerationPanelProps {
  landingPageId?: string;
}

export function AutoGenerationPanel({ landingPageId }: AutoGenerationPanelProps) {
  const {
    analyzing,
    generating,
    error,
    lastAnalysis,
    summary,
    analyzeDataQuality,
    generateMissingContent,
    clearError
  } = useIntelligentGeneration();

  const handleAnalyze = () => {
    analyzeDataQuality(landingPageId);
  };

  const handleGenerateAll = () => {
    generateMissingContent(landingPageId);
  };

  // Get analysis for specific landing page if provided
  const pageAnalysis = landingPageId 
    ? lastAnalysis.find(a => a.landingPageId === landingPageId)
    : null;

  const isLoading = analyzing || generating;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Geração Inteligente de IA
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button onClick={clearError} size="sm" variant="outline">
                Fechar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Global Summary */}
        {summary && !landingPageId && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Visão Geral do Sistema
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{summary.totalPages}</div>
                <div className="text-sm text-muted-foreground">Páginas Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.highQuality}</div>
                <div className="text-sm text-muted-foreground">Alta Qualidade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.needsImprovement}</div>
                <div className="text-sm text-muted-foreground">Precisam Melhorar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.canAutoGenerate}</div>
                <div className="text-sm text-muted-foreground">Prontos para IA</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Qualidade Média do Sistema</span>
                <span className="text-sm font-medium">{summary.averageScore}%</span>
              </div>
              <Progress value={summary.averageScore} className="h-2" />
            </div>

            {summary.mostCommonIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Problemas Mais Comuns:</h4>
                <div className="space-y-1">
                  {summary.mostCommonIssues.slice(0, 3).map((issue, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {issue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Specific Page Analysis */}
        {pageAnalysis && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Análise da Página</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Qualidade dos Dados</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pageAnalysis.overallScore}%</span>
                  <Badge 
                    variant={
                      pageAnalysis.overallScore >= 80 ? 'default' :
                      pageAnalysis.overallScore >= 60 ? 'secondary' : 'destructive'
                    }
                  >
                    {pageAnalysis.overallScore >= 80 ? 'Excelente' :
                     pageAnalysis.overallScore >= 60 ? 'Bom' : 'Precisa Melhorar'}
                  </Badge>
                </div>
              </div>
              <Progress value={pageAnalysis.overallScore} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Status dos Dados:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    {pageAnalysis.details.hasTitle ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                    Título
                  </div>
                  <div className="flex items-center gap-2">
                    {pageAnalysis.details.hasSubtitle ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                    Subtítulo
                  </div>
                  <div className="flex items-center gap-2">
                    {pageAnalysis.details.hasProducts ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                    Produtos
                  </div>
                  <div className="flex items-center gap-2">
                    {pageAnalysis.details.hasFAQ ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                    FAQ
                  </div>
                  <div className="flex items-center gap-2">
                    {pageAnalysis.details.hasKeywords ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    }
                    Keywords
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Qualidade dos Produtos:</h4>
                <div className="flex items-center gap-2">
                  <Progress value={pageAnalysis.details.productQuality * 100} className="h-2 flex-1" />
                  <span className="text-sm">{Math.round(pageAnalysis.details.productQuality * 100)}%</span>
                </div>
              </div>
            </div>

            {pageAnalysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recomendações:</h4>
                <div className="space-y-1">
                  {pageAnalysis.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleAnalyze} 
            disabled={isLoading}
            variant="outline"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Analisar Qualidade
          </Button>

          <Button 
            onClick={handleGenerateAll} 
            disabled={isLoading || (pageAnalysis && !pageAnalysis.canAutoGenerate)}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Gerar Conteúdo IA
          </Button>
        </div>

        {/* Generation Status */}
        {(pageAnalysis && !pageAnalysis.canAutoGenerate) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A página precisa de pelo menos 60% de qualidade para geração automática. 
              Complete os dados faltantes primeiro.
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Análise:</strong> Verifica a qualidade dos dados disponíveis</p>
          <p><strong>Geração IA:</strong> Cria automaticamente keywords, características de produtos e previews de blog</p>
        </div>
      </CardContent>
    </Card>
  );
}