import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Video {
  url: string;
  description?: string;
  title?: string;
}

interface Tutorial {
  id: string;
  course_name: string;
  course_url: string;
  created_at?: string;
}

interface ProductVideosListProps {
  productId: string | null;
  onInsert: (text: string) => void;
}

export const ProductVideosList: React.FC<ProductVideosListProps> = ({ productId, onInsert }) => {
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);
  const [instagramVideos, setInstagramVideos] = useState<Video[]>([]);
  const [testimonialVideos, setTestimonialVideos] = useState<Video[]>([]);
  const [technicalVideos, setTechnicalVideos] = useState<Video[]>([]);
  const [tiktokVideos, setTiktokVideos] = useState<Video[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [insertCount, setInsertCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchVideos();
    } else {
      clearVideos();
    }
  }, [productId]);

  // Reset counter when product changes
  useEffect(() => {
    setInsertCount(0);
  }, [productId]);

  const clearVideos = () => {
    setYoutubeVideos([]);
    setInstagramVideos([]);
    setTestimonialVideos([]);
    setTechnicalVideos([]);
    setTiktokVideos([]);
    setTutorials([]);
  };

  const fetchVideos = async () => {
    if (!productId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('youtube_videos, instagram_videos, testimonial_videos, technical_videos, tiktok_videos, tutorial_resources')
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (data) {
        setYoutubeVideos((data.youtube_videos as unknown as Video[]) || []);
        setInstagramVideos((data.instagram_videos as unknown as Video[]) || []);
        setTestimonialVideos((data.testimonial_videos as unknown as Video[]) || []);
        setTechnicalVideos((data.technical_videos as unknown as Video[]) || []);
        setTiktokVideos((data.tiktok_videos as unknown as Video[]) || []);
        
        const tutorialData = data.tutorial_resources as any;
        setTutorials((tutorialData?.tutorials as Tutorial[]) || []);
      }
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
      clearVideos();
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertVideo = (url: string, title: string) => {
    const nextNumber = insertCount + 1;
    const formattedText = `\n\n${nextNumber}) ${title}: ${url}\n`;
    onInsert(formattedText);
    setInsertCount(nextNumber);
  };

  const hasYouTube = youtubeVideos.length > 0;
  const hasInstagram = instagramVideos.length > 0;
  const hasTestimonials = testimonialVideos.length > 0;
  const hasTechnical = technicalVideos.length > 0;
  const hasTikTok = tiktokVideos.length > 0;
  const hasTutorials = tutorials.length > 0;

  const hasAnyVideos = hasYouTube || hasInstagram || hasTestimonials || hasTechnical || hasTikTok || hasTutorials;

  if (!productId || (!hasAnyVideos && !isLoading)) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="mt-3">
        <CardContent className="p-4 text-center text-muted-foreground">
          Carregando vídeos...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🎬 Biblioteca de Vídeos do Produto
          <Badge variant="secondary" className="ml-auto">
            {insertCount} inserido{insertCount !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="space-y-2">
          {/* YouTube Videos */}
          {hasYouTube && (
            <AccordionItem value="youtube" className="border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📹</span>
                  <span className="font-semibold">Vídeos YouTube</span>
                  <Badge variant="secondary" className="ml-2">{youtubeVideos.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {youtubeVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.description || `Vídeo YouTube ${index + 1}`}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {video.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(video.url, video.description || `Vídeo YouTube ${index + 1}`)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Instagram Videos */}
          {hasInstagram && (
            <AccordionItem value="instagram" className="border rounded-lg bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="font-semibold">Vídeos Instagram</span>
                  <Badge variant="secondary" className="ml-2">{instagramVideos.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {instagramVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.description || `Vídeo Instagram ${index + 1}`}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {video.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(video.url, video.description || `Vídeo Instagram ${index + 1}`)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Testimonial Videos */}
          {hasTestimonials && (
            <AccordionItem value="testimonials" className="border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎥</span>
                  <span className="font-semibold">Vídeos Depoimentos</span>
                  <Badge variant="secondary" className="ml-2">{testimonialVideos.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {testimonialVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.description || `Depoimento ${index + 1}`}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {video.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(video.url, video.description || `Depoimento ${index + 1}`)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Technical Videos */}
          {hasTechnical && (
            <AccordionItem value="technical" className="border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔬</span>
                  <span className="font-semibold">Explicações Técnicas</span>
                  <Badge variant="secondary" className="ml-2">{technicalVideos.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {technicalVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.description || `Vídeo Técnico ${index + 1}`}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {video.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(video.url, video.description || `Vídeo Técnico ${index + 1}`)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* TikTok Videos */}
          {hasTikTok && (
            <AccordionItem value="tiktok" className="border rounded-lg bg-slate-50 dark:bg-slate-950/20 border-slate-300 dark:border-slate-700">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎵</span>
                  <span className="font-semibold">Vídeos TikTok</span>
                  <Badge variant="secondary" className="ml-2">{tiktokVideos.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {tiktokVideos.map((video, index) => (
                    <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {video.description || `Vídeo TikTok ${index + 1}`}
                        </p>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {video.url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(video.url, video.description || `Vídeo TikTok ${index + 1}`)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Tutorial Resources */}
          {hasTutorials && (
            <AccordionItem value="tutorials" className="border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  <span className="font-semibold">Tutoriais do Produto</span>
                  <Badge variant="secondary" className="ml-2">{tutorials.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {tutorials.map((tutorial) => (
                    <div key={tutorial.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tutorial.course_name}
                        </p>
                        <a 
                          href={tutorial.course_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {tutorial.course_url.substring(0, 40)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleInsertVideo(tutorial.course_url, tutorial.course_name)}
                      >
                        Inserir
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Os vídeos inseridos são numerados automaticamente (1, 2, 3...) para facilitar a organização.
        </div>
      </CardContent>
    </Card>
  );
};
