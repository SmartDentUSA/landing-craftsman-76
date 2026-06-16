import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { fetchAsDataUrl } from './StrategicCarouselPreview';
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

/** Unified video source resolver — use everywhere instead of ad-hoc checks.
 * Prioriza a URL persistida (videoStorageUrl HTTPS) sobre o blob local efêmero (videoSrc),
 * para que o vídeo não "suma" após reload quando o blob URL morre. */
export function resolveVideoSource(texts: EngagementSlideTexts): string | null {
  if (texts.mediaType !== 'video') return null;
  const persisted = texts.videoStorageUrl;
  if (persisted && /^https?:\/\//i.test(persisted)) return persisted;
  return texts.videoSrc || persisted || null;
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

/** Estimate number of wrapped lines for a given text and max width */
function measureWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let currentWidth = 0;
  for (const word of words) {
    const ww = ctx.measureText(word + ' ').width;
    if (currentWidth + ww > maxW && currentWidth > 0) {
      lines++;
      currentWidth = ww;
    } else {
      currentWidth += ww;
    }
  }
  return lines || 1;
}


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
// Exported component used by both preview and PNG export (single source of truth)
export interface EngagementSlideRenderProps {
  slideNum: number;
  texts: EngagementSlideTexts;
  imageUrl: string;
  primaryColor: string;
  accentColor: string;
  brandName: string;
  handleName: string;
}

export function EngagementSlideRender(props: EngagementSlideRenderProps) {
  const { slideNum, texts, imageUrl, primaryColor, accentColor, brandName, handleName } = props;
  return renderSlideContent(slideNum, texts, imageUrl, primaryColor, accentColor, brandName, handleName);
}

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
          maxHeight: '55%', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{
            fontSize: 52, fontWeight: 900, color: '#ffffff', lineHeight: 1.15,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
          }}>
            <RichText text={texts.title || ''} />
          </div>
          {texts.text && (
            <div style={{
              fontSize: 24, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)', fontWeight: 400,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
            }}>
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

  // ===== Slide 6: Dedicated CTA layout =====
  if (slideNum === 6) {
    // Sanitize: truncate title/body for display only
    const displayTitle = (texts.title || '').slice(0, 120);
    const displayBody = (texts.text || '').slice(0, 160);
    const ctaLabel = texts.cta_label || '';

    return (
      <div style={{
        width: SLIDE_W, height: SLIDE_H, background: bg,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        gap: 32,
        textAlign: 'center',
      }}>
        {/* Title — compact, centered */}
        <div style={{
          fontSize: 40, fontWeight: 900, color: textColor, lineHeight: 1.2,
          maxHeight: 200, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const,
        }}>
          <RichText text={displayTitle} />
        </div>

        {/* Media — balanced height */}
        <MediaBlock height={320} />

        {/* Body — short, muted */}
        {displayBody && (
          <div style={{
            fontSize: 28, lineHeight: 1.5, color: subTextColor, fontWeight: 400,
            maxHeight: 130, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
          }}>
            <RichText text={displayBody} />
          </div>
        )}

        {/* CTA button — full width, word-wrap safe */}
        {ctaLabel && (
          <div style={{
            background: accent,
            color: getLuminance(accent) > 0.5 ? '#000' : '#fff',
            padding: '20px 40px',
            borderRadius: 20,
            fontSize: 32,
            fontWeight: 900,
            textAlign: 'center',
            width: '100%',
            wordBreak: 'break-word' as const,
            overflowWrap: 'break-word' as const,
            flexShrink: 0,
          }}>
            {ctaLabel}
          </div>
        )}

        {/* Slide number badge */}
        <div style={{
          position: 'absolute', bottom: 40, right: 48,
          width: 60, height: 60, borderRadius: '50%',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
        }}>
          6
        </div>
      </div>
    );
  }

  // ===== Slides 2–5: Generic layout =====
  return (
    <div style={{
      width: SLIDE_W, height: SLIDE_H, background: bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '48px 60px 48px', gap: 28, justifyContent: 'center' }}>
        {/* Title */}
        <div style={{ fontSize: 56, fontWeight: 900, color: textColor, lineHeight: 1.15 }}>
          <RichText text={texts.title || ''} />
        </div>

        {/* Image */}
        <MediaBlock height={440} />

        {/* Body text */}
        {texts.text && (
          <div style={{ fontSize: 36, lineHeight: 1.5, color: subTextColor, fontWeight: 400 }}>
            <RichText text={texts.text} />
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
/**
 * PNG export — renders the SAME JSX used in the preview (EngagementSlideRender)
 * into an off-screen container and snapshots it via html2canvas.
 * Guarantees pixel parity between editor preview and exported file.
 */
export async function generateEngagementSlidePNG(
  slideNum: number,
  imageUrl: string,
  texts: EngagementSlideTexts,
  primaryColor: string,
  accentColor: string,
  brandName: string,
  handleName: string,
): Promise<Blob> {
  // 1. Pre-fetch image as data URL to avoid CORS tainting in html2canvas
  let imgDataUrl = '';
  if (imageUrl) {
    try {
      imgDataUrl = await fetchAsDataUrl(imageUrl);
    } catch (err) {
      console.warn('[ENGAGEMENT_PNG] Failed to prefetch image, using original URL:', err);
      imgDataUrl = imageUrl;
    }
  }

  // 2. Build off-screen container at exact slide dimensions
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

  // 3. Render React component into the container — strip video so html2canvas can snapshot a static frame
  const exportTexts: EngagementSlideTexts = {
    ...texts,
    mediaType: 'image', // Force image rendering (videos can't be captured by html2canvas)
    videoSrc: undefined,
    videoStorageUrl: undefined,
  };

  const root = createRoot(container);
  await new Promise<void>((resolve) => {
    root.render(
      React.createElement(EngagementSlideRender, {
        slideNum,
        texts: exportTexts,
        imageUrl: imgDataUrl,
        primaryColor,
        accentColor,
        brandName,
        handleName,
      })
    );
    // Double rAF guarantees React commit + browser layout pass
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        const imgs = Array.from(container.querySelectorAll('img'));
        console.log(`[ENGAGEMENT_PNG] slide ${slideNum}: rendered, ${imgs.length} img(s) in container`);
        // Await img.decode() per image (more reliable than onload) with timeout
        await Promise.all(
          imgs.map((i) =>
            Promise.race<void>([
              (async () => {
                try {
                  await i.decode();
                } catch (err) {
                  console.warn(`[ENGAGEMENT_PNG] slide ${slideNum}: img.decode() failed`, { src: i.src?.slice(0, 80), err });
                }
              })(),
              new Promise<void>((res) => setTimeout(res, 4000)),
            ])
          )
        );
        // Extra frame + idle to let final pixels settle before snapshot
        requestAnimationFrame(() => setTimeout(resolve, 80));
      });
    });
  });


  let blob: Blob | null = null;
  try {
    // 4. Snapshot via html2canvas at native resolution
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
      imageTimeout: 4000,
    });

    blob = await new Promise<Blob | null>((resolve) => {
      snapshot.toBlob((b) => resolve(b), 'image/png');
    });
  } finally {
    // 5. Cleanup
    try { root.unmount(); } catch {}
    try { container.remove(); } catch {}
  }

  if (!blob) throw new Error('html2canvas snapshot failed (toBlob returned null)');
  return blob;
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

    // Title (max 3 lines)
    const titleFont = '900 52px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let titleEndY = drawRichText(ctx, (texts.title || '').slice(0, 150), 60, H - 260, W - 120, 62, titleFont, titleFont, '#ffffff', accent, 'left');

    // Subtitle (max 2 lines)
    if (texts.text) {
      const bodyFont = '400 24px system-ui, -apple-system, sans-serif';
      const bodyFontBold = '700 24px system-ui, -apple-system, sans-serif';
      drawRichText(ctx, (texts.text).slice(0, 200), 60, titleEndY + 16, W - 120, 36, bodyFont, bodyFontBold, 'rgba(255,255,255,0.8)', accent, 'left');
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
  } else if (slideNum === 6) {
    // ===== Slide 6 Video: dedicated CTA layout (vertically centered) =====
    const pad = 60;
    const contentW = W - pad * 2;
    const centerX = W / 2;
    const displayTitle = (texts.title || '').slice(0, 120);
    const displayBody = (texts.text || '').slice(0, 160);

    // --- Pre-measure all blocks to center vertically ---
    const titleFontSize = 40;
    const titleFont = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
    const titleLineH = titleFontSize * 1.25;
    ctx.font = titleFont;
    const titleLines = Math.min(measureWrappedLines(ctx, displayTitle, contentW), 4);
    const titleH = titleLines * titleLineH;

    const imgH = 320;

    const bodyFontSize = 28;
    const bodyFont = `400 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    const bodyFontBold = `700 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    const bodyLineH = bodyFontSize * 1.5;
    ctx.font = bodyFont;
    const bodyLines = displayBody ? Math.min(measureWrappedLines(ctx, displayBody, contentW), 3) : 0;
    const bodyH = bodyLines * bodyLineH;

    const ctaFontSize = 32;
    const ctaFont = `900 ${ctaFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.font = ctaFont;
    const btnPadX = 40;
    const maxCtaTextW = contentW - btnPadX * 2;
    const ctaWords = (texts.cta_label || '').split(' ');
    const ctaLinesArr: string[] = [];
    let ctaLine = '';
    for (const word of ctaWords) {
      const test = ctaLine + word + ' ';
      if (ctx.measureText(test).width > maxCtaTextW && ctaLine) {
        ctaLinesArr.push(ctaLine.trim());
        ctaLine = word + ' ';
      } else {
        ctaLine = test;
      }
    }
    if (ctaLine.trim()) ctaLinesArr.push(ctaLine.trim());
    const ctaLineH = ctaFontSize * 1.3;
    const btnPadY = 20;
    const btnH = texts.cta_label ? ctaLinesArr.length * ctaLineH + btnPadY * 2 : 0;

    const gap = 24;
    const totalH = titleH + gap + imgH + gap + (bodyH > 0 ? bodyH + gap : 0) + btnH;
    let curY = Math.max(pad, (H - totalH) / 2);

    // --- Draw title ---
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    curY = drawRichText(ctx, displayTitle, W / 2, curY, contentW, titleLineH, titleFont, titleFont, textColor, accent, 'center');
    curY += gap;

    // --- Draw video area ---
    ctx.save();
    const scaleF = imageScale / 100;
    ctx.translate(centerX, curY + imgH / 2);
    ctx.scale(scaleF, scaleF);
    ctx.translate(-centerX, -(curY + imgH / 2));
    ctx.beginPath();
    const rr = 16;
    ctx.moveTo(pad + rr, curY);
    ctx.lineTo(W - pad - rr, curY);
    ctx.arcTo(W - pad, curY, W - pad, curY + rr, rr);
    ctx.lineTo(W - pad, curY + imgH - rr);
    ctx.arcTo(W - pad, curY + imgH, W - pad - rr, curY + imgH, rr);
    ctx.lineTo(pad + rr, curY + imgH);
    ctx.arcTo(pad, curY + imgH, pad, curY + imgH - rr, rr);
    ctx.lineTo(pad, curY + rr);
    ctx.arcTo(pad, curY, pad + rr, curY, rr);
    ctx.closePath();
    ctx.clip();
    drawImageCover(ctx, videoEl, pad, curY, contentW, imgH);
    ctx.restore();
    curY += imgH + gap;

    // --- Draw body ---
    if (displayBody) {
      drawRichText(ctx, displayBody, W / 2, curY, contentW, bodyLineH, bodyFont, bodyFontBold, subTextColor, accent, 'center');
      curY += bodyH + gap;
    }

    // --- Draw CTA button ---
    if (texts.cta_label && ctaLinesArr.length > 0) {
      const btnX = pad;
      const btnW = contentW;
      const btnY = curY;

      ctx.fillStyle = accent;
      ctx.beginPath();
      const br = 20;
      ctx.moveTo(btnX + br, btnY);
      ctx.lineTo(btnX + btnW - br, btnY);
      ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + br, br);
      ctx.lineTo(btnX + btnW, btnY + btnH - br);
      ctx.arcTo(btnX + btnW, btnY + btnH, btnX + btnW - br, btnY + btnH, br);
      ctx.lineTo(btnX + br, btnY + btnH);
      ctx.arcTo(btnX, btnY + btnH, btnX, btnY + btnH - br, br);
      ctx.lineTo(btnX, btnY + br);
      ctx.arcTo(btnX, btnY, btnX + br, btnY, br);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = getLuminance(accent) > 0.5 ? '#000' : '#fff';
      ctx.font = ctaFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const textStartY = btnY + btnPadY + ctaLineH / 2;
      for (let li = 0; li < ctaLinesArr.length; li++) {
        ctx.fillText(ctaLinesArr[li], centerX, textStartY + li * ctaLineH);
      }
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
    ctx.fillText('6', W - 78, H - 70);
  } else {
    // ===== Slides 2–5 Video (centered layout) =====
    const titleFontSize = 56;
    const titleFont = `900 ${titleFontSize}px system-ui, -apple-system, sans-serif`;
    const bodyFontSize = 36;
    const bodyFont = `400 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    const bodyFontBold = `700 ${bodyFontSize}px system-ui, -apple-system, sans-serif`;
    const titleLineH = titleFontSize * 1.2;
    const bodyLineH = bodyFontSize * 1.5;
    const contentW = W - 120;
    const pad = 60;
    const gap = 28;
    const imgH = 440;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Measure (clamped)
    const titleMEnd = drawRichText(ctx, texts.title || '', -9999, -9999, contentW, titleLineH, titleFont, titleFont, 'transparent', 'transparent', 'left');
    const titleHRaw = titleMEnd - (-9999);
    const maxTitleH = 4 * titleLineH;
    const titleH = Math.min(titleHRaw, maxTitleH);
    let bodyH = 0;
    if (texts.text) {
      const bodyMEnd = drawRichText(ctx, texts.text, -9999, -9999, contentW, bodyLineH, bodyFont, bodyFontBold, 'transparent', 'transparent', 'left');
      const bodyHRaw = bodyMEnd - (-9999);
      const maxBodyH = 3 * bodyLineH;
      bodyH = Math.min(bodyHRaw, maxBodyH);
    }

    const totalH = titleH + gap + imgH + (bodyH > 0 ? gap + bodyH : 0);
    let curY = Math.max((H - totalH) / 2, 40);

    // Title (clipped to titleH)
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, curY, contentW, titleH);
    ctx.clip();
    drawRichText(ctx, texts.title || '', pad, curY, contentW, titleLineH, titleFont, titleFont, textColor, accent, 'left');
    ctx.restore();
    curY += titleH + gap;

    // Video area
    ctx.save();
    const scaleF = imageScale / 100;
    const cx = W / 2;
    const cy = curY + imgH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scaleF, scaleF);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    const rr = 16;
    ctx.moveTo(pad + rr, curY);
    ctx.lineTo(W - pad - rr, curY);
    ctx.arcTo(W - pad, curY, W - pad, curY + rr, rr);
    ctx.lineTo(W - pad, curY + imgH - rr);
    ctx.arcTo(W - pad, curY + imgH, W - pad - rr, curY + imgH, rr);
    ctx.lineTo(pad + rr, curY + imgH);
    ctx.arcTo(pad, curY + imgH, pad, curY + imgH - rr, rr);
    ctx.lineTo(pad, curY + rr);
    ctx.arcTo(pad, curY, pad + rr, curY, rr);
    ctx.closePath();
    ctx.clip();
    drawImageCover(ctx, videoEl, pad, curY, contentW, imgH);
    ctx.restore();
    curY += imgH + gap;

    // Body (clipped to bodyH)
    if (texts.text && bodyH > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad, curY, contentW, bodyH);
      ctx.clip();
      drawRichText(ctx, texts.text, pad, curY, contentW, bodyLineH, bodyFont, bodyFontBold, subTextColor, accent, 'left');
      ctx.restore();
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
  const urlPreview = videoUrl.substring(0, 80);

  // STEP 1 — Pre-fetch the video as a Blob to bypass CORS / canvas tainting.
  // Blob URLs are always treated as same-origin, so MediaRecorder won't throw SecurityError.
  let blobUrl: string | null = null;
  let usingBlobUrl = false;
  try {
    if (/^https?:\/\//i.test(videoUrl)) {
      const resp = await Promise.race([
        fetch(videoUrl, { mode: 'cors', credentials: 'omit' }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Video fetch timeout (20s)')), 20_000),
        ),
      ]);
      if (!resp.ok) throw new Error(`Video fetch HTTP ${resp.status}`);
      const blob = await resp.blob();
      blobUrl = URL.createObjectURL(blob);
      usingBlobUrl = true;
    }
  } catch (fetchErr) {
    console.warn('[VIDEO_RENDER_FAIL]', { phase: 'prefetch', slideNum, urlPreview, error: (fetchErr as Error)?.message });
    // Continue with raw URL as fallback — may still work if CORS headers are present.
    blobUrl = null;
  }

  // STEP 2 — Load the video element
  const videoEl = document.createElement('video');
  if (!usingBlobUrl) {
    // Only set crossOrigin when using a remote URL; blob URLs are same-origin.
    videoEl.crossOrigin = 'anonymous';
  }
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.preload = 'auto';
  videoEl.src = blobUrl ?? videoUrl;

  const cleanup = () => {
    if (blobUrl) {
      try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
    }
  };

  try {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        videoEl.onloadeddata = () => resolve();
        videoEl.onerror = () => reject(new Error('Failed to load video for export'));
        videoEl.load();
      }),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Video load timeout (15s)')), 15_000)),
    ]);
  } catch (loadErr) {
    console.error('[VIDEO_RENDER_FAIL]', { phase: 'load', slideNum, urlPreview, usingBlobUrl, error: (loadErr as Error)?.message });
    cleanup();
    throw loadErr;
  }

  // STEP 3 — Validate duration (Infinity / NaN / 0 → fallback to 10s)
  let duration = videoEl.duration;
  if (!isFinite(duration) || isNaN(duration) || duration <= 0) {
    console.warn('[VIDEO_RENDER_FAIL]', { phase: 'duration_invalid', slideNum, raw: videoEl.duration });
    duration = 10;
  }
  duration = Math.min(duration, 60); // cap at 60s

  // STEP 4 — Setup canvas + recorder
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30); // 30fps
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  } catch (recErr) {
    console.error('[VIDEO_RENDER_FAIL]', { phase: 'recorder_init', slideNum, error: (recErr as Error)?.message });
    cleanup();
    throw recErr;
  }
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => {
      console.error('[VIDEO_RENDER_FAIL]', { phase: 'recorder_error', slideNum, error: e });
      reject(new Error('MediaRecorder failed (likely SecurityError from tainted canvas)'));
    };
  });

  // STEP 5 — Test draw to detect canvas tainting BEFORE recorder.start()
  try {
    ctx.drawImage(videoEl, 0, 0, W, H);
    // Touching pixel data triggers SecurityError if tainted
    ctx.getImageData(0, 0, 1, 1);
  } catch (taintErr) {
    console.error('[VIDEO_RENDER_FAIL]', { phase: 'canvas_tainted', slideNum, urlPreview, usingBlobUrl, error: (taintErr as Error)?.message });
    cleanup();
    throw new Error('Canvas tainted (CORS): ' + ((taintErr as Error)?.message ?? 'unknown'));
  }

  // STEP 6 — Play and record
  try {
    recorder.start();
    videoEl.currentTime = 0;
    await videoEl.play();
  } catch (playErr) {
    console.error('[VIDEO_RENDER_FAIL]', { phase: 'play', slideNum, error: (playErr as Error)?.message });
    cleanup();
    throw playErr;
  }

  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);
  let frame = 0;

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      if (videoEl.ended || videoEl.paused || frame >= totalFrames) {
        try { recorder.stop(); } catch { /* noop */ }
        resolve();
        return;
      }
      try {
        drawSlideFrameWithVideo(ctx, slideNum, videoEl, texts, primaryColor, accentColor);
      } catch (drawErr) {
        console.error('[VIDEO_RENDER_FAIL]', { phase: 'draw_frame', slideNum, frame, error: (drawErr as Error)?.message });
        try { recorder.stop(); } catch { /* noop */ }
        resolve();
        return;
      }
      frame++;
      requestAnimationFrame(drawFrame);
    };
    requestAnimationFrame(drawFrame);
  });

  const result = await recordingDone;
  cleanup();
  return result;
}

// Reuse fetchAsDataUrl from Strategic (imported above for internal use too)
export { fetchAsDataUrl };
