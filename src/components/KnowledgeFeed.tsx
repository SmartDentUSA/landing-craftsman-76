import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeFeed } from '@/hooks/useKnowledgeFeed';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRef, memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeFeedProps {
  feedUrl: string;
  limit?: number;
  title?: string;
  subtitle?: string;
  visibleDesktop?: boolean;
  visibleMobile?: boolean;
}

const getCategoryColor = (letter: string) => {
  const colors: Record<string, string> = {
    'C': 'bg-blue-500', 'D': 'bg-green-500', 'E': 'bg-purple-500',
  };
  return colors[letter.toUpperCase()] || 'bg-gray-500';
};

const KnowledgeFeedComponent = ({ feedUrl, limit = 12, title, subtitle, visibleDesktop = true, visibleMobile = true }: KnowledgeFeedProps) => {
  const { articles, feedMeta, loading, error } = useKnowledgeFeed(feedUrl, limit);
  
  const plugin = useRef(Autoplay({ 
    delay: 5000, 
    stopOnInteraction: true, 
    stopOnMouseEnter: true 
  }));

  if (loading) {
    return (
      <section className={cn(
        "w-full bg-muted/30 py-12",
        !visibleDesktop && "md:hidden",
        !visibleMobile && "hidden md:block"
      )}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">{title || 'Carregando...'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || articles.length < 3) return null;

  return (
    <section className={cn(
      "w-full bg-gradient-to-b from-background to-muted/20 py-12",
      !visibleDesktop && "md:hidden",
      !visibleMobile && "hidden md:block"
    )}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{title || feedMeta?.title || 'Últimas Publicações'}</h2>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>

        <Carousel opts={{ align: "start", loop: true }} plugins={[plugin.current]}>
          <CarouselContent className="-ml-2 md:-ml-4">
            {articles.map((article) => (
              <CarouselItem 
                key={article.id} 
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/6 max-w-[280px]"
              >
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-card hover:bg-accent/50 rounded-lg border overflow-hidden block h-full transition-all hover:shadow-lg hover:scale-[1.02]"
                >
                  <div className="aspect-video overflow-hidden bg-muted relative">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <ExternalLink className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <Badge className={`${getCategoryColor(article.category.letter)} text-white text-xs`}>
                      {article.category.name}
                    </Badge>
                    
                    <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {article.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-muted-foreground/70">
                        {formatDistanceToNow(new Date(article.published_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                </a>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>

        <div className="mt-6 text-center">
          <Button variant="outline" asChild>
            <a href={feedMeta?.link || '#'} target="_blank" rel="noopener noreferrer">
              Ver Todos os Artigos <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export const KnowledgeFeed = memo(KnowledgeFeedComponent, (prevProps, nextProps) => {
  return (
    prevProps.feedUrl === nextProps.feedUrl &&
    prevProps.limit === nextProps.limit &&
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.visibleDesktop === nextProps.visibleDesktop &&
    prevProps.visibleMobile === nextProps.visibleMobile
  );
});

KnowledgeFeed.displayName = 'KnowledgeFeed';
