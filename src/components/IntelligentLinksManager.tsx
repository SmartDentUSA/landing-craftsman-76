import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Link, Edit, Trash2, Plus, ExternalLink, Eye } from "lucide-react";
import { toast } from "sonner";

interface IntelligentLink {
  keyword: string;
  url: string;
  occurrences: number;
}

interface IntelligentLinksManagerProps {
  blogContent: string;
  existingLinks: Record<string, string>;
  onLinksChange: (links: Record<string, string>) => void;
  blogType: 'commercial' | 'technical';
  productName: string;
}

export function IntelligentLinksManager({
  blogContent,
  existingLinks,
  onLinksChange,
  blogType,
  productName
}: IntelligentLinksManagerProps) {
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>(existingLinks);
  const [newKeyword, setNewKeyword] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const analyzeLinks = (): IntelligentLink[] => {
    const links: IntelligentLink[] = [];
    
    Object.entries(editingLinks).forEach(([keyword, url]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = blogContent.match(regex);
      const occurrences = matches ? matches.length : 0;
      
      if (occurrences > 0) {
        links.push({ keyword, url, occurrences });
      }
    });
    
    return links.sort((a, b) => b.occurrences - a.occurrences);
  };

  const generatePreviewContent = (): string => {
    let previewContent = blogContent;
    const sortedKeywords = Object.keys(editingLinks).sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(keyword => {
      const url = editingLinks[keyword];
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      previewContent = previewContent.replace(regex, `**[${keyword}](${url})**`);
    });
    
    return previewContent;
  };

  const addNewLink = () => {
    if (!newKeyword.trim() || !newUrl.trim()) {
      toast.error("Preencha palavra-chave e URL");
      return;
    }
    
    const keyword = newKeyword.trim().toLowerCase();
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    
    if (!regex.test(blogContent)) {
      toast.error("Palavra-chave não encontrada no conteúdo do blog");
      return;
    }
    
    setEditingLinks(prev => ({
      ...prev,
      [keyword]: newUrl.trim()
    }));
    
    setNewKeyword("");
    setNewUrl("");
    toast.success("Link adicionado com sucesso");
  };

  const removeLink = (keyword: string) => {
    setEditingLinks(prev => {
      const newLinks = { ...prev };
      delete newLinks[keyword];
      return newLinks;
    });
    toast.success("Link removido");
  };

  const updateLink = (keyword: string, newUrl: string) => {
    setEditingLinks(prev => ({
      ...prev,
      [keyword]: newUrl
    }));
  };

  const saveChanges = () => {
    onLinksChange(editingLinks);
    toast.success("Links inteligentes atualizados");
  };

  const resetChanges = () => {
    setEditingLinks(existingLinks);
    toast.info("Alterações descartadas");
  };

  const analyzedLinks = analyzeLinks();

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Link className="h-4 w-4" />
            Links Inteligentes - Blog {blogType === 'commercial' ? 'Comercial' : 'Técnico'}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {analyzedLinks.length} link{analyzedLinks.length !== 1 ? 's' : ''}
            </Badge>
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Preview - {productName} - Blog {blogType === 'commercial' ? 'Comercial' : 'Técnico'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div 
                    className="prose prose-sm max-w-none p-4"
                    dangerouslySetInnerHTML={{ 
                      __html: generatePreviewContent()
                        .replace(/#{1,6}\s/g, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener">$1</a>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/^/, '<p>')
                        .replace(/$/, '</p>')
                    }}
                  />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Lista de Links Existentes */}
        {analyzedLinks.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Links Aplicados</h4>
            {analyzedLinks.map((link) => (
              <div key={link.keyword} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="secondary" className="text-xs">
                    {link.occurrences}x
                  </Badge>
                  <span className="text-sm font-medium">{link.keyword}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {link.url}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Link</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Palavra-chave</label>
                          <Input value={link.keyword} disabled />
                        </div>
                        <div>
                          <label className="text-sm font-medium">URL</label>
                          <Input
                            value={editingLinks[link.keyword]}
                            onChange={(e) => updateLink(link.keyword, e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <Button onClick={() => setShowPreview(false)} className="w-full">
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(link.keyword)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum link inteligente configurado
          </div>
        )}

        <Separator />

        {/* Adicionar Novo Link */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Adicionar Novo Link</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Palavra-chave"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
            />
            <Input
              placeholder="URL (https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          </div>
          <Button onClick={addNewLink} size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Link
          </Button>
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex gap-2">
          <Button onClick={saveChanges} size="sm" className="flex-1">
            Salvar Alterações
          </Button>
          <Button onClick={resetChanges} variant="outline" size="sm">
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}