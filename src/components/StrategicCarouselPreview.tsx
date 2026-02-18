import React, { useState, useRef } from 'react';
import { Shield, Award, CheckCircle, Zap, Star, Layers, Upload, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TechnicalSpec {
  label: string;
  value: string;
}

interface ProductData {
  name: string;
  price?: number;
  category?: string;
  benefits?: string[];
  features?: string[];
  technicalSpecs?: TechnicalSpec[];
  productUrl?: string;
}

// ========================= SlideTexts Types =========================
export interface SlideTextsType {
  1: { hook: string; productName: string };
  2: { category: string; productName: string };
  3: { title: string };
  4: { label: string; keyword: string; benefit: string };
  5: { title: string; badge1: string; badge2: string; badge3: string };
  6: { productName: string; ctaButton: string; linkLabel: string; footer: string };
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
const SLIDE_EDITOR_FIELDS: Record<number, Array<{ key: string; label: string; type: 'input' | 'textarea' }>> = {
  1: [
    { key: 'hook', label: 'Texto do Gancho', type: 'textarea' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
  ],
  2: [
    { key: 'category', label: 'Categoria', type: 'input' },
    { key: 'productName', label: 'Nome do produto', type: 'input' },
  ],
  3: [
    { key: 'title', label: 'Título da seção', type: 'input' },
  ],
  4: [
    { key: 'label', label: 'Label topo (ex: EXPERIÊNCIA)', type: 'input' },
    { key: 'keyword', label: 'Palavra-chave', type: 'input' },
    { key: 'benefit', label: 'Benefício', type: 'textarea' },
  ],
  5: [
    { key: 'title', label: 'Título', type: 'input' },
    { key: 'badge1', label: 'Badge 1', type: 'input' },
    { key: 'badge2', label: 'Badge 2', type: 'input' },
    { key: 'badge3', label: 'Badge 3', type: 'input' },
  ],
  6: [
    { key: 'productName', label: 'Nome exibido', type: 'input' },
    { key: 'ctaButton', label: 'Texto do botão CTA', type: 'input' },
    { key: 'linkLabel', label: 'Label do link', type: 'input' },
    { key: 'footer', label: 'Texto de rodapé', type: 'input' },
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
    // reset so same file can be re-uploaded
    e.target.value = '';
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

      {/* Action row: thumbnails + upload + edit */}
      <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: containerW + 40 }}>
        {/* Image thumbnails */}
        {productImages.slice(0, 5).map((img, idx) => (
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

        {/* Upload button */}
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

        {/* Editor toggle */}
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
              {field.type === 'textarea' ? (
                <Textarea
                  value={slideTexts?.[field.key] || ''}
                  onChange={(e) => onSlideTextChange(field.key, e.target.value)}
                  className="text-xs min-h-[50px] resize-none"
                />
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
function Slide1Hook({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { hook?: string; productName?: string } }) {
  const textColor = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const hook = texts?.hook || (() => {
    const features = productData.features || [];
    const benefits = productData.benefits || [];
    const shortFeature = features.find(f => f && f.length <= 35);
    if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
    const shortBenefit = benefits.find(b => b && b.length <= 45);
    if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
    return `${productData.name}: a escolha que muda tudo`;
  })();
  const name = texts?.productName || productData.name;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: primaryColor }} />
      {image ? (
        <img src={image} alt="produto" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', width: '100%', objectFit: 'cover', objectPosition: 'center center', backgroundColor: '#f0f0f0' }} />
      ) : (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: '#333' }} />
      )}
      <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 200, background: `linear-gradient(to bottom, ${primaryColor}, transparent)` }} />
      <div style={{ position: 'absolute', top: 60, left: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textColor, fontWeight: 900, fontSize: 36 }}>1</span>
      </div>
      <div style={{ position: 'absolute', top: '15%', left: 80, right: 80, textAlign: 'center' }}>
        <p style={{ color: textColor, fontWeight: 900, fontSize: 80, lineHeight: 1.1, margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>{hook}</p>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
        <p style={{ color: '#ffffff', fontSize: 44, fontWeight: 600, margin: 0, textAlign: 'center' }}>{name}</p>
      </div>
    </div>
  );
}

// ==================== SLIDE 2 — SOLUÇÃO ====================
function Slide2Solution({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { category?: string; productName?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const category = texts?.category !== undefined ? texts.category : (productData.category || '');
  const name = texts?.productName || productData.name;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#f8f8f8', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '80px 80px 100px' }}>
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>2</span>
      </div>
      {category && (
        <div style={{ background: primaryColor, color: textOnPrimary, borderRadius: 50, padding: '16px 48px', fontSize: 36, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const }}>
          {category}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', minHeight: 0, overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto" style={{ maxWidth: '70%', maxHeight: '100%', height: 'auto', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))' }} />
        ) : (
          <div style={{ width: 500, height: 500, background: '#e0e0e0', borderRadius: 20 }} />
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 68, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>{name}</h2>
      </div>
    </div>
  );
}

// ==================== SLIDE 3 — CIENTIFICIDADE ====================
const SLIDE3_UNICODE_ICONS = ['⚡', '🛡', '⭐', '✅', '🔬'];

function Slide3Technical({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { title?: string } }) {
  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];
  const items = specs.length > 0 ? specs.map(s => ({ label: s.label, value: s.value })) : features.map(f => ({ label: f, value: '' }));
  const displayItems = items.slice(0, 5);
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const title = texts?.title || 'Por que confiar?';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#0f0f14', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>3</span>
      </div>
      <div style={{ width: '42%', position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
        )}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 120, background: 'linear-gradient(to right, transparent, #0f0f14)' }} />
      </div>
      <div style={{ flex: 1, padding: '100px 60px 80px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#ffffff', fontSize: 52, fontWeight: 900, margin: '0 0 60px 0', lineHeight: 1.2 }}>{title}</h2>
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
      </div>
    </div>
  );
}

// ==================== SLIDE 4 — EXPERIÊNCIA ====================
function Slide4Experience({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { label?: string; keyword?: string; benefit?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const benefit = texts?.benefit || productData.benefits?.[2] || productData.benefits?.[1] || 'Resultados excepcionais em cada uso';
  const keyword = texts?.keyword || productData.features?.[0] || 'Excelência';
  const label = texts?.label || 'Experiência';
  const kwFontSize = keyword.length > 15 ? 65 : 90;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', overflow: 'hidden' }}>
      <div style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto em uso" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
        )}
        <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: 30, color: '#111' }}>4</span>
        </div>
      </div>
      <div style={{ width: '50%', background: primaryColor, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 70px', overflow: 'visible' }}>
        <p style={{ color: textOnPrimary, opacity: 0.7, fontSize: 36, fontWeight: 600, margin: '0 0 20px 0', textTransform: 'uppercase' as const, letterSpacing: 4, flexShrink: 0 }}>{label}</p>
        <h2 style={{ color: textOnPrimary, fontSize: kwFontSize, fontWeight: 900, margin: '0 0 30px 0', lineHeight: 1.05, wordBreak: 'break-word' as const, flexShrink: 0 }}>{keyword}</h2>
        <p style={{ color: textOnPrimary, opacity: 0.9, fontSize: benefit.length > 60 ? 32 : 38, lineHeight: 1.5, margin: 0, fontWeight: 400, wordBreak: 'break-word' as const }}>{benefit}</p>
      </div>
    </div>
  );
}

// ==================== SLIDE 5 — SEGURANÇA ====================
function Slide5Security({ image, primaryColor, productData, texts }: { image: string; primaryColor: string; productData: ProductData; texts?: { title?: string; badge1?: string; badge2?: string; badge3?: string } }) {
  const features = productData.features || [];
  const benefits = productData.benefits || [];
  const title = texts?.title || 'Você pode confiar';
  const badges = [
    { icon: 'shield', label: texts?.badge1 || features[1] || features[0] || 'Biocompatível' },
    { icon: 'award', label: texts?.badge2 || features[2] || benefits[1] || '5 Anos de Casos' },
    { icon: 'check', label: texts?.badge3 || features[3] || benefits[2] || 'Qualidade Premium' },
  ];

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {image ? (
        <img src={image} alt="segurança" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px)', transform: 'scale(1.1)' }} />
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
              <span style={{ color: '#ffffff', fontSize: 40, fontWeight: 700, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.3, wordBreak: 'break-word' as const }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE 6 — CTA ====================
function Slide6CTA({ image, primaryColor, accentColor, productData, texts }: { image: string; primaryColor: string; accentColor: string; productData: ProductData; texts?: { productName?: string; ctaButton?: string; linkLabel?: string; footer?: string } }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';
  const name = texts?.productName || productData.name;
  const ctaButton = texts?.ctaButton || '🛒 Comprar Agora';
  const linkLabel = texts?.linkLabel || '🔗 Link na Bio';
  const footer = texts?.footer || 'Direct para mais informações';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: primaryColor, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 60, position: 'relative' }}>
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 60, left: 60 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>6</span>
      </div>
      <div style={{ width: 240, height: 240, borderRadius: 24, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#eee' }} />}
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
      const shortFeature = (productData.features || []).find(f => f && f.length <= 35);
      if (shortFeature) return `Você já ouviu falar em ${shortFeature}?`;
      const shortBenefit = (benefits || []).find(b => b && b.length <= 45);
      if (shortBenefit) return shortBenefit.charAt(0).toUpperCase() + shortBenefit.slice(1);
      return `${productData.name}: a escolha que muda tudo`;
    })();
    const productName = texts?.productName || productData.name;

    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, W, H * 0.55);
    if (img) {
      ctx.drawImage(img, 0, H * 0.40, W, H * 0.60);
    } else {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, H * 0.40, W, H * 0.60);
    }
    const grad1 = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.55);
    grad1.addColorStop(0, primaryColor);
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, H * 0.40, W, 200);
    const grad2 = ctx.createLinearGradient(0, H - 300, 0, H);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, H - 300, W, 300);
    drawBadge(1, 60, 60, 'rgba(255,255,255,0.2)', textOnPrimary);
    ctx.font = '900 80px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    wrapText(ctx, hookText, W / 2, H * 0.17, W - 160, 92, 'center');
    ctx.shadowBlur = 0;
    ctx.font = '600 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(productName, W / 2, H - 60);

  } else if (slideNum === 2) {
    const productName = texts?.productName || productData.name;
    const category = texts?.category !== undefined ? texts.category : (productData.category || '');

    ctx.fillStyle = '#f8f8f8';
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
      const maxW = W * 0.70;
      const maxH = 600;
      let dw = img.naturalWidth || img.width;
      let dh = img.naturalHeight || img.height;
      const scale = Math.min(maxW / dw, maxH / dh, 1);
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
    // Product name with wrapText to avoid clipping
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, productName, W / 2, H - 260, W - 160, 80, 'center');

  } else if (slideNum === 3) {
    const title = texts?.title || 'Por que confiar?';

    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, W, H);
    const imgW = W * 0.42;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, imgW, H);
      ctx.clip();
      ctx.drawImage(img, 0, 0, imgW, H);
      ctx.restore();
      const grad = ctx.createLinearGradient(imgW - 120, 0, imgW, 0);
      grad.addColorStop(0, 'rgba(15,15,20,0)');
      grad.addColorStop(1, '#0f0f14');
      ctx.fillStyle = grad;
      ctx.fillRect(imgW - 120, 0, 120, H);
    }
    drawBadge(3, 60, 60, primaryColor, textOnPrimary);
    const rx = imgW + 40;
    let ry = 100;
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, rx, ry);
    ry += 120;
    const items = specs.length > 0
      ? specs.slice(0, 5).map(s => s.label + (s.value ? ': ' + s.value : ''))
      : features.slice(0, 5);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Icon box
      ctx.fillStyle = primaryColor;
      roundRect(rx, ry, 56, 56, 12);
      ctx.fill();
      // Unicode icon centered in box
      ctx.font = '32px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ICONS_CANVAS[i % ICONS_CANVAS.length], rx + 28, ry + 28);
      // Item text
      ctx.font = '700 34px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ry = wrapText(ctx, item, rx + 76, ry + 10, W - rx - 60, 42);
      ry += 18;
    }
    if (items.length === 0) {
      ctx.font = '400 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Adicione especificações ao produto.', rx, ry);
    }

  } else if (slideNum === 4) {
    const keyword = texts?.keyword || features[0] || 'Excelência';
    const benefit = texts?.benefit || benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso';
    const label4 = texts?.label || 'EXPERIÊNCIA';
    const kwFontSize = keyword.length > 15 ? 65 : 90;

    const halfW = W / 2;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, halfW, H);
      ctx.clip();
      ctx.drawImage(img, 0, 0, halfW, H);
      ctx.restore();
    } else {
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, halfW, H);
    }
    drawBadge(4, 60, 60, 'rgba(255,255,255,0.9)', '#111111');
    ctx.fillStyle = primaryColor;
    ctx.fillRect(halfW, 0, halfW, H);
    ctx.textAlign = 'left';
    ctx.font = '600 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.7;
    ctx.textBaseline = 'top';
    ctx.fillText(label4.toUpperCase(), halfW + 70, 200);
    ctx.globalAlpha = 1;
    // Keyword with adaptive font + capture Y
    ctx.font = `900 ${kwFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = textOnPrimary;
    ctx.textBaseline = 'top';
    const benefitStartY = wrapText(ctx, keyword, halfW + 70, 270, halfW - 100, kwFontSize * 1.15);
    // Benefit text starts after keyword
    ctx.font = '400 38px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.9;
    wrapText(ctx, benefit, halfW + 70, benefitStartY + 40, halfW - 100, 52);
    ctx.globalAlpha = 1;

  } else if (slideNum === 5) {
    const title5 = texts?.title || 'Você pode confiar';
    const badge1 = texts?.badge1 || features[0] || 'Biocompatível';
    const badge2 = texts?.badge2 || features[1] || benefits[0] || '5 Anos de Casos';
    const badge3 = texts?.badge3 || features[2] || benefits[1] || 'Qualidade Premium';
    const badges5 = [badge1, badge2, badge3];

    if (img) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = W;
      offCanvas.height = H;
      const offCtx = offCanvas.getContext('2d')!;
      offCtx.filter = 'blur(12px)';
      offCtx.drawImage(img, -20, -20, W + 40, H + 40);
      ctx.drawImage(offCanvas, 0, 0);
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
    let by = 520;
    for (const badge of badges5) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(80, by, W - 160, 130, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(80 + 72, by + 65, 36, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.font = '700 40px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const truncatedBadge = truncateToWidth(ctx, badge, maxBadgeTextW);
      ctx.fillText(truncatedBadge, 80 + 130, by + 65);
      by += 155;
    }

  } else if (slideNum === 6) {
    const name6 = texts?.productName || productData.name;
    const ctaBtn = texts?.ctaButton || '🛒 Comprar Agora';
    const linkLbl = texts?.linkLabel || '🔗 Link na Bio';
    const ftr = texts?.footer || 'Direct para mais informações';

    ctx.fillStyle = primaryColor;
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
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
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
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaBtn, W / 2, btnY + btnH / 2);
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
    6: `<div style="width:100%;height:100%;background:${primaryColor};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;box-sizing:border-box;gap:60px;"><div style="width:240px;height:240px;border-radius:24px;overflow:hidden;border:4px solid rgba(255,255,255,0.8);">${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;background:#eee;"></div>'}</div><h2 style="color:${textOnPrimary};font-size:68px;font-weight:900;margin:0;text-align:center;">${productData.name}</h2><div style="background:${accentColor};color:${textOnAccent};border-radius:24px;padding:36px 72px;font-size:52px;font-weight:900;">🛒 Comprar Agora</div><span style="color:${textOnPrimary};opacity:0.85;font-size:44px;">🔗 Link na Bio</span><p style="color:${textOnPrimary};opacity:0.6;font-size:34px;margin:0;">Direct para mais informações</p></div>`,
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
