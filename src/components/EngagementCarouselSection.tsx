import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Sparkles, Image, RefreshCw, Download, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EngagementCarouselPreview, generateEngagementSlidePNG, fetchAsDataUrl } from "./EngagementCarouselPreview";
import type { EngagementSlideTexts, EngagementSlideTextsMap } from "./EngagementCarouselPreview";
import JSZip from "jszip";

interface EngagementCarouselSectionProps {
  productId: string;
  productName: string;
  feedCopy?: string;
  productImages?: Array<{ url: string; alt?: string }>;
  primaryColor?: string;
  accentColor?: string;
  brandName?: string;
  handleName?: string;
}

const DEFAULT_SLIDE_TEXTS: EngagementSlideTextsMap = {
  1: { title: '', text: '', image_suggestion: '' },
  2: { title: '', text: '', image_suggestion: '' },
  3: { title: '', text: '', image_suggestion: '' },
  4: { title: '', text: '', image_suggestion: '' },
  5: { title: '', text: '', image_suggestion: '' },
  6: { title: '', text: '', image_suggestion: '', cta_label: '' },
};

export function EngagementCarouselSection({
  productId,
  productName,
  feedCopy,
  productImages = [],
  primaryColor = '#1a1a1a',
  accentColor = '#FF6B35',
  brandName = 'Brand',
  handleName = 'handle',
}: EngagementCarouselSectionProps) {
  const [slideTexts, setSlideTexts] = useState<EngagementSlideTextsMap>({ ...DEFAULT_SLIDE_TEXTS });
  const [slideImageMap, setSlideImageMap] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasContent, setHasContent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSaved();
  }, [productId]);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const copies = data?.instagram_copies as any;
      if (copies?.engagement_carousel) {
        const ec = copies.engagement_carousel;
        // Restore slide texts
        if (ec.slideTexts) {
          setSlideTexts(ec.slideTexts);
          setHasContent(true);
        } else if (ec.slides) {
          // Legacy: convert from old format
          const newTexts = { ...DEFAULT_SLIDE_TEXTS };
          for (const slide of ec.slides) {
            newTexts[slide.position as keyof typeof newTexts] = {
              title: slide.title || '',
              text: slide.text || '',
              image_suggestion: slide.image_suggestion || '',
              cta_label: slide.cta_label || null,
            };
          }
          setSlideTexts(newTexts);
          setHasContent(true);
        }
        // Restore images
        if (ec.slideImageMap) {
          setSlideImageMap(ec.slideImageMap);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar carrossel engajamento:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistData = async (newTexts: EngagementSlideTextsMap, newImages: Record<number, string>) => {
    try {
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
            engagement_carousel: {
              slideTexts: newTexts,
              slideImageMap: newImages,
              generated_at: new Date().toISOString(),
              approach: 'engajamento',
            },
          } as any
        })
        .eq('id', productId);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
  };

  const handleSlideTextChange = (slideNum: number, key: string, value: string) => {
    setSlideTexts(prev => {
      const updated = {
        ...prev,
        [slideNum]: { ...prev[slideNum], [key]: value }
      };
      // Debounced persist
      setTimeout(() => persistData(updated, slideImageMap), 1000);
      return updated;
    });
  };

  const handleImageChange = (slideNum: number, url: string) => {
    setSlideImageMap(prev => {
      const updated = { ...prev, [slideNum]: url };
      setTimeout(() => persistData(slideTexts, updated), 500);
      return updated;
    });
  };

  const generateCarousel = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-carousel', {
        body: {
          productId,
          feedCopy: feedCopy || productName || 'Gerar conteúdo',
          approach: 'engajamento',
          promptType: 'engajamento',
        }
      });

      if (error) throw error;

      if (data?.slides) {
        const newTexts = { ...DEFAULT_SLIDE_TEXTS };
        for (const slide of data.slides) {
          newTexts[slide.position as keyof typeof newTexts] = {
            title: slide.title || '',
            text: slide.text || '',
            image_suggestion: slide.image_suggestion || '',
            cta_label: slide.cta_label || null,
          };
        }
        setSlideTexts(newTexts);
        setHasContent(true);
        await persistData(newTexts, slideImageMap);
        toast({ title: "🎯 Carrossel Engajamento gerado!", description: "6 slides visuais prontos para edição." });
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

  const exportAllPNGs = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      for (let i = 1; i <= 6; i++) {
        const texts = slideTexts[i];
        let imgUrl = slideImageMap[i] || '';
        // Convert to data URL if needed
        if (imgUrl && !imgUrl.startsWith('data:')) {
          try {
            imgUrl = await fetchAsDataUrl(imgUrl);
          } catch { /* use original */ }
        }
        const blob = await generateEngagementSlidePNG(i, imgUrl, texts, primaryColor, accentColor, brandName, handleName);
        zip.file(`engajamento_slide_${i}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carrossel_engajamento_${productName.replace(/\s+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✅ Download iniciado!", description: "6 PNGs 1080x1350 em ZIP." });
    } catch (err) {
      console.error('Erro no export:', err);
      toast({ title: "Erro", description: "Falha ao exportar PNGs.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const copyAllSlides = () => {
    const text = [1, 2, 3, 4, 5, 6].map(i => {
      const s = slideTexts[i];
      return `━━━ SLIDE ${i}: ${s.title} ━━━\n${s.text}${s.cta_label ? `\nCTA: ${s.cta_label}` : ''}\n📸 ${s.image_suggestion}`;
    }).join('\n\n');
    navigator.clipboard.writeText(`CARROSSEL ENGAJAMENTO — ${productName}\n\n${text}`);
    toast({ title: "Copiado!", description: "Todos os 6 slides copiados!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Image className="h-5 w-5" />
            🎯 Carrossel Engajamento — 6 Slides Visuais
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {hasContent && (
              <>
                <Button size="sm" variant="outline" onClick={copyAllSlides}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar Textos
                </Button>
                <Button size="sm" variant="outline" onClick={exportAllPNGs} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  Baixar ZIP
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant={hasContent ? "outline" : "default"}
              onClick={generateCarousel}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : hasContent ? (
                <RefreshCw className="h-4 w-4 mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {hasContent ? 'Regenerar' : 'Gerar com IA'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Progressão: Gancho → Problema → Solução → Prova → Autoridade → CTA • Use <code className="bg-muted px-1 rounded">**bold**</code> e <code className="bg-muted px-1 rounded">{'{destaque}'}</code>
        </p>
      </CardHeader>

      <CardContent>
        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Clique em "Gerar com IA" para criar o carrossel de engajamento visual.</p>
            <p className="text-xs mt-1">Layout editorial com fundo escuro, texto bold, e destaques em cor.</p>
          </div>
        ) : (
          <EngagementCarouselPreview
            slideImageMap={slideImageMap}
            onImageChange={handleImageChange}
            productImages={productImages}
            primaryColor={primaryColor}
            accentColor={accentColor}
            brandName={brandName}
            handleName={handleName}
            slideTexts={slideTexts}
            onSlideTextChange={handleSlideTextChange}
          />
        )}
      </CardContent>
    </Card>
  );
}
