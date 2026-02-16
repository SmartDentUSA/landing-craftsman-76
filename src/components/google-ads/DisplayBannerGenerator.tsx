import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, Image as ImageIcon, Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DisplayBanner, DisplayFormat, DisplayStyle } from '@/types/google-ads';
import { DISPLAY_FORMATS, DISPLAY_STYLES, generateBannerHTML } from './display-templates';
import { DisplayBannerPreview } from './DisplayBannerPreview';

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

export function DisplayBannerGenerator({ product }: DisplayBannerGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [banners, setBanners] = useState<DisplayBanner[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<DisplayFormat[]>(
    DISPLAY_FORMATS.filter(f => ['popular', 'mobile'].includes(f.category))
  );
  const [style, setStyle] = useState<DisplayStyle>('modern');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#7c3aed');
  const [ctaText, setCtaText] = useState('Saiba Mais');
  const [selectedImage, setSelectedImage] = useState(product.image_url || '');

  const allImages = [
    ...(product.image_url ? [{ url: product.image_url, alt: 'Principal' }] : []),
    ...(product.images_gallery || []),
  ].filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);

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

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-display-banners', {
        body: {
          productId: product.id,
          productName: product.name,
          productDescription: product.description || '',
          productImageUrl: selectedImage,
          primaryColor,
          secondaryColor,
          ctaText,
          style,
          formats: selectedFormats,
          finalUrl: product.product_url || '#',
        }
      });

      if (error) throw error;

      if (data?.banners) {
        setBanners(data.banners);
        toast({ title: `${data.banners.length} banners gerados com sucesso!` });
      } else {
        // Fallback: generate locally without AI copy
        const localBanners: DisplayBanner[] = selectedFormats.map(format => {
          const html = generateBannerHTML({
            width: format.width,
            height: format.height,
            style,
            primaryColor,
            secondaryColor,
            headline: product.name,
            description: product.description?.substring(0, 80) || '',
            ctaText,
            productImageUrl: selectedImage,
            finalUrl: product.product_url || '#',
          });
          return { format, html, sizeKB: new Blob([html]).size / 1024 };
        });
        setBanners(localBanners);
        toast({ title: `${localBanners.length} banners gerados (modo local)` });
      }
    } catch (err) {
      console.error('Error generating banners:', err);
      // Fallback local
      const localBanners: DisplayBanner[] = selectedFormats.map(format => {
        const html = generateBannerHTML({
          width: format.width,
          height: format.height,
          style,
          primaryColor,
          secondaryColor,
          headline: product.name,
          description: product.description?.substring(0, 80) || '',
          ctaText,
          productImageUrl: selectedImage,
          finalUrl: product.product_url || '#',
        });
        return { format, html, sizeKB: new Blob([html]).size / 1024 };
      });
      setBanners(localBanners);
      toast({ title: `${localBanners.length} banners gerados (fallback local)` });
    } finally {
      setIsGenerating(false);
    }
  }, [product, selectedImage, selectedFormats, style, primaryColor, secondaryColor, ctaText, toast]);

  const handleDownload = (banner: DisplayBanner) => {
    const blob = new Blob([banner.html], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `banner-${banner.format.width}x${banner.format.height}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadAll = () => {
    banners.forEach(b => handleDownload(b));
    toast({ title: `${banners.length} arquivos baixados` });
  };

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

      {/* Style & Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" /> Estilo e Cores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DISPLAY_STYLES.map(s => (
              <button
                key={s.value}
                onClick={() => setStyle(s.value)}
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
              <Label className="text-xs">Cor Primária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor Secundária</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Texto do CTA</Label>
              <Input value={ctaText} onChange={e => setCtaText(e.target.value)} className="h-8 text-xs mt-1" placeholder="Saiba Mais" />
            </div>
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
      <div className="flex justify-center">
        <Button onClick={handleGenerate} disabled={isGenerating || !selectedImage || selectedFormats.length === 0} size="lg" className="gap-2">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          Gerar {selectedFormats.length} Banners HTML5
        </Button>
      </div>

      {/* Banners Preview Grid */}
      {banners.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Banners Gerados ({banners.length})</CardTitle>
              <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleDownloadAll}>
                <Download className="h-3 w-3" /> Baixar Todos
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
