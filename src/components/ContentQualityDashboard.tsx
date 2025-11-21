import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SpinSolution {
  id: string;
  title: string;
  pain_type: string;
  sales_pitch: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function ContentQualityDashboard() {
  const { data: solutions, isLoading } = useQuery({
    queryKey: ['spin-solutions-quality'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as SpinSolution[];
    }
  });

  const getQualityBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">N/A</Badge>;
    
    if (score >= 90) return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Excelente</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500"><TrendingUp className="w-3 h-3 mr-1" /> Bom</Badge>;
    if (score >= 60) return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Regular</Badge>;
    return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Baixo</Badge>;
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">N/A</Badge>;
    
    if (score >= 85) return <Badge className="bg-green-600">Alta ({score}%)</Badge>;
    if (score >= 70) return <Badge className="bg-blue-600">Média ({score}%)</Badge>;
    return <Badge variant="secondary">Baixa ({score}%)</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Qualidade do Conteúdo Gerado
          <Badge variant="outline" className="ml-auto">
            {solutions?.length || 0} soluções
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!solutions || solutions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma solução SPIN encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solução</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Qualidade de Dados</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Modelo IA</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solutions.map((solution) => {
                  const metadata = solution.metadata || {};
                  const artifactChain = metadata.artifact_chain || {};
                  const qualityMetrics = metadata.quality_metrics || {};
                  const generationHistory = metadata.generation_history || [];

                  return (
                    <TableRow key={solution.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{solution.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {solution.pain_type}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {artifactChain.pitch_version || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getQualityBadge(qualityMetrics.data_quality_score)}
                        {qualityMetrics.data_quality_score && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Score: {qualityMetrics.data_quality_score}/100
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getConfidenceBadge(qualityMetrics.confidence_score)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {artifactChain.model_used?.split('/')[1] || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {artifactChain.timestamp 
                            ? formatDistanceToNow(new Date(artifactChain.timestamp), { 
                                addSuffix: true,
                                locale: ptBR 
                              })
                            : 'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            console.log('Metadata completo:', metadata);
                            alert(JSON.stringify(metadata, null, 2));
                          }}
                        >
                          Ver Histórico ({generationHistory.length})
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
