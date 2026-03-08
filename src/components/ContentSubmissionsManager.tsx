import { useContentSubmissions } from "@/hooks/useRAGMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "success" | "warning" | "outline"; icon: any }> = {
  pending: { variant: "warning", icon: Clock },
  processing: { variant: "secondary", icon: Clock },
  completed: { variant: "success", icon: CheckCircle2 },
  failed: { variant: "destructive", icon: XCircle },
  rejected: { variant: "destructive", icon: AlertCircle },
};

export function ContentSubmissionsManager() {
  const { data: submissions, isLoading, refetch } = useContentSubmissions();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }
    const { error } = await supabase
      .from("content_submissions")
      .update({
        processing_status: "failed",
        editorial_status: "rejected",
        rejection_reason: rejectionReason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao rejeitar: " + error.message);
    } else {
      toast.success("Submission rejeitada");
      setRejectingId(null);
      setRejectionReason("");
      refetch();
    }
  };

  if (isLoading) return <div className="text-muted-foreground p-4">Carregando submissions...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Editorial</TableHead>
              <TableHead>Rejeição</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(submissions || []).map((s) => {
              const cfg = statusConfig[s.processing_status || "pending"] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{s.title}</TableCell>
                  <TableCell><Badge variant="outline">{s.source_system}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{s.content_type}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {s.processing_status}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.editorial_status}</Badge></TableCell>
                  <TableCell className="max-w-[150px] truncate text-muted-foreground text-xs">
                    {s.rejection_reason || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.created_at ? format(new Date(s.created_at), "dd/MM HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    {rejectingId === s.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          className="border rounded px-2 py-1 text-xs w-32 bg-background"
                          placeholder="Motivo..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <Button size="sm" variant="destructive" onClick={() => handleReject(s.id)}>
                          OK
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectingId(s.id)}
                        disabled={s.processing_status === "failed"}
                      >
                        Rejeitar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
