import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Sparkles, Image, RefreshCw, Download, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EngagementCarouselPreview, generateEngagementSlidePNG, generateEngagementSlideVideo, fetchAsDataUrl, resolveVideoSource } from "./EngagementCarouselPreview";
import type { EngagementSlideTexts, EngagementSlideTextsMap } from "./EngagementCarouselPreview";
import JSZip from "jszip";
import { uploadCarouselToSmartOps, buildSocialPublisherUrl, slugify } from "@/lib/smartops-upload";

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
  const [sendingSmartOps, setSendingSmartOps] = useState(false);
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

  const handleImageFileUpload = async (slideNum: number, file: File, kind?: 'image' | 'logo-company' | 'logo-product') => {
    // ===== Logo uploads (company / product) — image only, persisted to Storage =====
    if (kind === 'logo-company' || kind === 'logo-product') {
      const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
      if (!ALLOWED.includes(file.type)) {
        toast({ title: 'Formato inválido', description: 'Use PNG, JPEG, WEBP ou SVG para a logo.', variant: 'destructive' });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: 'Logo muito grande', description: 'Limite de 8 MB.', variant: 'destructive' });
        return;
      }
      try {
        const ext = file.name.split('.').pop() || 'png';
        const subdir = kind === 'logo-company' ? 'logo_company' : 'logo_product';
        const path = `engagement-carousel/${productId}/${subdir}_slide_${slideNum}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('product-images')
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          toast({ title: 'Erro no upload da logo', description: upErr.message, variant: 'destructive' });
          return;
        }
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        if (urlData?.publicUrl) {
          const fieldKey = kind === 'logo-company' ? 'companyLogoUrl' : 'productLogoUrl';
          handleSlideTextChange(slideNum, fieldKey, urlData.publicUrl);
          toast({ title: '✅ Logo enviada', description: `Slide ${slideNum} atualizado.` });
        }
      } catch (err) {
        console.error('logo upload error', err);
        toast({ title: 'Erro no upload da logo', variant: 'destructive' });
      }
      return;
    }


    const MAX_BYTES = 100 * 1024 * 1024; // 100 MB (alinhado ao bucket)
    const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);

    // Validação client-side de tamanho
    if (file.size > MAX_BYTES) {
      console.error('[CAROUSEL_VIDEO_UPLOAD_FAIL]', {
        reason: 'file_too_large',
        slideNum,
        fileSize: file.size,
        fileSizeMB,
        fileType: file.type,
      });
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo tem ${fileSizeMB} MB. O limite é 100 MB. Comprima o vídeo e tente novamente.`,
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    if (file.type.startsWith('video/')) {
      // Validação de tipo MIME para vídeo
      if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
        console.error('[CAROUSEL_VIDEO_UPLOAD_FAIL]', {
          reason: 'mime_not_allowed',
          slideNum,
          fileType: file.type,
        });
        toast({
          title: "Formato de vídeo não suportado",
          description: `Formato "${file.type}" não é aceito. Use MP4, MOV, WebM ou M4V.`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      // Video upload — store in Storage and save URL in slideTexts
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `engagement-carousel/${productId}/slide_${slideNum}_video_${Date.now()}.${ext}`;

      console.log('[CAROUSEL_VIDEO_UPLOAD_START]', { slideNum, fileSize: file.size, fileSizeMB, fileType: file.type, path });

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('[CAROUSEL_VIDEO_UPLOAD_FAIL]', {
          reason: 'storage_error',
          slideNum,
          fileSize: file.size,
          fileSizeMB,
          fileType: file.type,
          path,
          error: uploadError,
          message: uploadError.message,
        });
        toast({
          title: "Erro no upload do vídeo",
          description: `${uploadError.message} (arquivo: ${fileSizeMB} MB)`,
          variant: "destructive",
          duration: 8000,
        });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        console.log('[CAROUSEL_VIDEO_UPLOAD_SUCCESS]', { slideNum, publicUrl: urlData.publicUrl });
        const nextTexts: EngagementSlideTextsMap = {
          ...slideTextsRef.current,
          [slideNum]: {
            ...slideTextsRef.current[slideNum],
            mediaType: 'video',
            videoStorageUrl: urlData.publicUrl,
          },
        };
        slideTextsRef.current = nextTexts;
        setSlideTexts(nextTexts);
        await persistData();
        toast({
          title: "✅ Vídeo enviado",
          description: `Slide ${slideNum} atualizado (${fileSizeMB} MB).`,
          duration: 4000,
        });
      }
      return;
    }

    // Validação de tipo para imagem
    if (file.type.startsWith('image/') && !ALLOWED_IMAGE_MIME.includes(file.type)) {
      toast({
        title: "Formato de imagem não suportado",
        description: `Formato "${file.type}" não é aceito. Use PNG, JPEG, WEBP ou GIF.`,
        variant: "destructive",
        duration: 8000,
      });
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
      const skippedSlides: number[] = [];
      const skipReasons: Record<number, string> = {};

      for (let i = 1; i <= 6; i++) {
        toast({ title: `📦 Exportando slide ${i}/6...` });

        try {
          const hasVideoForSlide = !!resolveVideoSource(slideTexts[i]);
          const slideTimeoutMs = hasVideoForSlide ? 600_000 : 45_000;
          await Promise.race([
            (async () => {
              const texts = slideTexts[i];
              const videoUrl = resolveVideoSource(texts);

              if (videoUrl) {
                // Try video export — attempt both sources before falling back
                const sources = [videoUrl];
                if (texts.videoSrc && texts.videoSrc !== videoUrl) sources.push(texts.videoSrc);
                if (texts.videoStorageUrl && texts.videoStorageUrl !== videoUrl) sources.push(texts.videoStorageUrl);

                let videoRendered = false;
                let lastVideoErr: string = '';
                for (const src of sources) {
                  try {
                    const videoBlob = await generateEngagementSlideVideo(i, src, texts, primaryColor, accentColor, brandName, handleName);
                    zip.file(`slide_${i}.webm`, videoBlob);
                    hasVideos = true;
                    videoRendered = true;
                    break;
                  } catch (err) {
                    lastVideoErr = (err as Error)?.message ?? String(err);
                    console.error('[CAROUSEL_ZIP_EXPORT_FAIL]', {
                      phase: 'video_render',
                      slideNum: i,
                      sourcePreview: src.substring(0, 80),
                      error: lastVideoErr,
                    });
                  }
                }

                if (!videoRendered) {
                  console.error(`All video sources failed for slide ${i}; exportação abortada para não gerar PNG diferente do preview (${lastVideoErr})`);
                  toast({
                    title: `❌ Slide ${i}: vídeo falhou`,
                    description: lastVideoErr,
                    duration: 6000,
                  });
                  throw new Error(`Slide ${i}: vídeo não renderizou igual ao preview. ${lastVideoErr}`);
                }
              } else {
                let imgUrl = slideImageMap[i] || '';
                if (imgUrl && !imgUrl.startsWith('data:')) {
                  try {
                    imgUrl = await fetchAsDataUrl(imgUrl);
                  } catch (e) {
                    console.error('[CAROUSEL_ZIP_EXPORT_FAIL]', {
                      phase: 'img_fetch',
                      slideNum: i,
                      error: (e as Error)?.message,
                    });
                      throw e;
                  }
                }
                const blob = await generateEngagementSlidePNG(i, imgUrl, texts, primaryColor, accentColor, brandName, handleName);
                zip.file(`slide_${i}.png`, blob);
              }
            })(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`Slide ${i} timeout (${Math.round(slideTimeoutMs / 1000)}s)`)),
                slideTimeoutMs
              )
            ),
          ]);
        } catch (err) {
          const msg = (err as Error)?.message ?? String(err);
          console.error('[CAROUSEL_ZIP_EXPORT_FAIL]', { phase: 'slide_outer', slideNum: i, error: msg });
          skippedSlides.push(i);
          skipReasons[i] = msg;
          throw err;
        }
      }

      if (Object.keys(zip.files).length === 0) {
        const reasonSummary = Object.entries(skipReasons)
          .map(([n, r]) => `Slide ${n}: ${r}`)
          .join(' | ') || 'Erro desconhecido — verifique o console.';
        toast({
          title: "Erro ao exportar .zip",
          description: `Nenhum slide pôde ser exportado. ${reasonSummary}`,
          variant: "destructive",
          duration: 12000,
        });
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carrossel_engajamento_${productName.replace(/\s+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      if (skippedSlides.length > 0) {
        const reasonSummary = skippedSlides
          .map((n) => `${n}: ${skipReasons[n] ?? 'desconhecido'}`)
          .join(' | ');
        toast({
          title: "⚠️ Download com avisos",
          description: `Slides pulados → ${reasonSummary}`,
          duration: 10000,
        });
      } else {
        toast({ title: "✅ Download iniciado!", description: hasVideos ? "PNGs + Vídeos com template em ZIP." : "6 PNGs 1080x1350 em ZIP." });
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      console.error('[CAROUSEL_ZIP_EXPORT_FAIL]', { phase: 'outer', error: msg, stack: (err as Error)?.stack });
      toast({
        title: "Erro ao exportar .zip",
        description: msg,
        variant: "destructive",
        duration: 12000,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSendSmartOps = async () => {
    setSendingSmartOps(true);
    try {
      toast({ title: 'Gerando carrossel...', description: 'Renderizando 6 slides (PNG/Vídeo).' });
      const slides: { blob: Blob; ext: string; contentType: string }[] = [];
      let hasVideos = false;
      for (let i = 1; i <= 6; i++) {
        const texts = slideTexts[i];
        const videoUrl = resolveVideoSource(texts);
        const rawUrl = slideImageMap[i] || '';
        console.log(`[SMARTOPS_ENGAJ] preparando slide ${i}/6`, {
          hasVideo: !!videoUrl,
          rawUrl: rawUrl.slice(0, 120),
        });

        // Try video first if there's a video source
        if (videoUrl) {
          const sources = [videoUrl];
          if (texts.videoSrc && texts.videoSrc !== videoUrl) sources.push(texts.videoSrc);
          if (texts.videoStorageUrl && texts.videoStorageUrl !== videoUrl) sources.push(texts.videoStorageUrl);

          let rendered = false;
          let lastErr = '';
          for (const src of sources) {
            try {
              const videoBlob = await Promise.race<Blob>([
                generateEngagementSlideVideo(i, src, texts, primaryColor, accentColor, brandName, handleName),
                new Promise<Blob>((_, reject) =>
                  setTimeout(() => reject(new Error(`Timeout (10min) renderizando vídeo slide ${i}`)), 600_000)
                ),
              ]);
              console.log(`[SMARTOPS_ENGAJ] slide ${i} vídeo pronto (${videoBlob.size} bytes)`);
              slides.push({ blob: videoBlob, ext: 'webm', contentType: 'video/webm' });
              hasVideos = true;
              rendered = true;
              break;
            } catch (err) {
              lastErr = (err as Error)?.message ?? String(err);
              console.error('[SMARTOPS_ENGAJ] vídeo falhou', { slideNum: i, src: src.slice(0, 80), error: lastErr });
            }
          }
          if (rendered) continue;
          console.error(`[SMARTOPS_ENGAJ] slide ${i}: vídeo falhou; envio abortado para não enviar PNG diferente do preview (${lastErr}).`);
          toast({
            title: `❌ Slide ${i}: vídeo falhou`,
            description: lastErr,
            duration: 6000,
          });
          throw new Error(`Slide ${i}: vídeo não renderizou igual ao preview. ${lastErr}`);
        }

        // PNG fallback / default
        let imgUrl = rawUrl;
        if (imgUrl && !imgUrl.startsWith('data:')) {
          try {
            imgUrl = await fetchAsDataUrl(imgUrl);
            console.log(`[SMARTOPS_ENGAJ] slide ${i} imgDataUrl bytes ≈`, imgUrl.length);
          } catch (e) {
            console.warn(`SmartOps engajamento slide ${i}: img falhou`, e);
          }
        }
        const blob = await Promise.race<Blob>([
          generateEngagementSlidePNG(i, imgUrl, texts, primaryColor, accentColor, brandName, handleName),
          new Promise<Blob>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (45s) renderizando slide ${i}`)), 45_000)
          ),
        ]);
        console.log(`[SMARTOPS_ENGAJ] slide ${i} PNG pronto (${blob.size} bytes)`);
        if (blob.size < 10_000) {
          console.warn(`[SMARTOPS_ENGAJ] slide ${i} suspeito — PNG muito pequeno`, { size: blob.size });
        }
        slides.push({ blob, ext: 'png', contentType: 'image/png' });
      }


      toast({
        title: 'Enviando para SmartOps...',
        description: hasVideos ? '6 slides (PNG+Vídeo) → bucket wa-media.' : '6 slides → bucket wa-media.',
      });
      const produtoSlug = slugify(productName);
      const { ref, total } = await uploadCarouselToSmartOps({
        slides,
        produtoSlug,
        tipo: 'engajamento',
      });

      toast({ title: '📤 Carrossel enviado!', description: 'Abrindo Social Publisher...' });
      const url = buildSocialPublisherUrl({ ref, produtoSlug, tipo: 'engajamento', total });
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      console.error('[SMARTOPS_UPLOAD_FAIL]', err);
      toast({
        title: 'Erro ao enviar para SmartOps',
        description: err?.message || 'Tente baixar e fazer upload manualmente.',
        variant: 'destructive',
      });
    } finally {
      setSendingSmartOps(false);
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
                <Button size="sm" onClick={handleSendSmartOps} disabled={sendingSmartOps || exporting}>
                  {sendingSmartOps ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  {sendingSmartOps ? 'Enviando...' : '📤 Enviar SmartOps'}
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
