import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link, Loader2, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileNameToAlt } from "@/lib/seo-image-helpers";

interface ImageData {
  mode: 'url' | 'supabase';
  src: string;
  supabase_path?: string;
  alt: string;
  scale: number;
  href?: string;
}

interface ImageUploaderProps {
  value: ImageData | string;
  onChange: (value: ImageData) => void;
  placeholder?: string;
  className?: string;
  proportionInfo?: string;
}

export const ImageUploader = ({ 
  value, 
  onChange, 
  placeholder = "URL da imagem",
  className,
  proportionInfo
}: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const normalizedValue: ImageData = typeof value === 'string' 
    ? { mode: 'url', src: value, alt: '', scale: 1.0 }
    : value || { mode: 'url', src: '', alt: '', scale: 1.0 };

  const finalSrc = normalizedValue.src;

  const updateImageData = (updates: Partial<ImageData>) => {
    onChange({ ...normalizedValue, ...updates });
  };

  const uploadToSupabase = async (file: File) => {
    try {
      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Extrair alt text do nome do arquivo original
      const autoAlt = sanitizeFileNameToAlt(file.name);
      
      console.log('📸 Auto-alt text gerado:', autoAlt);

      updateImageData({
        mode: 'supabase',
        src: publicUrl,
        supabase_path: filePath,
        alt: autoAlt,
        scale: normalizedValue.scale,
        href: normalizedValue.href
      });

      toast({
        title: "Upload concluído",
        description: `Imagem enviada. Alt text: "${autoAlt}"`,
      });

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload Supabase:', error);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSupabaseFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, WEBP, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 10MB",
        variant: "destructive",
      });
      return;
    }

    await uploadToSupabase(file);
  };

  const handleRemoveImage = () => {
    updateImageData({
      mode: 'url',
      src: '',
      supabase_path: undefined,
      alt: '',
      scale: 1.0,
      href: undefined
    });
  };

  return (
    <div className={className}>
      {proportionInfo && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">📐 Proporções Recomendadas:</p>
          <p className="text-xs text-blue-700 mt-1">{proportionInfo}</p>
        </div>
      )}
      
      <Tabs value={normalizedValue.mode} onValueChange={(value) => {
        updateImageData({ mode: value as 'url' | 'supabase' });
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url">URL Externa</TabsTrigger>
          <TabsTrigger value="supabase">Supabase Upload</TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div>
            <Label className="text-sm font-medium">URL da Imagem</Label>
            <Input
              placeholder={placeholder}
              value={normalizedValue.mode === 'url' ? normalizedValue.src : ''}
              onChange={(e) => updateImageData({ src: e.target.value, supabase_path: undefined })}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="supabase" className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSupabaseFileSelect}
            className="hidden"
          />

          {!normalizedValue.src ? (
            <Card 
              className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center py-8">
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Enviando para Supabase Storage...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para fazer upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Máx: 10MB</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Upload concluído</p>
                        <p className="text-xs text-muted-foreground">
                          {normalizedValue.supabase_path || 'Imagem do Supabase'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {finalSrc && (
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-sm font-medium">Texto Alternativo *</Label>
            <Input
              placeholder="Descrição da imagem (obrigatório)"
              value={normalizedValue.alt}
              onChange={(e) => updateImageData({ alt: e.target.value })}
              className={!normalizedValue.alt ? "border-red-300" : ""}
            />
            {!normalizedValue.alt && (
              <p className="text-xs text-red-500 mt-1">Texto alternativo é obrigatório para acessibilidade</p>
            )}
          </div>
          
          <div>
            <Label className="text-sm font-medium">Escala ({normalizedValue.scale?.toFixed(1) || '1.0'})</Label>
            <Input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={normalizedValue.scale || 1.0}
              onChange={(e) => updateImageData({ scale: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">URL de Direcionamento (opcional)</Label>
            <Input
              placeholder="https://exemplo.com (deixe em branco se não quiser link)"
              value={normalizedValue.href || ''}
              onChange={(e) => updateImageData({ href: e.target.value })}
              type="url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Quando preenchido, a imagem se tornará clicável e redirecionará para esta URL
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 p-2 border rounded-lg bg-muted/50">
              {finalSrc && (
                <img 
                  src={finalSrc} 
                  alt={normalizedValue.alt || 'Preview'} 
                  className="max-w-full h-auto max-h-32 rounded"
                  style={{ transform: `scale(${normalizedValue.scale || 1.0})` }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>
            
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">URL Final:</Label>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                {finalSrc || 'Aguardando configuração...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
