import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, ChevronLeft, ChevronRight, Sparkles, Image, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  position: number;
  title: string;
  text: string;
  image_suggestion: string;
  cta_label?: string | null;
}

interface EngagementCarousel {
  slides: CarouselSlide[];
  generated_at?: string;
  approach?: string;
}

interface EngagementCarouselSectionProps {
  productId: string;
  productName: string;
  feedCopy?: string;
}

const SLIDE_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🎯', label: 'Capa / Gancho' },
  2: { emoji: '😰', label: 'Problema' },
  3: { emoji: '💡', label: 'Solução' },
  4: { emoji: '🔬', label: 'Prova Técnica' },
  5: { emoji: '🏆', label: 'Autoridade' },
  6: { emoji: '📲', label: 'CTA' },
};

export function EngagementCarouselSection({ productId, productName, feedCopy }: EngagementCarouselSectionProps) {
  const [carousel, setCarousel] = useState<EngagementCarousel | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load saved carousel
  useEffect(() => {
    loadSavedCarousel();
  }, [productId]);

  const loadSavedCarousel = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const copies = data?.instagram_copies as any;
      if (copies?.engagement_carousel) {
        setCarousel(copies.engagement_carousel);
      }
    } catch (err) {
      console.error('Erro ao carregar carrossel engajamento:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCarousel = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-carousel', {
        body: {
          productId,
          feedCopy: feedCopy || '',
          approach: 'engajamento',
          promptType: 'engajamento',
        }
      });

      if (error) throw error;

      if (data?.slides) {
        const newCarousel: EngagementCarousel = {
          slides: data.slides,
          generated_at: new Date().toISOString(),
          approach: 'engajamento',
        };
        setCarousel(newCarousel);
        setActiveSlide(1);

        // Persist
        const { data: existingData } = await supabase
          .from('products_repository')
          .select('instagram_copies')
          .eq('id', productId)
          .single();

        const existingCopies = (existingData?.instagram_copies as any) || {};

        await supabase
          .from('products_repository')
          .update({
            instagram_copies: {
              ...existingCopies,
              engagement_carousel: newCarousel,
            } as any
          })
          .eq('id', productId);

        toast({ title: "🎯 Carrossel Engajamento gerado!", description: "6 slides prontos com progressão narrativa." });
      }
    } catch (error) {
      console.error('Erro ao gerar carrossel engajamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o carrossel de engajamento.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copySlide = (slide: CarouselSlide) => {
    const text = `SLIDE ${slide.position}: ${slide.title}\n\n${slide.text}${slide.cta_label ? `\n\nCTA: ${slide.cta_label}` : ''}\n\n📸 ${slide.image_suggestion}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `Slide ${slide.position} copiado.` });
  };

  const copyAllSlides = () => {
    if (!carousel?.slides) return;
    const text = carousel.slides.map(s =>
      `━━━ SLIDE ${s.position}: ${s.title} ━━━\n${s.text}${s.cta_label ? `\nCTA: ${s.cta_label}` : ''}\n📸 ${s.image_suggestion}`
    ).join('\n\n');
    const header = `CARROSSEL ENGAJAMENTO — ${productName}\n\n`;
    navigator.clipboard.writeText(header + text);
    toast({ title: "Copiado!", description: "Todos os 6 slides copiados!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentSlide = carousel?.slides?.find(s => s.position === activeSlide);
  const slideInfo = SLIDE_LABELS[activeSlide] || { emoji: '📄', label: `Slide ${activeSlide}` };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-5 w-5" />
            🎯 Carrossel Engajamento — 6 Slides
          </CardTitle>
          <div className="flex items-center gap-2">
            {carousel?.slides?.length === 6 && (
              <Button size="sm" variant="outline" onClick={copyAllSlides}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar Tudo
              </Button>
            )}
            <Button
              size="sm"
              variant={carousel ? "outline" : "default"}
              onClick={generateCarousel}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : carousel ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {carousel ? 'Regenerar' : 'Gerar com IA'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Progressão: Gancho → Problema → Solução → Prova → Autoridade → CTA
        </p>
      </CardHeader>

      <CardContent>
        {!carousel?.slides?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Clique em "Gerar com IA" para criar o carrossel de engajamento.</p>
            <p className="text-xs mt-1">Usa o prompt otimizado com progressão narrativa e anti-alucinação.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Slide navigation */}
            <div className="flex items-center justify-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setActiveSlide(prev => Math.max(1, prev - 1))}
                disabled={activeSlide === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {[1, 2, 3, 4, 5, 6].map(num => {
                const info = SLIDE_LABELS[num];
                return (
                  <Button
                    key={num}
                    size="sm"
                    variant={activeSlide === num ? "default" : "outline"}
                    className="h-8 px-2 text-xs"
                    onClick={() => setActiveSlide(num)}
                    title={info?.label}
                  >
                    {info?.emoji} {num}
                  </Button>
                );
              })}

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setActiveSlide(prev => Math.min(6, prev + 1))}
                disabled={activeSlide === 6}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Active slide content */}
            {currentSlide && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {slideInfo.emoji} Slide {currentSlide.position}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{slideInfo.label}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copySlide(currentSlide)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>

                <div>
                  <p className="font-semibold text-sm text-foreground">{currentSlide.title}</p>
                  <p className="text-sm mt-1 whitespace-pre-line text-foreground/90">{currentSlide.text}</p>
                </div>

                {currentSlide.cta_label && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary text-xs">
                      CTA: {currentSlide.cta_label}
                    </Badge>
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  📸 <strong>Visual:</strong> {currentSlide.image_suggestion}
                </div>
              </div>
            )}

            {/* Generated at */}
            {carousel.generated_at && (
              <p className="text-xs text-muted-foreground text-center">
                Gerado em {new Date(carousel.generated_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
