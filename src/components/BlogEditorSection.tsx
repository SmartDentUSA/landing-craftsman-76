import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Loader2, FileText, Save, Eye, Sparkles, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePromptsConfiguration } from "@/hooks/usePromptsConfiguration";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { TagInput } from "@/components/ui/tag-input";

interface BlogEditorSectionProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
}

interface BlogPost {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
}

export function BlogEditorSection({ landingPageId, landingPageData, selectedProductIds }: BlogEditorSectionProps) {
  const [blogPost, setBlogPost] = useState<BlogPost>({
    title: "",
    content: "",
    meta_description: "",
    keywords: [],
    status: "draft"
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { getConfigurationByFunction } = usePromptsConfiguration();
  const { loadProductsByIds } = useSelectedProducts();

  // Load existing blog post on mount
  useEffect(() => {
    loadExistingBlogPost();
  }, [landingPageId]);

  const loadExistingBlogPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const post = data[0];
        setBlogPost({
          title: post.title || "",
          content: post.content || "",
          meta_description: post.meta_description || "",
          keywords: Array.isArray(post.keywords) ? post.keywords : [],
          status: post.status || "draft"
        });
      } else {
        // Initialize with landing page data
        setBlogPost({
          title: landingPageData?.banner?.title || landingPageData?.seo_title || "",
          content: "",
          meta_description: landingPageData?.seo_description || "",
          keywords: [],
          status: "draft"
        });
      }
    } catch (error) {
      console.error('Erro ao carregar blog post:', error);
    }
  };

  const generateBlogContent = async () => {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      toast({
        title: "Produtos necessários",
        description: "Selecione produtos no repositório para gerar o blog contextual",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando blog estratégico contextual para:", landingPageId);

      const promptConfig = getConfigurationByFunction('strategic-blog-generator', 'Artigo Estratégico Contextual');
      
      const repositoryConfig = {
        selectedSources: promptConfig?.selected_data_sources || ['products_repository', 'approved_reviews', 'key_opinion_leaders', 'company_profile'],
        selectedFields: promptConfig?.selected_fields || {
          landing_pages: ['banner', 'seo_title', 'seo_description'],
          products_repository: ['name', 'description', 'benefits', 'keywords'],
          approved_reviews: ['review_text', 'contextual_seo_info'],
          key_opinion_leaders: ['full_name', 'specialty', 'mini_cv'],
          company_profile: ['company_name', 'main_products_services', 'target_audience']
        },
        selectedProductIds: selectedProductIds
      };

      const { data, error } = await supabase.functions.invoke('strategic-blog-generator', {
        body: {
          landingPageId,
          repositoryConfig
        }
      });

      if (error) throw error;

      if (data && typeof data === 'string') {
        const blogContent = data;
        const lines = blogContent.split('\n').filter(line => line.trim());
        const title = lines[0]?.replace(/^#+\s*/, '') || "Blog Estratégico Contextual";
        
        setBlogPost(prev => ({
          ...prev,
          title: title,
          content: blogContent,
          meta_description: `${title.substring(0, 150)}...`,
          keywords: selectedProductIds?.slice(0, 5) || []
        }));

        console.log("✅ Blog estratégico gerado com sucesso");
        
        toast({
          title: "Blog gerado com sucesso!",
          description: "Conteúdo estratégico contextual criado.",
        });
      } else {
        throw new Error("Resposta inválida do gerador estratégico");
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar blog estratégico:", err);
      setError(err.message || "Erro ao gerar blog estratégico");
      
      toast({
        title: "Erro na geração",
        description: err.message || "Erro ao gerar conteúdo do blog",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveBlogPost = async () => {
    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .upsert({
          landing_page_id: landingPageId,
          title: blogPost.title,
          content: blogPost.content,
          meta_description: blogPost.meta_description,
          keywords: blogPost.keywords,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      toast({
        title: "Blog salvo!",
        description: "Suas alterações foram salvas com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao salvar blog:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar o blog post",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateBlogPost = (field: keyof BlogPost, value: any) => {
    setBlogPost(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generatePreviewHTML = (content: string) => {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${blogPost.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { color: #333; }
          h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
          p { margin-bottom: 16px; }
          ul, ol { margin-bottom: 16px; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Editor de Blog</CardTitle>
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateBlogContent}
              disabled={generating || !selectedProductIds?.length}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? "Gerando..." : "Gerar com IA"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!blogPost.content}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Ocultar" : "Preview"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={saveBlogPost}
              disabled={saving || !blogPost.title}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">⚠️ {error}</p>
          </div>
        )}

        {!selectedProductIds?.length && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-sm text-orange-700">
              ⚠️ <strong>Produtos necessários:</strong> Selecione produtos no repositório para gerar o blog contextual
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Título */}
        <div className="space-y-2">
          <Label htmlFor="blog-title">Título do Blog</Label>
          <Input
            id="blog-title"
            value={blogPost.title}
            onChange={(e) => updateBlogPost('title', e.target.value)}
            placeholder="Digite o título do blog post..."
          />
        </div>

        {/* Meta Description */}
        <div className="space-y-2">
          <Label htmlFor="blog-meta">Meta Descrição</Label>
          <Textarea
            id="blog-meta"
            value={blogPost.meta_description}
            onChange={(e) => updateBlogPost('meta_description', e.target.value)}
            placeholder="Descrição para SEO (máx. 160 caracteres)..."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            {blogPost.meta_description.length}/160 caracteres
          </p>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <Label>Palavras-chave</Label>
          <TagInput
            value={blogPost.keywords}
            onChange={(keywords) => updateBlogPost('keywords', keywords)}
            placeholder="Adicionar palavra-chave..."
          />
        </div>

        {/* Content Editor */}
        <div className="space-y-2">
          <Label htmlFor="blog-content">Conteúdo</Label>
          <RichTextEditor
            content={blogPost.content}
            onChange={(content) => updateBlogPost('content', content)}
            placeholder="Escreva o conteúdo do seu blog post..."
            className="min-h-[400px]"
          />
        </div>

        {/* Preview */}
        {showPreview && blogPost.content && (
          <div className="border rounded-lg p-4 bg-background">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview do Blog
            </h3>
            <iframe
              srcDoc={generatePreviewHTML(blogPost.content)}
              className="w-full h-96 border rounded"
              title="Preview do Blog"
            />
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Status: {blogPost.status === 'draft' ? 'Rascunho' : 'Publicado'}
          </Badge>
          {selectedProductIds?.length && (
            <Badge variant="outline">
              {selectedProductIds.length} produto(s) selecionado(s)
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}