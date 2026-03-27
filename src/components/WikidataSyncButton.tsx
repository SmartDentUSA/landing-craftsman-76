import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Loader2, Eye, Shield, AlertTriangle, CheckCircle, Database, Zap, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  syncProductToWikidata,
  buildProductWikidataPayload,
  resolveWikidataEntity,
  executeWikidataWrite,
  type WikidataResolveResult,
} from "@/services/wikidata-sync";

interface WikidataSyncButtonProps {
  productId?: string;
  wikidataItemId?: string | null;
  onSyncSuccess?: (qid: string) => void;
}

const SYNC_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  synced: { label: "Synced", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  collision: { label: "Collision", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
  processing: { label: "Processing", variant: "secondary" },
};

const WRITE_DECISION_CONFIG: Record<string, { label: string; icon: typeof CheckCircle }> = {
  create: { label: "Create", icon: Zap },
  update: { label: "Update", icon: Database },
  skip: { label: "Skip", icon: CheckCircle },
  abort: { label: "Abort", icon: AlertTriangle },
};

export function WikidataSyncButton({ productId, wikidataItemId, onSyncSuccess }: WikidataSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [localQid, setLocalQid] = useState<string | null>(null);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [payloadData, setPayloadData] = useState<{ payload: unknown; summary: unknown } | null>(null);
  const [resolveResult, setResolveResult] = useState<WikidataResolveResult | null>(null);
  const { toast } = useToast();

  const displayQid = localQid || wikidataItemId;
  const isAnyLoading = syncing || previewing || resolving || publishing;
  const isLiveMode = resolveResult?.writeEnabled === true;
  const canPublish = isLiveMode && resolveResult?.syncStatus === "pending" && resolveResult?.writeDecision !== "abort";

  if (!productId) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncProductToWikidata(productId);
      if (result.success && result.wikidataQid) {
        setLocalQid(result.wikidataQid);
        onSyncSuccess?.(result.wikidataQid);
        toast({
          title: `✓ Sincronizado: ${result.wikidataQid}`,
          description: (
            <a href={`https://www.wikidata.org/wiki/${result.wikidataQid}`} target="_blank" rel="noopener noreferrer" className="underline">
              Ver no Wikidata →
            </a>
          ),
        });
      } else if (result.needsCreate) {
        toast({
          title: "Categoria identificada",
          description: `${result.fallbackLabel || "Categoria genérica"} — use Resolve + Publish para criar item específico.`,
        });
      } else {
        toast({ title: "Erro ao sincronizar", description: result.error ?? "Erro desconhecido", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao sincronizar", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handlePreviewPayload = async () => {
    setPreviewing(true);
    try {
      const result = await buildProductWikidataPayload(productId);
      if (result.success && result.payload) {
        setPayloadData({ payload: result.payload, summary: result.summary });
        setPayloadDialogOpen(true);
      } else {
        toast({ title: "Erro ao gerar payload", description: result.error ?? "Erro desconhecido", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro ao gerar payload", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      const result = await resolveWikidataEntity("product", productId);
      setResolveResult(result);

      if (result.success && result.wikidataQid) {
        setLocalQid(result.wikidataQid);
        onSyncSuccess?.(result.wikidataQid);
      }

      if (result.success) {
        toast({
          title: `Pipeline: ${result.writeDecision?.toUpperCase()} ${result.syncStatus === "synced" ? "✅" : ""}`,
          description: `Score: ${result.semanticGrade} (${((result.semanticScore || 0) * 100).toFixed(0)}%) | ${result.writeEnabled ? "🟢 Live" : "🔴 Preview"} | ${result.wikidataQid || "No QID yet"}`,
        });
      } else {
        toast({ title: "Pipeline bloqueado", description: result.error || result.errorCode || "Erro desconhecido", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro no pipeline", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await executeWikidataWrite("product", productId);

      if (result.success && result.wikidataQid) {
        setLocalQid(result.wikidataQid);
        onSyncSuccess?.(result.wikidataQid);
        setResolveResult((prev) => prev ? { ...prev, syncStatus: "synced", wikidataQid: result.wikidataQid } : prev);
        toast({
          title: `✅ Publicado: ${result.wikidataQid}`,
          description: (
            <a href={`https://www.wikidata.org/wiki/${result.wikidataQid}`} target="_blank" rel="noopener noreferrer" className="underline">
              Ver no Wikidata →
            </a>
          ),
        });
      } else {
        toast({
          title: "Erro ao publicar",
          description: result.error || result.errorCode || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({ title: "Erro ao publicar", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  const summary = payloadData?.summary as Record<string, unknown> | undefined;
  const semanticScore = summary?.semanticScore as Record<string, unknown> | undefined;
  const validationErrors = (summary?.validationErrors as Array<{ severity: string; path: string; message: string }>) || [];
  const hardErrors = validationErrors.filter(e => e.severity === "error");
  const warnings = validationErrors.filter(e => e.severity === "warning");

  const statusConfig = resolveResult?.syncStatus ? SYNC_STATUS_CONFIG[resolveResult.syncStatus] : null;
  const decisionConfig = resolveResult?.writeDecision ? WRITE_DECISION_CONFIG[resolveResult.writeDecision] : null;

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isAnyLoading} className="gap-1" title="Sincronizar produto com Wikidata">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          Wikidata
        </Button>
        <Button variant="ghost" size="sm" onClick={handlePreviewPayload} disabled={isAnyLoading} className="gap-1" title="Preview do payload wbeditentity">
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Payload
        </Button>
        <Button variant="ghost" size="sm" onClick={handleResolve} disabled={isAnyLoading} className="gap-1" title="Resolve & Persist pipeline">
          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Resolve
        </Button>

        {/* Publish button — only visible in Live Mode */}
        {(canPublish || publishing) && (
          <Button
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={isAnyLoading}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            title="Publicar no Wikidata (escrita real)"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Publish
          </Button>
        )}

        {/* QID badge */}
        {displayQid && (
          <a href={`https://www.wikidata.org/wiki/${displayQid}`} target="_blank" rel="noopener noreferrer">
            <Badge className="bg-emerald-600 text-white cursor-pointer">{displayQid}</Badge>
          </a>
        )}

        {/* Live/Preview mode indicator */}
        {resolveResult && (
          <Badge variant={isLiveMode ? "default" : "outline"} className={`text-[10px] ${isLiveMode ? "bg-emerald-600 text-white" : ""}`}>
            {isLiveMode ? "🟢 Live" : "🔴 Preview"}
          </Badge>
        )}

        {/* Status badges */}
        {statusConfig && (
          <Badge variant={statusConfig.variant} className="text-[10px]">
            {statusConfig.label}
          </Badge>
        )}
        {decisionConfig && (
          <Badge variant="outline" className="text-[10px] gap-0.5">
            <decisionConfig.icon className="h-3 w-3" />
            {decisionConfig.label}
          </Badge>
        )}
        {resolveResult?.writeDecision === "abort" && resolveResult.semanticScore != null && resolveResult.semanticScore < 0.7 && (
          <Badge variant="destructive" className="text-[10px] gap-0.5">
            <AlertTriangle className="h-3 w-3" />
            Score &lt; 0.7
          </Badge>
        )}
      </div>

      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Payload wbeditentity — Preview v4.0
            </DialogTitle>
            <DialogDescription>
              JSON validado, canonicalizado e auditável. {isLiveMode ? "🟢 Modo Live — escrita real habilitada." : "🔴 Modo Preview — nenhuma escrita é realizada."}
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="flex flex-wrap gap-2 text-xs">
              {summary.isValid ? (
                <Badge className="bg-emerald-600 text-white gap-1">
                  <CheckCircle className="h-3 w-3" /> Válido
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {hardErrors.length} erro(s)
                </Badge>
              )}
              <Badge variant="secondary">{String(summary.claimCount ?? 0)} claims</Badge>
              {semanticScore && (
                <Badge variant={semanticScore.passed ? "default" : "destructive"} className="gap-1">
                  <Shield className="h-3 w-3" />
                  Score: {String(semanticScore.grade)} ({((semanticScore.overall as number) * 100).toFixed(0)}%)
                </Badge>
              )}
              {(summary.duplicatesRemoved as number) > 0 && (
                <Badge variant="outline">{String(summary.duplicatesRemoved)} duplicatas removidas</Badge>
              )}
              <Badge variant="outline">Whitelist: ✓</Badge>
            </div>
          )}

          {semanticScore?.details && (
            <div className="rounded border p-2 bg-muted/30 text-xs space-y-1">
              <p className="font-semibold text-foreground">Semantic Score Details:</p>
              {(semanticScore.details as string[]).map((d: string, i: number) => (
                <p key={i} className={`text-muted-foreground ${d.startsWith("⚠️") || d.startsWith("MISSING") ? "text-destructive font-medium" : ""}`}>
                  {d}
                </p>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded border border-destructive/30 p-2 bg-destructive/5 text-xs space-y-1">
              <p className="font-semibold text-destructive">⚠ Warnings ({warnings.length}):</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-muted-foreground">
                  <span className="font-mono">{w.path}</span>: {w.message}
                </p>
              ))}
            </div>
          )}

          <ScrollArea className="flex-1 rounded border bg-muted p-3 max-h-[40vh]">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
              {JSON.stringify(payloadData?.payload, null, 2)}
            </pre>
          </ScrollArea>

          {summary?.techSpecsExtracted && Object.keys(summary.techSpecsExtracted as object).length > 0 && (
            <div className="rounded border p-3 bg-muted/50">
              <p className="text-xs font-semibold mb-1 text-foreground">
                Specs técnicos extraídos (description enrichment only — NOT claims):
              </p>
              <pre className="text-xs font-mono text-muted-foreground">
                {JSON.stringify(summary.techSpecsExtracted, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
