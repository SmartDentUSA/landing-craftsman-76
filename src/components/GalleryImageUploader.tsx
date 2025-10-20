import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, GripVertical, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface GalleryImage {
  url: string;
  alt: string;
  order: number;
  is_main: boolean;
  supabase_path?: string;
}

interface GalleryImageUploaderProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  maxImages?: number;
}

export const GalleryImageUploader = ({ 
  images, 
  onChange, 
  maxImages = 10 
}: GalleryImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadToSupabase = async (file: File): Promise<{ url: string; path: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `gallery/${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return { url: publicUrl, path: fileName };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast({
        title: "Limite excedido",
        description: `Máximo de ${maxImages} imagens na galeria`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é uma imagem`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede 10MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(file => uploadToSupabase(file));
      const results = await Promise.all(uploadPromises);

      const newImages: GalleryImage[] = results.map((result, index) => ({
        url: result.url,
        alt: validFiles[index].name.replace(/\.[^/.]+$/, ""),
        order: images.length + index,
        is_main: images.length === 0 && index === 0,
        supabase_path: result.path
      }));

      onChange([...images, ...newImages]);

      toast({
        title: "Upload concluído",
        description: `${validFiles.length} imagem(ns) adicionada(s)`,
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, order: i }));
    onChange(updatedImages);
  };

  const handleSetMain = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    onChange(updatedImages);
  };

  const handleUpdateAlt = (index: number, alt: string) => {
    const updatedImages = [...images];
    updatedImages[index] = { ...updatedImages[index], alt };
    onChange(updatedImages);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedImages = items.map((img, index) => ({
      ...img,
      order: index
    }));

    onChange(updatedImages);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Galeria de Imagens ({images.length}/{maxImages})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('gallery-upload')?.click()}
          disabled={isUploading || images.length >= maxImages}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Adicionar Imagens
            </>
          )}
        </Button>
      </div>

      <input
        id="gallery-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {images.length === 0 ? (
        <Card 
          className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => document.getElementById('gallery-upload')?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Clique para adicionar imagens</p>
            <p className="text-xs text-muted-foreground mt-1">
              Máx: {maxImages} imagens, 10MB cada
            </p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="gallery">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {images.map((image, index) => (
                  <Draggable key={index} draggableId={`image-${index}`} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="overflow-hidden"
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="flex items-center cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={image.url}
                                alt={image.alt}
                                className="w-full h-full object-cover"
                              />
                              {image.is_main && (
                                <div className="absolute top-1 right-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Texto alternativo"
                                value={image.alt}
                                onChange={(e) => handleUpdateAlt(index, e.target.value)}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                {!image.is_main && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetMain(index)}
                                    className="text-xs"
                                  >
                                    <Star className="h-3 w-3 mr-1" />
                                    Marcar Principal
                                  </Button>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveImage(index)}
                              className="flex-shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};
