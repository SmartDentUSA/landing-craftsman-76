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
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
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
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
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
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\p{L}\p{N}])${escapedKeyword}(?![\p{L}\p{N}])`, 'giu');
    
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
    <Card className="border border-muted-foreground/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Links Inteligentes
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {analyzedLinks.length} {analyzedLinks.length === 1 ? 'link' : 'links'} aplicado{analyzedLinks.length !== 1 ? 's' : ''}
            </Badge>
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3">
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle className="text-lg">
                    Preview: {productName} - Blog {blogType === 'commercial' ? 'Comercial' : 'Técnico'}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] border rounded-md">
                  <div 
                    className="prose prose-sm max-w-none p-6 bg-background"
                    dangerouslySetInnerHTML={{ 
                      __html: generatePreviewContent()
                        .replace(/#{1,6}\s/g, '')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener">$1 🔗</a>')
                        .replace(/\n\n/g, '</p><p class="mb-4">')
                        .replace(/^/, '<div class="leading-relaxed"><p class="mb-4">')
                        .replace(/$/, '</p></div>')
                    }}
                  />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Blog {blogType === 'commercial' ? 'Comercial' : 'Técnico'} • Gerencie links internos automaticamente
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Lista de Links Existentes */}
        {analyzedLinks.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Links Aplicados</h4>
              <span className="text-xs text-muted-foreground">
                Total: {analyzedLinks.reduce((sum, link) => sum + link.occurrences, 0)} ocorrências
              </span>
            </div>
            <div className="space-y-2">
              {analyzedLinks.map((link) => (
                <div 
                  key={link.keyword} 
                  className="group flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="text-xs font-medium shrink-0 bg-primary/10 text-primary border-primary/20">
                      {link.occurrences}×
                    </Badge>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">
                        {link.keyword}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link.url}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary opacity-70 group-hover:opacity-100 transition-opacity"
                          title="Editar link"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-lg">Editar Link Inteligente</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Palavra-chave</label>
                            <Input 
                              value={link.keyword} 
                              disabled 
                              className="bg-muted/50 text-muted-foreground"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">URL de destino</label>
                            <Input
                              value={editingLinks[link.keyword] || ''}
                              onChange={(e) => updateLink(link.keyword, e.target.value)}
                              placeholder="https://exemplo.com/pagina"
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <DialogTrigger asChild>
                              <Button className="flex-1">
                                <Edit className="h-4 w-4 mr-2" />
                                Salvar Alterações
                              </Button>
                            </DialogTrigger>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                Cancelar
                              </Button>
                            </DialogTrigger>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja remover o link "${link.keyword}"?`)) {
                          removeLink(link.keyword);
                        }
                      }}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                      title="Remover link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-muted-foreground/25 rounded-lg bg-muted/20">
            <Link className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum link inteligente configurado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione palavras-chave para criar links automaticamente
            </p>
          </div>
        )}

        <Separator />

        {/* Adicionar Novo Link */}
        <div className="space-y-4 p-4 border border-dashed border-muted-foreground/25 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Adicionar Novo Link</h4>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Palavra-chave
              </label>
              <Input
                placeholder="Ex: smartdent, implante dentário..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                URL de destino
              </label>
              <Input
                placeholder="https://exemplo.com/pagina"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
            <Button 
              onClick={addNewLink} 
              className="w-full h-9"
              disabled={!newKeyword.trim() || !newUrl.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Link Inteligente
            </Button>
          </div>
        </div>

        {/* Ações Principais */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={saveChanges} 
            className="flex-1 h-10"
            disabled={JSON.stringify(editingLinks) === JSON.stringify(existingLinks)}
          >
            Salvar Alterações
            {JSON.stringify(editingLinks) !== JSON.stringify(existingLinks) && (
              <Badge variant="secondary" className="ml-2 text-xs">
                ●
              </Badge>
            )}
          </Button>
          <Button 
            onClick={resetChanges} 
            variant="outline" 
            className="h-10 px-4"
            disabled={JSON.stringify(editingLinks) === JSON.stringify(existingLinks)}
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}