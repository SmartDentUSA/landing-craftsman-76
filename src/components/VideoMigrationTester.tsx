import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, Play, TestTube } from "lucide-react";

export function VideoMigrationTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [testingCaption, setTestingCaption] = useState(false);

  const runMigration = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-video-data', {
        body: {}
      });

      if (error) throw error;

      setResults(data);
      toast.success(`Migração concluída! ${data.productsUpdated} produtos atualizados.`);
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Erro na migração: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const testCaptionExtraction = async () => {
    setTestingCaption(true);
    
    try {
      // First, get a product with YouTube videos
      const { data: products, error: queryError } = await supabase
        .from('products_repository')
        .select('id, name, youtube_videos')
        .not('youtube_videos', 'is', null)
        .limit(1);

      if (queryError) throw queryError;

      if (!products || products.length === 0) {
        toast.error('Nenhum produto com vídeos YouTube encontrado. Execute a migração primeiro.');
        return;
      }

      const product = products[0];
      const youtubeVideos = product.youtube_videos as any[];
      
      if (!youtubeVideos || youtubeVideos.length === 0) {
        toast.error('Produto encontrado não tem vídeos YouTube válidos.');
        return;
      }

      // Test caption extraction
      const { data, error } = await supabase.functions.invoke('extract-youtube-captions', {
        body: {
          productId: product.id,
          videoType: 'youtube_videos'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Legendas extraídas com sucesso! ${data.extracted} vídeos processados.`);
      } else {
        toast.error('Falha na extração: ' + data.error);
      }
    } catch (error) {
      console.error('Caption extraction test error:', error);
      toast.error('Erro no teste de extração: ' + error.message);
    } finally {
      setTestingCaption(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Migração e Teste de Vídeos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runMigration} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isRunning ? 'Executando...' : 'Executar Migração'}
          </Button>

          <Button 
            onClick={testCaptionExtraction} 
            disabled={testingCaption}
            variant="outline"
            className="flex items-center gap-2"
          >
            {testingCaption ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {testingCaption ? 'Testando...' : 'Testar Extração'}
          </Button>
        </div>

        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {results.totalProductsChecked} produtos verificados
              </Badge>
              <Badge variant="secondary">
                {results.productsUpdated} atualizados
              </Badge>
            </div>

            {results.results && results.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Resultados da Migração:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {results.results.map((result: any, index: number) => (
                    <div key={index} className="text-xs p-2 border rounded">
                      <div className="font-medium">{result.productName}</div>
                      {result.success ? (
                        <div className="text-green-600">
                          ✓ YouTube: +{result.youtubeVideosAdded || 0}, 
                          Instagram: +{result.instagramVideosAdded || 0}
                        </div>
                      ) : (
                        <div className="text-red-600">✗ {result.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}