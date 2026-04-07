import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Sparkles, Image, RefreshCw, Download, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EngagementCarouselPreview, generateEngagementSlidePNG, generateEngagementSlideVideo, fetchAsDataUrl } from "./EngagementCarouselPreview";
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

  // Refs to always have current state for persist
  const slideTextsRef = useRef(slideTexts);
  const slideImageMapRef = useRef(slideImageMap);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Keep refs in sync
  useEffect(() => { slideTextsRef.current = slideTexts; }, [slideTexts]);
  useEffect(() => { slideImageMapRef.current = slideImageMap; }, [slideImageMap]);

  useEffect(() => {
    loadSaved();
  }, [productId]);

  const persistData = useCallback(async () => {
    const currentTexts = slideTextsRef.current;
    const currentImages = slideImageMapRef.current;
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = (existingData?.instagram_copies as any) || {};
      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            ...existingCopies,
            engagement_carousel: {
              slideTexts: currentTexts,
              slideImageMap: currentImages,
              generated_at: new Date().toISOString(),
              approach: 'engajamento',
            },
          } as any
        })
        .eq('id', productId);

      if (error) {
        console.error('Erro ao salvar carrossel:', error);
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast({ title: "Erro ao salvar", description: "Falha na persistência.", variant: "destructive" });
    }
  }, [productId, toast]);

  const debouncedPersist = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistData(), 1500);
  }, [persistData]);

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
        if (ec.slideTexts) {
          setSlideTexts(ec.slideTexts);
          setHasContent(true);
        } else if (ec.slides) {
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

  const uploadImageToStorage = async (file: File, slideNum: number): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `engagement-carousel/${productId}/slide_${slideNum}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  const handleSlideTextChange = (slideNum: number, key: string, value: string) => {
    setSlideTexts(prev => ({
      ...prev,
      [slideNum]: { ...prev[slideNum], [key]: value }
    }));
    debouncedPersist();
  };

  const handleImageChange = (slideNum: number, url: string) => {
    setSlideImageMap(prev => ({ ...prev, [slideNum]: url }));
    debouncedPersist();
  };

  const handleImageFileUpload = async (slideNum: number, file: File) => {
    if (file.type.startsWith('video/')) {
      // Video upload — store in Storage and save URL in slideTexts
      const blobUrl = URL.createObjectURL(file);
      // Show immediate preview via slideTexts (videoSrc is set by child)

      const ext = file.name.split('.').pop() || 'mp4';
      const path = `engagement-carousel/${productId}/slide_${slideNum}_video_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('Video upload error:', uploadError);
        toast({ title: "Erro no upload do vídeo", description: uploadError.message, variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        handleSlideTextChange(slideNum, 'videoStorageUrl', urlData.publicUrl);
      }
      return;
    }

    // Image upload (existing logic)
    const blobUrl = URL.createObjectURL(file);
    setSlideImageMap(prev => ({ ...prev, [slideNum]: blobUrl }));

    // Upload to Supabase Storage
    const publicUrl = await uploadImageToStorage(file, slideNum);
    if (publicUrl) {
      setSlideImageMap(prev => ({ ...prev, [slideNum]: publicUrl }));
      debouncedPersist();
    }
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
        // Persist immediately (not debounced)
        slideTextsRef.current = newTexts;
        await persistData();
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
      let hasVideos = false;
      for (let i = 1; i <= 6; i++) {
        const texts = slideTexts[i];
        const isVideo = texts.mediaType === 'video';

        if (isVideo) {
          // Video slide: render video with template overlay
          const videoUrl = texts.videoStorageUrl || texts.videoSrc;
          if (videoUrl) {
            try {
              const videoBlob = await generateEngagementSlideVideo(i, videoUrl, texts, primaryColor, accentColor, brandName, handleName);
              zip.file(`slide_${i}.webm`, videoBlob);
              hasVideos = true;
            } catch (err) {
              console.warn(`Could not render video for slide ${i}:`, err);
              // Fallback: generate PNG with thumbnail
              let imgUrl = slideImageMap[i] || '';
              if (imgUrl && !imgUrl.startsWith('data:')) {
                try { imgUrl = await fetchAsDataUrl(imgUrl); } catch { /* use original */ }
              }
              const blob = await generateEngagementSlidePNG(i, imgUrl, texts, primaryColor, accentColor, brandName, handleName);
              zip.file(`slide_${i}.png`, blob);
            }
          }
        } else {
          // Image slide: export PNG with template
          let imgUrl = slideImageMap[i] || '';
          if (imgUrl && !imgUrl.startsWith('data:')) {
            try {
              imgUrl = await fetchAsDataUrl(imgUrl);
            } catch { /* use original */ }
          }
          const blob = await generateEngagementSlidePNG(i, imgUrl, texts, primaryColor, accentColor, brandName, handleName);
          zip.file(`slide_${i}.png`, blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carrossel_engajamento_${productName.replace(/\s+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "✅ Download iniciado!", description: hasVideos ? "PNGs + Vídeos com template em ZIP." : "6 PNGs 1080x1350 em ZIP." });
    } catch (err) {
      console.error('Erro no export:', err);
      toast({ title: "Erro", description: "Falha ao exportar. Verifique se o navegador suporta gravação de vídeo.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    try {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      await persistData();
      toast({ title: "💾 Salvo!", description: "Carrossel salvo com sucesso." });
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    } finally {
      setSaving(false);
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
                <Button size="sm" variant="outline" onClick={handleManualSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  💾 Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={exportAllPNGs} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  📦 Baixar ZIP
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
            onImageFileUpload={handleImageFileUpload}
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
