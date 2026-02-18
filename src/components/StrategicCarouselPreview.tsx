import React, { useState, useRef } from 'react';
import { Shield, Award, CheckCircle, Zap, Star, Layers, Upload, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
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
export interface SlideTextsType {
  1: { hook: string; productName: string; imageScale?: string; bgColor?: string };
  2: { category: string; introLabel?: string; productName: string; imageScale?: string; bgColor?: string };
  3: { title: string; imageScale?: string; bgColor?: string };
  4: { label: string; keyword: string; benefit: string; imageScale?: string; bgColor?: string };
  5: { title: string; badge1: string; badge2: string; badge3: string; imageScale?: string; bgColor?: string };
  6: { productName: string; ctaButton: string; linkLabel: string; footer: string; imageScale?: string; bgColor?: string };
}

interface StrategicCarouselPreviewProps {
  slideImageMap: Record<number, string>;
  onImageChange: (slideNum: number, url: string) => void;
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
const SLIDE_EDITOR_FIELDS: Record<number, Array<{ key: string; label: string; type: 'input' | 'textarea' | 'slider' | 'color' }>> = {
  1: [
    { key: 'hook', label: 'Texto do Gancho', type: 'textarea' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
  2: [
    { key: 'category', label: 'Categoria', type: 'input' },
    { key: 'introLabel', label: 'Frase de introdução (ex: Apresentando)', type: 'input' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
  3: [
    { key: 'title', label: 'Título da seção', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
  4: [
    { key: 'label', label: 'Label topo (ex: EXPERIÊNCIA)', type: 'input' },
    { key: 'keyword', label: 'Palavra-chave', type: 'input' },
    { key: 'benefit', label: 'Benefício', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
  5: [
    { key: 'title', label: 'Título', type: 'textarea' },
    { key: 'badge1', label: 'Badge 1', type: 'textarea' },
    { key: 'badge2', label: 'Badge 2', type: 'textarea' },
    { key: 'badge3', label: 'Badge 3', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
  6: [
    { key: 'productName', label: 'Nome exibido', type: 'input' },
    { key: 'ctaButton', label: 'Texto do botão CTA', type: 'textarea' },
    { key: 'linkLabel', label: 'Label do link', type: 'input' },
    { key: 'footer', label: 'Texto de rodapé', type: 'textarea' },
    { key: 'imageScale', label: 'Escala da imagem (%)', type: 'slider' },
    { key: 'bgColor', label: 'Cor de fundo', type: 'color' },
  ],
};

interface SlideWrapperProps {
  slideNum: number;
  children: React.ReactNode;
  productImages: Array<{ url: string; alt?: string }>;
  currentImage: string;
  onImageChange: (slideNum: number, url: string) => void;
  primaryColor: string;
  slideTexts?: Record<string, string>;
  onSlideTextChange?: (key: string, value: string) => void;
}

function SlideWrapper({ slideNum, children, productImages, currentImage, onImageChange, primaryColor, slideTexts, onSlideTextChange }: SlideWrapperProps) {
  const containerW = SLIDE_W * SLIDE_SCALE;
  const containerH = SLIDE_H * SLIDE_SCALE;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [editorOpen, setEditorOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onImageChange(slideNum, dataUrl);
    };
    reader.readAsDataURL(file);
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
          }}
        >
          {children}
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
          title="Upload nova imagem"
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer"
          style={{ fontSize: 10, height: 26, flexShrink: 0 }}
        >
          <Upload style={{ width: 10, height: 10 }} />
          <span>Upload</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

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
              ) : field.type === 'slider' ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={Number(slideTexts?.[field.key]) || 100}
                    onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                    className="flex-1 h-2 rounded cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {slideTexts?.[field.key] || '100'}%
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
function Slide1Hook({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { hook?: string; productName?: string; imageScale?: string; bgColor?: string } }) {
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
      <div style={{ position: 'absolute', inset: 0, background: hasCustomBg ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.28)' }} />

      {/* Número do slide */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 36 }}>1</span>
      </div>

      {/* FAIXA CENTRAL OPACA com a frase — centralizada verticalmente */}
      <div style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        left: 0,
        right: 0,
        padding: '60px 80px',
        background: 'rgba(0, 0, 0, 0.58)',
        textAlign: 'center',
      }}>
        <p style={{ color: '#ffffff', fontWeight: 400, fontSize: 52, lineHeight: 1.3, margin: 0 }}>{hook}</p>
      </div>

      {/* Gradiente rodapé + nome do produto */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
        <p style={{ color: '#ffffff', fontSize: 44, fontWeight: 600, margin: 0, textAlign: 'center' }}>{name}</p>
      </div>
    </div>
  );
}

// ==================== SLIDE 2 — SOLUÇÃO ====================
function Slide2Solution({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { category?: string; introLabel?: string; productName?: string; imageScale?: string; bgColor?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const category = texts?.category !== undefined ? texts.category : (productData.category || '');
  const introLabel = texts?.introLabel !== undefined ? texts.introLabel : 'Apresentando';
  const name = texts?.productName || productData.name;
  const imageScale = Number(texts?.imageScale) || 100;
  const bgColor = texts?.bgColor || '#f8f8f8';
  const bgLuminance = getLuminance(bgColor.replace('#', '').length === 6 ? bgColor : '#f8f8f8');
  const textColor = bgLuminance > 0.5 ? '#111111' : '#ffffff';
  const subTextColor = bgLuminance > 0.5 ? '#888888' : 'rgba(255,255,255,0.7)';

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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', minHeight: 0, overflow: 'hidden' }}>
        {image ? (
          <img
            src={image}
            alt="produto"
            style={{
              maxWidth: '88%',
              maxHeight: '85%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
              transform: `scale(${imageScale / 100})`,
              transformOrigin: 'center center',
              filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))',
              transition: 'transform 0.2s ease',
            }}
          />
        ) : (
          <div style={{ width: 500, height: 500, background: '#e0e0e0', borderRadius: 20 }} />
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
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

function Slide3Technical({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { title?: string; imageScale?: string; bgColor?: string } }) {
  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];
  const items = specs.length > 0 ? specs.map(s => ({ label: s.label, value: s.value })) : features.map(f => ({ label: f, value: '' }));
  const displayItems = items.slice(0, 5);
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const title = texts?.title || 'Por que confiar?';

  // PRIORIDADE 1: Feed Copy Benefits — extração estruturada com filtro de linhas visuais
  const feedBenefits = productData.feedCopyBenefits;

  let benefitsHeadline = '';
  let benefitsBody = '';
  let benefitsBullets: string[] = [];

  if (feedBenefits) {
    const allLines = feedBenefits.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const lines = allLines.filter((l: string) => !isVisualDescriptionLine(l));
    benefitsHeadline = lines[0]?.slice(0, 80) || '';
    const bulletLines = lines.filter((l: string) => /^[•\-✅🔥⚡🎯💡🌟⭐🏆💎👉➡️]/.test(l)).slice(0, 4);
    const bodyLines = lines.slice(1).filter((l: string) => !bulletLines.includes(l));
    benefitsBody = bodyLines.join(' ').slice(0, 200);
    benefitsBullets = bulletLines;
  }

  // Tabela de comparação com concorrentes
  const cc = productData.competitorComparison;
  const hasCompetitorTable = cc?.enabled && cc.table_headers.length > 0 && cc.table_data.length > 0;

  const imageScale3 = Number(texts?.imageScale) || 100;
  const bgColor3 = texts?.bgColor || '#0f0f14';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bgColor3, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>3</span>
      </div>
      <div style={{ width: '42%', position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', transform: `scale(${imageScale3 / 100})`, transformOrigin: 'center center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
        )}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 120, background: `linear-gradient(to right, transparent, ${bgColor3})` }} />
      </div>
      <div style={{ flex: 1, padding: '100px 60px 80px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#ffffff', fontSize: 52, fontWeight: 900, margin: '0 0 40px 0', lineHeight: 1.2 }}>{title}</h2>
        {/* Divider accent */}
        <div style={{ width: 56, height: 3, background: primaryColor, borderRadius: 2, marginBottom: 36, flexShrink: 0 }} />

        {feedBenefits ? (
          // ESTRUTURADO: Headline + Corpo + Tabela/Bullets do feedCopyBenefits
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Headline em destaque */}
            {benefitsHeadline && (
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
            {/* TABELA competitor_comparison (prioridade sobre bullets) */}
            {hasCompetitorTable ? (
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
              // Fallback: bullets do feedCopyBenefits
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
function Slide4Experience({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { label?: string; keyword?: string; benefit?: string; imageScale?: string; bgColor?: string } }) {
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

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden', background: bgColor4, display: 'flex' }}>
      {/* Imagem à esquerda — 42% */}
      <div style={{ width: '42%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto em uso" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', transform: `scale(${imageScale4 / 100})`, transformOrigin: 'center center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
        )}
        {/* Feather borda direita */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 140, background: `linear-gradient(to right, transparent, ${bgColor4})` }} />
      </div>


      {/* Número do slide */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>4</span>
      </div>

      {/* Painel direito — textos (58%) */}
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '80px 60px 80px 48px', gap: 18, background: '#0f0f14',
      }}>
        {/* Label contextual */}
        <p style={{ color: '#fff', opacity: 0.65, fontSize: labelFontSize, fontWeight: 700, margin: 0, textTransform: 'uppercase' as const, letterSpacing: 3, wordBreak: 'break-word' as const }}>{finalLabel}</p>

        {/* Divider accent */}
        <div style={{ width: 56, height: 3, background: primaryColor, borderRadius: 2, flexShrink: 0 }} />

        {/* Headline — benefício principal */}
        <h2 style={{ color: '#ffffff', fontSize: kwFontSize, fontWeight: 900, margin: 0, lineHeight: 1.05, wordBreak: 'break-word' as const }}>{finalKeyword}</h2>

        {/* Texto de impacto — síntese dor → resolução */}
        <p style={{ color: '#d8d8d8', fontSize: impactFontSize, lineHeight: 1.55, margin: 0, fontWeight: 400, wordBreak: 'break-word' as const }}>{finalImpact}</p>

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
function Slide5Security({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { title?: string; badge1?: string; badge2?: string; badge3?: string; imageScale?: string; bgColor?: string } }) {
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

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {bgColor5 && <div style={{ position: 'absolute', inset: 0, background: bgColor5 }} />}
      {image ? (
        <img src={image} alt="segurança" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px)', transform: `scale(${imageScale5 / 100 * 1.1})` }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>5</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: 50, zIndex: 2 }}>
        <h2 style={{ color: '#ffffff', fontSize: 86, fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.1 }}>{title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
          {badges.map((badge, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '20px 44px', minHeight: 120, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="36" height="36">
                  {badge.icon === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
                  {badge.icon === 'award' && <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>}
                  {badge.icon === 'check' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                </svg>
              </div>
              <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700, display: 'block', wordBreak: 'break-word' as const, lineHeight: 1.3 }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE 6 — CTA ====================
function Slide6CTA({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { productName?: string; ctaButton?: string; linkLabel?: string; footer?: string; imageScale?: string; bgColor?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';
  const name = texts?.productName || productData.name;
  const ctaButton = texts?.ctaButton || '💡 Saiba Mais';
  const linkLabel = texts?.linkLabel || '🔗 Saiba Mais';
  const footer = texts?.footer || 'Direct para mais informações';
  const imageScale6 = Number(texts?.imageScale) || 100;
  const bgColor6 = texts?.bgColor || primaryColor;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: bgColor6, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 60, position: 'relative' }}>
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 60, left: 60 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>6</span>
      </div>
      <div style={{ width: 240, height: 240, borderRadius: 24, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${imageScale6 / 100})`, transformOrigin: 'center center' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee' }} />}
      </div>
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
}: StrategicCarouselPreviewProps) {
  const FONT_OPTIONS = [
    { label: 'Sistema (Padrão)', value: 'system-ui, -apple-system, sans-serif' },
    { label: 'Arial', value: "'Arial', Helvetica, sans-serif" },
    { label: 'Georgia (Elegante)', value: "Georgia, 'Times New Roman', serif" },
    { label: 'Impact (Destaque)', value: "Impact, 'Arial Narrow', sans-serif" },
    { label: 'Courier (Técnico)', value: "'Courier New', Courier, monospace" },
  ];

  const slides = [
    { num: 1, label: '🎣 Hook / Gancho', component: <Slide1Hook image={slideImageMap[1] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[1]} /> },
    { num: 2, label: '✨ Apresentação', component: <Slide2Solution image={slideImageMap[2] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[2]} /> },
    { num: 3, label: '🔬 Cientificidade', component: <Slide3Technical image={slideImageMap[3] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[3]} /> },
    { num: 4, label: '💫 Experiência', component: <Slide4Experience image={slideImageMap[4] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[4]} /> },
    { num: 5, label: '🛡️ Segurança', component: <Slide5Security image={slideImageMap[5] || ''} primaryColor={primaryColor} productData={productData} texts={slideTexts?.[5]} /> },
    { num: 6, label: '🛒 CTA', component: <Slide6CTA image={slideImageMap[6] || ''} primaryColor={primaryColor} accentColor={accentColor} productData={productData} texts={slideTexts?.[6]} /> },
  ];

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
              primaryColor={primaryColor}
              slideTexts={slideTexts?.[slide.num as keyof SlideTextsType] as Record<string, string>}
              onSlideTextChange={onSlideTextChange ? (key, value) => onSlideTextChange(slide.num, key, value) : undefined}
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

export async function fetchAsDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Layer 2: edge function proxy (server-side fetch → base64)
  try {
    const res = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/optimize-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: url, returnBase64: true }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.dataUrl) return data.dataUrl;
    }
  } catch {}

  // Layer 3: direct client-side fetch → blob → FileReader
  try {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {}

  // Layer 4: original URL (canvas may taint, but we still try)
  return url;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    // data: URLs never need crossOrigin
    if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // retry without crossOrigin as final fallback
      if (!url.startsWith('data:')) {
        const img2 = new Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => resolve(null);
        img2.src = url;
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align?: CanvasTextAlign): number {
  const savedAlign = ctx.textAlign;
  if (align) ctx.textAlign = align;
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, curY);
      line = word + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, curY);
    curY += lineHeight;
  }
  if (align) ctx.textAlign = savedAlign;
  return curY;
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (ctx.measureText(t + '…').width > maxW && t.length > 1) t = t.slice(0, -1);
  return t + '…';
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) { ctx.drawImage(img, x, y, w, h); return; }
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function generateSlidePNG(
  slideNum: number,
  imageUrl: string,
  primaryColor: string,
  accentColor: string,
  productData: ProductData,
  texts?: Record<string, string>
): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';

  const img = await loadImage(imageUrl);

  const benefits = productData.benefits || [];
  const features = productData.features || [];
  const specs = productData.technicalSpecs || [];

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function drawBadge(num: number, x: number, y: number, bg: string, fg: string) {
    ctx.beginPath();
    ctx.arc(x + 40, y + 40, 40, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x + 40, y + 40);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const ICONS_CANVAS = ['⚡', '🛡', '⭐', '✅', '🔬'];

  if (slideNum === 1) {
    const hookText = texts?.hook || (() => {
      // Prioridade 1: extrair do sales_pitch
      if (productData.salesPitch) {
        const sentences = productData.salesPitch.split(/[.!]/);
        const first = sentences[0]?.trim();
        if (first && first.length >= 15 && first.length <= 80) return first;
        const clause = first?.split(',')[0]?.trim();
        if (clause && clause.length >= 20 && clause.length <= 80) return clause;
        const truncated = (first || '').slice(0, 80).split(' ').slice(0, -1).join(' ');
        if (truncated.length >= 20) return truncated;
      }
      const shortFeature = (productData.features || []).find(f => f && f.length <= 35);
      if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
      const shortBenefit = (benefits || []).find(b => b && b.length <= 45);
      if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
      return `${productData.name}: a escolha que muda tudo`;
    })();
    const productName = texts?.productName || productData.name;
    const imageScale1 = Number(texts?.imageScale) || 100;
    const bgColor1 = texts?.bgColor || '';
    const hasCustomBg1 = bgColor1 && bgColor1 !== '#333333';

    // Background: custom color or image
    if (hasCustomBg1) {
      ctx.fillStyle = bgColor1;
      ctx.fillRect(0, 0, W, H);
    }
    // Imagem full-bleed cobrindo todo o canvas
    if (img) {
      ctx.save();
      const scaleF1 = imageScale1 / 100;
      ctx.translate(W / 2, H / 2);
      ctx.scale(scaleF1, scaleF1);
      ctx.translate(-W / 2, -H / 2);
      drawImageCover(ctx, img, 0, 0, W, H);
      ctx.restore();
    } else if (!hasCustomBg1) {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, W, H);
    }
    // Overlay escuro geral sutil
    ctx.fillStyle = hasCustomBg1 ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);
    // Número do slide
    drawBadge(1, 60, 60, 'rgba(255,255,255,0.2)', '#ffffff');
    // Faixa central opaca com a frase
    const faixaH = 340;
    const faixaY = H / 2 - faixaH / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, faixaY, W, faixaH);
    ctx.font = '400 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, hookText, W / 2, faixaY + 60, W - 160, 70, 'center');
    // Gradiente rodapé
    const grad2 = ctx.createLinearGradient(0, H - 300, 0, H);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, H - 300, W, 300);
    // Nome do produto no rodapé
    ctx.font = '600 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(productName, W / 2, H - 60);

  } else if (slideNum === 2) {
    const productName = texts?.productName || productData.name;
    const category = texts?.category !== undefined ? texts.category : (productData.category || '');
    const introLabel = texts?.introLabel || 'Apresentando';
    const bgColor2 = texts?.bgColor || '#f8f8f8';
    const bg2Luminance = getLuminance(bgColor2.replace('#', '').length === 6 ? bgColor2 : '#f8f8f8');
    const textColor2 = bg2Luminance > 0.5 ? '#111111' : '#ffffff';
    const subTextColor2 = bg2Luminance > 0.5 ? '#888888' : 'rgba(255,255,255,0.7)';

    ctx.fillStyle = bgColor2;
    ctx.fillRect(0, 0, W, H);
    drawBadge(2, 80, 80, primaryColor, textOnPrimary);
    let yOffset = 200;
    if (category) {
      ctx.font = '700 36px system-ui, -apple-system, sans-serif';
      const catW = ctx.measureText(category.toUpperCase()).width + 96;
      roundRect((W - catW) / 2, yOffset, catW, 80, 40);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.fillStyle = textOnPrimary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(category.toUpperCase(), W / 2, yOffset + 40);
      yOffset += 120;
    }
    if (img) {
      const imageScale2 = Number(texts?.imageScale) || 100;
      const maxW = W * 0.88;
      const maxH = 800;
      let dw = img.naturalWidth || img.width;
      let dh = img.naturalHeight || img.height;
      const scale = Math.min(maxW / dw, maxH / dh, 1) * (imageScale2 / 100);
      dw *= scale;
      dh *= scale;
      const ix = (W - dw) / 2;
      const iy = yOffset + (H - yOffset - 300 - dh) / 2;
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;
      ctx.drawImage(img, ix, iy, dw, dh);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.fillStyle = '#e0e0e0';
      roundRect((W - 500) / 2, yOffset + 40, 500, 500, 20);
      ctx.fill();
    }
    // introLabel ("Apresentando") above product name
    if (introLabel) {
      ctx.font = '400 32px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = subTextColor2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(introLabel.toUpperCase(), W / 2, H - 310);
    }
    // Product name with wrapText to avoid clipping
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textColor2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, productName, W / 2, H - 260, W - 160, 80, 'center');

  } else if (slideNum === 3) {
    const title = texts?.title || 'Por que confiar?';
    const imageScale3c = Number(texts?.imageScale) || 100;
    const bgColor3c = texts?.bgColor || '#0f0f14';

    ctx.fillStyle = bgColor3c;
    ctx.fillRect(0, 0, W, H);
    const imgW = W * 0.42;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, imgW, H);
      ctx.clip();
      ctx.save();
      const scaleF3 = imageScale3c / 100;
      ctx.translate(imgW / 2, H / 2);
      ctx.scale(scaleF3, scaleF3);
      ctx.translate(-imgW / 2, -H / 2);
      drawImageCover(ctx, img, 0, 0, imgW, H);
      ctx.restore();
      ctx.restore();
      const grad = ctx.createLinearGradient(imgW - 120, 0, imgW, 0);
      grad.addColorStop(0, 'rgba(15,15,20,0)');
      grad.addColorStop(1, bgColor3c);
      ctx.fillStyle = grad;
      ctx.fillRect(imgW - 120, 0, 120, H);
    }
    drawBadge(3, 60, 60, primaryColor, textOnPrimary);
    const rx = imgW + 40;
    const TEXT_FONT_S3 = '700 34px system-ui, -apple-system, sans-serif';
    const GAP_S3 = 44;
    const ICON_SIZE_S3 = 56;
    const LINE_H_S3 = 44;
    const TITLE_MAX_W_S3 = W - rx - 60;       // título começa em rx
    const TEXT_MAX_W_S3 = W - rx - 76 - 60;   // bullets começam em rx+76 (após ícone)

    const items = specs.length > 0
      ? specs.slice(0, 5).map(s => s.label + (s.value ? ': ' + s.value : ''))
      : features.slice(0, 5);

    // Pre-calculate line count for each item to determine true height
    const measureLinesS3 = (text: string): number => {
      ctx.font = TEXT_FONT_S3;
      const words = text.split(' ');
      let line = '';
      let lines = 1;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > TEXT_MAX_W_S3 && line !== '') {
          lines++;
          line = word + ' ';
        } else {
          line = test;
        }
      }
      return lines;
    };

    // Medir quantas linhas o título ocupa com wrapText
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    const titleLineH_S3 = 52 * 1.2;
    const titleWords = title.split(' ');
    let titleLine = '';
    let titleLinesCount = 1;
    for (const word of titleWords) {
      const test = titleLine + word + ' ';
      if (ctx.measureText(test).width > TITLE_MAX_W_S3 && titleLine !== '') {
        titleLinesCount++;
        titleLine = word + ' ';
      } else {
        titleLine = test;
      }
    }
    const TITLE_H_S3 = titleLinesCount * titleLineH_S3 + 28 + 32; // linhas + gap após título + padding
    const itemHeightsS3 = items.map(item => Math.max(ICON_SIZE_S3, measureLinesS3(item) * LINE_H_S3));
    const totalContentH_S3 = TITLE_H_S3 + itemHeightsS3.reduce((a, b) => a + b, 0) + GAP_S3 * (items.length - 1);

    // Vertically center content like JSX justifyContent:'center'
    let ry = Math.max(80, (H - totalContentH_S3) / 2);

    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const titleEndY = wrapText(ctx, title, rx, ry, TITLE_MAX_W_S3, titleLineH_S3);
    ry = titleEndY + 28;

    for (let i = 0; i < items.length; i++) {
      const itemH = itemHeightsS3[i];
      const itemY = ry;

      // Icon box
      ctx.fillStyle = primaryColor;
      roundRect(rx, itemY, ICON_SIZE_S3, ICON_SIZE_S3, 12);
      ctx.fill();
      ctx.font = '32px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ICONS_CANVAS[i % ICONS_CANVAS.length], rx + 28, itemY + 28);

      // Item text — starts at same Y as icon
      ctx.font = TEXT_FONT_S3;
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      wrapText(ctx, items[i], rx + 76, itemY + 10, TEXT_MAX_W_S3, LINE_H_S3);

      ry += itemH + GAP_S3;
    }

    if (items.length === 0) {
      ctx.font = '400 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Adicione especificações ao produto.', rx, ry);
    }

  } else if (slideNum === 4) {
    const { headline: narHeadline, impactText: narImpact, proofBullets: narBullets, label: narLabel } = buildImpactNarrative(productData);
    const keyword = texts?.keyword || narHeadline;
    const mainText = texts?.benefit || narImpact;
    const rawLabel4 = texts?.label || narLabel;
    const label4 = isVisualDescriptionLine(rawLabel4) ? 'Experiência / Fluxo' : rawLabel4;
    const bulletPool4 = narBullets;

    const kwFontSizeCanvas = keyword.length > 30 ? 52 : keyword.length > 20 ? 62 : keyword.length > 15 ? 70 : 78;

    // ---- Layout split 42/58 (igual ao Slide 3) ----
    const bgColor4c = texts?.bgColor || '#0f0f14';
    const imageScale4c = Number(texts?.imageScale) || 100;
    ctx.fillStyle = bgColor4c;
    ctx.fillRect(0, 0, W, H);

    // Imagem à esquerda (42%) com clip
    const imgW4 = Math.round(W * 0.42);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, imgW4, H);
      ctx.clip();
      ctx.save();
      ctx.translate(imgW4 / 2, H / 2);
      ctx.scale(imageScale4c / 100, imageScale4c / 100);
      ctx.translate(-imgW4 / 2, -H / 2);
      drawImageCover(ctx, img, 0, 0, imgW4, H);
      ctx.restore();
      ctx.restore();
      const grad4 = ctx.createLinearGradient(imgW4 - 140, 0, imgW4, 0);
      grad4.addColorStop(0, 'rgba(15,15,20,0)');
      grad4.addColorStop(1, bgColor4c);
      ctx.fillStyle = grad4;
      ctx.fillRect(imgW4 - 140, 0, 140, H);
    }

    drawBadge(4, 60, 60, 'rgba(255,255,255,0.15)', '#ffffff');

    // Painel de texto à direita
    const rx4 = imgW4 + 48;
    const textW4 = W - rx4 - 60;

    // Font sizes dinâmicos
    const benFontSizeCanvas = mainText.length > 240 ? 26 : mainText.length > 150 ? 30 : mainText.length > 80 ? 33 : 36;
    const benLineH4 = benFontSizeCanvas * 1.5;
    const bulletFontSize4 = benFontSizeCanvas * 0.85;

    // Medir alturas para centramento vertical
    ctx.font = `900 ${kwFontSizeCanvas}px system-ui, -apple-system, sans-serif`;
    const kwLineH4 = kwFontSizeCanvas * 1.1;
    let kwLine4 = '', kwLines4 = 1;
    for (const w of keyword.split(' ')) {
      const test = kwLine4 + w + ' ';
      if (ctx.measureText(test).width > textW4 && kwLine4 !== '') { kwLines4++; kwLine4 = w + ' '; } else { kwLine4 = test; }
    }
    ctx.font = `400 ${benFontSizeCanvas}px system-ui, -apple-system, sans-serif`;
    let benLine4 = '', benLines4 = 1;
    for (const w of mainText.split(' ')) {
      const test = benLine4 + w + ' ';
      if (ctx.measureText(test).width > textW4 && benLine4 !== '') { benLines4++; benLine4 = w + ' '; } else { benLine4 = test; }
    }

    const labelBlockH4 = 28 + 32; // label + divider
    const kwBlockH4 = kwLines4 * kwLineH4 + 28;
    const benBlockH4 = benLines4 * benLineH4 + 20;
    const bulletsBlockH4 = bulletPool4.length > 0 ? bulletPool4.length * (bulletFontSize4 * 1.6) + 16 : 0;
    const totalH4 = labelBlockH4 + kwBlockH4 + benBlockH4 + bulletsBlockH4;
    let ry4 = Math.max(80, (H - totalH4) / 2);

    // Label
    ctx.font = '700 24px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label4.slice(0, 40).toUpperCase(), rx4, ry4);
    ry4 += 28;

    // Divider accent
    ctx.fillStyle = primaryColor;
    ctx.fillRect(rx4, ry4, 56, 3);
    ry4 += 32;

    // Keyword
    ctx.font = `900 ${kwFontSizeCanvas}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ry4 = wrapText(ctx, keyword, rx4, ry4, textW4, kwLineH4) + 28;

    // Main text (salesPitch / description)
    ctx.font = `400 ${benFontSizeCanvas}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#d8d8d8';
    ctx.globalAlpha = 1;
    ry4 = wrapText(ctx, mainText, rx4, ry4, textW4, benLineH4) + 20;

    // Bullets complementares
    if (bulletPool4.length > 0) {
      ctx.font = `500 ${bulletFontSize4}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = '#c8c8c8';
      const bulletLineH = bulletFontSize4 * 1.6;
      for (const item of bulletPool4) {
        // Dot
        ctx.beginPath();
        ctx.arc(rx4 + 8, ry4 + bulletFontSize4 * 0.5, 6, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.fill();
        // Text
        ctx.fillStyle = '#c8c8c8';
        wrapText(ctx, item, rx4 + 24, ry4, textW4 - 24, bulletLineH);
        ry4 += bulletLineH;
      }
    }

    ctx.globalAlpha = 1;

  } else if (slideNum === 5) {
    const title5 = texts?.title || 'Você pode confiar';
    const badge1 = texts?.badge1 || features[0] || 'Biocompatível';
    const badge2 = texts?.badge2 || features[1] || benefits[0] || '5 Anos de Casos';
    const badge3 = texts?.badge3 || features[2] || benefits[1] || 'Qualidade Premium';
    const badges5 = [badge1, badge2, badge3];
    const imageScale5c = Number(texts?.imageScale) || 100;
    const bgColor5c = texts?.bgColor || '';

    if (img) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = W;
      offCanvas.height = H;
      const offCtx = offCanvas.getContext('2d')!;
      offCtx.filter = 'blur(12px)';
      const scale5 = (imageScale5c / 100) * 1.1;
      offCtx.drawImage(img, -20 * scale5, -20 * scale5, (W + 40) * scale5, (H + 40) * scale5);
      ctx.drawImage(offCanvas, 0, 0);
    } else if (bgColor5c) {
      ctx.fillStyle = bgColor5c;
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    drawBadge(5, 60, 60, 'rgba(255,255,255,0.2)', '#ffffff');
    ctx.font = '900 86px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, title5, W / 2, 200, W - 160, 96, 'center');
    const maxBadgeTextW = W - 160 - 130 - 60;
    const BADGE_LINE_H = 52;
    const BADGE_FONT = '700 40px system-ui, -apple-system, sans-serif';
    let by = 520;
    for (const badge of badges5) {
      // Medir linhas reais via word-wrap manual (igual ao wrapText)
      ctx.font = BADGE_FONT;
      const badgeWords = badge.split(' ');
      let bLine = '';
      let badgeLines = 1;
      for (const bw of badgeWords) {
        const test = bLine + bw + ' ';
        if (ctx.measureText(test).width > maxBadgeTextW && bLine !== '') {
          badgeLines++;
          bLine = bw + ' ';
        } else {
          bLine = test;
        }
      }
      const badgeBoxH = Math.max(130, 40 + badgeLines * BADGE_LINE_H);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(80, by, W - 160, badgeBoxH, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(80 + 72, by + badgeBoxH / 2, 36, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.font = BADGE_FONT;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      // Centralizar verticalmente o bloco de texto dentro da caixa
      const textBlockH = badgeLines * BADGE_LINE_H;
      const textStartY = by + (badgeBoxH - textBlockH) / 2;
      wrapText(ctx, badge, 80 + 130, textStartY, maxBadgeTextW, BADGE_LINE_H);
      by += badgeBoxH + 25;
    }

  } else if (slideNum === 6) {
    const name6 = texts?.productName || productData.name;
    const rawCtaBtn = texts?.ctaButton || '';
    const ctaBtn = (rawCtaBtn && rawCtaBtn.length <= 60) ? rawCtaBtn : '💡 Saiba Mais';
    const linkLbl = texts?.linkLabel || '🔗 Saiba Mais';
    const ftr = texts?.footer || 'Direct para mais informações';
    const imageScale6c = Number(texts?.imageScale) || 100;
    const bgColor6c = texts?.bgColor || primaryColor;

    ctx.fillStyle = bgColor6c;
    ctx.fillRect(0, 0, W, H);
    drawBadge(6, 60, 60, 'rgba(255,255,255,0.2)', textOnPrimary);
    if (img) {
      const cx = W / 2;
      const cy = 320;
      const r = 120;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      drawImageCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, name6, W / 2, 480, W - 160, 80, 'center');
    const btnY = 700;
    const btnH = 136;
    const btnW = W - 200;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 32;
    roundRect((W - btnW) / 2, btnY, btnW, btnH, 24);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    const ctaBtnFontSize = ctaBtn.length > 30 ? 36 : ctaBtn.length > 20 ? 44 : 52;
    ctx.font = `900 ${ctaBtnFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = textOnAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ctaBtnLineH = ctaBtnFontSize * 1.2;
    const ctaBtnLines = Math.max(1, Math.ceil(ctx.measureText(ctaBtn).width / (btnW - 80)));
    const ctaBtnBlockH = ctaBtnLines * ctaBtnLineH;
    wrapText(ctx, ctaBtn, W / 2, btnY + (btnH - ctaBtnBlockH) / 2, btnW - 80, ctaBtnLineH, 'center');
    ctx.font = '400 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(linkLbl, W / 2, 880);
    ctx.globalAlpha = 1;
    ctx.font = '400 34px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.6;
    ctx.fillText(ftr, W / 2, 960);
    ctx.globalAlpha = 1;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob falhou'));
    }, 'image/png');
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
