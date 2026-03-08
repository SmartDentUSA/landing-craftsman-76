import { usePipelineAuditLogs, useGeneratedPages } from "@/hooks/useRAGMetrics";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, Globe } from "lucide-react";

const stepStatusIcon = {
  started: <Clock className="h-3 w-3 text-warning" />,
  success: <CheckCircle2 className="h-3 w-3 text-success" />,
  error: <XCircle className="h-3 w-3 text-destructive" />,
};

export function PipelineAuditViewer() {
  const { data: logs, isLoading } = usePipelineAuditLogs();
  const { data: pages, isLoading: pagesLoading } = useGeneratedPages();

  return (
    <Tabs defaultValue="pipeline" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pipeline">Pipeline Logs</TabsTrigger>
        <TabsTrigger value="pages">Generated Pages</TabsTrigger>
      </TabsList>

      <TabsContent value="pipeline">
        {isLoading ? (
          <div className="text-muted-foreground p-4">Carregando logs...</div>
        ) : (logs || []).length === 0 ? (
          <div className="text-muted-foreground p-4 text-center">
            Nenhum log de pipeline registrado ainda. Os logs aparecerão quando submissions forem processadas.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs || []).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.step_number}</TableCell>
                    <TableCell className="font-medium text-sm">{log.step_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {stepStatusIcon[log.status as keyof typeof stepStatusIcon] || stepStatusIcon.started}
                        <span className="text-xs">{log.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                      {log.error_message || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm:ss") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="pages">
        {pagesLoading ? (
          <div className="text-muted-foreground p-4">Carregando páginas...</div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SEO Score</TableHead>
                  <TableHead>Canonical URL</TableHead>
                  <TableHead>Publicado</TableHead>
                  <TableHead>Criado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pages || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell><Badge variant="secondary">{p.page_type || "—"}</Badge></TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.content_status === "published"
                            ? "success"
                            : p.content_status === "archived"
                            ? "outline"
                            : "warning"
                        }
                      >
                        {p.content_status || "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.seo_score ?? "—"}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">
                      {p.canonical_url ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Globe className="h-3 w-3" />
                          {p.canonical_url}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.published ? "success" : "outline"}>
                        {p.published ? "Sim" : "Não"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.created_at ? format(new Date(p.created_at), "dd/MM HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
