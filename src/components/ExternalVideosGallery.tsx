import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useExternalVideos } from '@/hooks/useExternalVideos';
import { generateVideoSchema, generateOpenGraphTags, generateTwitterCardTags } from '@/lib/external-video-schema';
import type { ExternalVideo } from '@/types/external-videos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Play, ChevronDown, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type FilterType = 'all' | 'products' | 'resins';

// Normaliza URLs do YouTube para formato de embed correto
function normalizeYouTubeEmbedUrl(url: string): { embedUrl: string; videoId: string | null; watchUrl: string | null } {
  if (!url) return { embedUrl: url, videoId: null, watchUrl: null };
  
  let videoId: string | null = null;
  
  // youtube.com/embed/VIDEO_ID ou youtube-nocookie.com/embed/VIDEO_ID
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    videoId = url.split('/embed/')[1]?.split('?')[0]?.split('&')[0] || null;
  }
  // youtube.com/watch?v=VIDEO_ID
  else if (url.includes('youtube.com/watch')) {
    try {
      videoId = new URL(url).searchParams.get('v');
    } catch { videoId = null; }
  }
  // youtu.be/VIDEO_ID
  else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0] || null;
  }
  // youtube.com/shorts/VIDEO_ID
  else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('/shorts/')[1]?.split('?')[0]?.split('&')[0] || null;
  }
  
  if (videoId) {
    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }
  
  return { embedUrl: url, videoId: null, watchUrl: null };
}

export function ExternalVideosGallery() {
  const { data: videos, isLoading, error, refetch } = useExternalVideos();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<ExternalVideo | null>(null);

  const filteredVideos = videos?.filter((video) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'products' && video.produto) ||
      (filter === 'resins' && video.resina_vinculada);

    const matchesSearch =
      search === '' ||
      video.video.titulo.toLowerCase().includes(search.toLowerCase()) ||
      video.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())) ||
      video.produto?.nome.toLowerCase().includes(search.toLowerCase()) ||
      video.resina_vinculada?.nome.toLowerCase().includes(search.toLowerCase()) ||
      video.artigo_vinculado?.titulo?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: videos?.length || 0,
    products: videos?.filter((v) => v.produto).length || 0,
    resins: videos?.filter((v) => v.resina_vinculada).length || 0,
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao Carregar Vídeos</CardTitle>
          <CardDescription>
            Não foi possível conectar ao Sistema B. Verifique sua conexão e tente novamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Vídeos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vídeos de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.products}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vídeos de Resinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.resins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, tags, produto, resina ou artigo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filter === 'products' ? 'default' : 'outline'}
                onClick={() => setFilter('products')}
                size="sm"
              >
                📦 Produtos
              </Button>
              <Button
                variant={filter === 'resins' ? 'default' : 'outline'}
                onClick={() => setFilter('resins')}
                size="sm"
              >
                🧪 Resinas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Vídeos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredVideos && filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video, index) => (
            <Card
              key={`${video.pandavideo_id || index}`}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative">
                <img
                  src={video.video.thumbnail}
                  alt={video.video.titulo}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-t-lg group-hover:bg-black/50 transition-colors">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg line-clamp-2">{video.video.titulo}</CardTitle>
                <CardDescription className="line-clamp-2">{video.video.descricao}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {video.produto && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      📦 Produto
                    </Badge>
                  )}
                  {video.resina_vinculada && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      🧪 Resina
                    </Badge>
                  )}
                  {video.artigo_vinculado && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      📝 Artigo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum vídeo encontrado com os filtros aplicados.
          </CardContent>
        </Card>
      )}

      {/* Modal do Player */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        {selectedVideo && (
          <>
            <Helmet>
              <script type="application/ld+json">{JSON.stringify(generateVideoSchema(selectedVideo))}</script>
              {Object.entries(generateOpenGraphTags(selectedVideo)).map(([property, content]) => (
                <meta key={property} property={property} content={content} />
              ))}
              {Object.entries(generateTwitterCardTags(selectedVideo)).map(([name, content]) => (
                <meta key={name} name={name} content={content} />
              ))}
            </Helmet>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedVideo.video.titulo}</DialogTitle>
              </DialogHeader>

              {/* Player */}
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
                {selectedVideo.video.hls_url ? (
                  <video controls className="w-full h-full">
                    <source src={selectedVideo.video.hls_url} type="application/x-mpegURL" />
                    {selectedVideo.legendas.map((legenda) => (
                      <track
                        key={legenda.srclang}
                        kind="subtitles"
                        srcLang={legenda.srclang}
                        label={legenda.label}
                        src={legenda.src}
                      />
                    ))}
                    Seu navegador não suporta vídeos HTML5.
                  </video>
                ) : (() => {
                  const { embedUrl, watchUrl } = normalizeYouTubeEmbedUrl(selectedVideo.video.embed_url);
                  return (
                    <>
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedVideo.video.titulo}
                      />
                      {watchUrl && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-center">
                          <a 
                            href={watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1"
                          >
                            Problema com o player? Assistir no YouTube
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Descrição */}
              <div>
                <p className="text-sm text-muted-foreground">{selectedVideo.video.descricao}</p>
              </div>

              {/* Tags */}
              {selectedVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Cross-links */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">🔗 Conteúdo Relacionado</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedVideo.produto && (
                    <Link
                      to={selectedVideo.produto.url_pagina}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      onClick={() => setSelectedVideo(null)}
                    >
                      📦 {selectedVideo.produto.nome}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {selectedVideo.resina_vinculada && (
                    <Link
                      to={selectedVideo.resina_vinculada.url_pagina}
                      className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 hover:underline"
                      onClick={() => setSelectedVideo(null)}
                    >
                      🧪 {selectedVideo.resina_vinculada.nome}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {selectedVideo.artigo_vinculado && (
                    <Link
                      to={selectedVideo.artigo_vinculado.url_pagina}
                      className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 hover:underline"
                      onClick={() => setSelectedVideo(null)}
                    >
                      📝 {selectedVideo.artigo_vinculado.titulo || 'Ler Artigo'}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Transcrição */}
              {selectedVideo.video.transcricao && (
                <Collapsible className="border-t pt-4">
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-semibold hover:text-primary transition-colors">
                    <ChevronDown className="h-4 w-4" />
                    📄 Transcrição do Vídeo
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {selectedVideo.video.transcricao}
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Analytics (se disponível) */}
              {selectedVideo.analytics && (
                <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
                  {selectedVideo.analytics.views !== undefined && (
                    <div>
                      <div className="text-2xl font-bold">{selectedVideo.analytics.views.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Visualizações</div>
                    </div>
                  )}
                  {selectedVideo.analytics.watch_time_seconds !== undefined && (
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(selectedVideo.analytics.watch_time_seconds / 60)}m
                      </div>
                      <div className="text-xs text-muted-foreground">Tempo Assistido</div>
                    </div>
                  )}
                  {selectedVideo.analytics.completion_rate !== undefined && (
                    <div>
                      <div className="text-2xl font-bold">{selectedVideo.analytics.completion_rate}%</div>
                      <div className="text-xs text-muted-foreground">Taxa de Conclusão</div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
