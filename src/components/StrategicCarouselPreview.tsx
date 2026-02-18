import React from 'react';
import { Shield, Award, CheckCircle, Zap, Star, Layers, ExternalLink } from 'lucide-react';

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

interface StrategicCarouselPreviewProps {
  slideImageMap: Record<number, string>;
  onImageChange: (slideNum: number, url: string) => void;
  productImages: Array<{ url: string; alt?: string }>;
  primaryColor: string;
  accentColor: string;
  productData: ProductData;
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

interface SlideWrapperProps {
  slideNum: number;
  children: React.ReactNode;
  productImages: Array<{ url: string; alt?: string }>;
  currentImage: string;
  onImageChange: (slideNum: number, url: string) => void;
  primaryColor: string;
}

function SlideWrapper({ slideNum, children, productImages, currentImage, onImageChange, primaryColor }: SlideWrapperProps) {
  const containerW = SLIDE_W * SLIDE_SCALE;
  const containerH = SLIDE_H * SLIDE_SCALE;

  return (
    <div className="flex flex-col items-center gap-2">
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

      {/* Thumbnails strip */}
      {productImages.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center" style={{ maxWidth: containerW }}>
          {productImages.slice(0, 8).map((img, idx) => (
            <button
              key={idx}
              onClick={() => onImageChange(slideNum, img.url)}
              title="Usar esta imagem"
              style={{
                width: 28,
                height: 28,
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
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SLIDE 1 — HOOK / GANCHO ====================
function Slide1Hook({ image, primaryColor, productData }: { image: string; primaryColor: string; productData: ProductData }) {
  const textColor = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const hook = productData.benefits?.[0]
    ? `Você sabia que ${productData.benefits[0].toLowerCase()}?`
    : `Descubra o segredo por trás de ${productData.name}`;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top half — primary color */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: primaryColor }} />

      {/* Bottom half — product image */}
      {image ? (
        <img
          src={image}
          alt="produto"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', width: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
      ) : (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: '#333' }} />
      )}

      {/* Gradient blend in the middle */}
      <div style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 200, background: `linear-gradient(to bottom, ${primaryColor}, transparent)` }} />

      {/* Slide badge */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textColor, fontWeight: 900, fontSize: 36 }}>1</span>
      </div>

      {/* Hook text */}
      <div style={{ position: 'absolute', top: '15%', left: 80, right: 80, textAlign: 'center' }}>
        <p style={{ color: textColor, fontWeight: 900, fontSize: 88, lineHeight: 1.1, margin: 0, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
          {hook}
        </p>
      </div>

      {/* Bottom gradient for readability */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80 }}>
        <p style={{ color: '#ffffff', fontSize: 44, fontWeight: 600, margin: 0, textAlign: 'center' }}>
          {productData.name}
        </p>
      </div>
    </div>
  );
}

// ==================== SLIDE 2 — SOLUÇÃO ====================
function Slide2Solution({ image, primaryColor, accentColor, productData }: { image: string; primaryColor: string; accentColor: string; productData: ProductData }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';

  const priceFormatted = productData.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productData.price)
    : null;

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#f8f8f8', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '80px 80px 100px' }}>
      {/* Slide badge */}
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>2</span>
      </div>

      {/* Category badge */}
      {productData.category && (
        <div style={{ background: primaryColor, color: textOnPrimary, borderRadius: 50, padding: '16px 48px', fontSize: 36, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const }}>
          {productData.category}
        </div>
      )}

      {/* Product image — Apple style */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
        {image ? (
          <img
            src={image}
            alt="produto"
            style={{
              maxWidth: '70%',
              maxHeight: 600,
              objectFit: 'contain',
              filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.2))',
            }}
          />
        ) : (
          <div style={{ width: 500, height: 500, background: '#e0e0e0', borderRadius: 20 }} />
        )}
      </div>

      {/* Product name */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 72, fontWeight: 900, color: '#111', lineHeight: 1.1 }}>
          {productData.name}
        </h2>

      </div>
    </div>
  );
}

// ==================== SLIDE 3 — CIENTIFICIDADE ====================
function Slide3Technical({ image, primaryColor, accentColor, productData }: { image: string; primaryColor: string; accentColor: string; productData: ProductData }) {
  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];

  // Build list from specs or features
  const items = specs.length > 0
    ? specs.map(s => ({ label: s.label, value: s.value }))
    : features.map(f => ({ label: f, value: '' }));

  const displayItems = items.slice(0, 5);
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#0f0f14', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      {/* Slide badge */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>3</span>
      </div>

      {/* Left column — image */}
      <div style={{ width: '42%', position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />
        )}
        {/* Gradient overlay on right edge */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 120, background: 'linear-gradient(to right, transparent, #0f0f14)' }} />
      </div>

      {/* Right column — specs */}
      <div style={{ flex: 1, padding: '100px 60px 80px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#ffffff', fontSize: 52, fontWeight: 900, margin: '0 0 60px 0', lineHeight: 1.2 }}>
          Por que confiar?
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {displayItems.length > 0 ? displayItems.map((item, idx) => {
            const IconIdx = idx % SPEC_ICONS.length;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, color: textOnPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* SVG icon placeholder */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                      {IconIdx === 0 && <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>}
                      {IconIdx === 1 && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}
                      {IconIdx === 2 && <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>}
                      {IconIdx === 3 && <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>}
                      {IconIdx === 4 && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                      {IconIdx === 5 && <><rect x="2" y="20" width="8" height="4" rx="1"/><rect x="10" y="12" width="8" height="12" rx="1"/><rect x="18" y="4" width="8" height="20" rx="1"/></>}
                    </svg>
                  </div>
                </div>
                <div>
                  <p style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 36, margin: 0, lineHeight: 1.2 }}>{item.label}</p>
                  {item.value && (
                    <p style={{ color: '#aaa', fontSize: 30, margin: '6px 0 0 0', fontWeight: 400 }}>{item.value}</p>
                  )}
                </div>
              </div>
            );
          }) : (
            <p style={{ color: '#aaa', fontSize: 36 }}>Adicione especificações técnicas ao produto para exibir aqui.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE 4 — EXPERIÊNCIA ====================
function Slide4Experience({ image, primaryColor, productData }: { image: string; primaryColor: string; productData: ProductData }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const benefit = productData.benefits?.[1] || productData.benefits?.[0] || 'Resultados excepcionais em cada uso';
  const keyword = productData.features?.[0] || 'Excelência';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', overflow: 'hidden' }}>
      {/* Left — image */}
      <div style={{ width: '50%', position: 'relative', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt="produto em uso" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
        )}
        {/* Slide badge */}
        <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: 30, color: '#111' }}>4</span>
        </div>
      </div>

      {/* Right — text */}
      <div style={{ width: '50%', background: primaryColor, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 70px' }}>
        <p style={{ color: textOnPrimary, opacity: 0.7, fontSize: 36, fontWeight: 600, margin: '0 0 20px 0', textTransform: 'uppercase' as const, letterSpacing: 4 }}>
          Experiência
        </p>
        <h2 style={{ color: textOnPrimary, fontSize: 90, fontWeight: 900, margin: '0 0 50px 0', lineHeight: 1 }}>
          {keyword}
        </h2>
        <p style={{ color: textOnPrimary, opacity: 0.9, fontSize: 40, lineHeight: 1.5, margin: 0, fontWeight: 400 }}>
          {benefit}
        </p>
      </div>
    </div>
  );
}

// ==================== SLIDE 5 — SEGURANÇA ====================
function Slide5Security({ image, primaryColor, productData }: { image: string; primaryColor: string; productData: ProductData }) {
  const features = productData.features || [];
  const benefits = productData.benefits || [];

  const badges = [
    { icon: 'shield', label: features[0] || 'Biocompatível' },
    { icon: 'award', label: features[1] || benefits[0] || '5 Anos de Casos' },
    { icon: 'check', label: features[2] || benefits[1] || 'Qualidade Premium' },
  ];

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background image with blur */}
      {image ? (
        <img
          src={image}
          alt="segurança"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px)', transform: 'scale(1.1)' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#222' }} />
      )}

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />

      {/* Slide badge */}
      <div style={{ position: 'absolute', top: 60, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 30 }}>5</span>
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: 60, zIndex: 2 }}>
        <h2 style={{ color: '#ffffff', fontSize: 90, fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.1 }}>
          Você pode confiar
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
          {badges.map((badge, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '30px 50px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="36" height="36">
                  {badge.icon === 'shield' && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>}
                  {badge.icon === 'award' && <><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></>}
                  {badge.icon === 'check' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                </svg>
              </div>
              <span style={{ color: '#ffffff', fontSize: 44, fontWeight: 700 }}>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SLIDE 6 — CTA ====================
function Slide6CTA({ image, primaryColor, accentColor, productData }: { image: string; primaryColor: string; accentColor: string; productData: ProductData }) {
  const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff';
  const textOnAccent = getLuminance(accentColor) > 0.5 ? '#000000' : '#ffffff';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: primaryColor, fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 60 }}>
      {/* Slide badge */}
      <div style={{ alignSelf: 'flex-start', width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 60, left: 60 }}>
        <span style={{ color: textOnPrimary, fontWeight: 900, fontSize: 30 }}>6</span>
      </div>

      {/* Product thumbnail */}
      <div style={{ width: 240, height: 240, borderRadius: 24, overflow: 'hidden', border: '4px solid rgba(255,255,255,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? (
          <img src={image} alt="produto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#eee' }} />
        )}
      </div>

      {/* Product name */}
      <h2 style={{ color: textOnPrimary, fontSize: 72, fontWeight: 900, margin: 0, textAlign: 'center', lineHeight: 1.1 }}>
        {productData.name}
      </h2>

      {/* CTA button */}
      <div style={{ background: accentColor, color: textOnAccent, borderRadius: 24, padding: '40px 80px', fontSize: 56, fontWeight: 900, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', cursor: 'default' }}>
        🛒 Comprar Agora
      </div>

      {/* Link info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: textOnPrimary, opacity: 0.85, fontSize: 44 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="44" height="44">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        <span>Link na Bio</span>
      </div>

      {/* Footer */}
      <p style={{ color: textOnPrimary, opacity: 0.6, fontSize: 34, margin: 0, textAlign: 'center' }}>
        Direct para mais informações
      </p>
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
}: StrategicCarouselPreviewProps) {
  const slides = [
    {
      num: 1,
      label: '🎣 Hook / Gancho',
      component: (
        <Slide1Hook
          image={slideImageMap[1] || ''}
          primaryColor={primaryColor}
          productData={productData}
        />
      ),
    },
    {
      num: 2,
      label: '✨ Apresentação',
      component: (
        <Slide2Solution
          image={slideImageMap[2] || ''}
          primaryColor={primaryColor}
          accentColor={accentColor}
          productData={productData}
        />
      ),
    },
    {
      num: 3,
      label: '🔬 Cientificidade',
      component: (
        <Slide3Technical
          image={slideImageMap[3] || ''}
          primaryColor={primaryColor}
          accentColor={accentColor}
          productData={productData}
        />
      ),
    },
    {
      num: 4,
      label: '💫 Experiência',
      component: (
        <Slide4Experience
          image={slideImageMap[4] || ''}
          primaryColor={primaryColor}
          productData={productData}
        />
      ),
    },
    {
      num: 5,
      label: '🛡️ Segurança',
      component: (
        <Slide5Security
          image={slideImageMap[5] || ''}
          primaryColor={primaryColor}
          productData={productData}
        />
      ),
    },
    {
      num: 6,
      label: '🛒 CTA',
      component: (
        <Slide6CTA
          image={slideImageMap[6] || ''}
          primaryColor={primaryColor}
          accentColor={accentColor}
          productData={productData}
        />
      ),
    },
  ];

  return (
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
          >
            {slide.component}
          </SlideWrapper>
        </div>
      ))}
    </div>
  );
}

// ==================== PNG EXPORT — Canvas 2D API ====================

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // CORS fallback — render without image
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
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
  return curY;
}

export async function generateSlidePNG(
  slideNum: number,
  imageUrl: string,
  primaryColor: string,
  accentColor: string,
  productData: ProductData
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

  // Helper: draw rounded rect
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

  // Helper: draw slide number badge
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

  if (slideNum === 1) {
    // ── Slide 1: Hook ──────────────────────────────────────────────
    // Top: primary color
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Bottom: image or dark
    if (img) {
      ctx.drawImage(img, 0, H * 0.40, W, H * 0.60);
    } else {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, H * 0.40, W, H * 0.60);
    }

    // Gradient blend
    const grad1 = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.55);
    grad1.addColorStop(0, primaryColor);
    grad1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, H * 0.40, W, 200);

    // Bottom dark gradient
    const grad2 = ctx.createLinearGradient(0, H - 300, 0, H);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, H - 300, W, 300);

    // Badge
    drawBadge(1, 60, 60, 'rgba(255,255,255,0.2)', textOnPrimary);

    // Hook text
    const hookText = benefits[0]
      ? `Você sabia que ${benefits[0].toLowerCase()}?`
      : `Descubra o segredo por trás de ${productData.name}`;
    ctx.font = '900 88px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    wrapText(ctx, hookText, W / 2, H * 0.17, W - 160, 100);
    ctx.shadowBlur = 0;

    // Product name
    ctx.font = '600 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(productData.name, W / 2, H - 60);

  } else if (slideNum === 2) {
    // ── Slide 2: Apresentação ──────────────────────────────────────
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, W, H);

    // Badge
    drawBadge(2, 80, 80, primaryColor, textOnPrimary);

    // Category badge
    let yOffset = 200;
    if (productData.category) {
      ctx.font = '700 36px system-ui, -apple-system, sans-serif';
      const catW = ctx.measureText(productData.category.toUpperCase()).width + 96;
      roundRect((W - catW) / 2, yOffset, catW, 80, 40);
      ctx.fillStyle = primaryColor;
      ctx.fill();
      ctx.fillStyle = textOnPrimary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(productData.category.toUpperCase(), W / 2, yOffset + 40);
      yOffset += 120;
    }

    // Product image centered
    if (img) {
      const maxW = W * 0.70;
      const maxH = 600;
      let dw = img.naturalWidth || img.width;
      let dh = img.naturalHeight || img.height;
      const scale = Math.min(maxW / dw, maxH / dh, 1);
      dw *= scale;
      dh *= scale;
      const ix = (W - dw) / 2;
      const iy = yOffset + (H - yOffset - 280 - dh) / 2;
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

    // Product name
    ctx.font = '900 72px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(productData.name, W / 2, H - 100);

  } else if (slideNum === 3) {
    // ── Slide 3: Técnico ───────────────────────────────────────────
    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, W, H);

    // Left image column
    const imgW = W * 0.42;
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, imgW, H);
      ctx.clip();
      ctx.drawImage(img, 0, 0, imgW, H);
      ctx.restore();
      // Gradient edge
      const grad = ctx.createLinearGradient(imgW - 120, 0, imgW, 0);
      grad.addColorStop(0, 'rgba(15,15,20,0)');
      grad.addColorStop(1, '#0f0f14');
      ctx.fillStyle = grad;
      ctx.fillRect(imgW - 120, 0, 120, H);
    }

    // Badge
    drawBadge(3, 60, 60, primaryColor, textOnPrimary);

    // Right column text
    const rx = imgW + 40;
    let ry = 100;

    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Por que confiar?', rx, ry);
    ry += 120;

    const items = specs.length > 0
      ? specs.slice(0, 5).map(s => s.label + (s.value ? ': ' + s.value : ''))
      : features.slice(0, 5);

    for (const item of items) {
      // Icon box
      ctx.fillStyle = primaryColor;
      roundRect(rx, ry, 56, 56, 12);
      ctx.fill();
      ctx.font = '700 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ry = wrapText(ctx, item, rx + 76, ry + 10, W - rx - 60, 44);
      ry += 20;
    }

    if (items.length === 0) {
      ctx.font = '400 36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('Adicione especificações ao produto.', rx, ry);
    }

  } else if (slideNum === 4) {
    // ── Slide 4: Experiência ────────────────────────────────────────
    // Left: image
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

    // Badge on image
    drawBadge(4, 60, 60, 'rgba(255,255,255,0.9)', '#111111');

    // Right: primary color
    ctx.fillStyle = primaryColor;
    ctx.fillRect(halfW, 0, halfW, H);

    const benefit = benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso';
    const keyword = features[0] || 'Excelência';

    ctx.textAlign = 'left';
    ctx.font = '600 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.7;
    ctx.textBaseline = 'top';
    ctx.fillText('EXPERIÊNCIA', halfW + 70, 200);
    ctx.globalAlpha = 1;

    ctx.font = '900 90px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.textBaseline = 'top';
    wrapText(ctx, keyword, halfW + 70, 270, halfW - 100, 96);

    ctx.font = '400 40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.9;
    wrapText(ctx, benefit, halfW + 70, 500, halfW - 100, 52);
    ctx.globalAlpha = 1;

  } else if (slideNum === 5) {
    // ── Slide 5: Segurança ──────────────────────────────────────────
    if (img) {
      // Draw blurred background using offscreen trick
      const offCanvas = document.createElement('canvas');
      offCanvas.width = W;
      offCanvas.height = H;
      const offCtx = offCanvas.getContext('2d')!;
      offCtx.filter = 'blur(12px)';
      offCtx.drawImage(img, -20, -20, W + 40, H + 40); // oversized to hide blur edges
      ctx.drawImage(offCanvas, 0, 0);
    } else {
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, W, H);
    }

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    // Badge
    drawBadge(5, 60, 60, 'rgba(255,255,255,0.2)', '#ffffff');

    // Title
    ctx.font = '900 90px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, 'Você pode confiar', W / 2, 200, W - 160, 100);

    // Badges list
    const badges = [
      features[0] || 'Biocompatível',
      features[1] || benefits[0] || '5 Anos de Casos',
      features[2] || benefits[1] || 'Qualidade Premium',
    ];

    let by = 520;
    for (const badge of badges) {
      // Glass card
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(80, by, W - 160, 130, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Icon circle
      ctx.beginPath();
      ctx.arc(80 + 72, by + 65, 36, 0, Math.PI * 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();

      // Badge text
      ctx.font = '700 44px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge, 80 + 130, by + 65);

      by += 160;
    }

  } else if (slideNum === 6) {
    // ── Slide 6: CTA ────────────────────────────────────────────────
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, W, H);

    // Badge
    drawBadge(6, 60, 60, 'rgba(255,255,255,0.2)', textOnPrimary);

    // Thumbnail circular
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
      // Border
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // Product name
    ctx.font = '900 72px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    wrapText(ctx, productData.name, W / 2, 480, W - 160, 80);

    // CTA button
    const btnY = 700;
    const btnH = 140;
    const btnW = W - 200;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 32;
    roundRect((W - btnW) / 2, btnY, btnW, btnH, 24);
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛒 Comprar Agora', W / 2, btnY + btnH / 2);

    // Link na bio
    ctx.font = '400 44px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('🔗 Link na Bio', W / 2, 880);
    ctx.globalAlpha = 1;

    ctx.font = '400 34px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = textOnPrimary;
    ctx.globalAlpha = 0.6;
    ctx.textBaseline = 'top';
    ctx.fillText('Direct para mais informações', W / 2, 960);
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

  const priceFormatted = productData.price
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productData.price)
    : null;

  const specs = productData.technicalSpecs?.slice(0, 5) || [];
  const features = productData.features?.slice(0, 5) || [];
  const benefits = productData.benefits || [];

  const items = specs.length > 0
    ? specs.map(s => `<div style="display:flex;align-items:flex-start;gap:24px;"><div style="width:56px;height:56px;border-radius:12px;background:${primaryColor};flex-shrink:0;"></div><div><p style="color:#e0e0e0;font-weight:700;font-size:36px;margin:0;">${s.label}</p>${s.value ? `<p style="color:#aaa;font-size:30px;margin:6px 0 0 0;">${s.value}</p>` : ''}</div></div>`)
    : features.map(f => `<div style="display:flex;align-items:flex-start;gap:24px;"><div style="width:56px;height:56px;border-radius:12px;background:${primaryColor};flex-shrink:0;"></div><div><p style="color:#e0e0e0;font-weight:700;font-size:36px;margin:0;">${f}</p></div></div>`);

  const slideBodies: Record<number, string> = {
    1: `
      <div style="position:absolute;top:0;left:0;right:0;height:55%;background:${primaryColor};"></div>
      ${imageUrl ? `<img src="${imageUrl}" style="position:absolute;bottom:0;left:0;right:0;height:60%;width:100%;object-fit:cover;object-position:center top;">` : ''}
      <div style="position:absolute;top:40%;left:0;right:0;height:200px;background:linear-gradient(to bottom,${primaryColor},transparent);"></div>
      <div style="position:absolute;top:60px;left:60px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">
        <span style="color:${textOnPrimary};font-weight:900;font-size:36px;">1</span>
      </div>
      <div style="position:absolute;top:15%;left:80px;right:80px;text-align:center;">
        <p style="color:${textOnPrimary};font-weight:900;font-size:88px;line-height:1.1;margin:0;">
          ${benefits[0] ? `Você sabia que ${benefits[0].toLowerCase()}?` : `Descubra ${productData.name}`}
        </p>
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:200px;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);"></div>
      <p style="position:absolute;bottom:60px;left:80px;right:80px;color:#fff;font-size:44px;font-weight:600;margin:0;text-align:center;">${productData.name}</p>
    `,
    2: `
      <div style="width:100%;height:100%;background:#f8f8f8;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:80px;box-sizing:border-box;">
        ${productData.category ? `<div style="background:${primaryColor};color:${textOnPrimary};border-radius:50px;padding:16px 48px;font-size:36px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${productData.category}</div>` : '<div></div>'}
        ${imageUrl ? `<img src="${imageUrl}" style="max-width:70%;max-height:600px;object-fit:contain;filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));">` : '<div style="width:500px;height:500px;background:#e0e0e0;border-radius:20px;"></div>'}
        <div style="text-align:center;">
          <h2 style="margin:0;font-size:72px;font-weight:900;color:#111;line-height:1.1;">${productData.name}</h2>
          
        </div>
      </div>
    `,
    3: `
      <div style="width:100%;height:100%;display:flex;">
        <div style="width:42%;position:relative;overflow:hidden;">
          ${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : ''}
          <div style="position:absolute;top:0;right:0;bottom:0;width:120px;background:linear-gradient(to right,transparent,#0f0f14);"></div>
        </div>
        <div style="flex:1;padding:100px 60px 80px 40px;display:flex;flex-direction:column;justify-content:center;background:#0f0f14;">
          <h2 style="color:#fff;font-size:52px;font-weight:900;margin:0 0 60px 0;">Por que confiar?</h2>
          <div style="display:flex;flex-direction:column;gap:36px;">
            ${items.join('')}
          </div>
        </div>
      </div>
    `,
    4: `
      <div style="width:100%;height:100%;display:flex;">
        <div style="width:50%;position:relative;overflow:hidden;">
          ${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;background:#ccc;"></div>'}
        </div>
        <div style="width:50%;background:${primaryColor};display:flex;flex-direction:column;justify-content:center;padding:80px 70px;box-sizing:border-box;">
          <p style="color:${textOnPrimary};opacity:0.7;font-size:36px;font-weight:600;margin:0 0 20px 0;text-transform:uppercase;letter-spacing:4px;">Experiência</p>
          <h2 style="color:${textOnPrimary};font-size:90px;font-weight:900;margin:0 0 50px 0;line-height:1;">${features[0] || 'Excelência'}</h2>
          <p style="color:${textOnPrimary};opacity:0.9;font-size:40px;line-height:1.5;margin:0;">${benefits[1] || benefits[0] || 'Resultados excepcionais em cada uso'}</p>
        </div>
      </div>
    `,
    5: `
      ${imageUrl ? `<img src="${imageUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(8px);transform:scale(1.1);">` : '<div style="position:absolute;inset:0;background:#222;"></div>'}
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.65);"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;gap:60px;">
        <h2 style="color:#fff;font-size:90px;font-weight:900;margin:0;text-align:center;">Você pode confiar</h2>
        <div style="display:flex;flex-direction:column;gap:30px;width:100%;">
          ${[features[0]||'Biocompatível', features[1]||benefits[0]||'5 Anos de Casos', features[2]||benefits[1]||'Qualidade Premium'].map(badge => `
            <div style="display:flex;align-items:center;gap:36px;background:rgba(255,255,255,0.12);border-radius:20px;padding:30px 50px;border:1px solid rgba(255,255,255,0.2);">
              <div style="width:72px;height:72px;border-radius:50%;background:${primaryColor};flex-shrink:0;"></div>
              <span style="color:#fff;font-size:44px;font-weight:700;">${badge}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `,
    6: `
      <div style="width:100%;height:100%;background:${primaryColor};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px;box-sizing:border-box;gap:60px;">
        <div style="width:240px;height:240px;border-radius:24px;overflow:hidden;border:4px solid rgba(255,255,255,0.8);box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          ${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;background:#eee;"></div>'}
        </div>
        <h2 style="color:${textOnPrimary};font-size:72px;font-weight:900;margin:0;text-align:center;">${productData.name}</h2>
        <div style="background:${accentColor};color:${textOnAccent};border-radius:24px;padding:40px 80px;font-size:56px;font-weight:900;">🛒 Comprar Agora</div>
        <div style="display:flex;align-items:center;gap:20px;color:${textOnPrimary};opacity:0.85;font-size:44px;">
          <span>🔗 Link na Bio</span>
        </div>
        <p style="color:${textOnPrimary};opacity:0.6;font-size:34px;margin:0;">Direct para mais informações</p>
      </div>
    `,
  };

  const SLIDE_NAMES: Record<number, string> = {
    1: 'Hook / Gancho',
    2: 'Apresentação da Solução',
    3: 'Diferencial Técnico',
    4: 'Benefício na Prática',
    5: 'Segurança / Quebra de Objeção',
    6: 'Chamada para Ação',
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Slide ${slideNum} — ${SLIDE_NAMES[slideNum] || ''} — ${productData.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 1080px; height: 1350px; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; }
    .slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; }
  </style>
</head>
<body>
  <div class="slide">
    ${slideBodies[slideNum] || ''}
  </div>
</body>
</html>`;
}
