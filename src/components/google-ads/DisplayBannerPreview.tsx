import { useRef, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Maximize2 } from 'lucide-react';
import { DisplayBanner } from '@/types/google-ads';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface DisplayBannerPreviewProps {
  banner: DisplayBanner;
  onDownload: (banner: DisplayBanner) => void;
}

function BannerIframe({ html, width, height, scale }: { html: string; width: number; height: number; scale: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      scrolling="no"
      style={{
        width,
        height,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        border: 'none',
      }}
      title={`Banner ${width}x${height}`}
    />
  );
}

export function DisplayBannerPreview({ banner, onDownload }: DisplayBannerPreviewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const { format, html, sizeKB } = banner;
  const scale = Math.min(280 / format.width, 200 / format.height, 1);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {format.width}×{format.height}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{format.name}</span>
            <Badge variant={sizeKB > 150 ? 'destructive' : 'outline'} className="text-[10px]">
              {sizeKB.toFixed(1)}KB
            </Badge>
          </div>
          <div
            className="mx-auto bg-muted/50 rounded border flex items-center justify-center overflow-hidden"
            style={{ width: format.width * scale + 4, height: format.height * scale + 4 }}
          >
            <BannerIframe html={html} width={format.width} height={format.height} scale={scale} />
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-3 w-3 mr-1" /> Ampliar
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={() => onDownload(banner)}>
              <Download className="h-3 w-3 mr-1" /> HTML
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-fit max-h-[90vh] overflow-auto">
          <DialogTitle>{format.name} — {format.width}×{format.height}</DialogTitle>
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{ width: format.width + 4, height: format.height + 4 }}
          >
            <BannerIframe html={html} width={format.width} height={format.height} scale={1} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
