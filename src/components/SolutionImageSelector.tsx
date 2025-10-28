import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Check } from "lucide-react";
import { useState } from "react";

interface Solution {
  title?: string;
  description?: string;
  image?: {
    src: string;
    alt?: string;
    mode?: 'cloudflare' | 'external';
    cf_id?: string;
    variant?: string;
  };
}

interface SolutionImageSelectorProps {
  open: boolean;
  onClose: () => void;
  solutions: Solution[];
  onImageSelect: (imageMarkdown: string, imageUrl: string) => void;
}

const CLOUDFLARE_ACCOUNT_HASH = "2cfbb18ad5336f0cf09a679e06505ee2";

export function SolutionImageSelector({ 
  open, 
  onClose, 
  solutions, 
  onImageSelect 
}: SolutionImageSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Filtrar apenas soluções com imagens válidas
  const validSolutions = solutions
    .map((solution, index) => ({ solution, originalIndex: index }))
    .filter(({ solution }) => solution.image?.src);

  const getImageUrl = (image: Solution['image']): string => {
    if (!image?.src) return '';
    
    if (image.mode === 'cloudflare' && image.cf_id) {
      return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_HASH}/${image.cf_id}/${image.variant || 'w-768'}`;
    }
    
    return image.src;
  };

  const handleSelectImage = (solution: Solution, index: number) => {
    if (!solution.image?.src) return;
    
    setSelectedIndex(index);
    
    const imageUrl = getImageUrl(solution.image);
    const altText = solution.image.alt || solution.title || `Solução ${index + 1}`;
    
    // Criar markdown da imagem com atributos otimizados
    const imageMarkdown = `![${altText}](${imageUrl})`;
    
    onImageSelect(imageMarkdown, imageUrl);
    
    // Fechar após pequeno delay para feedback visual
    setTimeout(() => {
      onClose();
      setSelectedIndex(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Selecionar Imagem das Soluções
          </DialogTitle>
          <DialogDescription>
            Escolha uma imagem das soluções da landing page para inserir no blog
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {validSolutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhuma solução com imagem encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {validSolutions.map(({ solution, originalIndex }, index) => {
                const imageUrl = getImageUrl(solution.image);
                const isSelected = selectedIndex === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectImage(solution, originalIndex)}
                    className="group relative overflow-hidden rounded-lg border-2 transition-all hover:border-primary hover:shadow-lg"
                    style={{ 
                      borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      backgroundColor: isSelected ? 'hsl(var(--primary) / 0.05)' : 'transparent'
                    }}
                  >
                    {/* Imagem */}
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={solution.image?.alt || solution.title || `Solução ${originalIndex + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    {/* Badge de seleção */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}

                    {/* Título */}
                    {solution.title && (
                      <div className="p-2 bg-background/95 backdrop-blur-sm">
                        <p className="text-xs font-medium line-clamp-2 text-foreground">
                          {solution.title}
                        </p>
                      </div>
                    )}

                    {/* Badge de tipo */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {solution.image?.mode === 'cloudflare' ? 'Cloudflare' : 'Externa'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {validSolutions.length} {validSolutions.length === 1 ? 'imagem disponível' : 'imagens disponíveis'}
          </p>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
