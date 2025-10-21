import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Copy, ExternalLink, Monitor, Tablet, Smartphone } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useProductBlogsIntegration } from "@/hooks/useProductBlogsIntegration";
import { generateBlogHTML } from "@/services/seo/blogHTMLGenerator";

interface BlogData {
  title?: string;
  content?: string;
  meta_description?: string;
  keywords?: string[] | string;
  [key: string]: any;
}

interface ConsolidatedHTML {
  dentala: string;
  eodonto: string;
  generatedAt: string;
  productBlogsCount: { dentala: number; eodonto: number };
  strategicBlogTitle: { dentala: string; eodonto: string };
}

interface StrategicBlogPreviewProps {
  dentalaData: BlogData | null;
  eodontoData: BlogData | null;
  approvedLandingPages: any[];
  selectedProductIds?: string[];
  refreshKey?: number;
  landingPageId: string;
  consolidatedHTMLs?: { [landingPageId: string]: ConsolidatedHTML };
}

export function StrategicBlogPreview({
  dentalaData,
  eodontoData,
  approvedLandingPages,
  selectedProductIds = [],
  refreshKey = 0,
  landingPageId,
  consolidatedHTMLs,
}: StrategicBlogPreviewProps) {
  const [previewDentalaHTML, setPreviewDentalaHTML] = useState("");
  const [previewEodontoHTML, setPreviewEodontoHTML] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const DEVICE_SIZES = {
    desktop: { width: '100%', height: '800px', scale: 1 },
    tablet: { width: '768px', height: '1024px', scale: 0.8 },
    mobile: { width: '375px', height: '667px', scale: 0.6 }
  };

  console.log('📊 StrategicBlogPreview props:', { 
    selectedProductIds, 
    refreshKey, 
    landingPageId 
  });

  const { productBlogsForHTMLByDomain } = useProductBlogsIntegration(approvedLandingPages);

  // Usar HTML pré-gerado se disponível
  const cachedHTML = consolidatedHTMLs?.[landingPageId];

  // Debounce para regeneração automática
  const [debounceTick, setDebounceTick] = useState(0);

  const generateHTML = useCallback(async (domain: 'dentala' | 'eodonto') => {
    try {
      const strategicBlog = domain === 'dentala' ? dentalaData : eodontoData;
      
      if (!strategicBlog?.content) {
        return `<!DOCTYPE html>
          <html lang="pt-BR">
          <head><meta charset="UTF-8"><title>Preview vazio</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center; color: #666;">
            <p>Nenhum blog estratégico ${domain} disponível.</p>
            <p>Gere o blog estratégico primeiro.</p>
          </body>
          </html>`;
      }

      // Buscar blogs de produtos APENAS desta landing page
      const productBlogs = productBlogsForHTMLByDomain(domain, landingPageId);
      
      // Se há produtos selecionados, filtrar apenas esses
      const filteredBlogs = selectedProductIds.length > 0
        ? productBlogs.filter(blog => selectedProductIds.includes(blog.productId))
        : productBlogs;
      
      // Agregar keywords do blog estratégico
      const strategicKeywords = Array.isArray(strategicBlog.keywords) 
        ? strategicBlog.keywords 
        : (typeof strategicBlog.keywords === 'string' 
          ? [strategicBlog.keywords] 
          : []);

      // Agregar keywords dos produtos
      const allKeywords = [
        ...strategicKeywords,
        ...filteredBlogs.flatMap(b => b.keywords || [])
      ];

      // Remove duplicatas
      const uniqueKeywords = [...new Set(allKeywords)];
      
      // Buscar dados dos produtos selecionados para incluir image_url
      const supabase = (await import('@/integrations/supabase/client')).supabase;
      const { data: selectedProductsData } = await supabase
        .from('products_repository')
        .select('id, name, image_url, product_url')
        .in('id', selectedProductIds)
        .eq('approved', true);

      console.log(`🔍 Gerando preview consolidado ${domain}:`, {
        strategicTitle: strategicBlog.title,
        totalProductBlogs: productBlogs.length,
        filteredProductBlogs: filteredBlogs.length,
        selectedProductIds: selectedProductIds.length,
        hasStrategicBlog: !!strategicBlog?.content,
        includedProducts: filteredBlogs.map(b => b.productName)
      });

      // ✅ Usar o novo pipeline blogHTMLGenerator
      const html = await generateBlogHTML({
        blogs: [
          {
            title: strategicBlog.title || `Blog Estratégico ${domain}`,
            content: strategicBlog.content || '',
            meta_description: strategicBlog.meta_description,
            keywords: strategicKeywords,
          },
          ...filteredBlogs.map(pb => ({
            title: pb.title,
            content: pb.content,
            keywords: pb.keywords || [],
          }))
        ],
        domain: domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com.br',
        canonicalUrl: '',
        finalTitle: strategicBlog.title || `Blog Consolidado ${domain}`,
        finalDescription: strategicBlog.meta_description || '',
        selectedProducts: selectedProductsData || [],
        keywords: uniqueKeywords,
        preview: true,
        validateSchema: false,
        excludeFooter: true,
      });

      return html;
    } catch (error) {
      console.error(`Erro ao gerar HTML consolidado ${domain}:`, error);
      return `<!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><title>Erro</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center; color: #ef4444;">
          <h1>Erro ao gerar preview</h1>
          <p>${error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </body>
        </html>`;
    }
  }, [dentalaData, eodontoData, productBlogsForHTMLByDomain, landingPageId, selectedProductIds]);

  const doGenerateAll = useCallback(async () => {
    try {
      setIsGenerating(true);
      
      const [dentalaHTML, eodontoHTML] = await Promise.all([
        generateHTML('dentala'),
        generateHTML('eodonto')
      ]);

      setPreviewDentalaHTML(dentalaHTML);
      setPreviewEodontoHTML(eodontoHTML);
      
      // ✅ Apenas exibir toast se for ação manual do usuário
      if (showSuccessToast) {
        toast({ 
          title: "✅ Previews atualizados",
          description: "Previews consolidados gerados com sucesso"
        });
        setShowSuccessToast(false);
      }
    } catch (err: any) {
      console.error("Erro ao gerar previews:", err);
      toast({
        title: "Erro ao gerar previews",
        description: err?.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [generateHTML, showSuccessToast]);

  // Usar HTML pré-gerado ou gerar on-demand
  useEffect(() => {
    if (cachedHTML) {
      console.log('✅ Usando HTML pré-gerado do cache para LP:', landingPageId);
      setPreviewDentalaHTML(cachedHTML.dentala);
      setPreviewEodontoHTML(cachedHTML.eodonto);
      setIsGenerating(false);
    } else {
      // Fallback: gerar manualmente se não houver cache
      const timer = setTimeout(() => {
        setDebounceTick(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [cachedHTML, refreshKey, dentalaData, eodontoData, landingPageId]);

  // Trigger inicial (apenas se não houver cache)
  useEffect(() => {
    if (debounceTick > 0 && !cachedHTML) {
      doGenerateAll();
    }
  }, [debounceTick, cachedHTML, doGenerateAll]);

  const copyHTML = async (html: string, domain: string) => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    toast({ 
      title: "✅ HTML copiado",
      description: `HTML consolidado ${domain.toUpperCase()} copiado para a área de transferência`
    });
  };

  const openNewTab = (html: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html || "<!doctype html><title>Preview</title>");
      w.document.close();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">
              📰 Preview Consolidado (Blog Estratégico + Produtos)
            </h3>
            {cachedHTML && (
              <Badge variant="outline" className="ml-2">
                Auto-atualizado
              </Badge>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {cachedHTML && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mr-4">
                <Badge variant="secondary">
                  📘 Dentala: 1 estratégico + {cachedHTML.productBlogsCount.dentala} técnicos
                </Badge>
                <Badge variant="secondary">
                  📗 Eodonto: 1 estratégico + {cachedHTML.productBlogsCount.eodonto} comerciais
                </Badge>
              </div>
            )}

            <ToggleGroup type="single" value={deviceMode} onValueChange={(v) => v && setDeviceMode(v as any)}>
              <ToggleGroupItem value="desktop" aria-label="Desktop">
                <Monitor className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="tablet" aria-label="Tablet">
                <Tablet className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="mobile" aria-label="Mobile">
                <Smartphone className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              onClick={() => {
                setShowSuccessToast(true);
                doGenerateAll();
              }} 
              disabled={isGenerating} 
              size="sm" 
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Preview
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          📌 Mostrando apenas produtos desta landing page
          {selectedProductIds.length > 0 && (
            <span className="ml-2">🎯 Filtrado por seleção: {selectedProductIds.length} produto{selectedProductIds.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-260px)]">
        {/* DENTALA */}
        <div className="border rounded-lg overflow-hidden bg-white flex flex-col">
          <div className="p-2 bg-blue-50 border-b text-sm flex items-center justify-between">
            <span className="font-semibold">🟦 Dentala.com.br — Consolidado</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => openNewTab(previewDentalaHTML)}
                disabled={!previewDentalaHTML}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyHTML(previewDentalaHTML, 'dentala')}
                disabled={!previewDentalaHTML}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex justify-center items-start" style={{
            transform: `scale(${DEVICE_SIZES[deviceMode].scale})`,
            transformOrigin: 'top center'
          }}>
            {previewDentalaHTML ? (
              <iframe
                title="Dentala Preview Consolidado"
                srcDoc={previewDentalaHTML}
                style={{
                  width: DEVICE_SIZES[deviceMode].width,
                  height: DEVICE_SIZES[deviceMode].height,
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: deviceMode !== 'desktop' ? '0 10px 40px rgba(0,0,0,0.1)' : 'none'
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Gerando preview...
              </div>
            )}
          </div>
        </div>

        {/* EODONTO */}
        <div className="border rounded-lg overflow-hidden bg-white flex flex-col">
          <div className="p-2 bg-pink-50 border-b text-sm flex items-center justify-between">
            <span className="font-semibold">🟪 Eodonto.com.br — Consolidado</span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => openNewTab(previewEodontoHTML)}
                disabled={!previewEodontoHTML}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyHTML(previewEodontoHTML, 'eodonto')}
                disabled={!previewEodontoHTML}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex justify-center items-start" style={{
            transform: `scale(${DEVICE_SIZES[deviceMode].scale})`,
            transformOrigin: 'top center'
          }}>
            {previewEodontoHTML ? (
              <iframe
                title="Eodonto Preview Consolidado"
                srcDoc={previewEodontoHTML}
                style={{
                  width: DEVICE_SIZES[deviceMode].width,
                  height: DEVICE_SIZES[deviceMode].height,
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: deviceMode !== 'desktop' ? '0 10px 40px rgba(0,0,0,0.1)' : 'none'
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Gerando preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
