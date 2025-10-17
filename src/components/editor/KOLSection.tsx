import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useKOLs } from "@/hooks/useKOLs";
import { User, ExternalLink } from "lucide-react";

interface KOLSectionProps {
  selectedKolId?: string;
  onKolChange: (kolId: string | undefined) => void;
}

export function KOLSection({ selectedKolId, onKolChange }: KOLSectionProps) {
  const { kols, loading } = useKOLs(true); // Apenas KOLs aprovados
  
  const selectedKol = kols.find(k => k.id === selectedKolId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Autor do Conteúdo (KOL)
        </CardTitle>
        <CardDescription>
          Selecione o especialista que assinará o blog estratégico desta landing page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Especialista</label>
          <Select
            value={selectedKolId || "none"}
            onValueChange={(value) => onKolChange(value === "none" ? undefined : value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Carregando..." : "Selecionar autor..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem autor</SelectItem>
              {kols.map((kol) => (
                <SelectItem key={kol.id} value={kol.id}>
                  {kol.full_name} {kol.specialty && `- ${kol.specialty}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedKol && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <div className="flex gap-4">
              <Avatar className="h-16 w-16">
                {selectedKol.photo_url ? (
                  <AvatarImage src={selectedKol.photo_url} alt={selectedKol.full_name} />
                ) : (
                  <AvatarFallback>
                    {selectedKol.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-semibold">{selectedKol.full_name}</h4>
                  {selectedKol.specialty && (
                    <Badge variant="secondary" className="mt-1">
                      {selectedKol.specialty}
                    </Badge>
                  )}
                </div>
                
                {selectedKol.mini_cv && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedKol.mini_cv}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedKol.lattes_url && (
                    <a 
                      href={selectedKol.lattes_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Lattes
                    </a>
                  )}
                  {selectedKol.website_url && (
                    <a 
                      href={selectedKol.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                  {selectedKol.instagram_url && (
                    <a 
                      href={selectedKol.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Instagram
                    </a>
                  )}
                  {selectedKol.youtube_url && (
                    <a 
                      href={selectedKol.youtube_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            💡 <strong>Como funciona:</strong> O autor selecionado assinará automaticamente os blogs estratégicos gerados para esta landing page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
