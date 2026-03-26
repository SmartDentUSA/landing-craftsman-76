import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { syncProductToWikidata } from "@/services/wikidata-sync";

interface WikidataSyncButtonProps {
  productId?: string;
  wikidataItemId?: string;
}

export function WikidataSyncButton({ productId, wikidataItemId }: WikidataSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  if (!productId) return null;

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncProductToWikidata(productId);
      if (result.success && result.wikidataQid) {
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

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="gap-1"
        title="Sincronizar produto com Wikidata"
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        Wikidata
      </Button>
      {wikidataItemId && (
        <a
          href={`https://www.wikidata.org/wiki/${wikidataItemId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Badge className="bg-success text-success-foreground cursor-pointer">W</Badge>
        </a>
      )}
    </div>
  );
}
