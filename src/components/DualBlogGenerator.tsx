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
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const domainUrl = domain === 'dentala' ? 'https://dentala.com.br' : 'https://eodonto.com.br';
    const domainName = domain === 'dentala' ? 'Dentala' : 'Eodonto';

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
        
        /* Postagens */
        .posts-section {
            display: grid;
            gap: 2rem;
        }
        .featured-post {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .featured-post-content {
            padding: 1.5rem;
        }
        .featured-post-content h2 {
            margin-top: 0;
            font-size: 1.75rem;
        }
        .post-card {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
        }
        .post-card:hover {
            transform: translateY(-5px);
        }
        .post-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }
        .post-card-content {
            padding: 1.5rem;
        }
        .post-card-content h3 {
            margin-top: 0;
            font-size: 1.25rem;
        }
        .post-meta {
            color: var(--secondary-color);
            font-size: 0.875rem;
        }
        
        /* Sidebar */
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        /* CORREÇÃO DO ESPAÇAMENTO */
        .posts-grid,
        .sidebar-posts {
            display: grid;
            gap: 2rem;
        }

        .sidebar-posts .post-card img {
            height: 150px; /* Tamanho menor para a barra lateral */
        }
        
        .sidebar-posts .post-card-content h3 {
            font-size: 1rem;
        }

        /* Acordeão */
        .read-more-btn {
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            color: var(--primary-color);
            font-weight: 600;
            font-family: inherit;
            font-size: 1rem;
            margin-top: 0.5rem;
        }

        .full-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.5s ease;
        }
        
        .full-content.expanded {
            max-height: 1000px; /* Valor alto para acomodar qualquer tamanho de texto */
        }
        
        /* Main Content Grid */
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        @media (min-width: 768px) {
            .main-content {
                grid-template-columns: 2fr 1fr;
            }
        }
    </style>
</head>
<body>

    <main class="container main-content">
        <section class="posts-section">
            
            <article class="featured-post">
                <img src="https://via.placeholder.com/1200x600?text=${encodeURIComponent(version.title.substring(0, 50))}" alt="Imagem do post de destaque">
                <div class="featured-post-content">
                    <p class="post-meta">${domainName} | ${currentDate}</p>
                    <h2>${version.title}</h2>
                    <p>${version.metaDescription}</p>
                    <div class="full-content">
                        ${version.content}
                    </div>
                    <button class="read-more-btn">Leia mais &rarr;</button>
                </div>
            </article>

            <div class="posts-grid">
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Tecnologia+Odontologica" alt="Imagem sobre tecnologia odontológica">
                    <div class="post-card-content">
                        <p class="post-meta">Tecnologia | ${currentDate}</p>
                        <h3>Inovações em Tecnologia Odontológica</h3>
                        <p>Descubra as últimas tendências e equipamentos que estão transformando a odontologia moderna.</p>
                        <div class="full-content">
                            <p>Conteúdo completo sobre as inovações tecnológicas na odontologia, incluindo scanners, impressoras 3D e softwares especializados.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Materiais+Dentarios" alt="Imagem sobre materiais dentários">
                    <div class="post-card-content">
                        <p class="post-meta">Materiais | ${currentDate}</p>
                        <h3>Novos Materiais para Restaurações</h3>
                        <p>Conheça os materiais mais avançados para garantir durabilidade e estética em seus tratamentos.</p>
                        <div class="full-content">
                            <p>Informações detalhadas sobre resinas, cerâmicas e outros materiais de última geração para restaurações dentárias.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>

                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Equipamentos+Dentarios" alt="Imagem sobre equipamentos dentários">
                    <div class="post-card-content">
                        <p class="post-meta">Equipamentos | ${currentDate}</p>
                        <h3>Guia de Equipamentos Essenciais</h3>
                        <p>Saiba quais equipamentos são fundamentais para modernizar seu consultório ou laboratório.</p>
                        <div class="full-content">
                            <p>Análise completa dos equipamentos mais importantes para profissionais da odontologia digital.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
            </div>
        </section>

        <aside class="sidebar">
            <div class="sidebar-posts">
                <h3>Postagens Recentes</h3>
                
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Diagnostico+Digital" alt="Imagem sobre diagnóstico digital">
                    <div class="post-card-content">
                        <p class="post-meta">Diagnóstico | ${currentDate}</p>
                        <h3>Revolução no Diagnóstico Digital</h3>
                        <div class="full-content">
                            <p>Como as novas tecnologias estão melhorando a precisão dos diagnósticos odontológicos.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Workflow+Digital" alt="Imagem sobre workflow digital">
                    <div class="post-card-content">
                        <p class="post-meta">Workflow | ${currentDate}</p>
                        <h3>Otimização do Workflow Digital</h3>
                        <div class="full-content">
                            <p>Estratégias para implementar um fluxo de trabalho digital eficiente no seu consultório.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>

                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=Proteses+3D" alt="Imagem sobre próteses 3D">
                    <div class="post-card-content">
                        <p class="post-meta">Próteses | ${currentDate}</p>
                        <h3>Próteses Impressas em 3D</h3>
                        <div class="full-content">
                            <p>Vantagens e aplicações das próteses produzidas com impressão 3D na odontologia.</p>
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
            </div>
        </aside>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const readMoreButtons = document.querySelectorAll('.read-more-btn');

            readMoreButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const fullContent = this.previousElementSibling;
                    
                    // Verifica se o conteúdo está expandido ou não
                    const isExpanded = fullContent.classList.contains('expanded');

                    if (isExpanded) {
                        fullContent.classList.remove('expanded');
                        this.textContent = 'Leia mais →';
                    } else {
                        fullContent.classList.add('expanded');
                        this.textContent = 'Fechar ↑';
                    }
                });
            });
        });
    </script>
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