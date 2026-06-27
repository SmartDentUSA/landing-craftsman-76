import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Edit, Save, X, Zap, Code, ExternalLink, Film, Plus, ChevronLeft, ChevronRight, Image, Sparkles, Download, Palette, Send } from "lucide-react";
import { uploadCarouselToSmartOps, buildSocialPublisherUrl, slugify } from "@/lib/smartops-upload";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StrategicCarouselPreview, generateSlidePNG, generateStrategicSlideVideo, fetchAsDataUrl } from "./StrategicCarouselPreview";
import type { SlideTextsType } from "./StrategicCarouselPreview";
import { EngagementCarouselSection } from "./EngagementCarouselSection";
import JSZip from "jszip";

// === Tipos para Carrossel (7 Slides) ===
interface CarouselSlide {
  position: number;
  title: string;
  text: string;
  image_suggestion: string;
}

interface FeedCarousel {
  variation: number;
  approach: string;
  slides: CarouselSlide[];
  generated_at?: string;
}

interface CopyVariation {
  [key: string]: any;
  variation: number;
  approach: string;
  copy: string;
  link?: string;
  hashtags?: string[];
  call_to_action?: string;
}

interface InstagramCopy {
  feed_copies?: CopyVariation[];
  story_copy?: string;
  story_link?: string;
  reels_copies?: CopyVariation[];
  last_generated?: string;
  feed_copy?: string;
  feed_link?: string;
  reels_copy?: string;
  reels_link?: string;
  feed_carousels?: FeedCarousel[];
  last_carousel_update?: string;
}

// === Tipos para Roteiro de Reels (Script Audiovisual) ===
interface ReelsScene {
  visual: string;
  dialogue: string;
}

interface ReelsScript {
  variation: number;
  approach: string;
  hook: string;
  scenes: ReelsScene[];
  cta: string;
}

interface InstagramCopyGeneratorProps {
  productId: string;
  productName: string;
  productPrice?: number;
  productCategory?: string;
  productImages?: Array<{ url: string; alt?: string }>;
  productUrl?: string;
  productBenefits?: string[];
  productFeatures?: string[];
  technicalSpecs?: Array<{ label: string; value: string }>;
  productSalesPitch?: string;
  productDescription?: string;
  productTargetAudience?: string[];
  productApplications?: string;
  productFaq?: Array<{ question: string; answer: string }>;
  productEcommerceHtml?: string;
  competitorComparison?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    table_headers: string[];
    table_data: Array<Record<string, string>>;
  };
  isOpen: boolean;
  onClose: () => void;
}

const REELS_SCRIPT_LABELS: Record<string, { label: string; description: string }> = {
  educational: { label: '🎓 Educativa', description: 'Ensina algo útil ao público' },
  trending: { label: '🔥 Trending', description: 'Aproveita tendências virais' },
  behind_scenes: { label: '🎬 Bastidores', description: 'Mostra o processo por trás' },
  demonstration: { label: '🎯 Demonstração', description: 'Mostra o produto em ação' }
};

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function InstagramCopyGenerator({ productId, productName, productPrice, productCategory, productImages = [], productUrl, productBenefits, productFeatures, technicalSpecs, productSalesPitch, productDescription, productTargetAudience, productApplications, productFaq, productEcommerceHtml, competitorComparison, isOpen, onClose }: InstagramCopyGeneratorProps) {
  // === Estados existentes (Copies de texto) ===
  const [feedCopies, setFeedCopies] = useState<CopyVariation[]>([
    { variation: 1, approach: 'storytelling', copy: '', link: '' },
    { variation: 2, approach: 'benefits', copy: '', link: '' },
    { variation: 3, approach: 'problem_solution', copy: '', link: '' },
    { variation: 4, approach: 'urgency', copy: '', link: '' }
  ]);
  
  const [reelsCopies, setReelsCopies] = useState<CopyVariation[]>([
    { variation: 1, approach: 'educational', copy: '', link: '' },
    { variation: 2, approach: 'trending', copy: '', link: '' },
    { variation: 3, approach: 'behind_scenes', copy: '', link: '' },
    { variation: 4, approach: 'demonstration', copy: '', link: '' }
  ]);
  
  const [storyCopy, setStoryCopy] = useState('');
  const [storyLink, setStoryLink] = useState('');
  
  const [editingFeedVariation, setEditingFeedVariation] = useState<number | null>(null);
  const [editingReelsVariation, setEditingReelsVariation] = useState<number | null>(null);
  const [editingStory, setEditingStory] = useState(false);
  
  const [activeFeedTab, setActiveFeedTab] = useState(1);
  const [activeReelsTab, setActiveReelsTab] = useState(1);
  
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  // === Novos estados (Roteiro de Reels Audiovisual) ===
  const [reelsScripts, setReelsScripts] = useState<ReelsScript[]>([
    { variation: 1, approach: 'educational', hook: '', scenes: [], cta: '' },
    { variation: 2, approach: 'trending', hook: '', scenes: [], cta: '' },
    { variation: 3, approach: 'behind_scenes', hook: '', scenes: [], cta: '' },
    { variation: 4, approach: 'demonstration', hook: '', scenes: [], cta: '' }
  ]);
  const [activeReelsScriptTab, setActiveReelsScriptTab] = useState(1);
  const [generatingReelsScript, setGeneratingReelsScript] = useState(false);
  const [editingReelsScriptVariation, setEditingReelsScriptVariation] = useState<number | null>(null);

  // === Estados para Carrossel (7 Slides) ===
  const [feedCarousels, setFeedCarousels] = useState<FeedCarousel[]>([
    { variation: 1, approach: 'storytelling', slides: [] },
    { variation: 2, approach: 'benefits', slides: [] },
    { variation: 3, approach: 'problem_solution', slides: [] },
    { variation: 4, approach: 'urgency', slides: [] }
  ]);
  const [generatingCarousel, setGeneratingCarousel] = useState<number | null>(null);
  const [activeCarouselSlide, setActiveCarouselSlide] = useState<Record<number, number>>({
    1: 1, 2: 1, 3: 1, 4: 1
  });

  const { toast } = useToast();

  // === Estados para Carrossel Visual (6 Slides Estratégicos) ===
  const [slideImageMap, setSlideImageMap] = useState<Record<number, string>>({});
  const [allProductImages, setAllProductImages] = useState<Array<{ url: string; alt?: string }>>(productImages);
  const [primaryColor, setPrimaryColor] = useState('#1a1a2e');
  const [accentColor, setAccentColor] = useState('#e94560');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [sendingSmartOps, setSendingSmartOps] = useState(false);
  const [generatingVisualCarousel, setGeneratingVisualCarousel] = useState(false);
  const [generatingHook, setGeneratingHook] = useState(false);
  const [generatingScience, setGeneratingScience] = useState(false);
  const [generatingExperience, setGeneratingExperience] = useState(false);
  const [generatingSecurity, setGeneratingSecurity] = useState(false);
  const [slideTexts, setSlideTexts] = useState<Partial<SlideTextsType>>({});

  // === Visual Carousel: image/video file upload (delegated by StrategicCarouselPreview) ===
  const handleVisualSlideFileUpload = async (slideNum: number, file: File) => {
    const MAX_BYTES = 100 * 1024 * 1024;
    const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
    const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);

    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: `${fileSizeMB} MB excede o limite de 100 MB.`, variant: 'destructive', duration: 8000 });
      return;
    }

    const isVideo = file.type.startsWith('video/');
    if (isVideo && !ALLOWED_VIDEO_MIME.includes(file.type)) {
      toast({ title: 'Formato de vídeo não suportado', description: `Use MP4, MOV, WebM ou M4V.`, variant: 'destructive' });
      return;
    }
    if (!isVideo && file.type.startsWith('image/') && !ALLOWED_IMAGE_MIME.includes(file.type)) {
      toast({ title: 'Formato de imagem não suportado', description: 'Use PNG, JPEG, WEBP ou GIF.', variant: 'destructive' });
      return;
    }

    const folder = isVideo ? 'video' : 'image';
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'png');
    const path = `visual-carousel/${productId}/slide_${slideNum}_${folder}_${Date.now()}.${ext}`;

    console.log('[VISUAL_CAROUSEL_UPLOAD_START]', { slideNum, isVideo, fileSizeMB, path });

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error('[VISUAL_CAROUSEL_UPLOAD_FAIL]', { slideNum, error: uploadError });
      toast({ title: 'Erro no upload', description: `${uploadError.message} (${fileSizeMB} MB)`, variant: 'destructive', duration: 8000 });
      return;
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    if (!urlData?.publicUrl) return;

    if (isVideo) {
      setSlideTexts(prev => ({
        ...prev,
        [slideNum]: { ...((prev[slideNum as keyof SlideTextsType] as any) || {}), mediaType: 'video', videoStorageUrl: urlData.publicUrl },
      }));
      toast({ title: '✅ Vídeo enviado', description: `Slide ${slideNum} atualizado (${fileSizeMB} MB).`, duration: 4000 });
    } else {
      setSlideImageMap(prev => ({ ...prev, [slideNum]: urlData.publicUrl }));
      setSlideTexts(prev => ({
        ...prev,
        [slideNum]: { ...((prev[slideNum as keyof SlideTextsType] as any) || {}), mediaType: 'image' },
      }));
      toast({ title: '✅ Imagem enviada', description: `Slide ${slideNum} atualizado.`, duration: 3000 });
    }
  };

  // === Logos (empresa + produto) — aplicam em todos os slides do Carrossel Visual ===
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>('');
  const [productLogoUrl, setProductLogoUrl] = useState<string>('');
  const [companyLogoScale, setCompanyLogoScale] = useState<number>(100);
  const [productLogoScale, setProductLogoScale] = useState<number>(100);

  const handleLogoUpload = async (kind: 'company' | 'product', file: File) => {
    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Formato não suportado', description: 'Use PNG, JPEG, WEBP ou SVG.', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Logo muito grande', description: 'Limite de 8 MB.', variant: 'destructive' });
      return;
    }
    const ext = file.name.split('.').pop() || 'png';
    const path = `visual-carousel/${productId}/logo_${kind}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: 'Erro no upload do logo', description: error.message, variant: 'destructive' });
      return;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    if (!urlData?.publicUrl) return;
    if (kind === 'company') setCompanyLogoUrl(urlData.publicUrl);
    else setProductLogoUrl(urlData.publicUrl);
    toast({ title: `✅ Logo ${kind === 'company' ? 'da empresa' : 'do produto'} atualizado` });
  };

  const [fontFamily, setFontFamily] = useState<string>('system-ui, -apple-system, sans-serif');
  const [fontSize, setFontSize] = useState<number>(100);
  const [savingVisualCarousel, setSavingVisualCarousel] = useState(false);

  function extractHookFromSalesPitch(pitch: string): string | null {
    if (!pitch || pitch.length < 10) return null;
    const sentences = pitch.split(/[.!]/);
    const firstSentence = sentences[0]?.trim();
    if (!firstSentence || firstSentence.length < 15) return null;
    if (firstSentence.length <= 80) return firstSentence;
    const firstClause = firstSentence.split(',')[0]?.trim();
    if (firstClause && firstClause.length >= 20 && firstClause.length <= 80) return firstClause;
    // Truncar na última palavra inteira antes de 80 chars
    const truncated = firstSentence.slice(0, 80).split(' ').slice(0, -1).join(' ');
    return truncated.length >= 20 ? truncated : null;
  }

  function buildSmartHook(name: string, benefits: string[], features: string[], pitch?: string): string {
    // ÚNICA fonte legítima: o sales_pitch real do produto
    if (pitch) {
      const pitchHook = extractHookFromSalesPitch(pitch);
      if (pitchHook) return pitchHook;
    }
    // Sem pitch: apenas o nome do produto, sem adicionar palavras inventadas
    if (name) return name;
    return 'Produto';
  }

  function buildDefaultSlideTexts(): Partial<SlideTextsType> {
    const b = productBenefits || [];
    const f = productFeatures || [];
    return {
      1: { hook: buildSmartHook(productName, b, f, productSalesPitch), productName },
      2: { category: productCategory || '', introLabel: 'Apresentando', productName },
      3: {
        title: 'Por que confiar?',
        headline: b[0] || '',
        bullet1: b[1] || '',
        bullet2: b[2] || '',
        bullet3: b[3] || '',
        bullet4: b[4] || '',
      },
      4: { label: 'EXPERIÊNCIA', keyword: f[0] || '', benefit: b[2] || b[1] || b[0] || '' },
      5: { title: 'Você pode confiar', badge1: f[1] || f[0] || '', badge2: f[2] || b[1] || '', badge3: f[3] || b[2] || '' },
      6: { productName, ctaButton: '🛒 Comprar Agora', linkLabel: '🔗 Link na Bio', footer: 'Direct para mais informações' },
    };
  }

  useEffect(() => {
    if (!isOpen) return;
    // Reset images to prop initially
    setAllProductImages(productImages);
    if (productImages && productImages.length > 0) {
      const map: Record<number, string> = {};
      for (let i = 1; i <= 6; i++) {
        map[i] = productImages[(i - 1) % productImages.length].url;
      }
      setSlideImageMap(map);
    }
    loadExistingCopies();
  }, [isOpen, productId]);

  const loadExistingCopies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('instagram_copies, instagram_reels_scripts, image_url, images_gallery')
        .eq('id', productId)
        .single();

      if (error) throw error;

      // Rebuild the full image list from DB (in case parent didn't pass all gallery images)
      const dbImageUrl = (data as any)?.image_url;
      const dbGallery = Array.isArray((data as any)?.images_gallery) ? (data as any).images_gallery : [];
      const allImgs: Array<{ url: string; alt?: string }> = [];
      if (dbImageUrl) allImgs.push({ url: dbImageUrl, alt: 'Produto' });
      dbGallery.forEach((g: { url: string; alt?: string }) => {
        if (g?.url && !allImgs.find(i => i.url === g.url)) allImgs.push({ url: g.url, alt: g.alt });
      });
      if (allImgs.length > 0) {
        setAllProductImages(allImgs);
        // Also seed slideImageMap if it's still empty
        setSlideImageMap(prev => {
          const hasImages = Object.values(prev).some(v => v);
          if (!hasImages) {
            const map: Record<number, string> = {};
            for (let i = 1; i <= 6; i++) map[i] = allImgs[(i - 1) % allImgs.length].url;
            return map;
          }
          return prev;
        });
      }

      const instagramData = data?.instagram_copies as InstagramCopy;
      
      if (instagramData) {
        if (instagramData.feed_copies && instagramData.feed_copies.length > 0) {
          setFeedCopies(instagramData.feed_copies);
        }
        else if (instagramData.feed_copy) {
          setFeedCopies([
            { variation: 1, approach: 'storytelling', copy: instagramData.feed_copy, link: instagramData.feed_link }
          ]);
        }
        
        if (instagramData.reels_copies && instagramData.reels_copies.length > 0) {
          setReelsCopies(instagramData.reels_copies);
        }
        else if (instagramData.reels_copy) {
          setReelsCopies([
            { variation: 1, approach: 'educational', copy: instagramData.reels_copy, link: instagramData.reels_link }
          ]);
        }
        
        if (instagramData.story_copy) {
          setStoryCopy(instagramData.story_copy);
          setStoryLink(instagramData.story_link || '');
        }
      }

      // Carregar scripts de reels audiovisuais
      if (data?.instagram_reels_scripts && Array.isArray(data.instagram_reels_scripts) && data.instagram_reels_scripts.length > 0) {
        // O formato salvo é: [{ generated_at, reels_scripts: [...] }]
        const latestEntry = data.instagram_reels_scripts[0] as { reels_scripts?: ReelsScript[] };
        if (latestEntry?.reels_scripts && Array.isArray(latestEntry.reels_scripts)) {
          setReelsScripts(latestEntry.reels_scripts);
        }
      }

      // Carregar carrosséis salvos
      if (instagramData?.feed_carousels && Array.isArray(instagramData.feed_carousels)) {
        setFeedCarousels(instagramData.feed_carousels as FeedCarousel[]);
      }

      // Carregar textos do Carrossel Visual salvo
      const copies = data?.instagram_copies as any;
      if (copies?.visual_carousel_texts) {
        const savedTexts = copies.visual_carousel_texts;
        // SEMPRE recalcular o hook do Slide 1 com o sales_pitch atual (nunca usar valor preso do banco)
        const freshHook = buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch);
        setSlideTexts({
          ...savedTexts,
          1: {
            ...savedTexts[1],
            hook: freshHook,
            productName: productName,
          }
        });
        if (copies.visual_carousel_colors) {
          setPrimaryColor(copies.visual_carousel_colors.primaryColor || '#1a1a2e');
          setAccentColor(copies.visual_carousel_colors.accentColor || '#e94560');
        }
        if (copies.visual_carousel_font) {
          setFontFamily(copies.visual_carousel_font.fontFamily || 'system-ui, -apple-system, sans-serif');
          setFontSize(copies.visual_carousel_font.fontSize || 100);
        }
      } else {
        setSlideTexts(buildDefaultSlideTexts());
      }
    } catch (error) {
      console.error('Erro ao carregar copies:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as copies existentes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVisualCarouselTexts = async () => {
    setSavingVisualCarousel(true);
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
            visual_carousel_texts: slideTexts,
            visual_carousel_colors: { primaryColor, accentColor },
            visual_carousel_font: { fontFamily, fontSize },
            last_updated: new Date().toISOString(),
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({ title: "💾 Salvo!", description: "Textos do Carrossel Visual salvos com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o Carrossel Visual.", variant: "destructive" });
    }
    setSavingVisualCarousel(false);
  };

  const getApproachLabel = (approach: string): string => {
    const labels: Record<string, string> = {
      storytelling: '📖 Storytelling',
      benefits: '✨ Benefícios',
      problem_solution: '💡 Problema/Solução',
      urgency: '⏰ Urgência',
      educational: '🎓 Educativa',
      trending: '🔥 Trending',
      behind_scenes: '🎬 Bastidores',
      demonstration: '🎯 Demonstração'
    };
    return labels[approach] || approach;
  };

  const generateAllVariations = async (type: 'feed' | 'reels') => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'instagram',
          productId: productId,
          instagramType: type
        }
      });

      if (error) throw error;

      if (data?.content) {
        if (type === 'feed' && data.content.feed_copies) {
          setFeedCopies(data.content.feed_copies);
        } else if (type === 'reels' && data.content.reels_copies) {
          setReelsCopies(data.content.reels_copies);
        }

        toast({
          title: "Sucesso!",
          description: data.message || `4 variações de ${type} geradas!`,
        });
      }
    } catch (error) {
      console.error(`Erro ao gerar ${type}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível gerar as variações de ${type}.`,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateStory = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-content', {
        body: {
          type: 'instagram',
          productId: productId,
          instagramType: 'carousel'
        }
      });

      if (error) throw error;

      if (data?.content && data.content.feed_copy) {
        setStoryCopy(data.content.feed_copy);
        
        const { data: existingData } = await supabase
          .from('products_repository')
          .select('instagram_copies')
          .eq('id', productId)
          .single();

        const existingCopies = (existingData?.instagram_copies || {}) as Record<string, any>;
        
        const { error: updateError } = await supabase
          .from('products_repository')
          .update({
            instagram_copies: {
              ...existingCopies,
              story_copy: data.content.feed_copy,
              last_generated: new Date().toISOString()
            } as any
          })
          .eq('id', productId);

        if (updateError) throw updateError;

        toast({
          title: "Sucesso!",
          description: "Copy para Stories gerada!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar Stories:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a copy para Stories.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // === Novas funções para Roteiro de Reels Audiovisual ===
  const generateReelsScripts = async () => {
    setGeneratingReelsScript(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-reels-script', {
        body: { productId }
      });

      if (error) throw error;

      if (data?.content?.reels_scripts && Array.isArray(data.content.reels_scripts)) {
        setReelsScripts(data.content.reels_scripts);
        toast({
          title: "Sucesso!",
          description: "Roteiros de Reels gerados com 4 variações!",
        });
      }
    } catch (error) {
      console.error('Erro ao gerar scripts de reels:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar os roteiros de Reels.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReelsScript(false);
    }
  };

  const saveReelsScript = async (variationNum: number) => {
    try {
      const { error } = await supabase
        .from('products_repository')
        .update({ instagram_reels_scripts: reelsScripts as any })
        .eq('id', productId);

      if (error) throw error;

      setEditingReelsScriptVariation(null);
      toast({
        title: "Salvo!",
        description: `Roteiro de Reels variação ${variationNum} salvo com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar script:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o roteiro.",
        variant: "destructive",
      });
    }
  };

  const updateReelsScriptField = (variationIndex: number, field: 'hook' | 'cta', value: string) => {
    const updated = [...reelsScripts];
    updated[variationIndex] = { ...updated[variationIndex], [field]: value };
    setReelsScripts(updated);
  };

  const updateReelsScriptScene = (variationIndex: number, sceneIndex: number, field: 'visual' | 'dialogue', value: string) => {
    const updated = [...reelsScripts];
    const updatedScenes = [...updated[variationIndex].scenes];
    updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], [field]: value };
    updated[variationIndex] = { ...updated[variationIndex], scenes: updatedScenes };
    setReelsScripts(updated);
  };

  const addReelsScriptScene = (variationIndex: number) => {
    const updated = [...reelsScripts];
    updated[variationIndex] = {
      ...updated[variationIndex],
      scenes: [...updated[variationIndex].scenes, { visual: '', dialogue: '' }]
    };
    setReelsScripts(updated);
  };

  const removeReelsScriptScene = (variationIndex: number, sceneIndex: number) => {
    const updated = [...reelsScripts];
    if (updated[variationIndex].scenes.length <= 1) return;
    updated[variationIndex] = {
      ...updated[variationIndex],
      scenes: updated[variationIndex].scenes.filter((_, i) => i !== sceneIndex)
    };
    setReelsScripts(updated);
  };

  const copyReelsScriptToClipboard = (script: ReelsScript) => {
    const text = `ROTEIRO DE REELS - ${REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}

🎣 HOOK: ${script.hook}

🎬 CENAS:
${script.scenes.map((scene, i) => `
CENA ${i + 1}:
📹 Visual: ${scene.visual}
💬 Diálogo: ${scene.dialogue}
`).join('\n')}

📢 CTA: ${script.cta}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Roteiro copiado para a área de transferência." });
  };

  const copyReelsScriptAsHTML = (script: ReelsScript) => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Roteiro de Reels - ${productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #405de6, #833ab4, #c13584, #e1306c); min-height: 100vh; }
    .container { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    h1 { background: linear-gradient(135deg, #405de6, #c13584); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-top: 0; }
    .hook { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 12px 12px 0; margin: 16px 0; }
    .scene { background: #f3f4f6; padding: 16px; border-radius: 12px; margin: 12px 0; }
    .scene-number { font-weight: bold; color: #c13584; margin-bottom: 8px; }
    .visual { background: #dbeafe; padding: 10px; border-radius: 8px; margin: 6px 0; }
    .dialogue { background: #fce7f3; padding: 10px; border-radius: 8px; margin: 6px 0; }
    .cta { background: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 12px 12px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎬 ${REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}</h1>
    <div class="hook"><strong>🎣 Hook:</strong> ${script.hook}</div>
    <h2>🎬 Cenas</h2>
    ${script.scenes.map((scene, i) => `
    <div class="scene">
      <div class="scene-number">CENA ${i + 1}</div>
      <div class="visual"><strong>📹 Visual:</strong> ${scene.visual}</div>
      <div class="dialogue"><strong>💬 Diálogo:</strong> ${scene.dialogue}</div>
    </div>`).join('')}
    <div class="cta"><strong>📢 CTA:</strong> ${script.cta}</div>
  </div>
</body>
</html>`;

    navigator.clipboard.writeText(html);
    toast({ title: "HTML Copiado!", description: "Versão HTML do roteiro copiada." });
  };

  // === Funções para Carrossel (6 Slides — Metodologia Smart Dent) ===
  const SLIDE_TITLES: Record<number, string> = {
    1: 'Gancho',
    2: 'Solução',
    3: 'Diferencial Técnico',
    4: 'Experiência / Fluxo',
    5: 'Autoridade Smart Dent',
    6: 'CTA (Chamada para Ação)'
  };

  const generateCarouselFromFeed = async (variationNum: number) => {
    const feedVariation = feedCopies.find(v => v.variation === variationNum);
    if (!feedVariation?.copy) {
      toast({ 
        title: "Erro", 
        description: "Gere primeiro o texto do Feed antes de criar o carrossel", 
        variant: "destructive" 
      });
      return;
    }

    setGeneratingCarousel(variationNum);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-carousel', {
        body: {
          productId,
          feedCopy: feedVariation.copy,
          approach: feedVariation.approach
        }
      });

      if (error) throw error;

      if (data?.slides) {
        const updatedCarousels = [...feedCarousels];
        const index = updatedCarousels.findIndex(c => c.variation === variationNum);
        if (index !== -1) {
          updatedCarousels[index] = {
            ...updatedCarousels[index],
            slides: data.slides,
            generated_at: new Date().toISOString()
          };
          setFeedCarousels(updatedCarousels);
          
          // Salvar carrossel no banco
          await saveCarouselToDatabase(updatedCarousels);
        }
        toast({ title: "Sucesso!", description: "Carrossel gerado com 7 slides!" });
      }
    } catch (error) {
      console.error('Erro ao gerar carrossel:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível gerar o carrossel", 
        variant: "destructive" 
      });
    } finally {
      setGeneratingCarousel(null);
    }
  };

  const saveCarouselToDatabase = async (carousels: FeedCarousel[]) => {
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
            feed_carousels: carousels,
            last_carousel_update: new Date().toISOString()
          } as any
        })
        .eq('id', productId);
    } catch (error) {
      console.error('Erro ao salvar carrossel:', error);
    }
  };

  const copyCarouselSlide = (slide: CarouselSlide) => {
    const text = `SLIDE ${slide.position}: ${slide.title}

📸 SUGESTÃO DE IMAGEM:
${slide.image_suggestion}

✍️ TEXTO:
${slide.text}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `Slide ${slide.position} copiado!` });
  };

  const copyAllCarouselSlides = (carousel: FeedCarousel) => {
    const text = carousel.slides.map(s => 
      `SLIDE ${s.position}: ${s.title}\n\n📸 SUGESTÃO DE IMAGEM:\n${s.image_suggestion}\n\n✍️ TEXTO:\n${s.text}`
    ).join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
    
    const header = `CARROSSEL INSTAGRAM - ${getApproachLabel(carousel.approach).toUpperCase()}\n${productName}\n\n`;
    navigator.clipboard.writeText(header + text);
    toast({ title: "Copiado!", description: "Todos os 7 slides copiados!" });
  };

  const copyCarouselAsHTML = (carousel: FeedCarousel) => {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Carrossel Instagram - ${productName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #405de6, #833ab4, #c13584, #e1306c); min-height: 100vh; }
    .container { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    h1 { background: linear-gradient(135deg, #405de6, #c13584); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-top: 0; text-align: center; }
    .approach { text-align: center; color: #666; margin-bottom: 24px; }
    .slide { background: #f8f9fa; padding: 20px; border-radius: 16px; margin: 16px 0; border-left: 4px solid #c13584; }
    .slide-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .slide-number { background: linear-gradient(135deg, #405de6, #c13584); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .slide-title { font-weight: bold; color: #333; font-size: 16px; }
    .image-suggestion { background: #e0f2fe; padding: 12px; border-radius: 8px; margin: 8px 0; }
    .image-suggestion strong { color: #0369a1; }
    .text-content { background: #fef3c7; padding: 12px; border-radius: 8px; }
    .text-content strong { color: #b45309; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 Carrossel Instagram</h1>
    <p class="approach">${getApproachLabel(carousel.approach)} - ${productName}</p>
    ${carousel.slides.map(slide => `
    <div class="slide">
      <div class="slide-header">
        <div class="slide-number">${slide.position}</div>
        <span class="slide-title">${slide.title}</span>
      </div>
      <div class="image-suggestion">
        <strong>📸 Sugestão de Imagem:</strong><br>
        ${slide.image_suggestion}
      </div>
      <div class="text-content">
        <strong>✍️ Texto:</strong><br>
        ${slide.text}
      </div>
    </div>`).join('')}
  </div>
</body>
</html>`;

    navigator.clipboard.writeText(html);
    toast({ title: "HTML Copiado!", description: "Versão HTML do carrossel copiada!" });
  };

  const getCarouselForVariation = (variationNum: number): FeedCarousel | undefined => {
    return feedCarousels.find(c => c.variation === variationNum);
  };

  // === Export ZIP — Carrossel Visual (PNGs 1080×1350px) ===
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();
      const productData = {
        name: productName,
        price: productPrice,
        category: productCategory,
        benefits: productBenefits,
        features: productFeatures,
        technicalSpecs: technicalSpecs,
        productUrl: productUrl,
        feedCopyBenefits: feedCopies.find(v => v.approach === 'benefits')?.copy || undefined,
        feedCopyProblemSolution: feedCopies.find(v => v.approach === 'problem_solution')?.copy || undefined,
        competitorComparison: competitorComparison,
      };

      const SLIDE_FILE_NAMES: Record<number, string> = {
        1: 'slide-1-hook',
        2: 'slide-2-solucao',
        3: 'slide-3-tecnico',
        4: 'slide-4-experiencia',
        5: 'slide-5-seguranca',
        6: 'slide-6-cta',
      };

      for (let i = 1; i <= 6; i++) {
        const textsForSlide = (slideTexts[i as keyof SlideTextsType] as unknown as Record<string, string>) || {};
        const isVideo = textsForSlide.mediaType === 'video' && (textsForSlide.videoStorageUrl || textsForSlide.videoSrc);
        const logos = { companyUrl: companyLogoUrl, productUrl: productLogoUrl, companyScale: companyLogoScale, productScale: productLogoScale };

        if (isVideo) {
          try {
            const videoUrl = String(textsForSlide.videoStorageUrl || textsForSlide.videoSrc);
            const productData2 = productData;
            const videoBlob = await generateStrategicSlideVideo(i, videoUrl, primaryColor, accentColor, productData2, textsForSlide, logos);
            zip.file(`${SLIDE_FILE_NAMES[i]}.webm`, videoBlob);
            continue;
          } catch (vErr) {
            console.error(`[ZIP] Falha vídeo slide ${i}, fallback para PNG:`, vErr);
            // fall through to PNG fallback below
          }
        }

        try {
          const safeDataUrl = await fetchAsDataUrl(slideImageMap[i] || '');
          const pngBlob = await generateSlidePNG(i, safeDataUrl, primaryColor, accentColor, productData, textsForSlide, logos);
          zip.file(`${SLIDE_FILE_NAMES[i]}.png`, pngBlob);
        } catch (slideErr) {
          console.warn(`Slide ${i} gerado sem imagem (fallback):`, slideErr);
          const pngBlob = await generateSlidePNG(i, '', primaryColor, accentColor, productData, textsForSlide, logos);
          zip.file(`${SLIDE_FILE_NAMES[i]}.png`, pngBlob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `carrossel-${productName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "📦 ZIP gerado!", description: "6 PNGs de 1080×1350px baixados com sucesso." });
    } catch (error) {
      console.error('Erro ao gerar ZIP:', error);
      toast({ title: "Erro", description: "Não foi possível gerar o ZIP.", variant: "destructive" });
    } finally {
      setIsExportingZip(false);
    }
  };

  // === Enviar SmartOps — Carrossel Visual ===
  const handleSendSmartOpsVisual = async () => {
    setSendingSmartOps(true);
    try {
      const productData = {
        name: productName,
        price: productPrice,
        category: productCategory,
        benefits: productBenefits,
        features: productFeatures,
        technicalSpecs: technicalSpecs,
        productUrl: productUrl,
        feedCopyBenefits: feedCopies.find(v => v.approach === 'benefits')?.copy || undefined,
        feedCopyProblemSolution: feedCopies.find(v => v.approach === 'problem_solution')?.copy || undefined,
        competitorComparison: competitorComparison,
      };

      toast({ title: 'Gerando carrossel...', description: 'Renderizando 6 slides (PNG/vídeo).' });
      const slidesPayload: Array<{ blob: Blob; ext: string; contentType: string }> = [];
      const logos = { companyUrl: companyLogoUrl, productUrl: productLogoUrl, companyScale: companyLogoScale, productScale: productLogoScale };
      for (let i = 1; i <= 6; i++) {
        const textsForSlide = (slideTexts[i as keyof SlideTextsType] as unknown as Record<string, string>) || {};
        const isVideo = textsForSlide.mediaType === 'video' && (textsForSlide.videoStorageUrl || textsForSlide.videoSrc);
        console.log(`[SMARTOPS_VISUAL] preparando slide ${i}/6 (${isVideo ? 'VIDEO' : 'PNG'})`);

        if (isVideo) {
          try {
            const videoUrl = String(textsForSlide.videoStorageUrl || textsForSlide.videoSrc);
            const videoBlob = await Promise.race<Blob>([
              generateStrategicSlideVideo(i, videoUrl, primaryColor, accentColor, productData, textsForSlide, logos),
              new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error(`Timeout (150s) renderizando vídeo slide ${i}`)), 150_000)),
            ]);
            console.log(`[SMARTOPS_VISUAL] slide ${i} vídeo pronto (${videoBlob.size} bytes)`);
            slidesPayload.push({ blob: videoBlob, ext: 'webm', contentType: 'video/webm' });
            continue;
          } catch (e) {
            console.error(`[SMARTOPS_VISUAL] vídeo slide ${i} falhou, fallback PNG:`, e);
          }
        }

        let safeDataUrl = '';
        try { safeDataUrl = await fetchAsDataUrl(slideImageMap[i] || ''); }
        catch (e) { console.warn(`SmartOps slide ${i} sem imagem (fallback):`, e); }
        const pngBlob = await Promise.race<Blob>([
          generateSlidePNG(i, safeDataUrl, primaryColor, accentColor, productData, textsForSlide, logos),
          new Promise<Blob>((_, reject) => setTimeout(() => reject(new Error(`Timeout (45s) renderizando slide ${i}`)), 45_000)),
        ]);
        console.log(`[SMARTOPS_VISUAL] slide ${i} PNG pronto (${pngBlob.size} bytes)`);
        slidesPayload.push({ blob: pngBlob, ext: 'png', contentType: 'image/png' });
      }

      toast({ title: 'Enviando para SmartOps...', description: '6 slides → bucket wa-media.' });
      const produtoSlug = slugify(productName);
      const { ref, total } = await uploadCarouselToSmartOps({
        slides: slidesPayload,
        produtoSlug,
        tipo: 'visual',
      });

      toast({ title: '📤 Carrossel enviado!', description: 'Abrindo Social Publisher...' });
      const url = buildSocialPublisherUrl({ ref, produtoSlug, tipo: 'visual', total });
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



  // === Gerar textos do Carrossel Visual com IA ===
  const generateVisualCarouselTexts = async () => {
    setGeneratingVisualCarousel(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-instagram-carousel', {
        body: { productId, feedCopy: feedCopies[0]?.copy || '', approach: 'storytelling' }
      });
      if (error) throw error;
      if (data?.slides && Array.isArray(data.slides)) {
        const s = data.slides;
        // Replace slide texts completely — do NOT spread prev per slide so old values don't persist
        setSlideTexts(prev => {
          const prevTexts = prev as any;
          return {
            ...prev,
            // Slide 1: Priorizar gancho da IA, fallback para buildSmartHook local
            1: (() => {
              const aiHook = s[0]?.text?.split('\n')[0]?.trim();
              return {
                hook: (aiHook && aiHook.length >= 10 && aiHook.length <= 120)
                  ? aiHook
                  : buildSmartHook(productName, productBenefits || [], productFeatures || [], productSalesPitch),
                productName: prevTexts[1]?.productName || productName,
              };
            })(),
            3: (() => {
              const slide3Text = s[2]?.text || '';
              const slide3Lines = slide3Text
                .split('\n')
                .map((l: string) => l.replace(/^[-•*✅🔬⚡🛡⭐💡🔥🎯]\s*/, '').trim())
                .filter(Boolean);
              // Filtrar linhas de sugestão visual (infográfico, imagem de, etc.)
              const contentLines = slide3Lines.filter((l: string) => {
                const lower = l.toLowerCase();
                return !(
                  /^\[.{10,}\]/.test(l) ||
                  lower.includes('infográfico') ||
                  lower.includes('ilustração') ||
                  lower.includes('diagrama') ||
                  lower.startsWith('imagem de') ||
                  lower.startsWith('imagem da') ||
                  lower.startsWith('imagem do') ||
                  lower.includes('imagem mostrando') ||
                  lower.includes('dentista aplicando') ||
                  lower.includes('profissional aplicando')
                );
              });
              return {
                title:    s[2]?.title   || prevTexts[3]?.title    || 'Por que confiar?',
                headline: contentLines[0] || prevTexts[3]?.headline || '',
                body:     contentLines[1] || prevTexts[3]?.body     || '',
                bullet1:  contentLines[2] || prevTexts[3]?.bullet1  || '',
                bullet2:  contentLines[3] || prevTexts[3]?.bullet2  || '',
                bullet3:  contentLines[4] || prevTexts[3]?.bullet3  || '',
                bullet4:  contentLines[5] || prevTexts[3]?.bullet4  || '',
              };
            })(),
            4: {
              // label fixo — nunca usar image_suggestion da IA
              label: prevTexts[4]?.label || 'EXPERIÊNCIA / FLUXO',
              keyword: s[3]?.title || prevTexts[4]?.keyword || '',
              benefit: s[3]?.text || prevTexts[4]?.benefit || '',
            },
            5: (() => {
              // Extrair badges do text do Slide 5 (linhas separadas por \n)
              const slide5Lines = (s[4]?.text || '')
                .split('\n')
                .map((l: string) => l.replace(/^[-•*✅🔬🦷]\s*/, '').trim())
                .filter(Boolean);
              return {
                title: s[4]?.title || prevTexts[5]?.title || 'Tecnologia Smart Dent',
                badge1: slide5Lines[0] || prevTexts[5]?.badge1 || '',
                badge2: slide5Lines[1] || prevTexts[5]?.badge2 || '',
                badge3: slide5Lines[2] || prevTexts[5]?.badge3 || '',
              };
            })(),
            6: (() => {
              // Priorizar cta_label explícito da IA; fallback para primeira linha curta do text
              const ctaLabelAI = (s[5] as any)?.cta_label?.trim();
              const slide6Lines = (s[5]?.text || '')
                .split('\n')
                .map((l: string) => l.trim())
                .filter(Boolean);
              const ctaCandidate = slide6Lines.find((l: string) => l.length >= 5 && l.length <= 55);
              const ctaButton = ctaLabelAI
                ? ctaLabelAI
                : (ctaCandidate && ctaCandidate.length <= 55 ? ctaCandidate : '💡 Saiba Mais');
              return {
                productName: prevTexts[6]?.productName || productName,
                ctaButton,
                linkLabel: prevTexts[6]?.linkLabel || '🔗 Link na Bio',
                footer: prevTexts[6]?.footer || 'Direct para mais informações',
              };
            })(),
          };
        });
        toast({ title: "✨ Textos gerados!", description: "Slides 1, 3, 4, 5 e 6 atualizados com IA." });
      } else {
        toast({ title: "Aviso", description: "A IA não retornou slides. Tente novamente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível gerar textos com IA.", variant: "destructive" });
    }
    setGeneratingVisualCarousel(false);
  };

  // === Copy consolidada dos 6 slides ===
  const buildCarouselCopy = (): string => {
    const t = slideTexts as Partial<SlideTextsType>;
    return [
      `SLIDE 1 — HOOK\n${(t[1] as any)?.hook || ''}`,
      `━━━━━━━━━━━━━━━━━━\nSLIDE 2 — APRESENTAÇÃO\nProduto: ${(t[2] as any)?.productName || productName}\n${(t[2] as any)?.category ? `Categoria: ${(t[2] as any).category}` : ''}`,
      `━━━━━━━━━━━━━━━━━━\nSLIDE 3 — DIFERENCIAIS\n${(t[3] as any)?.title || 'Por que confiar?'}`,
      `━━━━━━━━━━━━━━━━━━\nSLIDE 4 — EXPERIÊNCIA\n${(t[4] as any)?.keyword || ''}\n${(t[4] as any)?.benefit || ''}`,
      `━━━━━━━━━━━━━━━━━━\nSLIDE 5 — SEGURANÇA\n${(t[5] as any)?.title || ''}\n✅ ${(t[5] as any)?.badge1 || ''}\n✅ ${(t[5] as any)?.badge2 || ''}\n✅ ${(t[5] as any)?.badge3 || ''}`,
      `━━━━━━━━━━━━━━━━━━\nSLIDE 6 — CTA\n${(t[6] as any)?.ctaButton || ''}\n${(t[6] as any)?.linkLabel || ''}\n${(t[6] as any)?.footer || ''}`,
    ].join('\n\n');
  };


  // === Funções existentes de salvar ===
  const saveFeedVariation = async (variationNum: number, copy: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = (existingData?.instagram_copies as InstagramCopy) || {};
      
      const updatedFeedCopies = [...feedCopies];
      const index = updatedFeedCopies.findIndex(v => v.variation === variationNum);
      if (index !== -1) {
        updatedFeedCopies[index] = { ...updatedFeedCopies[index], copy, link };
      }

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            ...(existingCopies || {}),
            feed_copies: updatedFeedCopies,
            last_updated: new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Variação ${variationNum} de Feed salva com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a variação.",
        variant: "destructive",
      });
    }
  };

  const saveReelsVariation = async (variationNum: number, copy: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = (existingData?.instagram_copies as InstagramCopy) || {};
      
      const updatedReelsCopies = [...reelsCopies];
      const index = updatedReelsCopies.findIndex(v => v.variation === variationNum);
      if (index !== -1) {
        updatedReelsCopies[index] = { ...updatedReelsCopies[index], copy, link };
      }

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: {
            ...(existingCopies || {}),
            reels_copies: updatedReelsCopies,
            last_updated: new Date().toISOString()
          } as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: `Variação ${variationNum} de Reels salva com sucesso!`,
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a variação.",
        variant: "destructive",
      });
    }
  };

  const saveStory = async (content: string, link?: string) => {
    try {
      const { data: existingData } = await supabase
        .from('products_repository')
        .select('instagram_copies')
        .eq('id', productId)
        .single();

      const existingCopies = existingData?.instagram_copies as any || {};

      const updatedCopies = {
        ...existingCopies,
        story_copy: content,
        story_link: link || '',
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({
          instagram_copies: updatedCopies as any
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Salvo!",
        description: "Copy Stories salva com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a copy.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Texto copiado para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const copyHTMLVersion = async (text: string, type: 'feed' | 'story' | 'reels') => {
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instagram ${type.charAt(0).toUpperCase() + type.slice(1)} - ${productName}</title>
  <meta name="description" content="Copy para Instagram ${type} do produto ${productName}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); min-height: 100vh; }
    .instagram-container { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
    .instagram-header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #efefef; }
    .instagram-content { font-size: 16px; line-height: 1.6; white-space: pre-wrap; color: #262626; }
    .hashtag { color: #0095f6; font-weight: 500; }
  </style>
</head>
<body>
  <div class="instagram-container">
    <div class="instagram-header"><strong>${productName}</strong></div>
    <div class="instagram-content">${text.replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')}</div>
  </div>
</body>
</html>`;

      await navigator.clipboard.writeText(htmlContent);
      toast({
        title: "HTML Copiado!",
        description: `Versão HTML da copy ${type} copiada.`,
      });
    } catch (error) {
      console.error('Erro ao copiar HTML:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar a versão HTML.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Gerador de Copy Instagram - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* SEÇÃO FEED - COM TABS PARA 4 VARIAÇÕES */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Feed (4 Variações)</CardTitle>
                    <Button
                      onClick={() => generateAllVariations('feed')}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeFeedTab)} onValueChange={(v) => setActiveFeedTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {feedCopies.map((variation) => (
                        <TabsTrigger key={variation.variation} value={String(variation.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{variation.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {variation.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {feedCopies.map((variation, index) => (
                      <TabsContent key={variation.variation} value={String(variation.variation)} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {getApproachLabel(variation.approach)}
                          </Badge>
                          {variation.copy && (
                            <span className="text-xs text-muted-foreground">
                              {variation.copy.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={variation.copy}
                          onChange={(e) => {
                            const newCopies = [...feedCopies];
                            newCopies[index].copy = e.target.value;
                            setFeedCopies(newCopies);
                          }}
                          className="min-h-[200px]"
                          placeholder={`Copy ${variation.variation} será gerada aqui...`}
                          readOnly={editingFeedVariation !== variation.variation}
                        />

                        {editingFeedVariation === variation.variation && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Link Externo (Canva)</label>
                            <Input
                              value={variation.link || ''}
                              onChange={(e) => {
                                const newCopies = [...feedCopies];
                                newCopies[index].link = e.target.value;
                                setFeedCopies(newCopies);
                              }}
                              placeholder="https://canva.com/design/..."
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          {editingFeedVariation === variation.variation ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  saveFeedVariation(variation.variation, variation.copy, variation.link);
                                  setEditingFeedVariation(null);
                                }}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  loadExistingCopies();
                                  setEditingFeedVariation(null);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingFeedVariation(variation.variation)}
                                disabled={!variation.copy}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              {variation.link && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(variation.link, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Canva
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(variation.copy)}
                                disabled={!variation.copy}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion(variation.copy, 'feed')}
                                disabled={!variation.copy}
                              >
                                <Code className="h-4 w-4 mr-2" />
                                HTML
                              </Button>
                            </>
                          )}
                        </div>

                        {/* === SEÇÃO CARROSSEL (7 Slides) === */}
                        <div className="mt-6 pt-4 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Image className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">Carrossel (7 Slides)</span>
                              {getCarouselForVariation(variation.variation)?.slides?.length === 7 && (
                                <Badge variant="secondary" className="text-xs">Gerado</Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateCarouselFromFeed(variation.variation)}
                              disabled={generatingCarousel === variation.variation || !variation.copy}
                            >
                              {generatingCarousel === variation.variation ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                              )}
                              Gerar IA
                            </Button>
                          </div>

                          {/* Navegação de Slides */}
                          {getCarouselForVariation(variation.variation)?.slides?.length === 7 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setActiveCarouselSlide(prev => ({
                                    ...prev,
                                    [variation.variation]: Math.max(1, (prev[variation.variation] || 1) - 1)
                                  }))}
                                  disabled={(activeCarouselSlide[variation.variation] || 1) === 1}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                
                                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                  <Button
                                    key={num}
                                    size="sm"
                                    variant={(activeCarouselSlide[variation.variation] || 1) === num ? "default" : "outline"}
                                    className="h-8 w-8 p-0"
                                    onClick={() => setActiveCarouselSlide(prev => ({
                                      ...prev,
                                      [variation.variation]: num
                                    }))}
                                  >
                                    {num}
                                  </Button>
                                ))}
                                
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setActiveCarouselSlide(prev => ({
                                    ...prev,
                                    [variation.variation]: Math.min(7, (prev[variation.variation] || 1) + 1)
                                  }))}
                                  disabled={(activeCarouselSlide[variation.variation] || 1) === 7}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Conteúdo do Slide Ativo */}
                              {(() => {
                                const carousel = getCarouselForVariation(variation.variation);
                                const activeSlideNum = activeCarouselSlide[variation.variation] || 1;
                                const slide = carousel?.slides?.find(s => s.position === activeSlideNum);
                                
                                if (!slide) return null;
                                
                                return (
                                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="font-mono">
                                        Slide {slide.position}
                                      </Badge>
                                      <span className="font-medium text-sm">{slide.title}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                          <Image className="h-3 w-3" />
                                          Sugestão de Imagem
                                        </label>
                                        <div className="bg-background rounded-md p-3 text-sm border min-h-[80px]">
                                          {slide.image_suggestion}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                          <Edit className="h-3 w-3" />
                                          Texto do Slide
                                        </label>
                                        <div className="bg-background rounded-md p-3 text-sm border min-h-[80px] font-medium">
                                          {slide.text}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyCarouselSlide(slide)}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copiar Slide
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Botões de exportação do carrossel completo */}
                              <div className="flex justify-end gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyAllCarouselSlides(getCarouselForVariation(variation.variation)!)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copiar Todos
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyCarouselAsHTML(getCarouselForVariation(variation.variation)!)}
                                >
                                  <Code className="h-4 w-4 mr-2" />
                                  HTML
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* SEÇÃO STORIES - MANTÉM ÚNICO */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Stories</CardTitle>
                    <Button
                      onClick={generateStory}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={storyCopy}
                    onChange={(e) => setStoryCopy(e.target.value)}
                    className="min-h-[150px]"
                    placeholder="A copy para stories será gerada aqui..."
                    readOnly={!editingStory}
                  />
                  {editingStory && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Link Externo (opcional)</label>
                      <Input
                        value={storyLink}
                        onChange={(e) => setStoryLink(e.target.value)}
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {storyCopy.length} caracteres
                    </span>
                    <div className="flex gap-2">
                      {!editingStory ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStory(true)}
                            disabled={!storyCopy}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          {storyLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(storyLink, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Canva
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(storyCopy)}
                            disabled={!storyCopy}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyHTMLVersion(storyCopy, 'story')}
                            disabled={!storyCopy}
                          >
                            <Code className="h-4 w-4 mr-2" />
                            HTML
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              saveStory(storyCopy, storyLink);
                              setEditingStory(false);
                            }}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStory(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEÇÃO REELS - COM TABS PARA 4 VARIAÇÕES (TEXTO) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Copy para Reels (4 Variações)</CardTitle>
                    <Button
                      onClick={() => generateAllVariations('reels')}
                      disabled={generating}
                      size="sm"
                      variant="outline"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todas
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeReelsTab)} onValueChange={(v) => setActiveReelsTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {reelsCopies.map((variation) => (
                        <TabsTrigger key={variation.variation} value={String(variation.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{variation.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {variation.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {reelsCopies.map((variation, index) => (
                      <TabsContent key={variation.variation} value={String(variation.variation)} className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {getApproachLabel(variation.approach)}
                          </Badge>
                          {variation.copy && (
                            <span className="text-xs text-muted-foreground">
                              {variation.copy.length} caracteres
                            </span>
                          )}
                        </div>

                        <Textarea
                          value={variation.copy}
                          onChange={(e) => {
                            const newCopies = [...reelsCopies];
                            newCopies[index].copy = e.target.value;
                            setReelsCopies(newCopies);
                          }}
                          className="min-h-[200px]"
                          placeholder={`Copy ${variation.variation} será gerada aqui...`}
                          readOnly={editingReelsVariation !== variation.variation}
                        />

                        {editingReelsVariation === variation.variation && (
                          <div>
                            <label className="text-sm font-medium mb-1 block">Link Externo (Canva)</label>
                            <Input
                              value={variation.link || ''}
                              onChange={(e) => {
                                const newCopies = [...reelsCopies];
                                newCopies[index].link = e.target.value;
                                setReelsCopies(newCopies);
                              }}
                              placeholder="https://canva.com/design/..."
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          {editingReelsVariation === variation.variation ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  saveReelsVariation(variation.variation, variation.copy, variation.link);
                                  setEditingReelsVariation(null);
                                }}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  loadExistingCopies();
                                  setEditingReelsVariation(null);
                                }}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingReelsVariation(variation.variation)}
                                disabled={!variation.copy}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Button>
                              {variation.link && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(variation.link, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Canva
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(variation.copy)}
                                disabled={!variation.copy}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyHTMLVersion(variation.copy, 'reels')}
                                disabled={!variation.copy}
                              >
                                <Code className="h-4 w-4 mr-2" />
                                HTML
                              </Button>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>

              {/* === SEÇÃO ROTEIRO DE REELS (SCRIPT AUDIOVISUAL) - NOVO === */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Film className="h-5 w-5" />
                      🎬 Roteiro de Reels (Audiovisual)
                    </CardTitle>
                    <Button
                      onClick={generateReelsScripts}
                      disabled={generatingReelsScript}
                      size="sm"
                      variant="outline"
                    >
                      {generatingReelsScript ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                      Gerar Todos
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scripts audiovisuais profissionais com hook, cenas e CTA
                  </p>
                </CardHeader>
                <CardContent>
                  <Tabs value={String(activeReelsScriptTab)} onValueChange={(v) => setActiveReelsScriptTab(Number(v))}>
                    <TabsList className="grid grid-cols-4 w-full mb-4">
                      {reelsScripts.map((script) => (
                        <TabsTrigger key={script.variation} value={String(script.variation)}>
                          <div className="flex flex-col items-center">
                            <span className="font-bold">#{script.variation}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {script.approach.replace('_', ' ')}
                            </span>
                          </div>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {reelsScripts.map((script, index) => {
                      const isEditing = editingReelsScriptVariation === script.variation;
                      const hasContent = script.hook || script.scenes.length > 0 || script.cta;

                      return (
                        <TabsContent key={script.variation} value={String(script.variation)} className="space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="capitalize">
                              {REELS_SCRIPT_LABELS[script.approach]?.label || script.approach}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {REELS_SCRIPT_LABELS[script.approach]?.description || ''}
                            </span>
                          </div>

                          {!hasContent ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Nenhum roteiro gerado ainda</p>
                              <p className="text-sm">Clique em "Gerar Todos" para criar roteiros audiovisuais</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Hook */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">🎣 Hook Inicial</label>
                                {isEditing ? (
                                  <Textarea
                                    value={script.hook}
                                    onChange={(e) => updateReelsScriptField(index, 'hook', e.target.value)}
                                    className="min-h-[60px]"
                                    placeholder="Gancho inicial que prende a atenção..."
                                  />
                                ) : (
                                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">{script.hook || 'Não definido'}</p>
                                  </div>
                                )}
                              </div>

                              {/* Cenas */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium">🎬 Cenas</label>
                                  {isEditing && (
                                    <Button size="sm" variant="outline" onClick={() => addReelsScriptScene(index)}>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Adicionar Cena
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="space-y-3">
                                  {script.scenes.map((scene, sceneIndex) => (
                                    <div key={sceneIndex} className="border rounded-lg p-4 bg-card">
                                      <div className="flex items-center justify-between mb-3">
                                        <Badge variant="secondary">Cena {sceneIndex + 1}</Badge>
                                        {isEditing && script.scenes.length > 1 && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => removeReelsScriptScene(index, sceneIndex)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground">📹 Visual</label>
                                          {isEditing ? (
                                            <Textarea
                                              value={scene.visual}
                                              onChange={(e) => updateReelsScriptScene(index, sceneIndex, 'visual', e.target.value)}
                                              className="mt-1 min-h-[80px]"
                                              placeholder="Descrição visual da cena..."
                                            />
                                          ) : (
                                            <p className="text-sm mt-1 p-2 bg-blue-50 border border-blue-100 rounded whitespace-pre-wrap">
                                              {scene.visual || 'Não definido'}
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-muted-foreground">💬 Diálogo</label>
                                          {isEditing ? (
                                            <Textarea
                                              value={scene.dialogue}
                                              onChange={(e) => updateReelsScriptScene(index, sceneIndex, 'dialogue', e.target.value)}
                                              className="mt-1 min-h-[80px]"
                                              placeholder="Fala sugerida..."
                                            />
                                          ) : (
                                            <p className="text-sm mt-1 p-2 bg-pink-50 border border-pink-100 rounded whitespace-pre-wrap">
                                              {scene.dialogue || 'Não definido'}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* CTA */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">📢 Call-to-Action</label>
                                {isEditing ? (
                                  <Input
                                    value={script.cta}
                                    onChange={(e) => updateReelsScriptField(index, 'cta', e.target.value)}
                                    placeholder="CTA final do vídeo..."
                                  />
                                ) : (
                                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm">{script.cta || 'Não definido'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Botões de ação */}
                          {hasContent && (
                            <div className="flex justify-end gap-2 pt-4 border-t">
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveReelsScript(script.variation)}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => {
                                    loadExistingCopies();
                                    setEditingReelsScriptVariation(null);
                                  }}>
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => setEditingReelsScriptVariation(script.variation)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => copyReelsScriptToClipboard(script)}>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copiar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => copyReelsScriptAsHTML(script)}>
                                    <Code className="h-4 w-4 mr-1" />
                                    HTML
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </CardContent>
              </Card>

              {/* === SEÇÃO CARROSSEL ENGAJAMENTO (6 SLIDES — PROGRESSÃO NARRATIVA) === */}
              <EngagementCarouselSection
                productId={productId}
                productName={productName}
                feedCopy={feedCopies[0]?.copy || ''}
                productImages={allProductImages}
                primaryColor={primaryColor}
                accentColor={accentColor}
                brandName={productName}
                handleName={productName.toLowerCase().replace(/\s+/g, '')}
              />

              {/* === SEÇÃO CARROSSEL VISUAL (6 LAYOUTS ESTRATÉGICOS) === */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      🎨 Carrossel Visual — 6 Layouts de Alta Conversão
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={generateVisualCarouselTexts}
                        disabled={generatingVisualCarousel}
                        size="sm"
                        variant="outline"
                      >
                        {generatingVisualCarousel ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        🤖 Gerar com IA
                      </Button>
                      <Button
                        onClick={async () => {
                          setGeneratingHook(true);
                          try {
                            const { data } = await supabase.functions.invoke('generate-carousel-hook', {
                              body: { productName, salesPitch: productSalesPitch || '', benefits: productBenefits || [], features: productFeatures || [] },
                            });
                            if (data?.hook) {
                              setSlideTexts(prev => ({ ...prev, 1: { ...((prev[1] as any) || {}), hook: data.hook, productName: (prev[1] as any)?.productName || productName } }));
                              toast({ title: '🎣 Novo gancho gerado!', description: data.hook });
                            }
                          } finally { setGeneratingHook(false); }
                        }}
                        disabled={generatingHook}
                        size="sm"
                        variant="outline"
                      >
                        {generatingHook ? <span className="animate-spin mr-1">⏳</span> : '🎣'}
                        {generatingHook ? 'Gerando...' : 'Novo Gancho IA'}
                      </Button>
                      <Button
                        onClick={async () => {
                          setGeneratingScience(true);
                          try {
                            const { data } = await supabase.functions.invoke('generate-carousel-slide', {
                              body: { productName, salesPitch: productSalesPitch || '', benefits: productBenefits || [], features: productFeatures || [], slideType: 'cientificidade' },
                            });
                            if (data?.title) {
                              setSlideTexts(prev => ({ ...prev, 3: { title: data.title, headline: data.headline || '', body: data.body || '', bullet1: data.bullet1 || '', bullet2: data.bullet2 || '', bullet3: data.bullet3 || '', bullet4: data.bullet4 || '' } }));
                              toast({ title: '🔬 Cientificidade gerada!', description: data.headline || data.title });
                            }
                          } catch { toast({ title: 'Erro', description: 'Falha ao gerar cientificidade.', variant: 'destructive' }); }
                          finally { setGeneratingScience(false); }
                        }}
                        disabled={generatingScience}
                        size="sm"
                        variant="outline"
                      >
                        {generatingScience ? <span className="animate-spin mr-1">⏳</span> : '🔬'}
                        {generatingScience ? 'Gerando...' : 'Ciência IA'}
                      </Button>
                      <Button
                        onClick={async () => {
                          setGeneratingExperience(true);
                          try {
                            const { data } = await supabase.functions.invoke('generate-carousel-slide', {
                              body: { productName, salesPitch: productSalesPitch || '', benefits: productBenefits || [], features: productFeatures || [], slideType: 'experiencia' },
                            });
                            if (data?.keyword || data?.benefit) {
                              setSlideTexts(prev => ({ ...prev, 4: { label: (prev as any)[4]?.label || 'EXPERIÊNCIA / FLUXO', keyword: data.keyword || '', benefit: data.benefit || '' } }));
                              toast({ title: '💫 Experiência gerada!', description: data.keyword || data.benefit });
                            }
                          } catch { toast({ title: 'Erro', description: 'Falha ao gerar experiência.', variant: 'destructive' }); }
                          finally { setGeneratingExperience(false); }
                        }}
                        disabled={generatingExperience}
                        size="sm"
                        variant="outline"
                      >
                        {generatingExperience ? <span className="animate-spin mr-1">⏳</span> : '💫'}
                        {generatingExperience ? 'Gerando...' : 'Experiência IA'}
                      </Button>
                      <Button
                        onClick={async () => {
                          setGeneratingSecurity(true);
                          try {
                            const { data } = await supabase.functions.invoke('generate-carousel-slide', {
                              body: { productName, salesPitch: productSalesPitch || '', benefits: productBenefits || [], features: productFeatures || [], slideType: 'seguranca' },
                            });
                            if (data?.title || data?.badge1) {
                              setSlideTexts(prev => ({ ...prev, 5: { title: data.title || 'Tecnologia Smart Dent', badge1: data.badge1 || '', badge2: data.badge2 || '', badge3: data.badge3 || '' } }));
                              toast({ title: '🛡️ Segurança gerada!', description: data.badge1 || data.title });
                            }
                          } catch { toast({ title: 'Erro', description: 'Falha ao gerar segurança.', variant: 'destructive' }); }
                          finally { setGeneratingSecurity(false); }
                        }}
                        disabled={generatingSecurity}
                        size="sm"
                        variant="outline"
                      >
                        {generatingSecurity ? <span className="animate-spin mr-1">⏳</span> : '🛡️'}
                        {generatingSecurity ? 'Gerando...' : 'Segurança IA'}
                      </Button>
                      <Button
                        onClick={handleExportZip}
                        disabled={isExportingZip}
                        size="sm"
                        variant="outline"
                      >
                        {isExportingZip ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        📦 Baixar ZIP
                      </Button>
                      <Button
                        onClick={handleSendSmartOpsVisual}
                        disabled={sendingSmartOps || isExportingZip}
                        size="sm"
                      >
                        {sendingSmartOps ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {sendingSmartOps ? 'Enviando...' : '📤 Enviar SmartOps'}
                      </Button>
                      <Button
                        onClick={saveVisualCarouselTexts}
                        disabled={savingVisualCarousel}
                        size="sm"
                      >
                        {savingVisualCarousel ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        💾 Salvar
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preview visual em tempo real. Clique no ✏️ abaixo de cada slide para editar os textos. Use "🤖 Gerar com IA" para preencher automaticamente.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color pickers + font controls */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/40 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Cor Primária</label>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                        title="Cor primária dos slides"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{primaryColor}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Cor de Destaque</label>
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border border-border"
                        title="Cor de destaque (botões)"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{accentColor}</span>
                    </div>
                    {allProductImages.length === 0 && (
                      <Badge variant="warning" className="text-xs">
                        Nenhuma imagem disponível
                      </Badge>
                    )}
                    {allProductImages.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {allProductImages.length} {allProductImages.length === 1 ? 'imagem' : 'imagens'}
                      </Badge>
                    )}
                  </div>

                  {/* Slides grid with font/size controls rendered inside StrategicCarouselPreview */}
                  <div className="overflow-x-auto pb-2">
                    <StrategicCarouselPreview
                      slideImageMap={slideImageMap}
                      onImageChange={(slideNum, url) =>
                        setSlideImageMap((prev) => ({ ...prev, [slideNum]: url }))
                      }
                      onImageFileUpload={handleVisualSlideFileUpload}
                      productImages={allProductImages}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                       productData={{
                         name: productName,
                         price: productPrice,
                         category: productCategory,
                         description: productDescription,
                         benefits: productBenefits,
                         features: productFeatures,
                         technicalSpecs: technicalSpecs,
                         productUrl: productUrl,
                         salesPitch: productSalesPitch,
                         targetAudience: productTargetAudience,
                         applications: productApplications,
                         faq: productFaq,
                         ecommerceHtmlText: productEcommerceHtml ? stripHtmlToText(productEcommerceHtml).slice(0, 300) : undefined,
                         feedCopyBenefits: feedCopies.find(v => v.approach === 'benefits')?.copy || undefined,
                         feedCopyProblemSolution: feedCopies.find(v => v.approach === 'problem_solution')?.copy || undefined,
                         competitorComparison: competitorComparison,
                       }}
                      slideTexts={slideTexts}
                      onSlideTextChange={(slideNum, key, value) =>
                        setSlideTexts(prev => ({
                          ...prev,
                          [slideNum]: { ...(prev[slideNum as keyof SlideTextsType] as any), [key]: value }
                        }))
                      }
                      fontFamily={fontFamily}
                      fontSize={fontSize}
                      onFontFamilyChange={setFontFamily}
                      onFontSizeChange={setFontSize}
                      companyLogoUrl={companyLogoUrl}
                      productLogoUrl={productLogoUrl}
                      companyLogoScale={companyLogoScale}
                      productLogoScale={productLogoScale}
                      onCompanyLogoUpload={(f) => handleLogoUpload('company', f)}
                      onProductLogoUpload={(f) => handleLogoUpload('product', f)}
                      onCompanyLogoScaleChange={setCompanyLogoScale}
                      onProductLogoScaleChange={setProductLogoScale}
                      onCompanyLogoRemove={() => setCompanyLogoUrl('')}
                      onProductLogoRemove={() => setProductLogoUrl('')}
                    />
                  </div>

                  {/* Copy consolidada */}
                  <Card className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          📋 Copy para Carrossel Visual
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(buildCarouselCopy());
                            toast({ title: "Copiado!", description: "Copy de todos os slides copiada." });
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copiar Tudo
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded p-3 max-h-64 overflow-y-auto leading-relaxed">
                        {buildCarouselCopy()}
                      </pre>
                    </CardContent>
                  </Card>

                  <p className="text-xs text-muted-foreground text-center">
                    Clique em ✏️ abaixo de cada slide para editar os textos • O ZIP exporta PNGs 1080×1350px prontos para Instagram
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
