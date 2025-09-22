import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, FileText, Globe, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processContentWithIntelligentLinks } from "@/lib/intelligent-links";

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
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const domainUrl = domain === 'dentala' ? 'https://dentala.com.br' : 'https://eodonto.com.br';
    const domainName = domain === 'dentala' ? 'Dentala' : 'Eodonto';

    // Get intelligent links from landing page data
    const intelligentLinks = landingPageData?.seo?.intelligent_links || {};
    
    // Process content with intelligent links
    const processedContent = processContentWithIntelligentLinks(version.content, intelligentLinks);

    return `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${version.title}</title>
    
    <meta name="description" content="${version.metaDescription}">
    <meta name="keywords" content="${version.keywords.join(', ')}">
    <link rel="canonical" href="${domainUrl}/blog">
    
    <meta property="og:title" content="${version.title}">
    <meta property="og:description" content="${version.metaDescription}">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --light-gray: #e9ecef;
            --dark-gray: #495057;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        a { text-decoration: none; color: var(--primary-color); }
        a:hover { text-decoration: underline; }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        img { max-width: 100%; height: auto; display: block; }
        
        /* Main Content Grid */
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        
        /* Featured Post Styles */
        .featured-post {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .featured-post-content {
            padding: 2rem;
        }
        .featured-post-content h1 {
            margin-top: 0;
            font-size: 2rem;
            line-height: 1.3;
        }
        .post-meta {
            color: var(--secondary-color);
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
        .post-description {
            font-size: 1.1rem;
            color: var(--dark-gray);
            margin-bottom: 1.5rem;
        }
        .post-content {
            line-height: 1.8;
            font-size: 1rem;
        }
        .post-content h2, .post-content h3 {
            color: var(--primary-color);
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        .post-content p {
            margin-bottom: 1.2rem;
        }
        .post-content ul, .post-content ol {
            margin-bottom: 1.2rem;
            padding-left: 2rem;
        }
        .post-content li {
            margin-bottom: 0.5rem;
        }
        
        /* Intelligent Links Styling */
        .post-content a[href] {
            color: var(--primary-color);
            text-decoration: underline;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        .post-content a[href]:hover {
            color: #2563eb;
            text-decoration: none;
        }
        
        @media (min-width: 768px) {
            .featured-post-content {
                padding: 3rem;
            }
            .featured-post-content h1 {
                font-size: 2.5rem;
            }
        }
    </style>
</head>
<body>
    <main class="container main-content">
        <article class="featured-post">
            <div class="featured-post-content">
                <p class="post-meta">${domainName} | ${currentDate}</p>
                <h1>${version.title}</h1>
                <p class="post-description">${version.metaDescription}</p>
                <div class="post-content">
                    ${processedContent}
                </div>
            </div>
        </article>
    </main>
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