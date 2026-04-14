import React, { useState, useRef } from 'react';
import { Upload, Pencil, ChevronDown, ChevronUp, Video, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// ========================= Types =========================
export interface EngagementSlideTexts {
  title: string;
  text: string;
  image_suggestion: string;
  cta_label?: string | null;
  imageScale?: string;
  bgColor?: string;
  accentColor?: string;
  mediaType?: 'image' | 'video';
  videoSrc?: string; // blob URL for video preview
  videoStorageUrl?: string; // persisted Supabase Storage URL for video
}

export type EngagementSlideTextsMap = Record<number, EngagementSlideTexts>;

/** Unified video source resolver — use everywhere instead of ad-hoc checks */
export function resolveVideoSource(texts: EngagementSlideTexts): string | null {
  if (texts.mediaType !== 'video') return null;
  return texts.videoSrc || texts.videoStorageUrl || null;
}

interface EngagementCarouselPreviewProps {
  slideImageMap: Record<number, string>;
  onImageChange: (slideNum: number, url: string) => void;
  onImageFileUpload?: (slideNum: number, file: File) => void;
  productImages: Array<{ url: string; alt?: string }>;
  primaryColor: string;
  accentColor: string;
  brandName: string;
  handleName: string;
  slideTexts: EngagementSlideTextsMap;
  onSlideTextChange: (slideNum: number, key: string, value: string) => void;
  fontFamily?: string;
  fontSize?: number;
}

const SLIDE_SCALE = 0.22;
const SLIDE_W = 1080;
const SLIDE_H = 1350;

const SLIDE_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: '🎯', label: 'Capa / Gancho' },
  2: { emoji: '😰', label: 'Problema' },
  3: { emoji: '💡', label: 'Solução' },
  4: { emoji: '🔬', label: 'Prova Técnica' },
  5: { emoji: '🏆', label: 'Autoridade' },
  6: { emoji: '📲', label: 'CTA' },
};

// Alternating dark/light backgrounds
const DEFAULT_BG: Record<number, string> = {
  1: '#1a1a1a',
  2: '#f5f5f5',
  3: '#1a1a1a',
  4: '#f5f5f5',
  5: '#1a1a1a',
  6: '#1a1a1a',
};

// ========================= Rich text parser =========================
// Supports **bold** and {highlight} with accent color
interface TextSegment {
  text: string;
  bold: boolean;
  highlight: boolean;
}

function parseRichText(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = input;
  const regex = /(\*\*(.+?)\*\*|\{(.+?)\})/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: remaining.slice(lastIndex, match.index), bold: false, highlight: false });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true, highlight: false });
    } else if (match[3]) {
      segments.push({ text: match[3], bold: false, highlight: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) {
    segments.push({ text: remaining.slice(lastIndex), bold: false, highlight: false });
  }
  return segments.length ? segments : [{ text: input, bold: false, highlight: false }];
}

// ========================= Canvas helpers =========================
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) {
  const sw = (img as any).naturalWidth || (img as any).videoWidth || (img as HTMLImageElement).width;
  const sh = (img as any).naturalHeight || (img as any).videoHeight || (img as HTMLImageElement).height;
  const ratio = Math.max(dw / sw, dh / sh);
  const nw = sw * ratio;
  const nh = sh * ratio;
  ctx.drawImage(img as any, dx - (nw - dw) / 2, dy - (nh - dh) / 2, nw, nh);
}

// Draw rich text on canvas with bold/**highlight** support
function drawRichText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  fontBase: string,
  fontBold: string,
  colorNormal: string,
  colorAccent: string,
  align: 'left' | 'center' = 'left'
): number {
  const segments = parseRichText(text);
  // Simple line-break: split into words with style, wrap
  const words: Array<{ word: string; bold: boolean; highlight: boolean }> = [];
  for (const seg of segments) {
    const ws = seg.text.split(/(\s+)/);
    for (const w of ws) {
      if (w) words.push({ word: w, bold: seg.bold, highlight: seg.highlight });
    }
  }

  const lines: Array<typeof words> = [];
  let currentLine: typeof words = [];
  let currentWidth = 0;

  for (const w of words) {
    ctx.font = w.bold ? fontBold : fontBase;
    const ww = ctx.measureText(w.word).width;
    if (currentWidth + ww > maxW && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [w];
      currentWidth = ww;
    } else {
      currentLine.push(w);
      currentWidth += ww;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  let cy = y;
  for (const line of lines) {
    // Calculate line width for center align
    let lineWidth = 0;
    for (const w of line) {
      ctx.font = w.bold ? fontBold : fontBase;
      lineWidth += ctx.measureText(w.word).width;
    }
    let cx = align === 'center' ? x - lineWidth / 2 : x;
    for (const w of line) {
      ctx.font = w.bold ? fontBold : fontBase;
      ctx.fillStyle = w.highlight ? colorAccent : colorNormal;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(w.word, cx, cy);
      cx += ctx.measureText(w.word).width;
    }
    cy += lineH;
  }
  return cy;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, align: 'left' | 'center' = 'left'): number {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line !== '') {
      if (align === 'center') ctx.textAlign = 'center';
      ctx.fillText(line.trim(), x, cy);
      line = word + ' ';
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line.trim()) {
    if (align === 'center') ctx.textAlign = 'center';
    ctx.fillText(line.trim(), x, cy);
    cy += lineH;
  }
  return cy;
}

// ========================= SlideWrapper =========================
interface SlideWrapperProps {
  slideNum: number;
  children: React.ReactNode;
  productImages: Array<{ url: string; alt?: string }>;
  currentImage: string;
  onImageChange: (slideNum: number, url: string) => void;
  onImageFileUpload?: (slideNum: number, file: File) => void;
  primaryColor: string;
  slideTexts?: Record<string, string>;
  onSlideTextChange?: (key: string, value: string) => void;
  mediaType?: 'image' | 'video';
  onMediaTypeChange?: (type: 'image' | 'video') => void;
}

const EDITOR_FIELDS: Record<number, Array<{ key: string; label: string; type: 'input' | 'textarea' | 'slider' | 'color' }>> = {
  1: [
    { key: 'title', label: 'Título (gancho)', type: 'textarea' },
    { key: 'text', label: 'Subtítulo', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
  2: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'text', label: 'Corpo', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
  3: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'text', label: 'Corpo', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
  4: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'text', label: 'Corpo', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
  5: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'text', label: 'Corpo', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
  6: [
    { key: 'title', label: 'Título CTA', type: 'textarea' },
    { key: 'text', label: 'Corpo CTA', type: 'textarea' },
    { key: 'cta_label', label: 'Botão CTA', type: 'input' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
    { key: 'accentColor', label: 'Cor de destaque', type: 'color' },
  ],
};

function SlideWrapper({ slideNum, children, productImages, currentImage, onImageChange, onImageFileUpload, primaryColor, slideTexts, onSlideTextChange, mediaType, onMediaTypeChange }: SlideWrapperProps) {
  const containerW = SLIDE_W * SLIDE_SCALE;
  const containerH = SLIDE_H * SLIDE_SCALE;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const info = SLIDE_LABELS[slideNum];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith('video/')) {
      // Store video blob URL for live preview, extract thumbnail for PNG export
      const blobUrl = URL.createObjectURL(file);
      onSlideTextChange?.('videoSrc', blobUrl);
      onMediaTypeChange?.('video');

      // Upload the video file to Supabase Storage via parent handler
      if (onImageFileUpload) {
        onImageFileUpload(slideNum, file);
      }

      // Also extract a thumbnail for PNG export
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.src = blobUrl;
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1080;
          canvas.height = video.videoHeight || 1350;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            onImageChange(slideNum, dataUrl); // thumbnail for PNG export
          }
        } catch (err) {
          console.warn('Could not extract video thumbnail:', err);
        }
      };
      video.onerror = () => {
        console.warn('Video load error, keeping blob URL for preview');
      };
    } else {
      // Upload image file to Storage via parent
      if (onImageFileUpload) {
        onImageFileUpload(slideNum, file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          onImageChange(slideNum, dataUrl);
        };
        reader.readAsDataURL(file);
      }
      onMediaTypeChange?.('image');
    }
    e.target.value = '';
  };

  const fields = EDITOR_FIELDS[slideNum] || [];

  return (
    <div className="flex flex-col items-center gap-2" style={{ maxWidth: containerW + 40 }}>
      {/* Label */}
      <div className="text-xs text-muted-foreground font-medium">{info?.emoji} {info?.label}</div>

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
          }}
        >
          {children}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: containerW + 40 }}>
        {productImages.slice(0, 4).map((img, idx) => (
          <button
            key={idx}
            onClick={() => onImageChange(slideNum, img.url)}
            title="Usar esta imagem"
            style={{
              width: 26, height: 26, borderRadius: 4, overflow: 'hidden', padding: 0,
              border: currentImage === img.url ? `2px solid ${primaryColor}` : '2px solid transparent',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <img src={img.url} alt={img.alt || `img ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload imagem ou vídeo"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
          style={{ fontSize: 10, height: 26, flexShrink: 0 }}
        >
          <Upload style={{ width: 10, height: 10 }} />
          <span>Upload</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />

        {/* Media type toggle */}
        {onMediaTypeChange && (
          <button
            onClick={() => onMediaTypeChange(mediaType === 'video' ? 'image' : 'video')}
            title={mediaType === 'video' ? 'Modo Vídeo ativo' : 'Modo Imagem ativo'}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
            style={{ fontSize: 10, height: 26, flexShrink: 0 }}
          >
            {mediaType === 'video' ? <Video style={{ width: 10, height: 10 }} /> : <ImageIcon style={{ width: 10, height: 10 }} />}
          </button>
        )}

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

      {/* Editor */}
      {editorOpen && onSlideTextChange && fields.length > 0 && (
        <div className="w-full space-y-2 p-3 bg-muted/40 border border-border rounded-lg" style={{ maxWidth: containerW + 40 }}>
          {fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={slideTexts?.[field.key] || ''}
                  onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                  className="text-xs min-h-[50px]"
                  placeholder={field.label}
                />
              ) : field.type === 'color' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={slideTexts?.[field.key] || '#FF6B35'}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={slideTexts?.[field.key] || ''}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="text-xs h-8 flex-1"
                    placeholder="#FF6B35"
                  />
                </div>
              ) : field.type === 'slider' ? (
                <div className="flex items-center gap-2">
                  <Slider
                    min={50}
                    max={150}
                    step={5}
                    value={[Number(slideTexts?.[field.key]) || 100]}
                    onValueChange={([v]) => onSlideTextChange(field.key, String(v))}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-8">{slideTexts?.[field.key] || '100'}%</span>
                </div>
              ) : (
                <Input
                  value={slideTexts?.[field.key] || ''}
                  onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                  className="text-xs h-8"
                  placeholder={field.label}
                />
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-1">
            💡 Use <code className="bg-muted px-1 rounded">**texto**</code> para negrito e <code className="bg-muted px-1 rounded">{'{texto}'}</code> para destaque colorido
          </p>
        </div>
      )}
    </div>
  );
}

// ========================= Slide Renderers (JSX preview) =========================
function renderSlideContent(
  slideNum: number,
  texts: EngagementSlideTexts,
  imageUrl: string,
  primaryColor: string,
  accentColor: string,
  brandName: string,
  handleName: string,
) {
  const bg = texts.bgColor || DEFAULT_BG[slideNum] || '#1a1a1a';
  const accent = texts.accentColor || accentColor || '#FF6B35';
  const isDark = getLuminance(bg) < 0.5;
  const textColor = isDark ? '#ffffff' : '#111111';
  const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const imageScale = Number(texts.imageScale) || 100;

  // Rich text renderer for JSX
  const RichText = ({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) => {
    const segments = parseRichText(text || '');
    return (
      <span className={className} style={style}>
        {segments.map((seg, i) => (
          <span key={i} style={{ fontWeight: seg.bold ? 900 : undefined, color: seg.highlight ? accent : undefined }}>
            {seg.text}
          </span>
        ))}
      </span>
    );
  };

  // Header removed per design requirement

  // Media block (image or video)
  const MediaBlock = ({ height = 440 }: { height?: number }) => {
    const videoSource = resolveVideoSource(texts);
    if (videoSource) {
      return (
        <div style={{
          width: '100%', height, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <video
            src={videoSource}
            autoPlay muted loop playsInline
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: `scale(${imageScale / 100})`,
              borderRadius: 16,
            }}
          />
        </div>
      );
    }
    return imageUrl ? (
      <div style={{
        width: '100%', height, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${imageScale / 100})`,
            borderRadius: 16,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    ) : (
      <div style={{
        width: '100%', height,
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: subTextColor, fontSize: 36,
      }}>
        📷 Upload imagem
      </div>
    );
  };

  // Slide 1: Full-bleed cover layout
  if (slideNum === 1) {
    return (
      <div style={{
        width: SLIDE_W, height: SLIDE_H, background: bg,
        position: 'relative', overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Full-bleed media */}
        {resolveVideoSource(texts) ? (
          <video
            src={resolveVideoSource(texts)!}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              transform: `scale(${imageScale / 100})`,
            }}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              transform: `scale(${imageScale / 100})`,
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: subTextColor, fontSize: 36,
          }}>
            📷 Upload imagem
          </div>
        )}

        {/* Gradient overlay bottom 50% */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, width: '100%', height: '60%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
        }} />

        {/* Text over gradient */}
        <div style={{
          position: 'absolute', bottom: 60, left: 60, right: 60,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
            <RichText text={texts.title || ''} />
          </div>
          {texts.text && (
            <div style={{ fontSize: 36, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }}>
              <RichText text={texts.text} />
            </div>
          )}
        </div>

        {/* Slide number badge */}
        <div style={{
          position: 'absolute', bottom: 40, right: 48,
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.5)',
        }}>
          1
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: SLIDE_W, height: SLIDE_H, background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header removed */}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: slideNum === 6 ? '40px 60px 40px' : '48px 60px 48px', gap: slideNum === 6 ? 20 : 28, justifyContent: slideNum === 6 ? 'flex-start' : 'center' }}>
        {/* Title */}
        <div style={{
          fontSize: slideNum === 6 ? 28 : 56, fontWeight: 900, color: textColor, lineHeight: 1.15,
          ...(slideNum === 6 ? { maxHeight: 160, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const } : {}),
        }}>
          <RichText text={texts.title || ''} />
        </div>

        {/* Image */}
        <MediaBlock height={slideNum === 6 ? 160 : 440} />

        {/* Body text */}
        {texts.text && (
          <div style={{ fontSize: slideNum === 6 ? 22 : 36, lineHeight: 1.5, color: subTextColor, fontWeight: 400, maxHeight: slideNum === 6 ? 120 : undefined, overflow: 'hidden' }}>
            <RichText text={texts.text} />
          </div>
        )}

        {/* CTA button for slide 6 */}
        {slideNum === 6 && texts.cta_label && (
          <div style={{
            alignSelf: 'center',
            background: accent,
            color: getLuminance(accent) > 0.5 ? '#000' : '#fff',
            padding: '14px 32px',
            borderRadius: 20,
            fontSize: 24,
            fontWeight: 900,
            textAlign: 'center',
            flexShrink: 0,
            width: '100%',
            maxWidth: '100%',
            wordBreak: 'break-word' as const,
            overflowWrap: 'break-word' as const,
          }}>
            {texts.cta_label}
          </div>
        )}
      </div>

      {/* Slide number badge */}
      <div style={{
        position: 'absolute', bottom: 40, right: 48,
        width: 60, height: 60, borderRadius: '50%',
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 900, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
      }}>
        {slideNum}
      </div>
    </div>
  );
}

// ========================= Main Component =========================
export function EngagementCarouselPreview({
  slideImageMap,
  onImageChange,
  onImageFileUpload,
  productImages,
  primaryColor,
  accentColor,
  brandName,
  handleName,
  slideTexts,
  onSlideTextChange,
}: EngagementCarouselPreviewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory' }}>
      {[1, 2, 3, 4, 5, 6].map((num) => {
        const texts = slideTexts[num] || { title: '', text: '', image_suggestion: '' };
        const imgUrl = slideImageMap[num] || '';
        const stMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(texts)) {
          if (typeof v === 'string') stMap[k] = v;
        }

        return (
          <SlideWrapper
            key={num}
            slideNum={num}
            productImages={productImages}
            currentImage={imgUrl}
            onImageChange={onImageChange}
            onImageFileUpload={onImageFileUpload}
            primaryColor={primaryColor}
            slideTexts={stMap}
            onSlideTextChange={(key, value) => onSlideTextChange(num, key, value)}
            mediaType={(texts.mediaType as 'image' | 'video') || 'image'}
            onMediaTypeChange={(type) => onSlideTextChange(num, 'mediaType', type)}
          >
            {renderSlideContent(num, texts, imgUrl, primaryColor, accentColor, brandName, handleName)}
          </SlideWrapper>
        );
      })}
    </div>
  );
}

// ========================= PNG Export =========================
export async function generateEngagementSlidePNG(
  slideNum: number,
  imageUrl: string,
  texts: EngagementSlideTexts,
  primaryColor: string,
  accentColor: string,
  brandName: string,
  handleName: string,
): Promise<Blob> {
  const W = SLIDE_W;
  const H = SLIDE_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bg = texts.bgColor || DEFAULT_BG[slideNum] || '#1a1a1a';
  const accent = texts.accentColor || accentColor || '#FF6B35';
  const isDark = getLuminance(bg) < 0.5;
  const textColor = isDark ? '#ffffff' : '#111111';
  const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const imageScale = Number(texts.imageScale) || 100;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // No header drawn (removed per design)

  // Load image
  let img: HTMLImageElement | null = null;
  if (imageUrl) {
    try {
      img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageUrl;
      });
    } catch { img = null; }
  }

  // Slide 1: Full-bleed cover with gradient
  if (slideNum === 1) {
    if (img) {
      ctx.save();
      const scaleF = imageScale / 100;
      ctx.translate(W / 2, H / 2);
      ctx.scale(scaleF, scaleF);
      ctx.translate(-W / 2, -H / 2);
      drawImageCover(ctx, img, 0, 0, W, H);
      ctx.restore();
    }

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    const titleFont = '900 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let titleEndY = drawRichText(ctx, texts.title || '', 60, H - 300, W - 120, 86, titleFont, titleFont, '#ffffff', accent, 'left');

    // Subtitle
    if (texts.text) {
      const bodyFont = '400 36px system-ui, -apple-system, sans-serif';
      const bodyFontBold = '700 36px system-ui, -apple-system, sans-serif';
      drawRichText(ctx, texts.text, 60, titleEndY + 20, W - 120, 54, bodyFont, bodyFontBold, 'rgba(255,255,255,0.8)', accent, 'left');
    }

    // Slide number badge
    ctx.beginPath();
    ctx.arc(W - 78, H - 70, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', W - 78, H - 70);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    });
  }

  // Title
  const titleFontSize = slideNum === 1 ? 72 : (slideNum === 6 ? 36 : 56);
  const titleFont = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
  const titleFontBold = titleFont; // already bold
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const titleY = 100;
  const titleEndY = drawRichText(ctx, texts.title || '', 60, titleY, W - 120, titleFontSize * 1.2, titleFont, titleFont, textColor, accent, 'left');

  // Image area
  const imgY = Math.max(titleEndY + 20, 320);
  const imgH = slideNum === 6 ? 160 : 440;
  if (img) {
    ctx.save();
    const scaleF = imageScale / 100;
    const cx = W / 2;
    const cy = imgY + imgH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scaleF, scaleF);
    ctx.translate(-cx, -cy);
    // Rounded clip
    ctx.beginPath();
    const rr = 16;
    ctx.moveTo(60 + rr, imgY);
    ctx.lineTo(W - 60 - rr, imgY);
    ctx.arcTo(W - 60, imgY, W - 60, imgY + rr, rr);
    ctx.lineTo(W - 60, imgY + imgH - rr);
    ctx.arcTo(W - 60, imgY + imgH, W - 60 - rr, imgY + imgH, rr);
    ctx.lineTo(60 + rr, imgY + imgH);
    ctx.arcTo(60, imgY + imgH, 60, imgY + imgH - rr, rr);
    ctx.lineTo(60, imgY + rr);
    ctx.arcTo(60, imgY, 60 + rr, imgY, rr);
    ctx.closePath();
    ctx.clip();
    drawImageCover(ctx, img, 60, imgY, W - 120, imgH);
    ctx.restore();
  } else {
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(60, imgY, W - 120, imgH);
  }

  // Body text
  const bodyY = imgY + imgH + (slideNum === 6 ? 20 : 28);
  if (texts.text) {
    const bodyFontSize = slideNum === 6 ? 22 : 36;
    const bodyFont = `400 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    const bodyFontBold = `700 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    drawRichText(ctx, texts.text, 60, bodyY, W - 120, bodyFontSize * 1.5, bodyFont, bodyFontBold, subTextColor, accent, 'left');
  }

  // CTA button for slide 6
  if (slideNum === 6 && texts.cta_label) {
    const btnW = W - 120;
    const btnH = 80;
    const btnX = 60;
    const btnY = H - 140;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(btnX + 20, btnY);
    ctx.lineTo(btnX + btnW - 20, btnY);
    ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + 20, 20);
    ctx.lineTo(btnX + btnW, btnY + btnH - 20);
    ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - 20, btnY + btnH, 20);
    ctx.lineTo(btnX + 20, btnY + btnH);
    ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - 20, 20);
    ctx.lineTo(btnX, btnY + 20);
    ctx.arcTo(btnX, btnY, btnX + 20, btnY, 20);
    ctx.closePath();
    ctx.fill();
    ctx.font = '900 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = getLuminance(accent) > 0.5 ? '#000' : '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texts.cta_label, W / 2, btnY + btnH / 2);
  }

  // Slide number badge
  ctx.beginPath();
  ctx.arc(W - 78, H - 70, 30, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  ctx.fill();
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(slideNum), W - 78, H - 70);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

// ========================= Video Export with Overlay =========================

/** Draw a single frame of the engagement slide template onto a canvas context,
 *  using a video element as the media source instead of a static image. */
function drawSlideFrameWithVideo(
  ctx: CanvasRenderingContext2D,
  slideNum: number,
  videoEl: HTMLVideoElement,
  texts: EngagementSlideTexts,
  primaryColor: string,
  accentColor: string,
) {
  const W = SLIDE_W;
  const H = SLIDE_H;

  const bg = texts.bgColor || DEFAULT_BG[slideNum] || '#1a1a1a';
  const accent = texts.accentColor || accentColor || '#FF6B35';
  const isDark = getLuminance(bg) < 0.5;
  const textColor = isDark ? '#ffffff' : '#111111';
  const subTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const imageScale = Number(texts.imageScale) || 100;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (slideNum === 1) {
    // Full-bleed video cover
    ctx.save();
    const scaleF = imageScale / 100;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scaleF, scaleF);
    ctx.translate(-W / 2, -H / 2);
    drawImageCover(ctx, videoEl, 0, 0, W, H);
    ctx.restore();

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Title
    const titleFont = '900 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let titleEndY = drawRichText(ctx, texts.title || '', 60, H - 300, W - 120, 86, titleFont, titleFont, '#ffffff', accent, 'left');

    // Subtitle
    if (texts.text) {
      const bodyFont = '400 36px system-ui, -apple-system, sans-serif';
      const bodyFontBold = '700 36px system-ui, -apple-system, sans-serif';
      drawRichText(ctx, texts.text, 60, titleEndY + 20, W - 120, 54, bodyFont, bodyFontBold, 'rgba(255,255,255,0.8)', accent, 'left');
    }

    // Badge
    ctx.beginPath();
    ctx.arc(W - 78, H - 70, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fill();
    ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', W - 78, H - 70);
  } else {
    // Title
    const titleFontSize = 56;
    const titleFont = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const titleY = 100;
    const titleEndY = drawRichText(ctx, texts.title || '', 60, titleY, W - 120, titleFontSize * 1.2, titleFont, titleFont, textColor, accent, 'left');

    // Video area
    const imgY = Math.max(titleEndY + 20, 320);
    const imgH = slideNum === 6 ? 160 : 440;
    ctx.save();
    const scaleF = imageScale / 100;
    const cx = W / 2;
    const cy = imgY + imgH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scaleF, scaleF);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    const rr = 16;
    ctx.moveTo(60 + rr, imgY);
    ctx.lineTo(W - 60 - rr, imgY);
    ctx.arcTo(W - 60, imgY, W - 60, imgY + rr, rr);
    ctx.lineTo(W - 60, imgY + imgH - rr);
    ctx.arcTo(W - 60, imgY + imgH, W - 60 - rr, imgY + imgH, rr);
    ctx.lineTo(60 + rr, imgY + imgH);
    ctx.arcTo(60, imgY + imgH, 60, imgY + imgH - rr, rr);
    ctx.lineTo(60, imgY + rr);
    ctx.arcTo(60, imgY, 60 + rr, imgY, rr);
    ctx.closePath();
    ctx.clip();
    drawImageCover(ctx, videoEl, 60, imgY, W - 120, imgH);
    ctx.restore();

    // Body text
    const bodyY = imgY + imgH + 28;
    if (texts.text) {
      const bodyFont = '400 36px system-ui, -apple-system, sans-serif';
      const bodyFontBold = '700 36px system-ui, -apple-system, sans-serif';
      drawRichText(ctx, texts.text, 60, bodyY, W - 120, 54, bodyFont, bodyFontBold, subTextColor, accent, 'left');
    }

    // CTA
    if (slideNum === 6 && texts.cta_label) {
      const btnW = W - 120;
      const btnH = 80;
      const btnX = 60;
      const btnY = H - 140;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(btnX + 20, btnY);
      ctx.lineTo(btnX + btnW - 20, btnY);
      ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + 20, 20);
      ctx.lineTo(btnX + btnW, btnY + btnH - 20);
      ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - 20, btnY + btnH, 20);
      ctx.lineTo(btnX + 20, btnY + btnH);
      ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - 20, 20);
      ctx.lineTo(btnX, btnY + 20);
      ctx.arcTo(btnX, btnY, btnX + 20, btnY, 20);
      ctx.closePath();
      ctx.fill();
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = getLuminance(accent) > 0.5 ? '#000' : '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(texts.cta_label, W / 2, btnY + btnH / 2);
    }

    // Badge
    ctx.beginPath();
    ctx.arc(W - 78, H - 70, 30, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    ctx.fill();
    ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(slideNum), W - 78, H - 70);
  }
}

/**
 * Generate a WEBM video with the engagement slide template overlaid on the source video.
 * Uses canvas.captureStream() + MediaRecorder to render frame-by-frame.
 */
export async function generateEngagementSlideVideo(
  slideNum: number,
  videoUrl: string,
  texts: EngagementSlideTexts,
  primaryColor: string,
  accentColor: string,
  brandName: string,
  handleName: string,
): Promise<Blob> {
  const W = SLIDE_W;
  const H = SLIDE_H;

  // Load video
  const videoEl = document.createElement('video');
  videoEl.crossOrigin = 'anonymous';
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.preload = 'auto';
  videoEl.src = videoUrl;

  await Promise.race([
    new Promise<void>((resolve, reject) => {
      videoEl.onloadeddata = () => resolve();
      videoEl.onerror = () => reject(new Error('Failed to load video for export'));
      videoEl.load();
    }),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Video load timeout (15s)')), 15_000)),
  ]);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Setup recording
  const stream = canvas.captureStream(30); // 30fps
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });

  // Play and record
  recorder.start();
  videoEl.currentTime = 0;
  await videoEl.play();

  const fps = 30;
  const duration = Math.min(videoEl.duration || 10, 60); // cap at 60s
  const totalFrames = Math.ceil(duration * fps);
  let frame = 0;

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      if (videoEl.ended || videoEl.paused || frame >= totalFrames) {
        recorder.stop();
        resolve();
        return;
      }
      drawSlideFrameWithVideo(ctx, slideNum, videoEl, texts, primaryColor, accentColor);
      frame++;
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);
  });

  return recordingDone;
}

// Reuse fetchAsDataUrl from Strategic
export { fetchAsDataUrl } from './StrategicCarouselPreview';
