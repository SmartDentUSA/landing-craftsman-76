import { useQuery } from '@tanstack/react-query';
import type { ExternalVideosResponse, ExternalVideo } from '@/types/external-videos';

const EXTERNAL_API_URL = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready&include_product_videos=true&include_resin_videos=true';

async function fetchExternalVideos(): Promise<ExternalVideo[]> {
  const response = await fetch(EXTERNAL_API_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar vídeos: ${response.statusText}`);
  }

  const data: ExternalVideosResponse = await response.json();
  
  // Combinar vídeos de produtos e resinas
  const allVideos = [
    ...(data.data.videos_produtos || []),
    ...(data.data.videos_resinas || []),
  ];

  return allVideos;
}

export function useExternalVideos() {
  return useQuery({
    queryKey: ['external-videos'],
    queryFn: fetchExternalVideos,
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 60 * 60 * 1000, // 1 hora (cacheTime foi renomeado para gcTime no v5)
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
