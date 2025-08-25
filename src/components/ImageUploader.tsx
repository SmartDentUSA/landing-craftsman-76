import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link, Loader2, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  altValue?: string;
  onAltChange?: (alt: string) => void;
  scaleValue?: number;
  onScaleChange?: (scale: number) => void;
  className?: string;
}

export const ImageUploader = ({ 
  value, 
  onChange, 
  placeholder = "URL da imagem",
  altValue,
  onAltChange,
  scaleValue,
  onScaleChange,
  className 
}: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadToCloudflare = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro no upload');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw new Error('Falha ao fazer upload da imagem');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const url = await uploadToCloudflare(file);
      onChange(url);
      
      // Auto-generate alt text if not provided
      if (onAltChange && (!altValue || altValue.trim() === '')) {
        const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        onAltChange(altText);
      }
      
      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao fazer upload da imagem",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    if (onAltChange) onAltChange('');
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "url" | "upload")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div>
            <Label className="text-sm font-medium">URL da Imagem</Label>
            <Input
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Upload de Imagem</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!value ? (
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {isUploading ? 'Enviando...' : 'Clique para selecionar uma imagem'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG até 10MB
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Imagem carregada</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {value}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Common fields for both tabs */}
      {value && (
        <div className="mt-4 space-y-3">
          {onAltChange && (
            <div>
              <Label className="text-sm font-medium">Texto Alternativo</Label>
              <Input
                placeholder="Descrição da imagem"
                value={altValue || ''}
                onChange={(e) => onAltChange(e.target.value)}
              />
            </div>
          )}
          
          {onScaleChange && (
            <div>
              <Label className="text-sm font-medium">Escala ({scaleValue?.toFixed(1) || '1.0'})</Label>
              <Input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={scaleValue || 1.0}
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          
          {/* Preview */}
          <div>
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 p-2 border rounded-lg bg-muted/50">
              <img 
                src={value} 
                alt={altValue || 'Preview'} 
                className="max-w-full h-auto max-h-32 rounded"
                style={{ transform: `scale(${scaleValue || 1.0})` }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};