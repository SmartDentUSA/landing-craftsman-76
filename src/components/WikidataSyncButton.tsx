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
import { Globe, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { syncProductToWikidata, buildProductWikidataPayload } from "@/services/wikidata-sync";

interface WikidataSyncButtonProps {
  productId?: string;
  wikidataItemId?: string | null;
  onSyncSuccess?: (qid: string) => void;
}

export function WikidataSyncButton({ productId, wikidataItemId, onSyncSuccess }: WikidataSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [localQid, setLocalQid] = useState<string | null>(null);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [payloadData, setPayloadData] = useState<{ payload: unknown; summary: unknown } | null>(null);
  const { toast } = useToast();

  const displayQid = localQid || wikidataItemId;

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
            <a
              href={`https://www.wikidata.org/wiki/${result.wikidataQid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Ver no Wikidata →
            </a>
          ),
        });
      } else {
        toast({
          title: "Erro ao sincronizar Wikidata",
          description: result.error ?? "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro ao sincronizar Wikidata",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
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
        toast({
          title: "Erro ao gerar payload",
          description: result.error ?? "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Erro ao gerar payload",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing || previewing}
          className="gap-1"
          title="Sincronizar produto com Wikidata"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          Wikidata
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePreviewPayload}
          disabled={syncing || previewing}
          className="gap-1"
          title="Preview do payload wbeditentity"
        >
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          Payload
        </Button>
        {displayQid && (
          <a
            href={`https://www.wikidata.org/wiki/${displayQid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge className="bg-success text-success-foreground cursor-pointer">W</Badge>
          </a>
        )}
      </div>

      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Payload wbeditentity — Preview
            </DialogTitle>
            <DialogDescription>
              JSON validado pronto para envio ao Wikidata API. Modo dry-run (nenhuma escrita é realizada).
            </DialogDescription>
          </DialogHeader>

          {payloadData?.summary && (
            <div className="flex flex-wrap gap-2 text-xs">
              {(payloadData.summary as any)?.isValid ? (
                <Badge className="bg-success text-success-foreground">✓ Válido</Badge>
              ) : (
                <Badge variant="destructive">✗ Erros de validação</Badge>
              )}
              <Badge variant="secondary">
                {(payloadData.summary as any)?.claimCount ?? 0} claims
              </Badge>
              {(payloadData.summary as any)?.labels?.length > 0 && (
                <Badge variant="outline">
                  Labels: {(payloadData.summary as any).labels.join(", ")}
                </Badge>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto rounded border bg-muted p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
              {JSON.stringify(payloadData?.payload, null, 2)}
            </pre>
          </div>

          {(payloadData?.summary as any)?.techSpecsExtracted &&
            Object.keys((payloadData.summary as any).techSpecsExtracted).length > 0 && (
              <div className="rounded border p-3 bg-muted/50">
                <p className="text-xs font-semibold mb-1 text-foreground">Specs técnicos extraídos:</p>
                <pre className="text-xs font-mono text-muted-foreground">
                  {JSON.stringify((payloadData.summary as any).techSpecsExtracted, null, 2)}
                </pre>
              </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
