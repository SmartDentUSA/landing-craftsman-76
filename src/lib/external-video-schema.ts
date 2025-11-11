import type { ExternalVideo } from '@/types/external-videos';

export function generateVideoSchema(video: ExternalVideo) {
  const minutes = Math.floor(video.video.duracao_segundos / 60);
  const seconds = video.video.duracao_segundos % 60;

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.video.titulo,
    description: video.video.descricao,
    thumbnailUrl: video.video.thumbnail,
    uploadDate: video.criado_em,
    duration: `PT${minutes}M${seconds}S`,
    contentUrl: video.video.embed_url,
    embedUrl: video.video.embed_url,
    transcript: video.video.transcricao,
    inLanguage: 'pt-BR',
  };

  // Adicionar legendas se disponíveis
  if (video.legendas && video.legendas.length > 0) {
    schema.caption = video.legendas.map((leg) => ({
      '@type': 'AudioObject',
      inLanguage: leg.srclang,
      name: leg.label,
      encodingFormat: 'text/vtt',
      contentUrl: leg.src,
    }));
  }

  return schema;
}

export function generateOpenGraphTags(video: ExternalVideo) {
  return {
    'og:type': 'video.other',
    'og:video': video.video.embed_url,
    'og:video:secure_url': video.video.embed_url,
    'og:video:type': 'text/html',
    'og:video:width': '1280',
    'og:video:height': '720',
    'og:image': video.video.thumbnail,
    'og:title': video.video.titulo,
    'og:description': video.video.descricao,
  };
}

export function generateTwitterCardTags(video: ExternalVideo) {
  return {
    'twitter:card': 'player',
    'twitter:player': video.video.embed_url,
    'twitter:player:width': '1280',
    'twitter:player:height': '720',
    'twitter:title': video.video.titulo,
    'twitter:description': video.video.descricao,
    'twitter:image': video.video.thumbnail,
  };
}
