import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, FileText, Globe, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DualBlogGeneratorProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
}

interface BlogVersion {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
}

interface DualBlogVersions {
  dentala: BlogVersion;
  eodonto: BlogVersion;
}

export function DualBlogGenerator({ landingPageId, landingPageData, selectedProductIds }: DualBlogGeneratorProps) {
  const [blogVersions, setBlogVersions] = useState<DualBlogVersions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateDualVersions = async () => {
    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando versões duplas do blog para:", landingPageId);

      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          type: 'dual_blog_versions',
          landingPageId,
          landingPage: landingPageData,
          selectedProductIds: selectedProductIds || [],
          include_offers: true
        }
      });

      if (error) throw error;

      if (data?.success && data?.content) {
        setBlogVersions(data.content);
        console.log("✅ Versões duplas geradas com sucesso");
        
        toast({
          title: "Versões Geradas!",
          description: "Blogs para Dentala e Eodonto criados com sucesso",
        });
      } else {
        throw new Error("Erro na geração das versões");
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar versões duplas:", err);
      setError(err.message || "Erro ao gerar versões dos blogs");
      
      toast({
        title: "Erro na Geração",
        description: err.message || "Erro ao gerar versões dos blogs",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateCompleteHTML = (version: BlogVersion, domain: string) => {
    const domainConfig = {
      dentala: {
        title: "Dentala - Tecnologia Odontológica Avançada",
        description: "Soluções técnicas para profissionais da odontologia",
        color: "#0066cc",
        logo: "https://dentala.com/logo.png"
      },
      eodonto: {
        title: "Eodonto - Soluções para Laboratórios de Prótese",
        description: "Equipamentos e materiais para laboratórios odontológicos",
        color: "#00aa44",
        logo: "https://eodonto.com/logo.png"
      }
    };

    const config = domainConfig[domain as keyof typeof domainConfig];

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${version.title} | ${config.title}</title>
    <meta name="description" content="${version.metaDescription}">
    <meta name="keywords" content="${version.keywords.join(', ')}">
    <meta name="robots" content="index, follow">
    <meta property="og:title" content="${version.title}">
    <meta property="og:description" content="${version.metaDescription}">
    <meta property="og:type" content="article">
    <link rel="canonical" href="https://${domain}.com/blog/${landingPageId}">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 3px solid ${config.color}; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: ${config.color}; margin-bottom: 10px; }
        .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
        .content { text-align: justify; }
        .keywords { margin-top: 30px; }
        .keyword-tag { background: ${config.color}; color: white; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
        img { max-width: 100%; height: auto; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="title">${version.title}</h1>
            <div class="meta">
                <strong>${config.title}</strong> | ${config.description}
            </div>
        </header>
        
        <main class="content">
            ${version.content}
        </main>
        
        <footer class="keywords">
            <h4>Tags relacionadas:</h4>
            ${version.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
        </footer>
    </div>
</body>
</html>`;
  };

  const copyToClipboard = async (version: BlogVersion, domain: string) => {
    const html = generateCompleteHTML(version, domain);
    
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML Copiado!",
        description: `Versão ${domain.toUpperCase()} copiada para área de transferência`,
      });
    } catch (err) {
      toast({
        title: "Erro ao Copiar",
        description: "Não foi possível copiar o HTML",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>HTML Blogs Copy & Paste</CardTitle>
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <Button 
            onClick={generateDualVersions}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Gerar 2 Versões
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">❌ {error}</p>
          </div>
        )}

        {!blogVersions && !generating && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="flex justify-center gap-4 mb-4">
              <Building2 className="h-8 w-8 text-blue-500" />
              <Globe className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm mb-2">Gere versões personalizadas para cada domínio</p>
            <p className="text-xs text-gray-500">
              • Dentala.com (foco técnico) • Eodonto.com (foco comercial)
            </p>
          </div>
        )}

        {blogVersions && (
          <Tabs defaultValue="dentala" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dentala" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dentala.com
                <Badge variant="outline" className="text-xs">Técnico</Badge>
              </TabsTrigger>
              <TabsTrigger value="eodonto" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Eodonto.com
                <Badge variant="outline" className="text-xs">Comercial</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dentala" className="space-y-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{blogVersions.dentala.title}</h3>
                  <Button 
                    onClick={() => copyToClipboard(blogVersions.dentala, 'dentala')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar HTML
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {blogVersions.dentala.metaDescription}
                </p>
                
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="text-sm text-gray-700 line-clamp-4"
                    dangerouslySetInnerHTML={{ 
                      __html: blogVersions.dentala.content.substring(0, 300) + '...'
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {blogVersions.dentala.keywords.slice(0, 8).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eodonto" className="space-y-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{blogVersions.eodonto.title}</h3>
                  <Button 
                    onClick={() => copyToClipboard(blogVersions.eodonto, 'eodonto')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar HTML
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {blogVersions.eodonto.metaDescription}
                </p>
                
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="text-sm text-gray-700 line-clamp-4"
                    dangerouslySetInnerHTML={{ 
                      __html: blogVersions.eodonto.content.substring(0, 300) + '...'
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {blogVersions.eodonto.keywords.slice(0, 8).map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}