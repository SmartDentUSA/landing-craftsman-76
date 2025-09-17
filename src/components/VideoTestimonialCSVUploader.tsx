import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trash2, Upload, CheckCircle, Youtube, Instagram } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ParsedTestimonial {
  id: string;
  testimonial_text: string;
  youtube_url?: string;
  instagram_url?: string;
  approved: boolean;
}

interface VideoTestimonialCSVUploaderProps {
  landingPageId: string;
  onTestimonialsUpdate: () => void;
}

export const VideoTestimonialCSVUploader: React.FC<VideoTestimonialCSVUploaderProps> = ({
  landingPageId,
  onTestimonialsUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [previewData, setPreviewData] = useState<ParsedTestimonial[]>([]);
  const { toast } = useToast();


  const parseCSV = (csvText: string): ParsedTestimonial[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    const parsedTestimonials: ParsedTestimonial[] = [];
    
    // Skip header line if exists
    const startIndex = lines[0]?.toLowerCase().includes('transcrição') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length >= 1) {
        const testimonialText = parts[0]?.trim();
        const youtubeUrl = parts[1]?.trim() || '';
        const instagramUrl = parts[2]?.trim() || '';
        
        if (testimonialText) {
          parsedTestimonials.push({
            id: `video_${Date.now()}_${i}`,
            testimonial_text: testimonialText,
            youtube_url: youtubeUrl,
            instagram_url: instagramUrl,
            approved: true
          });
        }
      }
    }
    
    return parsedTestimonials;
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "❌ Formato inválido",
        description: "Por favor, selecione um arquivo CSV",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      const parsedTestimonials = parseCSV(text);
      
      if (parsedTestimonials.length === 0) {
        toast({
          title: "❌ Nenhum depoimento encontrado",
          description: "Verifique o formato do arquivo CSV",
          variant: "destructive"
        });
        return;
      }

      setPreviewData(parsedTestimonials);
      setTotalCount(parsedTestimonials.length);
      
      toast({
        title: "📄 Arquivo processado",
        description: `${parsedTestimonials.length} depoimentos extraídos e prontos para importação`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao processar arquivo",
        description: "Verifique o formato do arquivo CSV",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const importTestimonials = async () => {
    if (previewData.length === 0) return;

    setIsProcessing(true);
    setProcessedCount(0);

    try {
      for (let i = 0; i < previewData.length; i++) {
        const testimonial = previewData[i];
        
        // Salvar no banco (simplificado - sem processamento AI)
        const testimonialData = {
          client_name: `Depoimento Vídeo #${i + 1}`,
          testimonial_text: testimonial.testimonial_text,
          youtube_url: testimonial.youtube_url,
          instagram_url: testimonial.instagram_url,
          landing_page_id: landingPageId,
          approved: true,
          display_order: i + 1
        };

        const { error } = await supabase
          .from('video_testimonials')
          .insert([testimonialData]);

        if (error) throw error;

        setProcessedCount(i + 1);
      }

      toast({
        title: "✅ Importação concluída!",
        description: `${previewData.length} depoimentos importados com sucesso`,
      });
      
      setPreviewData([]);
      onTestimonialsUpdate();
    } catch (error) {
      console.error('Error importing testimonials:', error);
      toast({
        title: "❌ Erro na importação",
        description: "Falha ao importar alguns depoimentos",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessedCount(0);
      setTotalCount(0);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            📥 Importação em Lote de Depoimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-upload">Upload do Arquivo CSV</Label>
            <div className="mt-1">
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading || isProcessing}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Formato: Transcrição;URL_YouTube;URL_Instagram
              <br />
              <a 
                href="/template-testimonials.csv" 
                download 
                className="text-blue-600 hover:underline"
              >
                📄 Baixar modelo CSV para depoimentos
              </a>
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando depoimentos...</span>
                <span>{processedCount}/{totalCount}</span>
              </div>
              <Progress value={(processedCount / totalCount) * 100} />
            </div>
          )}

          {previewData.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Depoimentos Extraídos</h4>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {previewData.length} encontrados
                  </Badge>
                  <Button onClick={importTestimonials} disabled={isProcessing}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Importar Agora
                  </Button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {previewData.slice(0, 5).map((testimonial, index) => (
                  <div key={testimonial.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Depoimento Vídeo #{index + 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                          {testimonial.testimonial_text.substring(0, 150)}...
                        </p>
                        <div className="flex gap-2 mt-2">
                          {testimonial.youtube_url && (
                            <Badge variant="secondary" className="text-xs">
                              <Youtube className="h-3 w-3 mr-1 text-red-500" />
                              YouTube
                            </Badge>
                          )}
                          {testimonial.instagram_url && (
                            <Badge variant="secondary" className="text-xs">
                              <Instagram className="h-3 w-3 mr-1 text-pink-500" />
                              Instagram
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {previewData.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    ... e mais {previewData.length - 5} depoimentos
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewData([])}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar Preview
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};