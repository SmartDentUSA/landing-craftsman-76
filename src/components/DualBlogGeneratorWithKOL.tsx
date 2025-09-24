import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Copy, FileText, Globe, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processContentWithIntelligentLinks } from "@/lib/intelligent-links";
import useLandingPages from "@/hooks/useLandingPages";
import { useKOLs } from "@/hooks/useKOLs";

interface DualBlogGeneratorProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
}

interface BlogVersion {
  title: string;
  content: string;
  metaDescription?: string;
  meta_description?: string;
  keywords: string[];
}

interface DualBlogVersions {
  dentala: BlogVersion;
  eodonto: BlogVersion;
}

export function DualBlogGeneratorWithKOL({ landingPageId, landingPageData, selectedProductIds }: DualBlogGeneratorProps) {
  const [blogVersions, setBlogVersions] = useState<DualBlogVersions | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("none");
  
  const { toast } = useToast();
  const { markBlogGenerated } = useLandingPages();
  const { kols, loading: kolsLoading } = useKOLs(true); // Only approved KOLs

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
          contentData: landingPageData, // For compatibility with Edge Function
          selectedProductIds: selectedProductIds || [],
          include_offers: true
        }
      });

      if (error) throw error;

      console.log("🔍 DualBlogGeneratorWithKOL - Resposta da AI:", data);
      
      if (data?.success && data?.content) {
        console.log("✅ DualBlogGeneratorWithKOL - Conteúdo encontrado:", data.content);
        setBlogVersions(data.content);
        await saveBlogVersions(data.content);
        markBlogGenerated(landingPageId);
        
        toast({
          title: "Sucesso!",
          description: "Versões do blog geradas com sucesso para ambos os domínios",
        });
      }
    } catch (error) {
      console.error("❌ Erro ao gerar versões:", error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(`Erro ao gerar conteúdo: ${errorMessage}`);
      toast({
        title: "Erro",
        description: `Falha ao gerar as versões do blog: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveBlogVersions = async (versions: DualBlogVersions) => {
    try {
      // Check if Dentala version exists
      const { data: existingDentala } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', ['dentala.com.br'])
        .single();

      const dentalaData = {
        landing_page_id: landingPageId,
        title: versions.dentala.title,
        content: versions.dentala.content,
        meta_description: versions.dentala.meta_description || versions.dentala.metaDescription || '',
        keywords: versions.dentala.keywords,
        published_domains: ['dentala.com.br'],
        status: 'generated',
        author_kol_id: selectedAuthorId === "none" ? null : selectedAuthorId
      };

      let dentalaError;
      if (existingDentala) {
        ({ error: dentalaError } = await supabase
          .from('blog_posts')
          .update(dentalaData)
          .eq('id', existingDentala.id));
      } else {
        ({ error: dentalaError } = await supabase
          .from('blog_posts')
          .insert(dentalaData));
      }

      if (dentalaError) throw dentalaError;

      // Check if Eodonto version exists
      const { data: existingEodonto } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', ['eodonto.com'])
        .single();

      const eodontoData = {
        landing_page_id: landingPageId,
        title: versions.eodonto.title,
        content: versions.eodonto.content,
        meta_description: versions.eodonto.meta_description || versions.eodonto.metaDescription || '',
        keywords: versions.eodonto.keywords,
        published_domains: ['eodonto.com'],
        status: 'generated',
        author_kol_id: selectedAuthorId === "none" ? null : selectedAuthorId
      };

      let eodontoError;
      if (existingEodonto) {
        ({ error: eodontoError } = await supabase
          .from('blog_posts')
          .update(eodontoData)
          .eq('id', existingEodonto.id));
      } else {
        ({ error: eodontoError } = await supabase
          .from('blog_posts')
          .insert(eodontoData));
      }

      if (eodontoError) throw eodontoError;
    } catch (error) {
      console.error('Error saving blog versions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao salvar';
      toast({
        title: "Erro ao salvar",
        description: `Erro ao salvar as versões do blog: ${errorMessage}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const normalizeUrl = (url: string, platform?: 'instagram' | 'youtube') => {
    if (!url) return '';
    
    // Handle Instagram specific formats
    if (platform === 'instagram') {
      if (url.startsWith('@')) {
        return `https://instagram.com/${url.substring(1)}`;
      }
      if (url.includes('instagram.com')) {
        return url.startsWith('http') ? url : `https://${url}`;
      }
      if (!url.includes('.')) {
        return `https://instagram.com/${url}`;
      }
    }
    
    // Handle YouTube specific formats
    if (platform === 'youtube') {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return url.startsWith('http') ? url : `https://${url}`;
      }
      if (!url.includes('.')) {
        return `https://youtube.com/c/${url}`;
      }
    }
    
    // Default URL normalization
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const generateCompleteHTML = async (blogVersion: BlogVersion, domain: string) => {
    const processedContent = processContentWithIntelligentLinks(blogVersion.content);
    
    // Get author information if selected
    let authorSection = '';
    if (selectedAuthorId && selectedAuthorId !== "none") {
      try {
        const { data: author } = await supabase
          .from('key_opinion_leaders')
          .select('*')
          .eq('id', selectedAuthorId)
          .single();
          
        if (author) {
          authorSection = `
            <div class="author-section" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
              <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                ${author.photo_url ? `<img src="${author.photo_url}" alt="${author.full_name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` : ''}
                <div>
                  <h4 style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${author.full_name}</h4>
                  ${author.specialty ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${author.specialty}</p>` : ''}
                </div>
              </div>
              ${author.mini_cv ? `<p style="margin: 0 0 15px 0; color: #555; font-size: 14px; line-height: 1.5;">${author.mini_cv}</p>` : ''}
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${author.lattes_url ? `<a href="${normalizeUrl(author.lattes_url)}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">Currículo Lattes</a>` : ''}
                ${author.website_url ? `<a href="${normalizeUrl(author.website_url)}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">Website</a>` : ''}
                ${author.instagram_url ? `<a href="${normalizeUrl(author.instagram_url, 'instagram')}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; background: #e4405f; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">Instagram</a>` : ''}
                ${author.youtube_url ? `<a href="${normalizeUrl(author.youtube_url, 'youtube')}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; background: #ff0000; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">YouTube</a>` : ''}
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error('Error fetching author:', error);
      }
    }

    return `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${blogVersion.title}</title>
      <meta name="description" content="${blogVersion.metaDescription}">
      <meta name="keywords" content="${blogVersion.keywords.join(', ')}">
      <meta property="og:title" content="${blogVersion.title}">
      <meta property="og:description" content="${blogVersion.metaDescription}">
      <meta property="og:type" content="article">
      <meta property="og:url" content="https://${domain}">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${blogVersion.title}">
      <meta name="twitter:description" content="${blogVersion.metaDescription}">
      <link rel="canonical" href="https://${domain}">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        .container { max-width: 100%; }
        p { margin-bottom: 15px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <article>
          <h1>${blogVersion.title}</h1>
          ${processedContent}
          ${authorSection}
        </article>
      </div>
    </body>
    </html>`;
  };

  const copyToClipboard = async (domain: 'dentala' | 'eodonto') => {
    if (!blogVersions) return;
    
    const blogVersion = blogVersions[domain];
    const domainName = domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com';
    const html = await generateCompleteHTML(blogVersion, domainName);
    
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "Copiado!",
        description: `HTML do blog ${domain} copiado para a área de transferência`,
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erro",
        description: "Falha ao copiar HTML para a área de transferência",
        variant: "destructive",
      });
    }
  };

  const selectedAuthor = kols.find(kol => kol.id === selectedAuthorId && selectedAuthorId !== "none");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Gerador de Blog Duplo</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Author Selection */}
          <div className="space-y-2">
            <Label htmlFor="author-select">Selecionar Autor (Opcional)</Label>
            <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um especialista..." />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-md z-50">
                <SelectItem value="none">Sem autor</SelectItem>
                {kols.map((kol) => (
                  <SelectItem key={kol.id} value={kol.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={kol.photo_url} alt={kol.full_name} />
                        <AvatarFallback>{kol.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{kol.full_name}</span>
                      {kol.specialty && (
                        <span className="text-muted-foreground">- {kol.specialty}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAuthor && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedAuthor.photo_url} alt={selectedAuthor.full_name} />
                    <AvatarFallback>{selectedAuthor.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAuthor.full_name}</p>
                    {selectedAuthor.specialty && (
                      <p className="text-sm text-muted-foreground">{selectedAuthor.specialty}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={generateDualVersions} 
            disabled={generating || kolsLoading}
            className="w-full"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Gerando versões...
              </>
            ) : (
              'Gerar Versões para Dentala e Eodonto'
            )}
          </Button>

          {error && (
            <div className="text-red-600 text-sm p-3 bg-red-50 rounded-lg">
              Erro: {error}
            </div>
          )}

          {blogVersions && (
            <Tabs defaultValue="dentala" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dentala" className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Dentala</span>
                </TabsTrigger>
                <TabsTrigger value="eodonto" className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4" />
                  <span>Eodonto</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dentala" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Versão Dentala</h3>
                    <Button 
                      onClick={() => copyToClipboard('dentala')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar HTML
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Título:</h4>
                    <p className="text-lg font-semibold">{blogVersions.dentala.title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Meta Descrição:</h4>
                    <p className="text-sm">{blogVersions.dentala.metaDescription}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Conteúdo (Preview):</h4>
                    <div className="text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      {blogVersions.dentala.content.substring(0, 200)}...
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blogVersions.dentala.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="eodonto" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Versão Eodonto</h3>
                    <Button 
                      onClick={() => copyToClipboard('eodonto')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar HTML
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Título:</h4>
                    <p className="text-lg font-semibold">{blogVersions.eodonto.title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Meta Descrição:</h4>
                    <p className="text-sm">{blogVersions.eodonto.metaDescription}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Conteúdo (Preview):</h4>
                    <div className="text-sm bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      {blogVersions.eodonto.content.substring(0, 200)}...
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {blogVersions.eodonto.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </CardContent>
    </Card>
  );
}