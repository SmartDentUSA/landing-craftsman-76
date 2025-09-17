import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ImageDebugPreviewProps {
  src?: string;
  alt: string;
  size?: number; // in px
  className?: string;
  debugLabel?: string;
}

export const ImageDebugPreview: React.FC<ImageDebugPreviewProps> = ({
  src,
  alt,
  size = 48,
  className,
  debugLabel,
}) => {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const handleLoad = () => {
    setStatus("ok");
    console.info("[ImageDebug] loaded", { label: debugLabel, src });
  };

  const handleError = () => {
    setStatus("error");
    console.warn("[ImageDebug] error", { label: debugLabel, src });
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-muted flex-shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label={debugLabel ? `Imagem ${debugLabel}` : "Imagem do produto"}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
          Sem imagem
        </div>
      )}

      {status !== "idle" && (
        <div className="absolute top-1 left-1">
          <Badge variant={status === "ok" ? "secondary" : "destructive"} className="text-[10px] px-1 py-0">
            {status === "ok" ? "OK" : "Erro"}
          </Badge>
        </div>
      )}

      {src && (
        <div className="absolute bottom-1 left-1 right-1 pointer-events-none">
          <div className="text-[10px] px-1 py-0.5 truncate bg-background/70 rounded">
            {src}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDebugPreview;
