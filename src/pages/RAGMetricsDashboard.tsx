import { useRAGMetrics } from "@/hooks/useRAGMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContentSubmissionsManager } from "@/components/ContentSubmissionsManager";
import { PipelineAuditViewer } from "@/components/PipelineAuditViewer";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Brain, AlertTriangle, Star, DollarSign, MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function RAGMetricsDashboard() {
  const { data: metrics, isLoading, error } = useRAGMetrics();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando métricas RAG...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Erro ao carregar métricas: {(error as Error).message}</div>
      </div>
    );
  }

  const m = metrics!;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">RAG Metrics Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Monitoramento em tempo real do pipeline RAG, Knowledge Brain e Content Submissions
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Auto-refresh: 30s
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Brain className="h-3.5 w-3.5" /> Chunks Indexados
              </div>
              <div className="text-2xl font-bold text-foreground">{m.totalChunks.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Taxa Alucinação
              </div>
              <div className="text-2xl font-bold text-foreground">{m.hallucinationRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Star className="h-3.5 w-3.5" /> Quality Score
              </div>
              <div className="text-2xl font-bold text-foreground">{m.avgQualityScore}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Custo RAG 24h
              </div>
              <div className="text-2xl font-bold text-foreground">R$ {m.ragCost24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MessageSquare className="h-3.5 w-3.5" /> Conversas Total
              </div>
              <div className="text-2xl font-bold text-foreground">{m.totalConversations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Activity className="h-3.5 w-3.5" /> Ativas
              </div>
              <div className="text-2xl font-bold text-foreground">{m.activeConversations}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="quality" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quality">Qualidade RAG</TabsTrigger>
            <TabsTrigger value="hallucinations">Alucinações</TabsTrigger>
            <TabsTrigger value="submissions">Content Submissions</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline & Pages</TabsTrigger>
          </TabsList>

          {/* Quality Chart */}
          <TabsContent value="quality">
            <Card>
              <CardHeader>
                <CardTitle>Quality Score ao Longo do Tempo</CardTitle>
                <CardDescription>Média diária do quality_score das respostas RAG</CardDescription>
              </CardHeader>
              <CardContent>
                {m.qualityOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={m.qualityOverTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[0, 1]} className="text-xs" />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="avgQuality"
                        name="Quality Score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Sem dados de qualidade ainda. As métricas serão populadas à medida que o RAG processar mensagens.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hallucinations Table */}
          <TabsContent value="hallucinations">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens com Alucinação Detectada</CardTitle>
                <CardDescription>Últimas respostas sinalizadas pelo LLM-as-Judge</CardDescription>
              </CardHeader>
              <CardContent>
                {m.hallucinatedMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhuma alucinação detectada. Excelente!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.hallucinatedMessages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="max-w-[400px] truncate text-sm">{msg.content}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{msg.quality_score ?? "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), "dd/MM HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Content Submissions</CardTitle>
                <CardDescription>
                  Gerenciamento de conteúdos submetidos — inclui rejection_reason, processed_by e editorial_status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentSubmissionsManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline & Pages */}
          <TabsContent value="pipeline">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Audit & Generated Pages</CardTitle>
                <CardDescription>
                  Logs de auditoria do pipeline de 16 etapas e páginas geradas com content_status e canonical_url
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PipelineAuditViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
