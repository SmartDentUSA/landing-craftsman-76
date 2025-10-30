import { useState, useRef } from 'react';
import { Upload, X, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClientPhotoData {
  src: string;
  supabase_path: string;
  uploaded_at: string;
  alt: string;
}

interface ClientPhotoUploaderProps {
  value: ClientPhotoData | null;
  clientName: string;
  onChange: (data: ClientPhotoData | null) => void;
}

export function ClientPhotoUploader({ value, clientName, onChange }: ClientPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadToSupabase = async (file: File) => {
    setIsUploading(true);
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens (JPG, PNG, WEBP)');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Máximo: 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `client-${Date.now()}.${fileExt}`;
      const filePath = `spin-clients/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onChange({
        src: publicUrl,
        supabase_path: filePath,
        uploaded_at: new Date().toISOString(),
        alt: `Foto de ${clientName}`
      });

      toast({
        title: "✅ Foto salva!",
        description: "Upload concluído com sucesso",
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

  const handleRemove = async () => {
    if (value?.supabase_path) {
      try {
        await supabase.storage
          .from('product-images')
          .remove([value.supabase_path]);
      } catch (error) {
        console.error('Erro ao remover foto:', error);
      }
    }
    onChange(null);
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Avatar className="w-20 h-20 border-2 border-border">
        {value?.src ? (
          <AvatarImage src={value.src} alt={value.alt} />
        ) : (
          <AvatarFallback className="bg-muted">
            <User className="w-10 h-10 text-muted-foreground" />
          </AvatarFallback>
        )}
      </Avatar>

      <div className="flex flex-col gap-2">
        {isUploading ? (
          <Button disabled size="sm" variant="outline">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enviando...
          </Button>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {value ? 'Trocar Foto' : 'Upload Foto'}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Recomendado: 400x400px • Máx: 5MB
        </p>
      </div>
    </div>
  );
}
