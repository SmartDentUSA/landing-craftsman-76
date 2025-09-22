import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  priority = false,
  onLoad,
  onError,
  fallbackSrc = '/placeholder.svg',
  placeholder = 'blur',
  blurDataURL,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (priority) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Gerar blur placeholder se não fornecido
  const defaultBlurDataURL = blurDataURL || 
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJoc2woMjIwIDEzJSA5MSUpIi8+Cjwvc3ZnPgo=';

  return (
    <div 
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        className
      )}
      style={{ width, height }}
    >
      {/* Placeholder blur durante carregamento */}
      {placeholder === 'blur' && !isLoaded && (
        <img
          src={defaultBlurDataURL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
          aria-hidden="true"
        />
      )}

      {/* Skeleton placeholder */}
      {!isLoaded && placeholder === 'empty' && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Imagem principal */}
      {isInView && (
        <img
          src={hasError ? fallbackSrc : src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Status indicator para debug */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 right-1 text-xs bg-black/50 text-white px-1 rounded">
          {hasError ? '❌' : isLoaded ? '✅' : '⏳'}
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;