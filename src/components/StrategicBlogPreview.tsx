import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { useProductBlogsIntegration } from "@/hooks/useProductBlogsIntegration";
import { supabase } from "@/integrations/supabase/client";

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
}

export function StrategicBlogPreview({
  dentalaData,
  eodontoData,
  approvedLandingPages,
  selectedProductIds = [],
  refreshKey = 0,
}: StrategicBlogPreviewProps) {
  const [previewDentalaHTML, setPreviewDentalaHTML] = useState("");
  const [previewEodontoHTML, setPreviewEodontoHTML] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { productBlogsForHTMLByDomain } = useProductBlogsIntegration(approvedLandingPages);

  // Debounce para regeneração automática
  const [debounceTick, setDebounceTick] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounceTick((prev) => prev + 1);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [refreshKey, dentalaData, eodontoData]);

  const generateConsolidatedHTML = useCallback(async (domain: 'dentala' | 'eodonto') => {
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

      console.log(`🔍 Gerando preview consolidado ${domain}:`, {
        strategicTitle: strategicBlog.title,
        productBlogsCount: productBlogs.length
      });

      // Consolidar: strategic blog PRIMEIRO, depois product blogs
      const allBlogs = [
        {
          title: strategicBlog.title || `Blog Estratégico ${domain}`,
          content: strategicBlog.content,
          keywords: Array.isArray(strategicBlog.keywords) 
            ? strategicBlog.keywords 
            : typeof strategicBlog.keywords === 'string' 
              ? [strategicBlog.keywords] 
              : [],
          type: 'strategic'
        },
        ...productBlogs.map(pb => ({
          title: pb.title,
          content: pb.content,
          keywords: [],
          type: pb.type,
          productName: pb.productName
        }))
      ];

      // Gerar HTML consolidado simples
      const blogsHTML = allBlogs.map((blog, index) => `
        <article style="margin-bottom: 60px; padding-bottom: 40px; ${index < allBlogs.length - 1 ? 'border-bottom: 2px solid #eee;' : ''}">
          <header style="margin-bottom: 24px;">
            <h2 style="font-size: 28px; color: #1a1a1a; margin-bottom: 12px; line-height: 1.3;">
              ${blog.title}
            </h2>
            ${blog.type === 'strategic' ? '<span style="display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Blog Estratégico</span>' : ''}
            ${blog.type === 'commercial' ? '<span style="display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Comercial</span>' : ''}
            ${blog.type === 'technical' ? '<span style="display: inline-block; background: #6366f1; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase;">Técnico</span>' : ''}
          </header>
          <div style="line-height: 1.8; color: #333;">
            ${blog.content}
          </div>
        </article>
      `).join('\n');

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strategicBlog.title || `Preview Consolidado ${domain}`}</title>
  <meta name="description" content="${strategicBlog.meta_description || ''}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f9fafb;
      padding: 0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 40px;
      border-bottom: 3px solid #3b82f6;
      margin-bottom: 60px;
    }
    .header h1 {
      font-size: 42px;
      color: #1a1a1a;
      margin-bottom: 16px;
      line-height: 1.2;
    }
    .header .meta {
      color: #666;
      font-size: 14px;
      margin-top: 12px;
    }
    .header .badge {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 16px;
    }
    h2 { font-size: 28px; color: #1a1a1a; margin: 32px 0 16px; }
    h3 { font-size: 22px; color: #333; margin: 24px 0 12px; }
    p { margin-bottom: 16px; }
    ul, ol { margin: 16px 0 16px 24px; }
    li { margin-bottom: 8px; }
    strong { color: #1a1a1a; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer {
      margin-top: 80px;
      padding-top: 40px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${strategicBlog.title || `Preview Consolidado ${domain}`}</h1>
      <div class="meta">
        ${strategicBlog.meta_description || ''}
      </div>
      <div class="badge">${domain.toUpperCase()}.COM.BR</div>
      <div class="meta" style="margin-top: 20px;">
        📝 ${allBlogs.length} artigo${allBlogs.length > 1 ? 's' : ''} consolidado${allBlogs.length > 1 ? 's' : ''}
        ${productBlogs.length > 0 ? ` • ${productBlogs.length} produto${productBlogs.length > 1 ? 's' : ''}` : ''}
      </div>
    </div>

    ${blogsHTML}

    <div class="footer">
      <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <p style="margin-top: 8px;">Preview Consolidado • ${domain.toUpperCase()}</p>
    </div>
  </div>
</body>
</html>`;

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
  }, [dentalaData, eodontoData, productBlogsForHTMLByDomain]);

  const doGenerateAll = useCallback(async () => {
    try {
      setIsGenerating(true);
      
      const [dentalaHTML, eodontoHTML] = await Promise.all([
        generateConsolidatedHTML('dentala'),
        generateConsolidatedHTML('eodonto')
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
  }, [generateConsolidatedHTML]);

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
