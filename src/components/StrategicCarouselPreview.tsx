import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { Shield, Award, CheckCircle, Zap, Star, Layers, Upload, Pencil, ChevronDown, ChevronUp, Video, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TechnicalSpec {
  label: string;
  value: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface CompetitorComparison {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  table_headers: string[];
  table_data: Array<Record<string, string>>;
}

interface ProductData {
  name: string;
  price?: number;
  category?: string;
  description?: string;
  benefits?: string[];
  features?: string[];
  technicalSpecs?: TechnicalSpec[];
  productUrl?: string;
  salesPitch?: string;
  targetAudience?: string[];
  applications?: string;
  faq?: FAQ[];
  ecommerceHtmlText?: string;
  feedCopyBenefits?: string;        // Copy IA — variação Benefits do Feed
  feedCopyProblemSolution?: string; // Copy IA — variação Problem/Solution do Feed
  competitorComparison?: CompetitorComparison;
}

// ========================= SlideTexts Types =========================
// Common fields supported by ALL slides (added Nov 2026 — backward compatible).
// They are merged into each slide's typed shape so callers can keep using the
// existing per-slide keys without changes.
export interface CommonSlideMediaFields {
  // Media (video support — same model as the Engagement carousel)
  mediaType?: 'image' | 'video';
  videoSrc?: string;          // blob: URL for instant preview
  videoStorageUrl?: string;   // persisted Supabase Storage HTTPS URL
  // Layout / styling
  coverMode?: 'contain' | 'cover'; // Slide 2 default 'contain'; other slides default to their existing behavior
  maskOpacity?: string;       // 0–90 (% darkening over media)
  maskColor?: string;         // hex, default #000000
  textColor?: string;         // hex; overrides per-slide auto-luminance color when set
  textPosition?: 'top' | 'center' | 'bottom';
  textBlockScale?: string;    // 60–140 (text block scale %)
}

export interface SlideTextsType {
  1: { hook: string; productName: string; imageScale?: string; bgColor?: string; overlayOpacity?: string; faixaVisible?: string; faixaColor?: string; faixaOpacity?: string; hookVisible?: string; nameVisible?: string; badgeVisible?: string } & CommonSlideMediaFields;
  2: { category: string; introLabel?: string; productName: string; imageScale?: string; bgColor?: string; badgeVisible?: string; categoryVisible?: string; introLabelVisible?: string; nameVisible?: string } & CommonSlideMediaFields;
  3: { title: string; headline?: string; body?: string; bullet1?: string; bullet2?: string; bullet3?: string; bullet4?: string; imageScale?: string; bgColor?: string; headlineVisible?: string; sideStripVisible?: string; badgeVisible?: string; titleVisible?: string } & CommonSlideMediaFields;
  4: { label: string; keyword: string; benefit: string; imageScale?: string; bgColor?: string; badgeVisible?: string; labelVisible?: string; keywordVisible?: string; benefitVisible?: string; headlineVisible?: string; sideStripVisible?: string } & CommonSlideMediaFields;
  5: { title: string; badge1: string; badge2: string; badge3: string; imageScale?: string; bgColor?: string; badgeVisible?: string; titleVisible?: string; badge1Visible?: string; badge2Visible?: string; badge3Visible?: string; headlineVisible?: string; sideStripVisible?: string } & CommonSlideMediaFields;
  6: { productName: string; ctaButton: string; linkLabel: string; footer: string; imageScale?: string; bgColor?: string; badgeVisible?: string; productNameVisible?: string; ctaButtonVisible?: string; linkLabelVisible?: string; footerVisible?: string; imageVisible?: string } & CommonSlideMediaFields;
}

interface StrategicCarouselPreviewProps {
  slideImageMap: Record<number, string>;
  onImageChange: (slideNum: number, url: string) => void;
  /** Optional: upload an image OR video file for a specific slide. Mirrors the Engagement flow. */
  onImageFileUpload?: (slideNum: number, file: File) => void;
  productImages: Array<{ url: string; alt?: string }>;
  primaryColor: string;
  accentColor: string;
  productData: ProductData;
  slideTexts?: Partial<SlideTextsType>;
  onSlideTextChange?: (slideNum: number, key: string, value: string) => void;
  fontFamily?: string;
  fontSize?: number; // escala percentual 60–150
  onFontFamilyChange?: (v: string) => void;
  onFontSizeChange?: (v: number) => void;
  // ===== Logos overlay (carousel-level) =====
  companyLogoUrl?: string;
  productLogoUrl?: string;
  companyLogoScale?: number; // % 40–200
  productLogoScale?: number; // % 40–200
  onCompanyLogoUpload?: (file: File) => void;
  onProductLogoUpload?: (file: File) => void;
  onCompanyLogoScaleChange?: (v: number) => void;
  onProductLogoScaleChange?: (v: number) => void;
  onCompanyLogoRemove?: () => void;
  onProductLogoRemove?: () => void;
}

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const SPEC_ICONS = [Zap, Shield, Award, Star, CheckCircle, Layers];
const SLIDE_SCALE = 0.22;
const SLIDE_W = 1080;
const SLIDE_H = 1350;

// ========================= Per-slide editor configs =========================
type EditorFieldType = 'input' | 'textarea' | 'slider' | 'color' | 'toggle' | 'select';
interface EditorField {
  key: string;
  label: string;
  type: EditorFieldType;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
}

// Common media + typography controls appended to EVERY slide.
const COMMON_MEDIA_FIELDS: EditorField[] = [
  { key: 'coverMode', label: 'Cobertura da mídia', type: 'select', options: [
    { value: 'cover', label: 'Cobrir todo o card (cover)' },
    { value: 'contain', label: 'Ajustar (contain / padrão)' },
  ]},
  { key: 'maskOpacity', label: 'Transparência da máscara (%)', type: 'slider', min: 0, max: 90 },
  { key: 'maskColor',   label: 'Cor da máscara',                type: 'color' },
  { key: 'textColor',   label: 'Cor das fontes',                type: 'color' },
];

const SLIDE_EDITOR_FIELDS: Record<number, Array<EditorField>> = {
  1: [
    { key: 'hook', label: 'Texto do Gancho', type: 'textarea' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'faixaVisible', label: 'Mostrar faixa central', type: 'toggle' },
    { key: 'faixaColor', label: 'Cor da faixa', type: 'color' },
    { key: 'faixaOpacity', label: 'Transparência da faixa (%)', type: 'slider', min: 0, max: 100 },
    { key: 'overlayOpacity', label: 'Transparência do overlay (%)', type: 'slider', min: 0, max: 80 },
    ...COMMON_MEDIA_FIELDS,
  ],
  2: [
    { key: 'category', label: 'Categoria', type: 'input' },
    { key: 'introLabel', label: 'Frase de introdução (ex: Apresentando)', type: 'input' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    ...COMMON_MEDIA_FIELDS,
  ],
  3: [
    { key: 'title',    label: 'Título da seção',      type: 'textarea' },
    { key: 'headline', label: 'Headline em destaque',  type: 'textarea' },
    { key: 'headlineVisible', label: 'Mostrar bloco colorido (headline)', type: 'toggle' },
    { key: 'sideStripVisible', label: 'Mostrar faixa lateral (imagem)', type: 'toggle' },
    { key: 'body',     label: 'Texto de apoio',        type: 'textarea' },
    { key: 'bullet1',  label: 'Bullet técnico 1',      type: 'textarea' },
    { key: 'bullet2',  label: 'Bullet técnico 2',      type: 'textarea' },
    { key: 'bullet3',  label: 'Bullet técnico 3',      type: 'textarea' },
    { key: 'bullet4',  label: 'Bullet técnico 4',      type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor',    label: 'Cor de fundo',         type: 'color' },
    ...COMMON_MEDIA_FIELDS,
  ],
  4: [
    { key: 'label', label: 'Label topo (ex: EXPERIÊNCIA)', type: 'input' },
    { key: 'keyword', label: 'Palavra-chave', type: 'input' },
    { key: 'headlineVisible', label: 'Mostrar bloco colorido (headline)', type: 'toggle' },
    { key: 'sideStripVisible', label: 'Mostrar faixa lateral (imagem)', type: 'toggle' },
    { key: 'benefit', label: 'Benefício', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    ...COMMON_MEDIA_FIELDS,
  ],
  5: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'headlineVisible', label: 'Mostrar bloco colorido (headline)', type: 'toggle' },
    { key: 'sideStripVisible', label: 'Mostrar faixa lateral (imagem)', type: 'toggle' },
    { key: 'badge1', label: 'Badge 1', type: 'textarea' },
    { key: 'badge2', label: 'Badge 2', type: 'textarea' },
    { key: 'badge3', label: 'Badge 3', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    ...COMMON_MEDIA_FIELDS,
  ],
  6: [
    { key: 'productName', label: 'Nome exibido', type: 'input' },
    { key: 'ctaButton', label: 'Texto do botão CTA', type: 'textarea' },
    { key: 'linkLabel', label: 'Label do link', type: 'input' },
    { key: 'footer', label: 'Texto de rodapé', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    ...COMMON_MEDIA_FIELDS,
  ],
};

// ===== Carousel-level logos (overlay rendered on every slide) =====
export interface CarouselLogos {
  companyUrl?: string;
  productUrl?: string;
  companyScale?: number; // % 40-200
  productScale?: number; // % 40-200
}

/**
 * Overlay rendered inside the 1080x1350 canvas so it is captured by html2canvas
 * during PNG export AND visible in the on-screen preview.
 * - Company logo: top-right
 * - Product logo: bottom-left
 */
export function CarouselLogosOverlay({ logos }: { logos?: CarouselLogos }) {
  if (!logos) return null;
  const { companyUrl, productUrl, companyScale = 100, productScale = 100 } = logos;
  if (!companyUrl && !productUrl) return null;
  // Base height in slide-pixels (the slide is 1080x1350).
  const BASE_H = 90; // px @ 1080 width
  const cH = Math.round(BASE_H * (companyScale / 100));
  const pH = Math.round(BASE_H * (productScale / 100));
  return (
    <>
      {companyUrl && (
        <img
          src={companyUrl}
          alt="Logo da empresa"
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            top: 36,
            right: 36,
            height: cH,
            width: 'auto',
            maxWidth: '45%',
            objectFit: 'contain',
            zIndex: 50,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
        />
      )}
      {productUrl && (
        <img
          src={productUrl}
          alt="Logo do produto"
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            bottom: 36,
            left: 36,
            height: pH,
            width: 'auto',
            maxWidth: '45%',
            objectFit: 'contain',
            zIndex: 50,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
          }}
        />
      )}
    </>
  );
}

interface SlideWrapperProps {
  slideNum: number;
  children: React.ReactNode;
  productImages: Array<{ url: string; alt?: string }>;
  currentImage: string;
  onImageChange: (slideNum: number, url: string) => void;
  /** When provided, image AND video uploads are delegated to this handler (which can persist to Storage). */
  onImageFileUpload?: (slideNum: number, file: File) => void;
  primaryColor: string;
  slideTexts?: Record<string, string>;
  onSlideTextChange?: (key: string, value: string) => void;
  logos?: CarouselLogos;
}

function SlideWrapper({ slideNum, children, productImages, currentImage, onImageChange, onImageFileUpload, primaryColor, slideTexts, onSlideTextChange, logos }: SlideWrapperProps) {
  const containerW = SLIDE_W * SLIDE_SCALE;
  const containerH = SLIDE_H * SLIDE_SCALE;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [editorOpen, setEditorOpen] = useState(false);

  // ===== Media customization (mask / video / text overrides) =====
  const mediaType: 'image' | 'video' = (slideTexts?.mediaType as 'image' | 'video') || 'image';
  // Unificar prioridade com o export: URL persistida primeiro, blob local só como fallback.
  // Evita divergência preview↔export e blobs revogados após reload.
  const videoUrl: string = slideTexts?.videoStorageUrl || slideTexts?.videoSrc || '';
  const maskOpacityNum = Math.min(90, Math.max(0, Number(slideTexts?.maskOpacity ?? 0)));
  const maskColor = slideTexts?.maskColor || '#000000';
  const textColorOverride = slideTexts?.textColor || '';
  // textPosition / textBlockScale were removed from the editor (non-functional with absolute layouts).

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Video: must go through the parent handler (Storage upload). Otherwise reject gracefully.
    if (file.type.startsWith('video/')) {
      if (onImageFileUpload) {
        onImageFileUpload(slideNum, file);
        // Mark this slide as video media so the renderer overlays the <video>.
        onSlideTextChange?.('mediaType', 'video');
        const blobUrl = URL.createObjectURL(file);
        onSlideTextChange?.('videoSrc', blobUrl);
      } else {
        console.warn('[CAROUSEL_VISUAL] Upload de vídeo requer onImageFileUpload no parent.');
      }
      e.target.value = '';
      return;
    }
    // Image: delegate to parent if available (persists to Storage), else fallback to local dataURL.
    if (onImageFileUpload) {
      onImageFileUpload(slideNum, file);
      onSlideTextChange?.('mediaType', 'image');
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        onImageChange(slideNum, dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };


  const insertFormat = (key: string, prefix: string, suffix: string) => {
    if (!onSlideTextChange) return;
    const ta = textareaRefs.current[key];
    const currentVal = slideTexts?.[key] || '';
    if (ta) {
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      const selected = currentVal.slice(start, end);
      const newVal = currentVal.slice(0, start) + prefix + selected + suffix + currentVal.slice(end);
      onSlideTextChange(key, newVal);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      onSlideTextChange(key, currentVal + prefix + suffix);
    }
  };

  const applyUppercase = (key: string) => {
    if (!onSlideTextChange) return;
    const ta = textareaRefs.current[key];
    const currentVal = slideTexts?.[key] || '';
    if (ta) {
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      if (start !== end) {
        const newVal = currentVal.slice(0, start) + currentVal.slice(start, end).toUpperCase() + currentVal.slice(end);
        onSlideTextChange(key, newVal);
        return;
      }
    }
    onSlideTextChange(key, currentVal.toUpperCase());
  };

  const fields = SLIDE_EDITOR_FIELDS[slideNum] || [];

  // CSS variables kept for backwards-compat; only textColor is actually consumed (via scoped <style> below).
  const shellStyleVars: React.CSSProperties = {
    ['--slide-text-color' as any]: textColorOverride || 'inherit',
  };

  // When a video is active, suppress the slide's own background image/color so the
  // <video> at zIndex 1 becomes visible. We clone the slide element and inject
  // image="" + texts.bgColor='transparent' + overlayOpacity='0'.
  const renderedChildren = React.useMemo(() => {
    if (mediaType !== 'video' || !videoUrl || !React.isValidElement(children)) return children;
    const childProps = (children as React.ReactElement<any>).props || {};
    const mergedTexts = {
      ...(childProps.texts || {}),
      bgColor: 'transparent',
      overlayOpacity: '0',
      // In video-background mode the slide-specific media placeholders/side strips
      // must not paint opaque blocks above the video. Text, masks and logos remain.
      sideStripVisible: 'false',
      imageVisible: 'false',
      mediaType: 'video',
    };
    return React.cloneElement(children as React.ReactElement<any>, { image: '', texts: mergedTexts });
  }, [children, mediaType, videoUrl]);

  // Unique class so the scoped <style> only affects this slide instance.
  const slideContentClass = `visual-slide-content-${slideNum}-${React.useId().replace(/:/g, '')}`;

  return (
    <div className="flex flex-col items-center gap-2" style={{ maxWidth: containerW + 40 }}>
      {/* Slide preview */}
      <div
        style={{
          width: containerW,
          height: containerH,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            transform: `scale(${SLIDE_SCALE})`,
            transformOrigin: 'top left',
            position: 'absolute',
            top: 0,
            left: 0,
            ...shellStyleVars,
          }}
        >
          {/* Scoped text-color override (forces all text descendants to user-picked color) */}
          {textColorOverride && (
            <style>{`.${slideContentClass} :is(p, span, h1, h2, h3, h4, h5, h6, div, li, a, button) { color: ${textColorOverride} !important; }`}</style>
          )}
          {/* Full-bleed video overlay (BACKGROUND — sits behind slide content) */}
          {mediaType === 'video' && videoUrl && (
            <div data-strategic-video-slot="true" data-video-scale="100" data-video-radius="0" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
              <video
                src={videoUrl}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
          {/* Mask overlay (between video and text) */}
          {maskOpacityNum > 0 && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: maskColor,
                opacity: maskOpacityNum / 100,
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Slide content (text + graphics) — forced ABOVE the video/mask */}
          <div className={slideContentClass} style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
            {renderedChildren}
          </div>
          {/* Carousel-level logos overlay (top-right + bottom-left) */}
          <CarouselLogosOverlay logos={logos} />
        </div>
      </div>



      {/* Swipe hint — only on Slide 1 */}
      {slideNum === 1 && (
        <div className="flex items-center justify-center gap-1.5 py-1" style={{ maxWidth: containerW + 40 }}>
          <span style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Arraste para o lado
          </span>
        </div>
      )}

      {/* Action row: thumbnails + upload + edit */}
      <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: containerW + 40 }}>
        {productImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => onImageChange(slideNum, img.url)}
            title="Usar esta imagem"
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              overflow: 'hidden',
              padding: 0,
              border: currentImage === img.url ? `2px solid ${primaryColor}` : '2px solid transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <img
              src={img.url}
              alt={img.alt || `img ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload nova imagem ou vídeo"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
          style={{ fontSize: 10, height: 26, flexShrink: 0 }}
        >
          <Upload style={{ width: 10, height: 10 }} />
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => {
            const next = mediaType === 'video' ? 'image' : 'video';
            onSlideTextChange?.('mediaType', next);
            if (next === 'image') {
              onSlideTextChange?.('videoSrc', '');
              onSlideTextChange?.('videoStorageUrl', '');
            }
          }}
          title={mediaType === 'video' ? 'Modo Vídeo ativo (clique para voltar a Imagem)' : 'Modo Imagem ativo (clique para usar Vídeo)'}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
          style={{ fontSize: 10, height: 26, flexShrink: 0 }}
        >
          {mediaType === 'video' ? <Video style={{ width: 10, height: 10 }} /> : <ImageIcon style={{ width: 10, height: 10 }} />}
          <span>{mediaType === 'video' ? 'Vídeo' : 'Imagem'}</span>
        </button>

        {onSlideTextChange && (
          <button
            onClick={() => setEditorOpen(!editorOpen)}
            title="Editar textos do slide"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
            style={{ fontSize: 10, height: 26, flexShrink: 0 }}
          >
            <Pencil style={{ width: 10, height: 10 }} />
            {editorOpen ? <ChevronUp style={{ width: 10, height: 10 }} /> : <ChevronDown style={{ width: 10, height: 10 }} />}
          </button>
        )}
      </div>

      {/* Inline editor */}
      {editorOpen && onSlideTextChange && fields.length > 0 && (
        <div className="w-full space-y-2 p-3 bg-muted/40 border border-border rounded-lg" style={{ maxWidth: containerW + 40 }}>
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.type === 'color' ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="color"
                    value={slideTexts?.[field.key] || '#f8f8f8'}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-background"
                    title="Escolher cor"
                  />
                  <Input
                    value={slideTexts?.[field.key] || '#f8f8f8'}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="text-xs h-7 font-mono flex-1"
                    placeholder="#f8f8f8"
                    maxLength={7}
                  />
                </div>
              ) : field.type === 'toggle' ? (
                <button
                  type="button"
                  onClick={() => onSlideTextChange(field.key, (slideTexts?.[field.key] ?? 'true') === 'true' ? 'false' : 'true')}
                  className={`text-xs px-3 py-1 rounded border cursor-pointer font-medium ${(slideTexts?.[field.key] ?? 'true') === 'true' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}
                >
                  {(slideTexts?.[field.key] ?? 'true') === 'true' ? 'Ativado' : 'Desativado'}
                </button>
              ) : field.type === 'slider' ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min={field.min ?? 50}
                    max={field.max ?? 150}
                    step={5}
                    value={Number(slideTexts?.[field.key]) || (field.min != null ? Math.round(((field.min ?? 0) + (field.max ?? 150)) / 2) : 100)}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="flex-1 h-2 rounded cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {slideTexts?.[field.key] || (field.min != null ? Math.round(((field.min ?? 0) + (field.max ?? 150)) / 2) : 100)}%
                  </span>
                </div>
              ) : field.type === 'textarea' ? (
                <div>
                  <div className="flex gap-1 mb-1">
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 border border-border rounded font-bold hover:bg-muted bg-background cursor-pointer"
                      onClick={() => insertFormat(field.key, '**', '**')}
                      title="Negrito"
                    >B</button>
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 border border-border rounded italic hover:bg-muted bg-background cursor-pointer"
                      onClick={() => insertFormat(field.key, '_', '_')}
                      title="Itálico"
                    >I</button>
                    <button
                      type="button"
                      className="text-xs px-2 py-0.5 border border-border rounded hover:bg-muted bg-background cursor-pointer font-semibold"
                      onClick={() => applyUppercase(field.key)}
                      title="MAIÚSCULAS"
                    >AA</button>
                  </div>
                  <Textarea
                    ref={(el) => { textareaRefs.current[field.key] = el; }}
                    value={slideTexts?.[field.key] || ''}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="text-xs min-h-[50px] resize-none"
                  />
                </div>
              ) : field.type === 'select' ? (
                <select
                  value={slideTexts?.[field.key] || (field.options?.[0]?.value ?? '')}
                  onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                  className="text-xs h-7 w-full rounded border border-border bg-background px-2 cursor-pointer"
                >
                  {(field.options || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={slideTexts?.[field.key] || ''}
                  onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                  className="text-xs h-7"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              onClick={() => setEditorOpen(false)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer font-medium"
            >
              ✓ Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SLIDE 1 — HOOK / GANCHO ====================
function Slide1Hook({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { hook?: string; productName?: string; imageScale?: string; bgColor?: string; overlayOpacity?: string; faixaVisible?: string; faixaColor?: string; faixaOpacity?: string } }) {
  const hook = texts?.hook || (() => {
    if (productData.salesPitch) {
      const pitch = productData.salesPitch.trim();
      const sentences = pitch.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const s = sentence.trim();
        if (s.length >= 40 && s.length <= 90) return s;
      }
      if (pitch.length <= 90) return pitch;
      const words = pitch.split(' ');
      let accumulated = '';
      for (const word of words) {
        if ((accumulated + ' ' + word).trim().length > 90) break;
        accumulated = (accumulated + ' ' + word).trim();
      }
      if (accumulated.length >= 30) return accumulated;
    }
    return productData.name || '';
  })();
  const name = texts?.productName || productData.name;
  const imageScale = Number(texts?.imageScale) || 100;
  const bgColor = texts?.bgColor || '';
  const hasCustomBg = bgColor && bgColor !== '#333333';
  const faixaVisible = (texts?.faixaVisible ?? 'true') !== 'false';

  // Auto text color: when faixa is OFF, adapt text/hook to page background luminance.
  // When ON, white stays best contrast against the colored band.
  const refBg = hasCustomBg ? bgColor : (image ? '' : '#333333');
  const autoTextColor = refBg && getLuminance(refBg) > 0.55 ? '#111111' : '#ffffff';
  const noFaixaTextColor = autoTextColor;
  const noFaixaShadow = autoTextColor === '#ffffff'
    ? '0 2px 12px rgba(0,0,0,0.7)'
    : '0 2px 8px rgba(255,255,255,0.4)';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background: custom color or image */}
      {hasCustomBg ? (
        <div style={{ position: 'absolute', inset: 0, background: bgColor }} />
      ) : null}
      {image ? (
        <img src={image} alt="produto" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: `scale(${imageScale / 100})`, transformOrigin: 'center center' }} />
      ) : (
        !hasCustomBg && <div style={{ position: 'absolute', inset: 0, background: '#333' }} />
      )}

      {/* Overlay escuro geral sutil para dar profundidade */}
      {(() => {
        const rawOv = texts?.overlayOpacity;
        const ov = rawOv !== undefined && rawOv !== '' ? Math.max(0, Math.min(100, Number(rawOv))) : (hasCustomBg ? 10 : 28);
        return <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${ov / 100})` }} />;
      })()}

      {/* Número do slide */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 36 }}>1</span>
      </div>

      {/* FAIXA CENTRAL OPACA com a frase — centralizada verticalmente */}
      {faixaVisible ? (
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: 0,
          right: 0,
          padding: '60px 80px',
          background: (() => {
            const fc = texts?.faixaColor || '#000000';
            const clean = fc.replace('#', '');
            const r = parseInt(clean.slice(0, 2), 16);
            const g = parseInt(clean.slice(2, 4), 16);
            const b = parseInt(clean.slice(4, 6), 16);
            const rawOp = texts?.faixaOpacity;
            const op = rawOp !== undefined && rawOp !== '' ? Math.max(0, Math.min(100, Number(rawOp))) / 100 : 0.78;
            return `rgba(${r},${g},${b},${op})`;
          })(),
          textAlign: 'center',
        }}>
          <p style={{ color: '#ffffff', fontWeight: 500, fontSize: 52, lineHeight: 1.3, margin: 0, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{hook}</p>
        </div>
      ) : (
        // SEM faixa: texto livre na página, cor adaptada ao fundo
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          left: 0,
          right: 0,
          padding: '60px 80px',
          textAlign: 'center',
        }}>
          <p style={{ color: noFaixaTextColor, fontWeight: 700, fontSize: 56, lineHeight: 1.25, margin: 0, textShadow: noFaixaShadow }}>{hook}</p>
        </div>
      )}

      {/* Gradiente rodapé + nome do produto */}
      {faixaVisible && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />
      )}
      <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
        <p style={{ color: faixaVisible ? '#ffffff' : noFaixaTextColor, fontSize: 44, fontWeight: 600, margin: 0, textAlign: 'center', textShadow: faixaVisible ? undefined : noFaixaShadow }}>{name}</p>
      </div>
    </div>
  );
}

// ==================== SLIDE 2 — SOLUÇÃO ====================
function Slide2Solution({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { category?: string; introLabel?: string; productName?: string; imageScale?: string; bgColor?: string; coverMode?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const category = texts?.category !== undefined ? texts.category : (productData.category || '');
  const introLabel = texts?.introLabel !== undefined ? texts.introLabel : 'Apresentando';
  const name = texts?.productName || productData.name;
  const imageScale = Number(texts?.imageScale) || 100;
  const bgColor = texts?.bgColor || '#f8f8f8';
  const bgLuminance = getLuminance(bgColor.replace('#', '').length === 6 ? bgColor : '#f8f8f8');
  const textColor = bgLuminance > 0.5 ? '#111111' : '#ffffff';
  const subTextColor = bgLuminance > 0.5 ? '#888888' : 'rgba(255,255,255,0.7)';
  const isCover = (texts?.coverMode || 'contain') === 'cover';

  // === COVER MODE: image fills the entire card; texts overlay on top ===
  if (isCover && image) {
    return (
      <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', background: bgColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${imageScale / 100})`,
            transformOrigin: 'center center',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 80px 100px', zIndex: 3 }}>
          <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>2</span>
          </div>
          {category && (
            <div style={{ alignSelf: 'center', background: primaryColor, color: textOnPrimary, borderRadius: 50, padding: '16px 48px', fontSize: 36, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const }}>
              {category}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            {introLabel && (
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 400, color: '#ffffff', letterSpacing: 3, textTransform: 'uppercase' as const, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                  {introLabel}
                </span>
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: 68, fontWeight: 900, color: '#ffffff', lineHeight: 1.1, textShadow: '0 4px 24px rgba(0,0,0,0.7)' }}>{name}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bgColor, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '80px 80px 100px' }}>
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>2</span>
      </div>
      {category && (
        <div style={{ background: primaryColor, color: textOnPrimary, borderRadius: 50, padding: '16px 48px', fontSize: 36, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const }}>
          {category}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', minHeight: 0, width: '100%' }}>
        {image ? (
          <img
            src={image}
            alt="produto"
            style={{
              maxWidth: '88%',
              maxHeight: '65%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
              transform: `scale(${imageScale / 100})`,
              transformOrigin: 'center center',
              filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))',
              transition: 'transform 0.2s ease',
            }}
          />
        ) : null}
      </div>
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        {introLabel && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 400, color: subTextColor, letterSpacing: 3, textTransform: 'uppercase' as const }}>
              {introLabel}
            </span>
          </div>
        )}
        <h2 style={{ margin: 0, fontSize: 68, fontWeight: 900, color: textColor, lineHeight: 1.1 }}>{name}</h2>
      </div>
    </div>
  );
}

// ==================== HELPER: Filtrar linhas de descrição visual da IA ====================
function isVisualDescriptionLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    // Linhas entre colchetes: [Imagem: ...], [Infográfico: ...]
    /^\[.{10,}\]/.test(line) ||
    // Tipos de conteúdo visual
    lower.includes('infográfico') ||
    lower.includes('gráfico') ||
    lower.includes('ilustração') ||
    lower.includes('diagrama') ||
    lower.includes('animação') ||
    // Descrições de ações visuais
    // Padrões "imagem de/da/do/das" — sugestões fotográficas da IA
    lower.startsWith('imagem de') ||
    lower.startsWith('imagem da') ||
    lower.startsWith('imagem do') ||
    lower.startsWith('imagem das') ||
    lower.startsWith('imagem dos') ||
    lower.includes('dentista aplicando') ||
    lower.includes('profissional aplicando') ||
    lower.includes('aplicando o produto') ||
    lower.includes('aplicando o cimento') ||
    lower.includes('mãos de um dentista') ||
    lower.includes('mãos do dentista') ||
    lower.includes('imagem mostrando') ||
    lower.includes('setas indicam') ||
    lower.includes('seta indicando') ||
    lower.includes('ícones flutuantes') ||
    lower.includes('ícones discretos') ||
    lower.includes('ícone indicando') ||
    lower.includes('ícones indicam') ||
    lower.includes('icones flutuantes') ||
    lower.includes('icones discretos') ||
    lower.includes('icone indicando') ||
    lower.includes('icones indicam') ||
    // Estilo e design de imagem
    lower.includes('design deve') ||
    lower.includes('estilizado') ||
    lower.includes('flutuando em') ||
    lower.includes('flutuantes') ||
    lower.includes('cores como') ||
    lower.includes('nanopartículas') ||
    // Instruções de criação visual
    lower.includes('sugestão visual') ||
    lower.includes('sugestão de imagem') ||
    lower.includes('fundo deve') ||
    lower.includes('fundo com') ||
    lower.includes('deve mostrar') ||
    lower.includes('deve conter') ||
    lower.includes('deve transmitir') ||
    lower.includes('transmitir credibilidade') ||
    lower.includes('credibilidade científica') ||
    // Padrões compostos: contexto visual
    (lower.includes('visualmente') && lower.includes('mostr')) ||
    (lower.includes('3d') && lower.includes('mostrando')) ||
    (lower.includes('mostrando') && lower.includes('ponta')) ||
    (lower.includes('mostrando') && lower.includes('caneta')) ||
    (lower.includes('mostrando') && lower.includes('camada'))
  );
}

// ==================== SLIDE 3 — CIENTIFICIDADE ====================
const SLIDE3_UNICODE_ICONS = ['⚡', '🛡', '⭐', '✅', '🔬'];

function Slide3Technical({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { title?: string; headline?: string; body?: string; bullet1?: string; bullet2?: string; bullet3?: string; bullet4?: string; imageScale?: string; bgColor?: string; headlineVisible?: string; sideStripVisible?: string } }) {
  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];
  const items = specs.length > 0 ? specs.map(s => ({ label: s.label, value: s.value })) : features.map(f => ({ label: f, value: '' }));
  const displayItems = items.slice(0, 5);
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const title = texts?.title || 'Por que confiar?';

  // PRIORIDADE 0: Textos editados/gerados por IA
  const hasAITexts = !!(texts?.headline || texts?.bullet1);

  let benefitsHeadline = '';
  let benefitsBody = '';
  let benefitsBullets: string[] = [];

  if (hasAITexts) {
    benefitsHeadline = texts?.headline || '';
    benefitsBody = texts?.body || '';
    benefitsBullets = [texts?.bullet1, texts?.bullet2, texts?.bullet3, texts?.bullet4].filter(Boolean) as string[];
  } else {
    // PRIORIDADE 1: Feed Copy Benefits — extração estruturada com filtro de linhas visuais
    const feedBenefits = productData.feedCopyBenefits;
    if (feedBenefits) {
      const allLines = feedBenefits.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const lines = allLines.filter((l: string) => !isVisualDescriptionLine(l));
      benefitsHeadline = lines[0]?.slice(0, 80) || '';
      const bulletLines = lines.filter((l: string) => /^[•\-✅🔥⚡🎯💡🌟⭐🏆💎👉➡️]/.test(l)).slice(0, 4);
      const bodyLines = lines.slice(1).filter((l: string) => !bulletLines.includes(l));
      benefitsBody = bodyLines.join(' ').slice(0, 200);
      benefitsBullets = bulletLines;
    }
    // PRIORIDADE 1.5: Benefits do produto (array cadastrado no repositório)
    else if (productData.benefits && productData.benefits.length > 0) {
      const rawBenefits = productData.benefits as string[];
      benefitsHeadline = rawBenefits[0]?.slice(0, 80) || '';
      benefitsBullets = rawBenefits.slice(1, 5);
    }
  }

  // Tabela de comparação com concorrentes
  const cc = productData.competitorComparison;
  const hasCompetitorTable = cc?.enabled && cc.table_headers.length > 0 && cc.table_data.length > 0;

  const imageScale3 = Number(texts?.imageScale) || 100;
  const bgColor3 = texts?.bgColor || '#0f0f14';

  const sideStripVisible = (texts?.sideStripVisible ?? 'true') !== 'false';
  const headlineVisible = (texts?.headlineVisible ?? 'true') !== 'false';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bgColor3, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>3</span>
      </div>
      {sideStripVisible && (
        <div style={{ width: '42%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
          {image ? (
            <img src={image} alt="produto" style={{ maxWidth: '100%', maxHeight: '70%', width: 'auto', height: 'auto', objectFit: 'contain', transform: `scale(${imageScale3 / 100})`, transformOrigin: 'center center' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
          )}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 120, background: `linear-gradient(to right, transparent, ${bgColor3})`, pointerEvents: 'none' }} />
        </div>
      )}
      <div style={{ flex: 1, padding: sideStripVisible ? '100px 60px 80px 40px' : '100px 80px 80px 140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#ffffff', fontSize: 52, fontWeight: 900, margin: '0 0 40px 0', lineHeight: 1.2 }}>{title}</h2>
        {/* Divider accent */}
        <div style={{ width: 56, height: 3, background: primaryColor, borderRadius: 2, marginBottom: 36, flexShrink: 0 }} />


        {(benefitsHeadline || benefitsBullets.length > 0) ? (
          // ESTRUTURADO: Headline + Corpo + Tabela/Bullets (IA/editado ou feedCopyBenefits)
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Headline em destaque (bloco colorido) */}
            {benefitsHeadline && headlineVisible && (
              <p style={{ color: primaryColor, fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
                {benefitsHeadline}
              </p>
            )}
            {/* Corpo do texto */}
            {benefitsBody && (
              <p style={{ color: '#d8d8d8', fontSize: 26, fontWeight: 400, margin: 0, lineHeight: 1.6 }}>
                {benefitsBody}
              </p>
            )}
            {/* TABELA competitor_comparison (prioridade sobre bullets, só sem IA texts) */}
            {!hasAITexts && hasCompetitorTable ? (
              <div style={{ marginTop: 8 }}>
                {cc!.title && (
                  <p style={{ color: '#aaaaaa', fontSize: 20, fontWeight: 600, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {cc!.title}
                  </p>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {cc!.table_headers.map((header, i) => (
                        <th key={i} style={{
                          background: primaryColor,
                          color: '#ffffff',
                          fontSize: 22,
                          fontWeight: 700,
                          padding: '10px 14px',
                          textAlign: 'left',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cc!.table_data.slice(0, 5).map((row, rowIdx) => (
                      <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}>
                        {cc!.table_headers.map((header, colIdx) => (
                          <td key={colIdx} style={{
                            color: '#e0e0e0',
                            fontSize: 20,
                            fontWeight: colIdx === 0 ? 700 : 400,
                            padding: '9px 14px',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}>
                            {row[header] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Bullets (IA/editados ou do feedCopyBenefits)
              benefitsBullets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  {benefitsBullets.map((bullet, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: `3px solid ${primaryColor}`, paddingLeft: 16 }}>
                      <p style={{ color: '#e8e8e8', fontSize: 26, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{bullet}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ) : hasCompetitorTable ? (
          // SEM feedBenefits mas COM tabela
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {cc!.title && (
              <p style={{ color: '#aaaaaa', fontSize: 20, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                {cc!.title}
              </p>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {cc!.table_headers.map((header, i) => (
                    <th key={i} style={{
                      background: primaryColor,
                      color: '#ffffff',
                      fontSize: 22,
                      fontWeight: 700,
                      padding: '10px 14px',
                      textAlign: 'left',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cc!.table_data.slice(0, 5).map((row, rowIdx) => (
                  <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}>
                    {cc!.table_headers.map((header, colIdx) => (
                      <td key={colIdx} style={{
                        color: '#e0e0e0',
                        fontSize: 20,
                        fontWeight: colIdx === 0 ? 700 : 400,
                        padding: '9px 14px',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}>
                        {row[header] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // FALLBACK: Lista de specs/features
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {displayItems.length > 0 ? displayItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 28 }}>
                  {SLIDE3_UNICODE_ICONS[idx % SLIDE3_UNICODE_ICONS.length]}
                </div>
                <div>
                  <p style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 36, margin: 0, lineHeight: 1.2 }}>{item.label}</p>
                  {item.value && <p style={{ color: '#aaa', fontSize: 30, margin: '6px 0 0 0', fontWeight: 400 }}>{item.value}</p>}
                </div>
              </div>
            )) : (
              <p style={{ color: '#aaa', fontSize: 36 }}>Adicione especificações técnicas ao produto para exibir aqui.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== FUNÇÃO DE SÍNTESE DE IMPACTO ====================
function buildImpactNarrative(productData: ProductData): {
  headline: string;
  impactText: string;
  proofBullets: string[];
  label: string;
} {
  const faqs = productData.faq || [];
  const ecommerceText = productData.ecommerceHtmlText || '';
  const benefits = (productData.benefits as string[]) || [];
  const features = (productData.features as string[]) || [];
  const specs = productData.technicalSpecs || [];
  const salesPitch = productData.salesPitch || '';
  const description = productData.description || '';
  const applications = productData.applications || '';
  const targetAudience = (productData.targetAudience as string[]) || [];
  const name = productData.name || '';

  let headline = '';
  let impactText = '';
  let proofBullets: string[] = [];

  // PRIORIDADE 0: Feed Copy Problem/Solution (copy IA com estrutura dor → solução)
  if (productData.feedCopyProblemSolution) {
    const copy = productData.feedCopyProblemSolution;
    const allLines = copy.split('\n').map((l: string) => l.trim()).filter(Boolean);
    // Filtrar linhas que são sugestões visuais/descrições de imagem
    const lines = allLines.filter((l: string) => !isVisualDescriptionLine(l));
    headline = (lines[0]?.slice(0, 80) || name);
    const bulletLines = lines.filter((l: string) => /^[•\-💸⏳✅🔥⚡🎯]/.test(l)).slice(0, 3);
    const bodyLines = lines.slice(1).filter((l: string) => !bulletLines.includes(l));
    const body = bodyLines.join(' ').slice(0, 250);
    return {
      headline,
      impactText: body || copy.slice(0, 250),
      proofBullets: bulletLines,
      label: 'Experiência / Fluxo',
    };
  }

  if (faqs.length > 0) {
    // Prioridade 1: FAQs — headline = 1ª pergunta, texto = 1ª resposta, bullets = próximas perguntas
    headline = faqs[0].question;
    impactText = faqs[0].answer.slice(0, 250);
    const faqBullets = faqs.slice(1, 4).map(f => f.question).filter(q => q.length < 90);
    proofBullets = faqBullets.slice(0, 3);
    return { headline, impactText, proofBullets, label: 'Perguntas & Respostas' };
  }

  if (ecommerceText) {
    // Prioridade 2: HTML E-commerce extraído
    headline = benefits[0] || features[0] || name;
    impactText = ecommerceText.slice(0, 250);
    proofBullets = [benefits[1], benefits[2], features[0]].filter(Boolean).slice(0, 3) as string[];
    return { headline, impactText, proofBullets, label: 'Impacto Real' };
  }

  // Prioridade 3: Fallback — salesPitch → description → benefits
  headline = benefits[0] || features[0] || name || 'Resultados que transformam';

  if (salesPitch) {
    impactText = salesPitch.slice(0, 220);
  } else if (description && benefits[1]) {
    impactText = `${description.slice(0, 130)}. ${benefits[1]}`.slice(0, 220);
  } else if (description && applications) {
    impactText = `${description.slice(0, 130)}. ${applications}`.slice(0, 220);
  } else if (description) {
    impactText = description.slice(0, 220);
  } else if (benefits.length >= 2) {
    impactText = `${benefits[1]}${benefits[2] ? ` — ${benefits[2]}` : ''}`;
  } else if (applications) {
    impactText = applications.slice(0, 220);
  } else if (targetAudience.length > 0) {
    impactText = `Desenvolvido para ${targetAudience.slice(0, 2).join(' e ')}.`;
  } else {
    impactText = 'Solução desenvolvida para resultados reais e consistentes.';
  }

  const specBullets = specs.slice(0, 3).map(s => `${s.label}: ${s.value}`);
  const featureBullets = features.filter(f => f !== headline && f.length < 80);
  const benefitBullets = benefits.filter(b => b !== headline).slice(1);
  proofBullets = [...specBullets, ...featureBullets, ...benefitBullets]
    .filter(Boolean)
    .filter(b => b.length < 80)
    .slice(0, 3);

  return { headline, impactText, proofBullets, label: 'Impacto Real' };
}

// ==================== SLIDE 4 — EXPERIÊNCIA ====================
function Slide4Experience({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { label?: string; keyword?: string; benefit?: string; imageScale?: string; bgColor?: string; headlineVisible?: string; sideStripVisible?: string } }) {
  const { headline, impactText, proofBullets, label } = buildImpactNarrative(productData);

  // Respeitar edições manuais do usuário
  const finalLabel = texts?.label || label;
  const finalKeyword = texts?.keyword || headline;
  const finalImpact = texts?.benefit || impactText;
  const finalBullets = proofBullets;

  // Auto-sizing calibrado para conteúdo rico
  const kwFontSize = finalKeyword.length > 50 ? 38 : finalKeyword.length > 35 ? 46 : finalKeyword.length > 22 ? 56 : 68;
  const labelFontSize = 22;
  const impactFontSize = finalImpact.length > 180 ? 20 : finalImpact.length > 120 ? 22 : finalImpact.length > 70 ? 25 : 28;
  const imageScale4 = Number(texts?.imageScale) || 100;
  const bgColor4 = texts?.bgColor || '#0f0f14';
  const sideStripVisible = (texts?.sideStripVisible ?? 'true') !== 'false';
  const headlineVisible = (texts?.headlineVisible ?? 'true') !== 'false';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden', background: bgColor4, display: 'flex' }}>
      {/* Imagem à esquerda — 42% */}
      {sideStripVisible && (
        <div style={{ width: '42%', flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }}>
          {image ? (
            <img src={image} alt="produto em uso" style={{ maxWidth: '100%', maxHeight: '70%', width: 'auto', height: 'auto', objectFit: 'contain', transform: `scale(${imageScale4 / 100})`, transformOrigin: 'center center' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
          )}
          {/* Feather borda direita */}
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 140, background: `linear-gradient(to right, transparent, ${bgColor4})`, pointerEvents: 'none' }} />
        </div>
      )}


      {/* Número do slide */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>4</span>
      </div>

      {/* Painel direito — textos */}
      <div style={{
        flex: 1, minWidth: 0, maxWidth: sideStripVisible ? '58%' : '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: sideStripVisible ? '80px 60px 80px 48px' : '80px 80px',
        gap: 18, background: bgColor4,
        overflow: 'hidden',
      }}>
        {/* Label contextual */}
        <p style={{ color: '#fff', opacity: 0.65, fontSize: labelFontSize, fontWeight: 700, margin: 0, textTransform: 'uppercase' as const, letterSpacing: 3, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, maxWidth: '100%' }}>{finalLabel}</p>

        {/* Divider accent */}
        {headlineVisible && <div style={{ width: 56, height: 3, background: primaryColor, borderRadius: 2, flexShrink: 0 }} />}

        {/* Headline — benefício principal */}
        {headlineVisible && (
          <h2 style={{ color: '#ffffff', fontSize: kwFontSize, fontWeight: 900, margin: 0, lineHeight: 1.05, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, maxWidth: '100%', hyphens: 'auto' as const }}>{finalKeyword}</h2>
        )}

        {/* Texto de impacto — síntese dor → resolução */}
        <p style={{ color: '#d8d8d8', fontSize: impactFontSize, lineHeight: 1.55, margin: 0, fontWeight: 400, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, maxWidth: '100%' }}>{finalImpact}</p>

        {/* Bullets de prova técnica */}
        {finalBullets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {finalBullets.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, flexShrink: 0, marginTop: impactFontSize * 0.35 }} />
                <span style={{ color: '#c8c8c8', fontSize: impactFontSize * 0.88, lineHeight: 1.4, fontWeight: 500, wordBreak: 'break-word' as const }}>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ==================== SLIDE 5 — SEGURANÇA ====================
function Slide5Security({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { title?: string; badge1?: string; badge2?: string; badge3?: string; imageScale?: string; bgColor?: string; headlineVisible?: string; sideStripVisible?: string } }) {
  const features = productData.features || [];
  const benefits = productData.benefits || [];
  const title = texts?.title || 'Você pode confiar';
  const badges = [
    { icon: 'shield', label: texts?.badge1 || features[1] || features[0] || 'Biocompatível' },
    { icon: 'award', label: texts?.badge2 || features[2] || benefits[1] || '5 Anos de Casos' },
    { icon: 'check', label: texts?.badge3 || features[3] || benefits[2] || 'Qualidade Premium' },
  ];
  const imageScale5 = Number(texts?.imageScale) || 100;
  const bgColor5 = texts?.bgColor || '';
  const sideStripVisible = (texts?.sideStripVisible ?? 'true') !== 'false';
  const headlineVisible = (texts?.headlineVisible ?? 'true') !== 'false';

  // Quando o "side strip" (imagem de fundo + overlay) é desligado, o fundo
  // vira sólido — recalculamos a cor de textos/badges via luminância para legibilidade.
  const solidBg = bgColor5 || '#0f0f14';
  const lightOnDark = !sideStripVisible ? (getLuminance(solidBg) <= 0.5) : true;
  const textColor = lightOnDark ? '#ffffff' : '#111111';
  const badgeBg = lightOnDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
  const badgeBorder = lightOnDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)';
  const numberBg = lightOnDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {(!sideStripVisible || bgColor5) && <div style={{ position: 'absolute', inset: 0, background: solidBg }} />}
      {sideStripVisible && (
        <>
          {image ? (
            <img src={image} alt="segurança" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px)', transform: `scale(${imageScale5 / 100 * 1.1})` }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
        </>
      )}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: numberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: textColor, fontWeight: 900, fontSize: 30 }}>5</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '120px 80px 80px', gap: 32, zIndex: 2 }}>
        {headlineVisible && (
          <h2 style={{ color: textColor, fontSize: 64, fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, maxWidth: '100%', flexShrink: 0 }}>{title}</h2>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
          {badges.map((badge, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 32, background: badgeBg, borderRadius: 20, padding: '18px 36px', minHeight: 96, backdropFilter: 'blur(10px)', border: badgeBorder, flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="32" height="32">
                  {badge.icon === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
                  {badge.icon === 'award' && <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>}
                  {badge.icon === 'check' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                </svg>
              </div>
              <span style={{ color: textColor, fontSize: 34, fontWeight: 700, display: 'block', wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, lineHeight: 1.3, flex: 1, minWidth: 0 }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE 6 — CTA ====================
function Slide6CTA({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { productName?: string; ctaButton?: string; linkLabel?: string; footer?: string; imageScale?: string; bgColor?: string; imageVisible?: string; mediaType?: 'image' | 'video' } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';
  const name = texts?.productName || productData.name;
  const ctaButton = texts?.ctaButton || '💡 Saiba Mais';
  const linkLabel = texts?.linkLabel || '🔗 Saiba Mais';
  const footer = texts?.footer || 'Direct para mais informações';
  const imageScale6 = Number(texts?.imageScale) || 100;
  const bgColor6 = texts?.bgColor || primaryColor;
  const showImageBox = (texts?.imageVisible ?? 'true') !== 'false' && (texts?.mediaType !== 'video' || !!image);

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bgColor6, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 60, position: 'relative' }}>
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 60, left: 60 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>6</span>
      </div>
      {showImageBox && (
        <div style={{ width: 240, height: 240, borderRadius: 24, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {image ? <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${imageScale6 / 100})`, transformOrigin: 'center center' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee' }} />}
        </div>
      )}
      <h2 style={{ color: textOnPrimary, fontSize: 68, fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.1 }}>{name}</h2>
      <div style={{ background: accentColor, color: textOnAccent, borderRadius: 24, padding: '36px 72px', fontSize: 52, fontWeight: 900, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        {ctaButton}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: textOnPrimary, opacity: 0.85, fontSize: 44 }}>
        <span>{linkLabel}</span>
      </div>
      <p style={{ color: textOnPrimary, opacity: 0.6, fontSize: 34, margin: 0, textAlign: 'center' }}>{footer}</p>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export function StrategicCarouselPreview({
  slideImageMap,
  onImageChange,
  onImageFileUpload,
  productImages,
  primaryColor,
  accentColor,
  productData,
  slideTexts,
  onSlideTextChange,
  fontFamily = 'system-ui, -apple-system, sans-serif',
  fontSize = 100,
  onFontFamilyChange,
  onFontSizeChange,
  companyLogoUrl,
  productLogoUrl,
  companyLogoScale = 100,
  productLogoScale = 100,
  onCompanyLogoUpload,
  onProductLogoUpload,
  onCompanyLogoScaleChange,
  onProductLogoScaleChange,
  onCompanyLogoRemove,
  onProductLogoRemove,
}: StrategicCarouselPreviewProps) {
  const FONT_OPTIONS = [
    { label: 'Sistema (Padrão)', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Arial', value: "'Arial', Helvetica, sans-serif" },
    { label: 'Georgia (Elegante)', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Impact (Destaque)', value: "Impact, 'Arial Narrow', sans-serif" },
    { label: 'Courier (Técnico)', value: "'Courier New', Courier, monospace" },
  ];

  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const productLogoInputRef = useRef<HTMLInputElement>(null);

  const logos: CarouselLogos = {
    companyUrl: companyLogoUrl,
    productUrl: productLogoUrl,
    companyScale: companyLogoScale,
    productScale: productLogoScale,
  };

  const slides = [
    { num: 1, label: '🎣 Hook / Gancho', component: <Slide1Hook image={slideImageMap[1] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[1]} /> },
    { num: 2, label: '✨ Apresentação', component: <Slide2Solution image={slideImageMap[2] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[2]} /> },
    { num: 3, label: '🔬 Cientificidade', component: <Slide3Technical image={slideImageMap[3] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[3]} /> },
    { num: 4, label: '💫 Experiência', component: <Slide4Experience image={slideImageMap[4] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[4]} /> },
    { num: 5, label: '🛡️ Segurança', component: <Slide5Security image={slideImageMap[5] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[5]} /> },
    { num: 6, label: '🛒 CTA', component: <Slide6CTA image={slideImageMap[6] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[6]} /> },
  ];

  const LogoControl = ({
    title,
    url,
    scale,
    onUpload,
    onScale,
    onRemove,
    inputRef,
    positionHint,
  }: {
    title: string;
    url?: string;
    scale: number;
    onUpload?: (file: File) => void;
    onScale?: (v: number) => void;
    onRemove?: () => void;
    inputRef: React.RefObject<HTMLInputElement>;
    positionHint: string;
  }) => (
    <div className="flex items-center gap-3 p-2 rounded border border-border bg-background">
      <div
        className="flex items-center justify-center rounded border border-dashed border-border bg-muted overflow-hidden shrink-0"
        style={{ width: 56, height: 40 }}
      >
        {url ? (
          <img src={url} alt={title} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="text-[10px] text-muted-foreground">Sem logo</span>
        )}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{title}</span>
          <span className="text-[10px] text-muted-foreground">{positionHint}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer flex items-center gap-1"
            style={{ fontSize: 11 }}
          >
            <Upload style={{ width: 10, height: 10 }} />
            {url ? 'Trocar' : 'Enviar'}
          </button>
          {url && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
              style={{ fontSize: 11 }}
            >
              Remover
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && onUpload) onUpload(f);
              e.target.value = '';
            }}
          />
        </div>
        {onScale && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Tamanho:</span>
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={scale}
              onChange={(e) => onScale(Number(e.target.value))}
              className="flex-1 h-2 rounded cursor-pointer accent-primary"
            />
            <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">{scale}%</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Font & size controls */}
      {(onFontFamilyChange || onFontSizeChange) && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border">
          {onFontFamilyChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Fonte:</span>
              <select
                value={fontFamily}
                onChange={(e) => onFontFamilyChange(e.target.value)}
                className="text-xs h-8 rounded border border-border bg-background px-2 cursor-pointer"
                style={{ fontFamily }}
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
          {onFontSizeChange && (
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tamanho:</span>
              <input
                type="range"
                min={60}
                max={150}
                step={5}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="flex-1 h-2 rounded cursor-pointer accent-primary"
              />
              <span className="text-xs font-mono text-muted-foreground w-8">{fontSize}%</span>
            </div>
          )}
        </div>
      )}

      {/* Logos da empresa + produto (aplicam em todos os slides) */}
      {(onCompanyLogoUpload || onProductLogoUpload) && (
        <div className="grid sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <LogoControl
            title="Logo da empresa"
            url={companyLogoUrl}
            scale={companyLogoScale}
            onUpload={onCompanyLogoUpload}
            onScale={onCompanyLogoScaleChange}
            onRemove={onCompanyLogoRemove}
            inputRef={companyLogoInputRef}
            positionHint="Topo direito"
          />
          <LogoControl
            title="Logo do produto"
            url={productLogoUrl}
            scale={productLogoScale}
            onUpload={onProductLogoUpload}
            onScale={onProductLogoScaleChange}
            onRemove={onProductLogoRemove}
            inputRef={productLogoInputRef}
            positionHint="Base esquerda"
          />
        </div>
      )}

      {/* Slides grid */}
      <div className="flex flex-wrap gap-6 justify-center">
        {slides.map((slide) => (
          <div key={slide.num} className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{slide.label}</span>
            <SlideWrapper
              slideNum={slide.num}
              productImages={productImages}
              currentImage={slideImageMap[slide.num] || ''}
              onImageChange={onImageChange}
              onImageFileUpload={onImageFileUpload}
              primaryColor={primaryColor}
              slideTexts={slideTexts?.[slide.num as keyof SlideTextsType] as unknown as Record<string, string>}
              onSlideTextChange={onSlideTextChange ? (key, value) => onSlideTextChange(slide.num, key, value) : undefined}
              logos={logos}
            >
              {slide.component}
            </SlideWrapper>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== CORS-safe image loader ====================
const SUPABASE_PROJECT_URL = 'https://pgfgripuanuwwolmtknn.supabase.co';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)),
  ]);
}

export async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Layer 2: edge function proxy (server-side fetch → base64)
  try {
    const res = await withTimeout(
      fetch(`${SUPABASE_PROJECT_URL}/functions/v1/optimize-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, returnBase64: true }),
      }),
      10_000,
      'optimize-image edge function'
    );
    if (res.ok) {
      const data = await res.json();
      if (data.dataUrl) return data.dataUrl;
    }
  } catch (err) {
    console.warn('[fetchAsDataUrl] Edge function failed:', err);
  }

  // Layer 3: direct client-side fetch → blob → FileReader
  try {
    const res = await withTimeout(fetch(url, { mode: 'cors' }), 10_000, 'direct fetch');
    const blob = await res.blob();
    // SVG → rasterizar para PNG: html2canvas/canvas falham em alguns SVGs servidos via data URL.
    if (blob.type === 'image/svg+xml' || /\.svg(\?|$)/i.test(url)) {
      try {
        const svgUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('SVG load failed'));
          img.src = svgUrl;
        });
        const w = img.naturalWidth || 512;
        const h = img.naturalHeight || 512;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(svgUrl);
        return canvas.toDataURL('image/png');
      } catch (svgErr) {
        console.warn('[fetchAsDataUrl] SVG rasterize failed, falling back to data URL:', svgErr);
      }
    }
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[fetchAsDataUrl] Direct fetch failed:', err);
  }

  // Layer 4: original URL (canvas may taint, but we still try)
  return url;
}

type DomVideoDrawOrder = 'video-under-overlay' | 'video-over-overlay';

interface DomVideoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  scale: number;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawVideoCoverInSlot(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, slot: DomVideoSlot) {
  const vw = video.videoWidth || SLIDE_W;
  const vh = video.videoHeight || SLIDE_H;
  const baseScale = Math.max(slot.w / vw, slot.h / vh) * slot.scale;
  const dw = vw * baseScale;
  const dh = vh * baseScale;
  const dx = slot.x + (slot.w - dw) / 2;
  const dy = slot.y + (slot.h - dh) / 2;

  ctx.save();
  roundedRectPath(ctx, slot.x, slot.y, slot.w, slot.h, slot.radius);
  ctx.clip();
  ctx.drawImage(video, dx, dy, dw, dh);
  ctx.restore();
}

async function waitForDomMedia(container: HTMLElement, label: string) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => Promise.race<void>([
      (async () => {
        try { await img.decode(); }
        catch (err) { console.warn(`[${label}] image decode failed`, { src: img.src?.slice(0, 80), err }); }
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]))
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 250))));
}

async function resolveVideoUrlForCanvas(videoUrl: string, logPrefix: string): Promise<{ src: string; revoke?: () => void; usingBlobUrl: boolean }> {
  if (!/^https?:\/\//i.test(videoUrl)) return { src: videoUrl, usingBlobUrl: videoUrl.startsWith('blob:') };
  try {
    const resp = await Promise.race([
      fetch(videoUrl, { mode: 'cors', credentials: 'omit' }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Video fetch timeout (20s)')), 20_000)),
    ]);
    if (!resp.ok) throw new Error(`Video fetch HTTP ${resp.status}`);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    return { src: blobUrl, usingBlobUrl: true, revoke: () => URL.revokeObjectURL(blobUrl) };
  } catch (err) {
    console.warn(`[${logPrefix}] video prefetch failed, using original URL`, err);
    return { src: videoUrl, usingBlobUrl: false };
  }
}

export async function generateDomCompositedVideo({
  videoUrl,
  overlayElement,
  slotSelector,
  drawOrder,
  logPrefix = 'DOM_VIDEO',
  durationCapSeconds = 3600,
}: {
  videoUrl: string;
  overlayElement: React.ReactElement;
  slotSelector: string;
  drawOrder: DomVideoDrawOrder;
  logPrefix?: string;
  durationCapSeconds?: number;
}): Promise<Blob> {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-99999px',
    'top:0',
    `width:${SLIDE_W}px`,
    `height:${SLIDE_H}px`,
    'pointer-events:none',
    'z-index:-1',
    'overflow:hidden',
  ].join(';');
  document.body.appendChild(container);
  const root = createRoot(container);

  let overlayUrl = '';
  let videoRevoke: (() => void) | undefined;

  try {
    root.render(overlayElement);
    await waitForDomMedia(container, logPrefix);

    const containerRect = container.getBoundingClientRect();
    let slots: DomVideoSlot[] = Array.from(container.querySelectorAll<HTMLElement>(slotSelector)).map((el) => {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const radiusAttr = Number(el.dataset.videoRadius);
      const radius = Number.isFinite(radiusAttr) && radiusAttr >= 0
        ? radiusAttr
        : parseFloat(computed.borderTopLeftRadius || '0') || 0;
      const scaleAttr = Number(el.dataset.videoScale);
      const scale = Number.isFinite(scaleAttr) && scaleAttr > 0 ? scaleAttr / 100 : 1;
      return {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        w: rect.width,
        h: rect.height,
        radius,
        scale,
      };
    }).filter((slot) => slot.w > 0 && slot.h > 0);

    if (slots.length === 0) {
      slots = [{ x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, radius: 0, scale: 1 }];
    }

    const overlayCanvas = await html2canvas(container, {
      width: SLIDE_W,
      height: SLIDE_H,
      windowWidth: SLIDE_W,
      windowHeight: SLIDE_H,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 8000,
    });
    const overlayBlob = await new Promise<Blob | null>((resolve) => overlayCanvas.toBlob((b) => resolve(b), 'image/png'));
    if (!overlayBlob) throw new Error('Overlay snapshot failed');
    overlayUrl = URL.createObjectURL(overlayBlob);
    const overlayImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Overlay image load failed'));
      img.src = overlayUrl;
    });

    const resolvedVideo = await resolveVideoUrlForCanvas(videoUrl, logPrefix);
    videoRevoke = resolvedVideo.revoke;
    const videoEl = document.createElement('video');
    if (!resolvedVideo.usingBlobUrl) videoEl.crossOrigin = 'anonymous';
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';
    videoEl.src = resolvedVideo.src;

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error('video load failed'));
        videoEl.load();
      }),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('video load timeout (15s)')), 15_000)),
    ]);

    // Force duration resolution for webm/mp4 without cues (duration === Infinity)
    let duration = videoEl.duration;
    if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
      console.warn(`[${logPrefix}] duration unavailable (${duration}), forcing via seek`);
      await new Promise<void>((resolve) => {
        const onDurationChange = () => {
          if (isFinite(videoEl.duration) && videoEl.duration > 0) {
            videoEl.removeEventListener('durationchange', onDurationChange);
            resolve();
          }
        };
        videoEl.addEventListener('durationchange', onDurationChange);
        try { videoEl.currentTime = 1e101; } catch { /* noop */ }
        setTimeout(resolve, 3000);
      });
      duration = videoEl.duration;
      try { videoEl.currentTime = 0; } catch { /* noop */ }
    }
    if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
      console.warn(`[${logPrefix}] duration still unavailable, falling back to 10s`);
      duration = 10;
    }
    duration = Math.min(duration, durationCapSeconds);
    console.log(`[${logPrefix}] using duration ${duration.toFixed(2)}s`);

    const canvas = document.createElement('canvas');
    canvas.width = SLIDE_W;
    canvas.height = SLIDE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const drawVideoSlots = () => slots.forEach((slot) => drawVideoCoverInSlot(ctx, videoEl, slot));
    const drawFrame = () => {
      ctx.clearRect(0, 0, SLIDE_W, SLIDE_H);
      if (drawOrder === 'video-under-overlay') {
        drawVideoSlots();
        ctx.drawImage(overlayImg, 0, 0, SLIDE_W, SLIDE_H);
      } else {
        ctx.drawImage(overlayImg, 0, 0, SLIDE_W, SLIDE_H);
        drawVideoSlots();
      }
    };

    drawFrame();
    ctx.getImageData(0, 0, 1, 1);

    try {
      if (videoEl.currentTime !== 0) {
        await Promise.race([
          new Promise<void>((resolve) => {
            videoEl.addEventListener('seeked', () => resolve(), { once: true });
            videoEl.currentTime = 0;
          }),
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch { /* keep currently loaded frame */ }

    drawFrame();

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    const recordingDone = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => reject(new Error('MediaRecorder error'));
    });

    recorder.start();
    await videoEl.play();

    const startedAt = performance.now();
    const durationMs = duration * 1000;
    let stopped = false;
    const stopRecorder = () => {
      if (stopped) return;
      stopped = true;
      try { recorder.stop(); } catch { /* noop */ }
    };

    await new Promise<void>((resolve) => {
      const onEnded = () => { stopRecorder(); resolve(); };
      videoEl.addEventListener('ended', onEnded, { once: true });
      const fallbackTimer = window.setTimeout(() => { stopRecorder(); resolve(); }, durationMs + 500);
      const tick = () => {
        if (stopped) return;
        const elapsed = performance.now() - startedAt;
        if (videoEl.ended || elapsed >= durationMs) {
          window.clearTimeout(fallbackTimer);
          stopRecorder();
          resolve();
          return;
        }
        try {
          drawFrame();
          requestAnimationFrame(tick);
        } catch (err) {
          console.error(`[${logPrefix}] frame draw failed`, err);
          window.clearTimeout(fallbackTimer);
          stopRecorder();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

    return await recordingDone;
  } finally {
    try { root.unmount(); } catch { /* noop */ }
    try { container.remove(); } catch { /* noop */ }
    if (overlayUrl) { try { URL.revokeObjectURL(overlayUrl); } catch { /* noop */ } }
    if (videoRevoke) { try { videoRevoke(); } catch { /* noop */ } }
  }
}

// ==================== StrategicSlideRender — single source of truth ====================
// Renders the same JSX as the editor preview, used both for the in-app preview wrappers
// and for the off-screen html2canvas snapshot during PNG export.
export interface StrategicSlideRenderProps {
  slideNum: number;
  image: string;
  primaryColor: string;
  accentColor: string;
  productData: ProductData;
  texts?: Partial<SlideTextsType>;
  logos?: CarouselLogos;
  fontFamily?: string;
  fontSize?: number;
}

export function StrategicSlideRender({ slideNum, image, primaryColor, accentColor, productData, texts, logos, fontFamily, fontSize }: StrategicSlideRenderProps) {
  const t: any = texts || {};
  const slot = t[slideNum] || {};
  const videoMode = slot.mediaType === 'video' && (slot.videoSrc || slot.videoStorageUrl);
  // In video mode (export overlay), suppress slide's own background/image so the
  // underlying <video> shows through when composited on a canvas.
  const renderImage = videoMode ? '' : image;
  const slotForRender = videoMode
    ? {
        ...slot,
        bgColor: 'transparent',
        overlayOpacity: '0',
        sideStripVisible: 'false',
        imageVisible: 'false',
        mediaType: 'video',
      }
    : slot;
  const renderTexts = { ...t, [slideNum]: slotForRender };

  const maskOpacityNum = Math.min(90, Math.max(0, Number(slot.maskOpacity ?? 0)));
  const maskColor = slot.maskColor || '#000000';
  const textColorOverride = slot.textColor || '';
  const contentClass = `strategic-export-content-${slideNum}`;

  let body: React.ReactNode = null;
  if (slideNum === 1) body = <Slide1Hook image={renderImage} primaryColor={primaryColor} productData={productData} texts={renderTexts[1]} />;
  else if (slideNum === 2) body = <Slide2Solution image={renderImage} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={renderTexts[2]} />;
  else if (slideNum === 3) body = <Slide3Technical image={renderImage} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={renderTexts[3]} />;
  else if (slideNum === 4) body = <Slide4Experience image={renderImage} primaryColor={primaryColor} productData={productData} texts={renderTexts[4]} />;
  else if (slideNum === 5) body = <Slide5Security image={renderImage} primaryColor={primaryColor} productData={productData} texts={renderTexts[5]} />;
  else if (slideNum === 6) body = <Slide6CTA image={renderImage} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={renderTexts[6]} />;

  return (
    <div style={{
      position: 'relative', width: SLIDE_W, height: SLIDE_H,
      background: videoMode ? 'transparent' : undefined,
      fontFamily: fontFamily || undefined,
      fontSize: typeof fontSize === 'number' ? `${fontSize}%` : undefined,
    }}>

      {textColorOverride && (
        <style>{`.${contentClass} :is(p, span, h1, h2, h3, h4, h5, h6, div, li, a, button) { color: ${textColorOverride} !important; }`}</style>
      )}
      {videoMode && (
        <div
          data-strategic-video-slot="true"
          data-video-scale="100"
          data-video-radius="0"
          aria-hidden
          style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
        />
      )}
      {maskOpacityNum > 0 && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: maskColor,
            opacity: maskOpacityNum / 100,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      )}
      <div className={contentClass} style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
        {body}
      </div>
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
        <CarouselLogosOverlay logos={logos} />
      </div>
    </div>
  );
}

/**
 * PNG export — renders the SAME JSX used in the preview (StrategicSlideRender)
 * into an off-screen container and snapshots it via html2canvas.
 * Guarantees pixel parity between editor preview and exported file.
 */
export async function generateSlidePNG(
  slideNum: number,
  imageUrl: string,
  primaryColor: string,
  accentColor: string,
  productData: ProductData,
  texts?: Record<string, string>,
  logos?: CarouselLogos,
  fontFamily?: string,
  fontSize?: number,
): Promise<Blob> {
  // 1. Pre-fetch image as data URL to avoid CORS tainting in html2canvas
  let imgDataUrl = '';
  if (imageUrl) {
    try {
      imgDataUrl = await fetchAsDataUrl(imageUrl);
    } catch (err) {
      console.warn('[STRATEGIC_PNG] Failed to prefetch image, using original URL:', err);
      imgDataUrl = imageUrl;
    }
  }

  // 1b. Pre-fetch logos as data URLs so html2canvas can paint them.
  let resolvedLogos: CarouselLogos | undefined = logos;
  if (logos && (logos.companyUrl || logos.productUrl)) {
    const [companyData, productData2] = await Promise.all([
      logos.companyUrl ? fetchAsDataUrl(logos.companyUrl).catch(() => logos.companyUrl) : Promise.resolve(undefined),
      logos.productUrl ? fetchAsDataUrl(logos.productUrl).catch(() => logos.productUrl) : Promise.resolve(undefined),
    ]);
    resolvedLogos = { ...logos, companyUrl: companyData, productUrl: productData2 };
  }

  // 2. Wrap flat texts under the proper slide key expected by StrategicSlideRender
  const slideTexts: Partial<SlideTextsType> = texts
    ? ({ [slideNum]: texts } as any)
    : {};

  // 3. Build off-screen container at exact slide dimensions
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-99999px',
    'top:0',
    `width:${SLIDE_W}px`,
    `height:${SLIDE_H}px`,
    'pointer-events:none',
    'z-index:-1',
    'overflow:hidden',
  ].join(';');
  document.body.appendChild(container);

  // 4. Render React component into the container
  const root = createRoot(container);
  root.render(
    React.createElement(StrategicSlideRender, {
      slideNum,
      image: imgDataUrl,
      primaryColor,
      accentColor,
      productData,
      texts: slideTexts,
      logos: resolvedLogos,
      fontFamily,
      fontSize,
    })
  );
  await waitForDomMedia(container, `STRATEGIC_PNG_${slideNum}`);

  let blob: Blob | null = null;
  try {
    // 5. Snapshot via html2canvas at native resolution
    const snapshot = await html2canvas(container, {
      width: SLIDE_W,
      height: SLIDE_H,
      windowWidth: SLIDE_W,
      windowHeight: SLIDE_H,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 8000,
    });

    blob = await new Promise<Blob | null>((resolve) => {
      snapshot.toBlob((b) => resolve(b), 'image/png');
    });
  } finally {
    try { root.unmount(); } catch {}
    try { container.remove(); } catch {}
  }

  if (!blob) throw new Error('html2canvas snapshot failed (toBlob returned null)');
  return blob;
}

/**
 * Generate a WEBM video for a Strategic slide, with the slide template
 * (text, mask, logos) composited over the source video.
 *
 * Strategy: render the template DOM via html2canvas (with the slide in
 * "videoMode" so its background is transparent) to obtain a single PNG
 * overlay. Then draw the playing <video> + overlay on a canvas frame loop
 * and capture via MediaRecorder until the video ends.
 */
export async function generateStrategicSlideVideo(
  slideNum: number,
  videoUrl: string,
  primaryColor: string,
  accentColor: string,
  productData: ProductData,
  texts: Record<string, string>,
  logos?: CarouselLogos,
  fontFamily?: string,
  fontSize?: number,
): Promise<Blob> {
  let resolvedLogos: CarouselLogos | undefined = logos;
  if (logos && (logos.companyUrl || logos.productUrl)) {
    const [companyData, productData2] = await Promise.all([
      logos.companyUrl ? fetchAsDataUrl(logos.companyUrl).catch(() => logos.companyUrl) : Promise.resolve(undefined),
      logos.productUrl ? fetchAsDataUrl(logos.productUrl).catch(() => logos.productUrl) : Promise.resolve(undefined),
    ]);
    resolvedLogos = { ...logos, companyUrl: companyData, productUrl: productData2 };
  }

  const overlayTexts = ({
    [slideNum]: {
      ...texts,
      mediaType: 'video',
      videoSrc: videoUrl,
      videoStorageUrl: videoUrl,
    } as any,
  } as unknown as Partial<SlideTextsType>);

  return generateDomCompositedVideo({
    videoUrl,
    overlayElement: React.createElement(StrategicSlideRender, {
      slideNum,
      image: '',
      primaryColor,
      accentColor,
      productData,
      texts: overlayTexts,
      logos: resolvedLogos,
      fontFamily,
      fontSize,
    }),
    slotSelector: '[data-strategic-video-slot="true"]',
    drawOrder: 'video-under-overlay',
    logPrefix: `STRATEGIC_VIDEO_${slideNum}`,
    durationCapSeconds: 3600,
  });
}

// ==================== HTML EXPORT HELPERS (legado) ====================
export function generateSlideHTML(slideNum: number, imageUrl: string, primaryColor: string, accentColor: string, productData: ProductData): string {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';
  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];
  const benefits = productData.benefits || [];
  const items = specs.length > 0
    ? specs.map(s => `<div style="display:flex;align-items:flex-start;gap:24px;"><div style="width:56px;height:56px;border-radius:12px;background:${primaryColor};flex-shrink:0;"></div><div><p style="color:#e0e0e0;font-weight:700;font-size:36px;margin:0;">${s.label}</p>${s.value ? `<p style="color:#aaa;font-size:30px;margin:6px 0 0 0;">${s.value}</p>` : ''}</div></div>`)
    : features.map(f => `<div style="display:flex;align-items:flex-start;gap:24px;"><div style="width:56px;height:56px;border-radius:12px;background:${primaryColor};flex-shrink:0;"></div><div><p style="color:#e0e0e0;font-weight:700;font-size:36px;margin:0;">${f}</p></div></div>`);

  const smartHook = (() => {
    // Prioridade 1: extrair do sales_pitch
    if (productData.salesPitch) {
      const sentences = productData.salesPitch.split(/[.!]/);
      const first = sentences[0]?.trim();
      if (first && first.length >= 15 && first.length <= 90) return first;
      const clause = first?.split(',')[0]?.trim();
      if (clause && clause.length >= 20 && clause.length <= 90) return clause;
    }
    const shortFeature = features.find(f => f && f.length <= 35);
    if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
    const shortBenefit = benefits.find(b => b && b.length <= 45);
    if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
    return `${productData.name}: a escolha que muda tudo`;
  })();

  const slideBodies: Record<number, string> = {
    1: `<div style="position:absolute;top:0;left:0;right:0;height:55%;background:${primaryColor};"></div>${imageUrl ? `<img src="${imageUrl}" style="position:absolute;bottom:0;left:0;right:0;height:60%;width:100%;object-fit:cover;object-position:center top;">` : ''}<div style="position:absolute;top:15%;left:80px;right:80px;text-align:center;"><p style="color:${textOnPrimary};font-weight:900;font-size:80px;line-height:1.1;margin:0;">${smartHook}</p></div><p style="position:absolute;bottom:60px;left:80px;right:80px;color:#fff;font-size:44px;font-weight:600;margin:0;text-align:center;">${productData.name}</p>`,
    2: `<div style="width:100%;height:100%;background:#f8f8f8;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:80px;box-sizing:border-box;">${productData.category ? `<div style="background:${primaryColor};color:${textOnPrimary};border-radius:50px;padding:16px 48px;font-size:36px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${productData.category}</div>` : '<div></div>'}${imageUrl ? `<img src="${imageUrl}" style="max-width:70%;max-height:600px;object-fit:contain;filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));">` : '<div style="width:500px;height:500px;background:#e0e0e0;border-radius:20px;"></div>'}<div style="text-align:center;"><h2 style="margin:0;font-size:68px;font-weight:900;color:#111;line-height:1.1;">${productData.name}</h2></div></div>`,
    3: `<div style="width:100%;height:100%;display:flex;"><div style="width:42%;position:relative;overflow:hidden;">${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : ''}<div style="position:absolute;top:0;right:0;bottom:0;width:120px;background:linear-gradient(to right,transparent,#0f0f14);"></div></div><div style="flex:1;padding:100px 60px 80px 40px;display:flex;flex-direction:column;justify-content:center;background:#0f0f14;"><h2 style="color:#fff;font-size:52px;font-weight:900;margin:0 0 60px 0;">Por que confiar?</h2><div style="display:flex;flex-direction:column;gap:36px;">${items.join('')}</div></div></div>`,
    4: `<div style="width:100%;height:100%;display:flex;"><div style="width:50%;position:relative;overflow:hidden;">${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;background:#ccc;"></div>'}</div><div style="width:50%;background:${primaryColor};display:flex;flex-direction:column;justify-content:center;padding:80px 70px;box-sizing:border-box;"><p style="color:${textOnPrimary};opacity:0.7;font-size:36px;font-weight:600;margin:0 0 20px 0;text-transform:uppercase;letter-spacing:4px;">Experiência</p><h2 style="color:${textOnPrimary};font-size:${(features[0] || 'Excelência').length > 15 ? 65 : 90}px;font-weight:900;margin:0 0 40px 0;line-height:1;word-break:break-word;">${features[0] || 'Excelência'}</h2><p style="color:${textOnPrimary};opacity:0.9;font-size:38px;line-height:1.5;margin:0;">${benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso'}</p></div></div>`,
    5: `${imageUrl ? `<img src="${imageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(8px);transform:scale(1.1);">` : '<div style="position:absolute;inset:0;background:#222;"></div>'}<div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;gap:50px;"><h2 style="color:#fff;font-size:86px;font-weight:900;margin:0;text-align:center;">Você pode confiar</h2><div style="display:flex;flex-direction:column;gap:28px;width:100%;">${[features[0]||'Biocompatível', features[1]||benefits[0]||'5 Anos de Casos', features[2]||benefits[1]||'Qualidade Premium'].map(badge => `<div style="display:flex;align-items:center;gap:36px;background:rgba(255,255,255,0.12);border-radius:20px;padding:28px 44px;border:1px solid rgba(255,255,255,0.2);overflow:hidden;"><div style="width:72px;height:72px;border-radius:50%;background:${primaryColor};flex-shrink:0;"></div><span style="color:#fff;font-size:40px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${badge}</span></div>`).join('')}</div></div>`,
    6: `<div style="width:100%;height:100%;background:${primaryColor};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;box-sizing:border-box;gap:60px;"><div style="width:240px;height:240px;border-radius:24px;overflow:hidden;border:4px solid rgba(255,255,255,0.8);">${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;background:#eee;"></div>'}</div><h2 style="color:${textOnPrimary};font-size:68px;font-weight:900;margin:0;text-align:center;">${productData.name}</h2><div style="background:${accentColor};color:${textOnAccent};border-radius:24px;padding:36px 72px;font-size:52px;font-weight:900;">💡 Saiba Mais</div><span style="color:${textOnPrimary};opacity:0.85;font-size:44px;">🔗 Saiba Mais</span><p style="color:${textOnPrimary};opacity:0.6;font-size:34px;margin:0;">Direct para mais informações</p></div>`,
  };

  const SLIDE_NAMES: Record<number, string> = { 1: 'Hook / Gancho', 2: 'Apresentação da Solução', 3: 'Diferencial Técnico', 4: 'Benefício na Prática', 5: 'Segurança / Quebra de Objeção', 6: 'Chamada para Ação' };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Slide ${slideNum} — ${SLIDE_NAMES[slideNum] || ''} — ${productData.name}</title>
  <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { width: 1080px; height: 1350px; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; } .slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; }</style>
</head>
<body><div class="slide">${slideBodies[slideNum] || ''}</div></body>
</html>`;
}
