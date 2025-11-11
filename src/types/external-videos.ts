export interface ExternalVideo {
  video: {
    titulo: string;
    descricao: string;
    embed_url: string;
    thumbnail: string;
    duracao_segundos: number;
    transcricao: string;
    hls_url?: string;
    preview_url?: string;
  };
  legendas: Array<{
    srclang: string;
    label: string;
    src: string;
  }>;
  audios?: Array<{
    language: string;
    label: string;
  }>;
  produto?: {
    nome: string;
    url_pagina: string;
    slug?: string;
  };
  resina_vinculada?: {
    nome: string;
    url_pagina: string;
    slug?: string;
  };
  artigo_vinculado?: {
    titulo?: string;
    url_pagina: string;
    slug?: string;
  };
  tags: string[];
  criado_em: string;
  pandavideo_id?: string;
  analytics?: {
    views?: number;
    watch_time_seconds?: number;
    completion_rate?: number;
  };
}

export interface ExternalVideosResponse {
  data: {
    videos_produtos: ExternalVideo[];
    videos_resinas: ExternalVideo[];
  };
}
