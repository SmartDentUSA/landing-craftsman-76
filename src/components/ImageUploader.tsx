import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Link, Loader2, X, Image as ImageIcon, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageData {
  mode: 'url' | 'cloudflare';
  src: string;
  cf_id?: string;
  variant?: 'w-480' | 'w-768' | 'w-1200';
  alt: string;
  scale: number;
}

interface ImageUploaderProps {
  value: ImageData | string; // Suporte a formato antigo e novo
  onChange: (value: ImageData) => void;
  placeholder?: string;
  className?: string;
}

// Variants disponíveis no Cloudflare Images
const CLOUDFLARE_VARIANTS = [
  { value: 'w-480', label: 'Pequena (480px)', description: 'Para mobile e thumbnails' },
  { value: 'w-768', label: 'Média (768px)', description: 'Para tablets e cards' },
  { value: 'w-1200', label: 'Grande (1200px)', description: 'Para desktop e banners' }
] as const;

export const ImageUploader = ({ 
  value, 
  onChange, 
  placeholder = "URL da imagem",
  className 
}: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Normalizar o valor para o novo formato
  const normalizedValue: ImageData = typeof value === 'string' 
    ? { mode: 'url', src: value, alt: '', scale: 1.0 }
    : value || { mode: 'url', src: '', alt: '', scale: 1.0 };

  // Calcular src final baseado no mode
  const finalSrc = normalizedValue.mode === 'cloudflare' && normalizedValue.cf_id 
    ? `https://imagedelivery.net/ACCOUNT_HASH_PLACEHOLDER/${normalizedValue.cf_id}/${normalizedValue.variant || 'w-768'}`
    : normalizedValue.src;

  const updateImageData = (updates: Partial<ImageData>) => {
    const newData = { ...normalizedValue, ...updates };
    
    // Recalcular src se for cloudflare
    if (newData.mode === 'cloudflare' && newData.cf_id) {
      newData.src = `https://imagedelivery.net/ACCOUNT_HASH_PLACEHOLDER/${newData.cf_id}/${newData.variant || 'w-768'}`;
    }
    
    onChange(newData);
  };

  const cloudflareDirectUpload = async (file: File): Promise<{ cf_id: string; uploadURL: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('cloudflare-direct-upload');

      if (error) {
        console.error('Erro na edge function:', error);
        throw new Error(error.message || 'Erro na comunicação com o servidor');
      }

      if (!data?.uploadURL || !data?.id) {
        throw new Error('Dados de upload não retornados pelo servidor');
      }

      return { cf_id: data.id, uploadURL: data.uploadURL };
    } catch (error) {
      console.error('Erro no direct upload:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha ao obter URL de upload');
    }
  };

  const uploadToCloudflare = async (file: File): Promise<string> => {
    const { cf_id, uploadURL } = await cloudflareDirectUpload(file);
    
    // Upload direto para Cloudflare
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(uploadURL, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Cloudflare upload error:', errorText);
      throw new Error('Falha no upload para Cloudflare');
    }

    return cf_id;
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
      const cf_id = await uploadToCloudflare(file);
      
      updateImageData({
        mode: 'cloudflare',
        cf_id,
        variant: 'w-768', // Variant padrão
        alt: normalizedValue.alt || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
      });
      
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
    updateImageData({ 
      src: '', 
      cf_id: undefined, 
      alt: '' 
    });
  };

  return (
    <div className={className}>
      <Tabs value={normalizedValue.mode} onValueChange={(value) => updateImageData({ mode: value as 'url' | 'cloudflare' })}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="cloudflare" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Cloudflare Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-3">
          <div>
            <Label className="text-sm font-medium">URL da Imagem</Label>
            <Input
              placeholder={placeholder}
              value={normalizedValue.mode === 'url' ? normalizedValue.src : ''}
              onChange={(e) => updateImageData({ src: e.target.value, cf_id: undefined })}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="cloudflare" className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Upload para Cloudflare Images</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!normalizedValue.cf_id ? (
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {isUploading ? 'Enviando...' : 'Clique para fazer upload'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, JPEG até 10MB - Upload direto para Cloudflare
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Imagem no Cloudflare</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {normalizedValue.cf_id}
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

                {/* Seleção de Variant */}
                <div>
                  <Label className="text-sm font-medium">Tamanho da Imagem</Label>
                  <Select 
                    value={normalizedValue.variant || 'w-768'} 
                    onValueChange={(variant) => updateImageData({ variant: variant as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOUDFLARE_VARIANTS.map((variant) => (
                        <SelectItem key={variant.value} value={variant.value}>
                          <div>
                            <div className="font-medium">{variant.label}</div>
                            <div className="text-xs text-muted-foreground">{variant.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Campos comuns */}
      {(finalSrc || normalizedValue.cf_id) && (
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
          
          {/* Preview e URL final */}
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
            
            {/* URL final gerada */}
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