import { useState, useEffect } from 'react';

interface ImageMetadata {
  url: string;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  lastChecked: number;
  isValid: boolean;
}

interface ImageCacheStore {
  [url: string]: ImageMetadata;
}

const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 horas
const STORAGE_KEY = 'image_cache_metadata';

export const useImageCache = () => {
  const [cache, setCache] = useState<ImageCacheStore>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Salvar cache no localStorage
  const saveCache = (newCache: ImageCacheStore) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCache));
      setCache(newCache);
    } catch (error) {
      console.warn('Falha ao salvar cache de imagens:', error);
    }
  };

  // Verificar se imagem existe e obter metadados
  const validateImageUrl = async (url: string): Promise<ImageMetadata> => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'force-cache' 
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');

      // Para obter dimensões, precisamos carregar a imagem
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error('Falha ao carregar imagem para dimensões'));
        img.src = url;
      });

      return {
        url,
        width: dimensions.width,
        height: dimensions.height,
        size: contentLength ? parseInt(contentLength) : undefined,
        format: contentType.split('/')[1] || 'unknown',
        lastChecked: Date.now(),
        isValid: true,
      };
    } catch (error) {
      console.warn(`Falha ao validar imagem ${url}:`, error);
      return {
        url,
        lastChecked: Date.now(),
        isValid: false,
      };
    }
  };

  // Verificar se imagem está no cache e é válida
  const getCachedImage = (url: string): ImageMetadata | null => {
    const cached = cache[url];
    if (!cached) return null;

    const isExpired = Date.now() - cached.lastChecked > CACHE_DURATION;
    if (isExpired) {
      // Remove entrada expirada
      const newCache = { ...cache };
      delete newCache[url];
      saveCache(newCache);
      return null;
    }

    return cached;
  };

  // Verificar e cachear imagem
  const checkAndCacheImage = async (url: string): Promise<ImageMetadata> => {
    const cached = getCachedImage(url);
    if (cached) return cached;

    const metadata = await validateImageUrl(url);
    const newCache = { ...cache, [url]: metadata };
    saveCache(newCache);

    return metadata;
  };

  // Verificar múltiplas imagens em lote
  const checkMultipleImages = async (urls: string[]): Promise<ImageMetadata[]> => {
    const promises = urls.map(url => checkAndCacheImage(url));
    return Promise.all(promises);
  };

  // Limpar cache expirado
  const cleanExpiredCache = () => {
    const now = Date.now();
    const newCache: ImageCacheStore = {};

    Object.entries(cache).forEach(([url, metadata]) => {
      if (now - metadata.lastChecked < CACHE_DURATION) {
        newCache[url] = metadata;
      }
    });

    if (Object.keys(newCache).length !== Object.keys(cache).length) {
      saveCache(newCache);
    }
  };

  // Obter estatísticas do cache
  const getCacheStats = () => {
    const total = Object.keys(cache).length;
    const valid = Object.values(cache).filter(m => m.isValid).length;
    const invalid = total - valid;

    return { total, valid, invalid };
  };

  // Limpar todo o cache
  const clearCache = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCache({});
  };

  // Limpar cache expirado a cada 30 minutos
  useEffect(() => {
    const interval = setInterval(cleanExpiredCache, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cache]);

  return {
    checkAndCacheImage,
    checkMultipleImages,
    getCachedImage,
    getCacheStats,
    clearCache,
    cleanExpiredCache,
  };
};

export default useImageCache;