import { useState, useRef } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualImageData {
  src: string;
  supabase_path: string;
  alt: string;
  uploaded_at: string | null;
  dimensions?: { width: number; height: number };
}

interface ManualBannerUploaderProps {
  value: ManualImageData | null;
  onChange: (data: ManualImageData | null) => void;
}

export function ManualBannerUploader({ value, onChange }: ManualBannerUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [aspectWarning, setAspectWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateAspectRatio = (width: number, height: number): boolean => {
    const ratio = width / height;
    const target = 16 / 9; // 1.777...
    const tolerance = 0.05;
    
    if (Math.abs(ratio - target) > tolerance) {
      setAspectWarning(
        `⚠️ Proporção atual: ${ratio.toFixed(2)}:1 (Ideal: 1.78:1 para 16:9)`
      );
      return false;
    }
    
    setAspectWarning('');
    return true;
  };

  const uploadToSupabase = async (file: File) => {
    setIsUploading(true);
    try {
      // Validações básicas
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens (JPG, PNG, WEBP)');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Máximo: 10MB');
      }

      // Carregar imagem para validar dimensões
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = URL.createObjectURL(file);
      });

      // Validar aspect ratio (só aviso, não bloqueia)
      validateAspectRatio(img.width, img.height);

      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `spin-hero-${Date.now()}.${fileExt}`;
      const filePath = `spin-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // Atualizar estado
      onChange({
        src: publicUrl,
        supabase_path: filePath,
        alt: `Banner hero - ${file.name}`,
        uploaded_at: new Date().toISOString(),
        dimensions: { width: img.width, height: img.height }
      });

      toast({
        title: "✅ Upload concluído!",
        description: `${img.width}x${img.height}px salvo no Supabase`,
      });

    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadToSupabase(file);
  };

  const handleRemove = () => {
    onChange(null);
    setAspectWarning('');
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!value?.src ? (
        <Card 
          className="border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Enviando para Supabase...</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Clique para fazer upload</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Recomendado: 1920x1080px (16:9) • Máx: 10MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPG, PNG, WEBP
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <div className="relative">
                <img
                  src={value.src}
                  alt={value.alt}
                  className="w-full h-auto rounded-lg"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                />
                <button
                  className="absolute top-2 right-2 bg-destructive text-white p-2 rounded-full hover:bg-destructive/90 transition-colors"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-3 text-xs text-muted-foreground">
                <p>📐 Dimensões: {value.dimensions?.width}x{value.dimensions?.height}px</p>
                <p>📅 Upload: {new Date(value.uploaded_at || '').toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>

          {aspectWarning && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{aspectWarning}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label>Texto Alternativo *</Label>
            <Input
              value={value.alt}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="Descrição do banner para acessibilidade"
            />
          </div>
        </div>
      )}
    </div>
  );
}
