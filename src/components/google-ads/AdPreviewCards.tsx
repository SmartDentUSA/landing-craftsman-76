import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, ExternalLink, Play } from 'lucide-react';
import { AdCopy, Sitelink, VideoExtension } from '@/types/google-ads';

interface AdPreviewCardsProps {
  adCopies: AdCopy;
  finalUrl: string;
  sitelinks: Sitelink[];
  videos?: VideoExtension[];
}

export const AdPreviewCards = ({ adCopies, finalUrl, sitelinks, videos = [] }: AdPreviewCardsProps) => {
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  };

  const AdCard = ({ headline, description, paths }: { headline: string; description: string; paths: string[] }) => (
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
  );

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

          <div className="space-y-3">
            {/* Primary combinations */}
            {adCopies?.headlines?.length > 0 ? (
              adCopies.headlines.slice(0, 3).map((headline, index) => (
                <AdCard
                  key={index}
                  headline={headline}
                  description={adCopies.descriptions?.[index % adCopies.descriptions.length] || ''}
                  paths={adCopies.paths || []}
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
};