import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trash2, Upload, CheckCircle, Youtube, Instagram, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface ParsedTestimonial {
  id: string;
  testimonial_text: string;
  youtube_url?: string;
  instagram_url?: string;
  approved: boolean;
  client_name?: string;
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

  const downloadTemplate = () => {
    const csvContent = `Transcrição do depoimento;Vídeo youtube;Video instagram;Nome
"Excelente atendimento e qualidade superior!";https://youtube.com/watch?v=exemplo1;;João Silva
"Profissionais muito capacitados e atenciosos";;;Maria Santos
"Superou todas as minhas expectativas";https://youtube.com/watch?v=exemplo2;https://instagram.com/p/exemplo;Pedro Costa`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo-depoimentos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "📥 Modelo baixado",
      description: "Use este arquivo como base para seus depoimentos",
    });
  };


  const parseCSV = (csvText: string): ParsedTestimonial[] => {
    try {
      const parseResult = Papa.parse(csvText, {
        header: false,
        delimiter: ',',
        skipEmptyLines: 'greedy',
        transformHeader: (header: string) => header.toLowerCase(),
        newline: '\n',
        quoteChar: '"',
      });
      
      if (parseResult.errors.length > 0) {
        console.warn('CSV Parse warnings:', parseResult.errors);
      }
      
      const rows = parseResult.data as string[][];
      const parsedTestimonials: ParsedTestimonial[] = [];
      
      // Skip header if it contains keywords
      const startIndex = rows[0]?.[0]?.toLowerCase().includes('transcrição') || 
                        rows[0]?.[0]?.toLowerCase().includes('depoimento') ? 1 : 0;
      
      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const testimonialText = row[0]?.trim();
        const youtubeUrl = row[1]?.trim() || '';
        const instagramUrl = row[2]?.trim() || '';
        const clientName = row[3]?.trim() || `Cliente #${i + 1}`;
        
        if (testimonialText && testimonialText.length > 10) {
          parsedTestimonials.push({
            id: `video_${Date.now()}_${i}`,
            testimonial_text: testimonialText,
            youtube_url: youtubeUrl,
            instagram_url: instagramUrl,
            approved: true,
            client_name: clientName
          });
        }
      }
      
      return parsedTestimonials;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File uploaded:', { name: file.name, type: file.type, size: file.size });

    // Check file format more thoroughly
    const fileName = file.name.toLowerCase();
    const fileType = file.type;
    
    if (!fileName.endsWith('.csv') && fileType !== 'text/csv' && fileType !== 'application/vnd.ms-excel') {
      toast({
        title: "❌ Formato inválido",
        description: `Arquivo ${fileName} não é um CSV válido. Por favor, selecione um arquivo .csv`,
        variant: "destructive"
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const text = await file.text();
      console.log('File content preview:', text.substring(0, 200));
      
      const parsedTestimonials = parseCSV(text);
      console.log('Parsed testimonials:', parsedTestimonials);
      
      if (parsedTestimonials.length === 0) {
        toast({
          title: "❌ Nenhum depoimento encontrado",
          description: "Verifique se o arquivo CSV está no formato correto: Transcrição do depoimento;Vídeo youtube;Video instagram;Nome",
          variant: "destructive"
        });
        return;
      }

      setPreviewData(parsedTestimonials);
      setTotalCount(parsedTestimonials.length);
      
      toast({
        title: "✅ Arquivo processado com sucesso!",
        description: `${parsedTestimonials.length} depoimentos extraídos e prontos para importação`,
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "❌ Erro ao processar arquivo",
        description: `Erro: ${error instanceof Error ? error.message : 'Formato de arquivo inválido'}`,
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
        
        // Salvar no banco com dados do CSV
        const testimonialData = {
          client_name: testimonial.client_name || `Depoimento Vídeo #${i + 1}`,
          testimonial_text: testimonial.testimonial_text,
          youtube_url: testimonial.youtube_url || null,
          instagram_url: testimonial.instagram_url || null,
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
            <div className="text-sm text-muted-foreground mt-1 space-y-2">
              <p>
                <strong>Formato esperado:</strong> Transcrição do depoimento;Vídeo youtube;Video instagram;Nome
              </p>
              <div className="bg-gray-50 p-2 rounded text-xs font-mono">
                Exemplo:<br />
                "Excelente atendimento e qualidade!";https://youtube.com/watch?v=123;https://instagram.com/p/abc;João Silva
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={downloadTemplate}
                className="mt-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Modelo CSV
              </Button>
            </div>
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
                           <span className="font-medium text-sm">
                             {testimonial.client_name || `Depoimento Vídeo #${index + 1}`}
                           </span>
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