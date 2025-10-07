import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, ExternalLink, Play, AlertTriangle } from 'lucide-react';
import { AdCopy, Sitelink, VideoExtension } from '@/types/google-ads';

interface AdPreviewCardsProps {
  adCopies: AdCopy;
  finalUrl: string;
  sitelinks: Sitelink[];
  videos?: VideoExtension[];
}

// Helper para validar e truncar ad copies
const validateAdCopies = (adCopies: AdCopy): { 
  validated: AdCopy; 
  truncated: boolean 
} => {
  let wasTruncated = false;
  
  const validated: AdCopy = {
    headlines: (adCopies.headlines || []).map(h => {
      if (h.length > 30) {
        wasTruncated = true;
        return h.substring(0, 27) + '...';
      }
      return h;
    }),
    descriptions: (adCopies.descriptions || []).map(d => {
      if (d.length > 90) {
        wasTruncated = true;
        return d.substring(0, 87) + '...';
      }
      return d;
    }),
    paths: (adCopies.paths || []).map(p => {
      if (p.length > 15) {
        wasTruncated = true;
        return p.substring(0, 15);
      }
      return p;
    })
  };
  
  return { validated, truncated: wasTruncated };
};

export const AdPreviewCards = React.memo(({ adCopies, finalUrl, sitelinks, videos = [] }: AdPreviewCardsProps) => {
  // Validar e truncar ad copies
  const { validated: validatedCopies, truncated } = useMemo(
    () => validateAdCopies(adCopies),
    [adCopies]
  );
  const formatUrl = useMemo(() => (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  }, []);

  const AdCard = useMemo(() => ({ headline, description, paths }: { headline: string; description: string; paths: string[] }) => (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="space-y-1">
        <div className="text-blue-600 text-lg font-medium leading-tight">
          {headline}
        </div>
        <div className="text-sm text-gray-600 leading-relaxed">
          {description}
        </div>
        <div className="text-green-600 text-sm">
          {formatUrl(finalUrl)}
          {paths.length > 0 && (
            <span className="text-gray-500">
              {' › '}{paths.join(' › ')}
            </span>
          )}
        </div>
      </div>
    </div>
  ), [finalUrl, formatUrl]);

  return (
    <div className="space-y-6">
      {/* RSA Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Preview dos Anúncios (RSA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">Desktop</Badge>
            <Badge variant="outline">Responsivo</Badge>
          </div>

          {truncated && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Textos truncados</p>
                <p className="text-xs text-amber-700 mt-1">
                  Alguns textos excederam os limites do Google Ads e foram automaticamente truncados:
                  <br />• Headlines: máx. 30 caracteres
                  <br />• Descriptions: máx. 90 caracteres
                  <br />• Paths: máx. 15 caracteres
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary combinations */}
            {validatedCopies?.headlines?.length > 0 ? (
              validatedCopies.headlines.slice(0, 3).map((headline, index) => (
                <AdCard
                  key={index}
                  headline={headline}
                  description={validatedCopies.descriptions?.[index % validatedCopies.descriptions.length] || ''}
                  paths={validatedCopies.paths || []}
                />
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum anúncio disponível para preview
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> O Google testará automaticamente diferentes combinações de headlines e descriptions para otimizar performance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sitelinks Preview */}
      {sitelinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Sitelinks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {sitelinks.slice(0, 6).map((sitelink, index) => (
                <div key={index} className="text-blue-600 text-sm hover:underline cursor-pointer">
                  {sitelink.label}
                </div>
              ))}
            </div>
            {sitelinks.length > 6 && (
              <p className="text-xs text-amber-600 mt-2">
                Apenas os primeiros 6 sitelinks serão usados
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video Extensions Preview */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Extensões de Vídeo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {videos.slice(0, 5).map((video, index) => (
                <div key={index} className="flex items-center gap-3 p-2 border rounded">
                  <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{video.label || 'Vídeo'}</div>
                    <div className="text-xs text-muted-foreground">
                      youtube.com/watch?v={video.youtube_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {videos.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                +{videos.length - 5} vídeos adicionais
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile Preview Hint */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-gray-500" />
            <div>
              <div className="text-sm font-medium">Preview Mobile</div>
              <div className="text-xs text-muted-foreground">
                No mobile, headlines e descriptions podem ser truncados. 
                O Google ajusta automaticamente para o espaço disponível.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});