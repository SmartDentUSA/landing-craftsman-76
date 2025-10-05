import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { useProductBlogsIntegration } from "@/hooks/useProductBlogsIntegration";
import { useSEOHTMLGenerator } from "@/hooks/useSEOHTMLGenerator";
import { getLatestSEOContext } from "@/services/seoContextStore";

interface BlogData {
  title?: string;
  content?: string;
  meta_description?: string;
  keywords?: string[] | string;
  [key: string]: any;
}

interface StrategicBlogPreviewProps {
  dentalaData: BlogData | null;
  eodontoData: BlogData | null;
  approvedLandingPages: any[];
  selectedProductIds?: string[];
  refreshKey?: number;
  landingPageId: string;
}

export function StrategicBlogPreview({
  dentalaData,
  eodontoData,
  approvedLandingPages,
  selectedProductIds = [],
  refreshKey = 0,
  landingPageId,
}: StrategicBlogPreviewProps) {
  const [previewDentalaHTML, setPreviewDentalaHTML] = useState("");
  const [previewEodontoHTML, setPreviewEodontoHTML] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { productBlogsForHTMLByDomain } = useProductBlogsIntegration(approvedLandingPages);
  const { generateConsolidatedBlogHTML } = useSEOHTMLGenerator();

  // Debounce para regeneração automática
  const [debounceTick, setDebounceTick] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceTick((prev) => prev + 1);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [refreshKey, dentalaData, eodontoData]);

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

      // Buscar blogs de produtos para o domínio
      const productBlogs = productBlogsForHTMLByDomain(domain);
      
      // Buscar SEO Context do Supabase
      const seoContext = await getLatestSEOContext(landingPageId);

      console.log(`🔍 Gerando preview consolidado ${domain}:`, {
        strategicTitle: strategicBlog.title,
        productBlogsCount: productBlogs.length,
        hasSEOContext: !!seoContext
      });

      // Usar generateConsolidatedBlogHTML do hook robusto
      const html = await generateConsolidatedBlogHTML({
        title: strategicBlog.title || `Blog Consolidado ${domain}`,
        description: strategicBlog.meta_description || '',
        domain: domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com.br',
        blogs: [
          ...(seoContext ? [{
            title: 'Blog Estratégico',
            content: seoContext.baseTextMarkdown || '',
            keywords: seoContext.aiKeywords?.map(k => k.term) || [],
          }] : []),
          ...productBlogs.map(pb => ({
            title: pb.title,
            content: pb.content,
            productName: pb.productName,
            keywords: [],
          }))
        ],
        landingPageIdForSEOContext: landingPageId,
        preview: true,
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
  }, [dentalaData, eodontoData, productBlogsForHTMLByDomain, landingPageId, generateConsolidatedBlogHTML]);

  const doGenerateAll = useCallback(async () => {
    try {
      setIsGenerating(true);
      
      const [dentalaHTML, eodontoHTML] = await Promise.all([
        generateHTML('dentala'),
        generateHTML('eodonto')
      ]);

      setPreviewDentalaHTML(dentalaHTML);
      setPreviewEodontoHTML(eodontoHTML);
      
      toast({ 
        title: "✅ Previews atualizados",
        description: "Previews consolidados gerados com sucesso"
      });
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
  }, [generateHTML]);

  // Gera ao montar e quando debounceTick muda
  useEffect(() => {
    doGenerateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceTick]);

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
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          📰 Preview Consolidado (Blog Estratégico + Produtos)
        </h3>
        <Button onClick={doGenerateAll} disabled={isGenerating} size="sm" variant="outline">
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
          <div className="flex-1 overflow-hidden">
            {previewDentalaHTML ? (
              <iframe
                title="Dentala Preview Consolidado"
                srcDoc={previewDentalaHTML}
                className="w-full h-full border-0"
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
          <div className="flex-1 overflow-hidden">
            {previewEodontoHTML ? (
              <iframe
                title="Eodonto Preview Consolidado"
                srcDoc={previewEodontoHTML}
                className="w-full h-full border-0"
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
