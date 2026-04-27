import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Loader2, Download, Image as ImageIcon, Palette, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DisplayBanner, DisplayFormat, DisplayStyle } from '@/types/google-ads';
import { DISPLAY_FORMATS, DISPLAY_STYLES, generateBannerHTML, contrastRatio, getLayoutBucket } from './display-templates';
import { STYLE_PRESETS, DEFAULT_STYLE, type StylePreset } from './smartdent-constants';
import { DisplayBannerPreview } from './DisplayBannerPreview';
import JSZip from 'jszip';

interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  product_url?: string;
  image_url?: string;
  images_gallery?: Array<{ url: string; alt?: string }>;
}

interface DisplayBannerGeneratorProps {
  product: Product;
}

// Convert image URL to WebP via canvas (returns dataURL + Blob)
async function convertImageToWebP(url: string, quality = 0.85): Promise<{ dataUrl: string; blob: Blob }> {
  const res = await fetch(url, { mode: 'cors' }).catch(() => fetch(url));
  const sourceBlob = await res.blob();
  const bitmap = await createImageBitmap(sourceBlob).catch(() => null);
  if (!bitmap) {
    // Fallback: return original blob as dataURL
    const dataUrl: string = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(sourceBlob);
    });
    return { dataUrl, blob: sourceBlob };
  }
  // Cap dimensions for ad weight
  const maxSide = 800;
  const ratio = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 1);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/webp', quality)
  );
  const dataUrl: string = await new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
  return { dataUrl, blob };
}

export function DisplayBannerGenerator({ product }: DisplayBannerGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [banners, setBanners] = useState<DisplayBanner[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<DisplayFormat[]>(
    DISPLAY_FORMATS.filter(f => ['popular', 'mobile'].includes(f.category))
  );
  const [style, setStyle] = useState<DisplayStyle>(DEFAULT_STYLE);
  const [primaryColor, setPrimaryColor] = useState(STYLE_PRESETS[DEFAULT_STYLE].primary);
  const [secondaryColor, setSecondaryColor] = useState(STYLE_PRESETS[DEFAULT_STYLE].secondary);
  const [accentColor, setAccentColor] = useState(STYLE_PRESETS[DEFAULT_STYLE].accent);
  const [ctaText, setCtaText] = useState('Saiba Mais');
  const [headline, setHeadline] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [showFdaBadge, setShowFdaBadge] = useState(true);
  const [campaignSlug, setCampaignSlug] = useState('');
  const [finalUrl, setFinalUrl] = useState(product.product_url || '');
  const [selectedImage, setSelectedImage] = useState(product.image_url || '');

  const handleStylePresetChange = useCallback((preset: StylePreset) => {
    const cfg = STYLE_PRESETS[preset];
    setStyle(preset);
    setPrimaryColor(cfg.primary);
    setSecondaryColor(cfg.secondary);
    setAccentColor(cfg.accent);
  }, []);

  const allImages = [
    ...(product.image_url ? [{ url: product.image_url, alt: 'Principal' }] : []),
    ...(product.images_gallery || []),
  ].filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);

  // WCAG AA — 3 contrastes derivados do preset selecionado
  const contrastChecks = useMemo(() => {
    const p = STYLE_PRESETS[style];
    const h = contrastRatio(p.textOnBg, p.bgDominant);
    const c = contrastRatio(p.ctaText, p.ctaBg);
    const f = contrastRatio(p.fdaBadgeText, p.fdaBadgeBg);
    return {
      headline: { label: 'Headline (texto vs fundo)', ratio: h, pass: h >= 4.5 },
      cta:      { label: 'CTA (texto vs botão)',     ratio: c, pass: c >= 4.5 },
      fda:      { label: 'FDA Badge',                 ratio: f, pass: f >= 4.5 },
    };
  }, [style]);
  const allContrastsPass = contrastChecks.headline.pass && contrastChecks.cta.pass && contrastChecks.fda.pass;

  const toggleFormat = (format: DisplayFormat) => {
    setSelectedFormats(prev => {
      const exists = prev.find(f => f.width === format.width && f.height === format.height);
      return exists ? prev.filter(f => !(f.width === format.width && f.height === format.height)) : [...prev, format];
    });
  };

  const toggleCategory = (category: string) => {
    const catFormats = DISPLAY_FORMATS.filter(f => f.category === category);
    const allSelected = catFormats.every(cf => selectedFormats.some(sf => sf.width === cf.width && sf.height === cf.height));
    if (allSelected) {
      setSelectedFormats(prev => prev.filter(f => f.category !== category));
    } else {
      setSelectedFormats(prev => {
        const without = prev.filter(f => f.category !== category);
        return [...without, ...catFormats];
      });
    }
  };

  const selectAll = () => {
    setSelectedFormats(prev => prev.length === DISPLAY_FORMATS.length ? [] : [...DISPLAY_FORMATS]);
  };

  const handleGenerate = useCallback(async () => {
    if (!selectedImage) {
      toast({ title: 'Selecione uma foto do produto', variant: 'destructive' });
      return;
    }
    if (selectedFormats.length === 0) {
      toast({ title: 'Selecione ao menos um formato', variant: 'destructive' });
      return;
    }
    if (!finalUrl) {
      toast({ title: 'URL Final é obrigatória para tracking IAB/UTM', variant: 'destructive' });
      return;
    }
    if (!allContrastsPass) {
      toast({ title: 'Ajuste as cores do preset — algum contraste WCAG AA está abaixo de 4.5:1.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      // Validate WebP conversion is feasible (used at download time)
      await convertImageToWebP(selectedImage);

      // Fetch AI copy (one call, not per format)
      let copies: Record<string, { headline: string; subheadline: string }> = {};
      try {
        const { data, error } = await supabase.functions.invoke('generate-display-banners', {
          body: {
            productName: product.name,
            productDescription: product.description || '',
            ctaText,
            formats: selectedFormats,
            campaignSlug: campaignSlug || product.id,
          },
        });
        if (!error && data?.copies) copies = data.copies;
      } catch (e) {
        console.warn('AI copy fetch failed, using manual/product fallback:', e);
      }

      // Render HTML in frontend (single source of truth). Reference product.webp
      // as a relative asset — the WebP file is added to the ZIP at download time.
      const localBanners: DisplayBanner[] = selectedFormats.map(format => {
        const key = `${format.width}x${format.height}`;
        const aiCopy = copies[key];
        const finalHeadline = headline.trim() || aiCopy?.headline || product.name;
        const finalSub = subheadline.trim() || aiCopy?.subheadline || '';

        const html = generateBannerHTML({
          width: format.width,
          height: format.height,
          style,
          primaryColor,
          secondaryColor,
          accentColor,
          headline: finalHeadline,
          subheadline: finalSub,
          ctaText,
          productImageUrl: 'product.webp',
          finalUrl,
          showFdaBadge,
          campaignSlug: campaignSlug || product.id,
          utm: {
            source: 'google_display',
            medium: 'banner',
            campaign: campaignSlug || product.id,
          },
        });
        return { format, html, sizeKB: new Blob([html]).size / 1024 };
      });

      setBanners(localBanners);
      const overweight = localBanners.filter(b => b.sizeKB > 150).length;
      toast({
        title: `${localBanners.length} banners gerados`,
        description: overweight > 0 ? `⚠️ ${overweight} acima de 150KB — revise a imagem.` : 'Todos dentro do limite de peso.',
      });
    } catch (err) {
      console.error('Error generating banners:', err);
      toast({ title: 'Erro ao gerar banners', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [product, selectedImage, selectedFormats, style, primaryColor, secondaryColor, accentColor, ctaText, headline, subheadline, finalUrl, showFdaBadge, campaignSlug, allContrastsPass, toast]);

  function buildManifest(banner: DisplayBanner): string {
    const bucket = getLayoutBucket(banner.format.width, banner.format.height);
    return JSON.stringify({
      size: `${banner.format.width}x${banner.format.height}`,
      bucket,
      headline: headline.trim() || product.name,
      ctaText,
      campaignSlug: campaignSlug || product.id,
      weightKB: Number(banner.sizeKB.toFixed(2)),
      stylePreset: style,
      fdaBadge: showFdaBadge,
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  const handleDownload = async (banner: DisplayBanner) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(`Preparando ${banner.format.width}x${banner.format.height}...`);
      const bucket = getLayoutBucket(banner.format.width, banner.format.height);
      const zip = new JSZip();
      zip.file('index.html', banner.html);
      zip.file('manifest.json', buildManifest(banner));
      if (bucket !== 'SMALL') {
        const { blob: webpBlob } = await convertImageToWebP(selectedImage);
        zip.file('product.webp', webpBlob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `banner-${banner.format.width}x${banner.format.height}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download error:', err);
      toast({ title: 'Erro ao preparar ZIP', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsDownloading(true);
      setDownloadProgress('Convertendo imagem para WebP...');
      const { blob: webpBlob } = await convertImageToWebP(selectedImage);
      const zip = new JSZip();
      for (let i = 0; i < banners.length; i++) {
        const b = banners[i];
        setDownloadProgress(`Empacotando ${i + 1}/${banners.length}...`);
        const bucket = getLayoutBucket(b.format.width, b.format.height);
        const folder = zip.folder(`${b.format.width}x${b.format.height}`);
        if (folder) {
          folder.file('index.html', b.html);
          folder.file('manifest.json', buildManifest(b));
          if (bucket !== 'SMALL') folder.file('product.webp', webpBlob);
        }
      }
      setDownloadProgress('Gerando ZIP final...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `display-banners-${campaignSlug || 'all'}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: `${banners.length} banners empacotados em ZIP (WebP)` });
    } catch (err) {
      console.error('Download all error:', err);
      toast({ title: 'Erro ao gerar ZIP', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  // Campaign-readiness checklist
  const checklist = useMemo(() => {
    const totalKB = banners.reduce((s, b) => s + b.sizeKB, 0);
    const overweight = banners.filter(b => b.sizeKB > 150).length;
    return [
      { id: 'image', label: 'Foto do produto selecionada', passed: !!selectedImage, critical: true },
      { id: 'url', label: 'URL final definida (clickTag/UTM)', passed: !!finalUrl, critical: true },
      { id: 'contrast', label: `Contrastes WCAG AA: H ${contrastChecks.headline.ratio.toFixed(2)} / CTA ${contrastChecks.cta.ratio.toFixed(2)} / FDA ${contrastChecks.fda.ratio.toFixed(2)}`, passed: allContrastsPass, critical: true },
      { id: 'cta', label: 'Texto do CTA definido', passed: !!ctaText.trim(), critical: true },
      { id: 'campaign', label: 'Slug de campanha definido (UTM)', passed: !!campaignSlug.trim(), critical: false },
      { id: 'formats', label: `${selectedFormats.length} formato(s) selecionado(s)`, passed: selectedFormats.length > 0, critical: true },
      { id: 'banners', label: `${banners.length} banners gerados`, passed: banners.length > 0, critical: false },
      { id: 'weight', label: `Peso total: ${totalKB.toFixed(1)}KB (sem 150KB+)`, passed: banners.length > 0 && overweight === 0, critical: banners.length > 0 },
      { id: 'fda', label: showFdaBadge ? 'Badge FDA K260152 ativo' : 'Badge FDA opcional desativado', passed: true, critical: false },
      { id: 'tracking', label: 'IAB clickTag + GA4/GTM injetados', passed: banners.length > 0, critical: banners.length > 0 },
    ];
  }, [banners, selectedImage, finalUrl, contrastChecks, allContrastsPass, ctaText, campaignSlug, selectedFormats.length, showFdaBadge]);

  const categories = ['popular', 'horizontal', 'mobile', 'vertical', 'square'] as const;
  const categoryLabels: Record<string, string> = {
    popular: 'Populares', horizontal: 'Horizontal', mobile: 'Mobile', vertical: 'Vertical', square: 'Quadrado'
  };

  return (
    <div className="space-y-4">
      {/* Photo Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Foto do Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allImages.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === img.url ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img src={img.url} alt={img.alt || 'Produto'} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Nenhuma foto na galeria. Informe a URL:</p>
              <Input
                placeholder="https://... URL da imagem do produto"
                value={selectedImage}
                onChange={e => setSelectedImage(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy & Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" /> Copy, Estilo e Cores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Headline (opcional, sobrepõe IA)</Label>
              <Input value={headline} onChange={e => setHeadline(e.target.value)} className="h-8 text-xs mt-1" placeholder="Ex.: Resina Definitiva FDA Classe II" />
            </div>
            <div>
              <Label className="text-xs">Subheadline (opcional)</Label>
              <Input value={subheadline} onChange={e => setSubheadline(e.target.value)} className="h-8 text-xs mt-1" placeholder="Ex.: Restaurações duradouras com Bio Vitality" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DISPLAY_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => handleStylePresetChange(s.value as StylePreset)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  style === s.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.description}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Primária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Secundária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Destaque (CTA)</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Texto CTA</Label>
              <Input value={ctaText} onChange={e => setCtaText(e.target.value)} className="h-8 text-xs mt-1" placeholder="Saiba Mais" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleStylePresetChange(DEFAULT_STYLE)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline"
            >
              <RotateCcw className="h-3 w-3" /> Resetar para padrão SmartDent
            </button>
          </div>

          {/* WCAG AA — 3 contrastes derivados do preset */}
          <div className="rounded-md border bg-muted/30 p-2 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground mb-1">
              Contrastes WCAG AA (mín 4.5:1)
            </div>
            {(['headline', 'cta', 'fda'] as const).map(k => {
              const c = contrastChecks[k];
              return (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className={c.pass ? 'text-green-600' : 'text-destructive'}>{c.pass ? '✓' : '✗'}</span>
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span className={c.pass ? 'text-green-700 font-medium' : 'text-destructive font-bold'}>
                    {c.ratio.toFixed(2)}:1
                  </span>
                  {!c.pass && <span className="text-destructive text-[10px]">(mín 4.5:1)</span>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">URL Final (clickTag IAB)</Label>
              <Input value={finalUrl} onChange={e => setFinalUrl(e.target.value)} className="h-8 text-xs mt-1" placeholder="https://minhaloja.lojaintegrada.com.br/produto/..." />
            </div>
            <div>
              <Label className="text-xs">Slug de Campanha (UTM)</Label>
              <Input value={campaignSlug} onChange={e => setCampaignSlug(e.target.value)} className="h-8 text-xs mt-1" placeholder="bio_vitality_q2_2026" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch id="fda" checked={showFdaBadge} onCheckedChange={setShowFdaBadge} />
            <Label htmlFor="fda" className="text-xs cursor-pointer">Exibir badge FDA K260152 (Bio Vitality)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Format Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Formatos ({selectedFormats.length}/{DISPLAY_FORMATS.length})</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
              {selectedFormats.length === DISPLAY_FORMATS.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map(cat => {
            const catFormats = DISPLAY_FORMATS.filter(f => f.category === cat);
            const allCatSelected = catFormats.every(cf => selectedFormats.some(sf => sf.width === cf.width && sf.height === cf.height));
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1">
                  <Checkbox
                    checked={allCatSelected}
                    onCheckedChange={() => toggleCategory(cat)}
                    id={`cat-${cat}`}
                  />
                  <Label htmlFor={`cat-${cat}`} className="text-xs font-semibold cursor-pointer">
                    {categoryLabels[cat]}
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1 ml-6">
                  {catFormats.map(f => {
                    const isSelected = selectedFormats.some(sf => sf.width === f.width && sf.height === f.height);
                    return (
                      <Badge
                        key={`${f.width}x${f.height}`}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer text-[10px] transition-all"
                        onClick={() => toggleFormat(f)}
                      >
                        {f.width}×{f.height}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex flex-col items-center gap-1">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedImage || selectedFormats.length === 0 || !allContrastsPass}
          size="lg"
          className="gap-2"
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          Gerar {selectedFormats.length} Banners HTML5
        </Button>
        {!allContrastsPass && (
          <p className="text-xs text-destructive">
            Ajuste o preset até todos os contrastes passarem (≥ 4.5:1).
          </p>
        )}
      </div>

      {/* Campaign Readiness Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">✅ Pronto para Campanha — {checklist.filter(c => c.passed).length}/{checklist.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {checklist.map(item => (
              <li key={item.id} className="flex items-center gap-2 text-xs">
                {item.passed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  : item.critical
                    ? <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <span className={item.passed ? '' : item.critical ? 'text-destructive' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Banners Preview Grid */}
      {banners.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Banners Gerados ({banners.length})</CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleDownloadAll} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {isDownloading ? downloadProgress : 'Baixar Todos (ZIP WebP)'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {banners.map((b, i) => (
                <DisplayBannerPreview key={i} banner={b} onDownload={handleDownload} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
