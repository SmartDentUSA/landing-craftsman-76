import { useState, useEffect, useRef } from "react";
import { validateMetaDescription } from '@/lib/seo-validators';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeBlogContent } from "@/lib/blog-utils";
import { Loader2, FileText, Save, Eye, Sparkles, Link, BookOpen, Settings, Zap, Globe, ShoppingCart, History, RotateCcw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePromptsConfiguration } from "@/hooks/usePromptsConfiguration";
import { useSelectedProducts } from "@/hooks/useSelectedProducts";
import { TagInput } from "@/components/ui/tag-input";
import { BlogConsolidationInterface } from "./BlogConsolidationInterface";
import { useAutoLinker } from "@/hooks/useAutoLinker";
import { SolutionImageSelector } from "./SolutionImageSelector";

interface BlogEditorSectionProps {
  landingPageId: string;
  landingPageData: any;
  selectedProductIds?: string[];
  onSave?: () => void; // callback quando salvar blog estratégico
}

interface BlogPost {
  title: string;
  content: string;
  meta_description: string;
  keywords: string[];
  status: string;
}

interface DualBlogPost {
  dentala: BlogPost;
  eodonto: BlogPost;
}

export function BlogEditorSection({ landingPageId, landingPageData, selectedProductIds, onSave }: BlogEditorSectionProps) {
  const [dentalaBlogPost, setDentalaBlogPost] = useState<BlogPost | null>(null);
  const [eodontoBlogPost, setEodontoBlogPost] = useState<BlogPost | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<'dentala' | 'eodonto'>('dentala');
  const [dentalaHistory, setDentalaHistory] = useState<any[]>([]);
  const [eodontoHistory, setEodontoHistory] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blogGenerated, setBlogGenerated] = useState(false);
  const [autoLinksEnabled, setAutoLinksEnabled] = useState(true);
  const [previewContent, setPreviewContent] = useState("");
  const [previewLinksCount, setPreviewLinksCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<{ domain: 'dentala' | 'eodonto', index: number } | null>(null);
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [activeEditor, setActiveEditor] = useState<'dentala' | 'eodonto' | null>(null);
  const [dentalaEditorInstance, setDentalaEditorInstance] = useState<any>(null);
  const [eodontoEditorInstance, setEodontoEditorInstance] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [metaValidation, setMetaValidation] = useState({ 
    valid: true, 
    warnings: [] as string[], 
    score: 100 
  });
  
  const { toast } = useToast();
  const { getConfigurationByFunction } = usePromptsConfiguration();
  const { loadProductsByIds } = useSelectedProducts();
  const { processAutoLinks, debouncedPreviewLinks, getApplicableLinks, isProcessing, autoLinksCount } = useAutoLinker();

  // Load existing blog post on mount
  useEffect(() => {
    loadDualBlogs();
  }, [landingPageId]);

  // Validate meta description when it changes
  useEffect(() => {
    const currentMeta = selectedDomain === 'dentala' 
      ? dentalaBlogPost?.meta_description 
      : eodontoBlogPost?.meta_description;
    
    if (currentMeta) {
      const validation = validateMetaDescription(currentMeta);
      setMetaValidation(validation);
    }
  }, [dentalaBlogPost?.meta_description, eodontoBlogPost?.meta_description, selectedDomain]);

  const createVersionEntries = async (data: any) => {
    try {
      const now = new Date().toISOString();
      
      // Dentala version
      const { data: existingDentala } = await supabase
        .from('blog_posts')
        .select('id, version_history')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', ['dentala.com.br'])
        .maybeSingle();
      
      if (existingDentala) {
        const newDentalaVersion = {
          id: crypto.randomUUID(),
          title: data.dentala.title || 'Blog Estratégico',
          content: data.dentala.content || '',
          meta_description: data.dentala.meta_description || '',
          keywords: data.dentala.keywords || [],
          generated_at: now,
          ai_source: data.dentala.selectedAPI || 'strategic-generator',
          domain: 'dentala.com.br'
        };
        
        const updatedDentalaHistory = {
          versions: [newDentalaVersion, ...((existingDentala.version_history as any)?.versions || [])].slice(0, 10)
        };
        
        await supabase.from('blog_posts').update({
          version_history: updatedDentalaHistory
        }).eq('id', existingDentala.id);
        
        setDentalaHistory(updatedDentalaHistory.versions);
      }
      
      // Eodonto version
      const { data: existingEodonto } = await supabase
        .from('blog_posts')
        .select('id, version_history')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', ['eodonto.com.br'])
        .maybeSingle();
      
      if (existingEodonto) {
        const newEodontoVersion = {
          id: crypto.randomUUID(),
          title: data.eodonto.title || 'Blog Estratégico',
          content: data.eodonto.content || '',
          meta_description: data.eodonto.meta_description || '',
          keywords: data.eodonto.keywords || [],
          generated_at: now,
          ai_source: data.eodonto.selectedAPI || 'strategic-generator',
          domain: 'eodonto.com.br'
        };
        
        const updatedEodontoHistory = {
          versions: [newEodontoVersion, ...((existingEodonto.version_history as any)?.versions || [])].slice(0, 10)
        };
        
        await supabase.from('blog_posts').update({
          version_history: updatedEodontoHistory
        }).eq('id', existingEodonto.id);
        
        setEodontoHistory(updatedEodontoHistory.versions);
      }
      
      console.log('✅ Versões criadas automaticamente no histórico');
    } catch (error) {
      console.error('❌ Erro ao criar versões:', error);
    }
  };

  const loadDualBlogs = async () => {
    try {
      console.log('🔍 Carregando blogs duais...');
      
      const { data: blogs, error: loadError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('landing_page_id', landingPageId)
        .order('updated_at', { ascending: false });

      if (loadError) {
        console.error('❌ Erro ao carregar blogs:', loadError);
        throw loadError;
      }

      console.log(`📊 Total de blogs encontrados: ${blogs?.length || 0}`);
      console.table(
        (blogs || []).map((b: any) => ({
          id: b.id?.substring(0, 8),
          domains: b.published_domains,
          title: b.title?.substring(0, 30),
        }))
      );

      // Helper seguro para verificar domínios
      const domainMatches = (domains: unknown, target: string) =>
        Array.isArray(domains) && (domains as string[]).includes(target);

      const dentalaBlog = blogs?.find((b: any) =>
        domainMatches(b.published_domains, 'dentala.com.br')
      );
      const eodontoBlog = blogs?.find((b: any) =>
        domainMatches(b.published_domains, 'eodonto.com.br')
      );

      console.log(`✅ Dentala encontrado: ${!!dentalaBlog}`);
      console.log(`✅ Eodonto encontrado: ${!!eodontoBlog}`);

      if (dentalaBlog) {
        const normalizedContent = normalizeBlogContent(dentalaBlog.content || '');
        setDentalaBlogPost({
          title: dentalaBlog.title || '',
          content: normalizedContent,
          meta_description: dentalaBlog.meta_description || '',
          keywords: dentalaBlog.keywords || [],
          status: dentalaBlog.status || 'draft',
        });
        setDentalaHistory((dentalaBlog.version_history as any)?.versions || []);
        console.log(
          `   📚 Dentala: ${
            ((dentalaBlog.version_history as any)?.versions || []).length
          } versões | Normalizado: ${normalizedContent.substring(0, 50)}...`
        );
      }

      if (eodontoBlog) {
        const normalizedContent = normalizeBlogContent(eodontoBlog.content || '');
        setEodontoBlogPost({
          title: eodontoBlog.title || '',
          content: normalizedContent,
          meta_description: eodontoBlog.meta_description || '',
          keywords: eodontoBlog.keywords || [],
          status: eodontoBlog.status || 'draft',
        });
        setEodontoHistory((eodontoBlog.version_history as any)?.versions || []);
        console.log(
          `   📚 Eodonto: ${
            ((eodontoBlog.version_history as any)?.versions || []).length
          } versões | Normalizado: ${normalizedContent.substring(0, 50)}...`
        );
      }

      // Verificar se já existem blogs salvos e marcar como gerado
      if (dentalaBlog && eodontoBlog) {
        setBlogGenerated(true);
        console.log('✅ Blogs existentes detectados - marcando como gerado');
      }

      // Verificar flag blog_generated na landing page
      const { data: lpData } = await supabase
        .from('landing_pages')
        .select('blog_generated, blog_generated_at')
        .eq('id', landingPageId)
        .single();

      if (lpData?.blog_generated) {
        setBlogGenerated(true);
        console.log('✅ Landing page já tem blogs gerados em:', lpData.blog_generated_at);
      }
    } catch (error: any) {
      console.error('❌ Erro fatal ao carregar blogs duais:', error);
      toast({
        title: 'Erro ao carregar blogs',
        description: error?.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const generateBlogContent = async () => {
    if (!selectedProductIds || selectedProductIds.length === 0) {
      toast({
        title: "Produtos necessários",
        description: "Selecione produtos no repositório para gerar os blogs contextuais",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      console.log("🔄 Gerando blogs estratégicos duais (Dentala + Eodonto)...");

      const promptConfig = getConfigurationByFunction('strategic-blog-generator', 'Artigo Estratégico Contextual');
      
      const repositoryConfig = {
        selectedDataSources: promptConfig?.selected_data_sources || [
          'landing_page_banner',
          'landing_page_solutions_1',
          'landing_page_solutions_2',
          'products_repository',
          'approved_reviews',
          'key_opinion_leaders',
          'company_profile'
        ],
        selectedFields: promptConfig?.selected_fields || {},
        selectedProductIds: selectedProductIds
      };

      console.log('📤 Chamando strategic-blog-generator com:', { landingPageId, repositoryConfig });
      
      const { data, error } = await supabase.functions.invoke('strategic-blog-generator', {
        body: { landingPageId, repositoryConfig }
      });

      console.log('📥 Resposta da edge function:', { data, error });

      if (error) {
        console.error('❌ Erro detalhado da edge function:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      if (data?.dentala && data?.eodonto) {
        // Carregar dados salvos do banco
        await loadDualBlogs();
        
        // Create version history entries for auto-generated content
        await createVersionEntries(data);
        
        setBlogGenerated(true);

        console.log("✅ Blogs estratégicos duais gerados com sucesso");
        console.log(`   - Dentala: ${data.dentala.contentLength} chars (${data.dentala.selectedAPI})`);
        console.log(`   - Eodonto: ${data.eodonto.contentLength} chars (${data.eodonto.selectedAPI})`);
        
        toast({
          title: "✅ Blogs Gerados com Sucesso!",
          description: `Dentala: ${data.dentala.contentLength} chars • Eodonto: ${data.eodonto.contentLength} chars`,
        });
      } else {
        throw new Error("Resposta inválida do gerador estratégico");
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar blogs estratégicos:", err);
      console.error("❌ Stack trace:", err.stack);
      console.error("❌ Detalhes completos:", JSON.stringify(err, null, 2));
      
      const errorMessage = err.message || err.error || err.msg || "Erro ao gerar blogs estratégicos";
      setError(errorMessage);
      
      toast({
        title: "❌ Erro na geração",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveDualBlog = async () => {
    setSaving(true);
    setIsSaving(true);
    
    try {
      const currentBlog = selectedDomain === 'dentala' ? dentalaBlogPost : eodontoBlogPost;
      const domain = selectedDomain === 'dentala' ? 'dentala.com.br' : 'eodonto.com.br';
      
      if (!currentBlog) {
        throw new Error('Nenhum blog selecionado para salvar');
      }
      
      // Carregar histórico existente
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, version_history')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', [domain])
        .maybeSingle();
      
      const newVersion = {
        id: crypto.randomUUID(),
        title: currentBlog.title,
        content: currentBlog.content,
        meta_description: currentBlog.meta_description,
        keywords: currentBlog.keywords,
        generated_at: new Date().toISOString(),
        ai_source: 'manual_edit',
        domain
      };
      
      const updatedHistory = {
        versions: [newVersion, ...((existing?.version_history as any)?.versions || [])].slice(0, 10)
      };
      
      await supabase.from('blog_posts').upsert({
        id: existing?.id,
        landing_page_id: landingPageId,
        title: currentBlog.title,
        content: currentBlog.content,
        meta_description: currentBlog.meta_description,
        keywords: currentBlog.keywords,
        author_kol_id: landingPageData?.author_kol_id,
        published_domains: [domain],
        version_history: updatedHistory,
        status: 'draft',
        updated_at: new Date().toISOString()
      });
      
      // Atualizar histórico local
      if (selectedDomain === 'dentala') {
        setDentalaHistory(updatedHistory.versions);
      } else {
        setEodontoHistory(updatedHistory.versions);
      }
      
      setLastSaved(new Date());
      
      toast({
        title: "✅ Blog salvo com sucesso!",
        description: `Blog ${selectedDomain === 'dentala' ? 'Dentala' : 'Eodonto'} atualizado.`,
      });
      
      // ✅ PATCH 0.3: Safety Delay antes de chamar onSave
      const SAVE_COMMIT_DELAY_MS = 120;
      await new Promise(resolve => setTimeout(resolve, SAVE_COMMIT_DELAY_MS));
      
      // ✅ Notificar parent que houve save
      onSave?.();
    } catch (error: any) {
      console.error('Erro ao salvar blog:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message || "Erro ao salvar o blog post",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setIsSaving(false);
    }
  };

  const restoreVersion = (domain: 'dentala' | 'eodonto', version: any) => {
    if (domain === 'dentala') {
      setDentalaBlogPost({
        title: version.title,
        content: version.content,
        meta_description: version.meta_description,
        keywords: version.keywords,
        status: 'draft'
      });
    } else {
      setEodontoBlogPost({
        title: version.title,
        content: version.content,
        meta_description: version.meta_description,
        keywords: version.keywords,
        status: 'draft'
      });
    }
    
    toast({
      title: "Versão Restaurada",
      description: `Versão restaurada no editor ${domain === 'dentala' ? 'Dentala' : 'Eodonto'}.`,
    });
  };

  const deleteVersion = async (domain: 'dentala' | 'eodonto', versionIndex: number) => {
    try {
      console.log('🗑️ Tentando excluir versão:', { domain, versionIndex });
      
      const targetDomain = domain === 'dentala' ? 'dentala.com.br' : 'eodonto.com.br';
      const history = domain === 'dentala' ? dentalaHistory : eodontoHistory;
      
      console.log('📚 Histórico atual:', history.length, 'versões');
      console.log('📍 Versão a ser excluída:', history[versionIndex]);
      
      // Validações
      if (versionIndex === 0) {
        console.warn('⚠️ Tentativa de excluir versão atual (índice 0)');
        toast({
          title: "Ação não permitida",
          description: "Não é possível excluir a versão atual.",
          variant: "destructive"
        });
        return;
      }
      
      if (history.length < 2) {
        toast({
          title: "Ação não permitida",
          description: "É necessário manter pelo menos uma versão.",
          variant: "destructive"
        });
        return;
      }
      
      // Buscar o blog atual
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, version_history')
        .eq('landing_page_id', landingPageId)
        .contains('published_domains', [targetDomain])
        .maybeSingle();
        
      if (!existing) {
        throw new Error('Blog não encontrado');
      }
      
      // Remover a versão do array
      const currentHistory = (existing.version_history as any)?.versions || [];
      const updatedVersions = currentHistory.filter((_: any, i: number) => i !== versionIndex);
      
      // Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          version_history: { versions: updatedVersions }
        })
        .eq('id', existing.id);
        
      if (updateError) throw updateError;
      
      // Atualizar estado local
      if (domain === 'dentala') {
        setDentalaHistory(updatedVersions);
      } else {
        setEodontoHistory(updatedVersions);
      }
      
      console.log('✅ Versão excluída com sucesso. Novo tamanho:', updatedVersions.length);
      
      toast({
        title: "Versão excluída",
        description: `Versão ${versionIndex + 1} foi removida do histórico.`,
      });
      
      setDeleteDialogOpen(false);
      setVersionToDelete(null);
    } catch (error: any) {
      console.error('❌ Erro detalhado ao deletar versão:', error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir a versão.",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (domain: 'dentala' | 'eodonto', index: number) => {
    setVersionToDelete({ domain, index });
    setDeleteDialogOpen(true);
  };

  // Validar meta description quando mudar
  useEffect(() => {
    const currentBlog = selectedDomain === 'dentala' ? dentalaBlogPost : eodontoBlogPost;
    if (currentBlog?.meta_description) {
      const validation = validateMetaDescription(currentBlog.meta_description);
      setMetaValidation(validation);
    }
  }, [dentalaBlogPost?.meta_description, eodontoBlogPost?.meta_description, selectedDomain]);

  const updateDentalaBlog = (field: keyof BlogPost, value: any) => {
    setDentalaBlogPost(prev => prev ? ({ ...prev, [field]: value }) : null);
    if (field === 'content' && autoLinksEnabled && value) {
      debouncedPreviewLinks(value, (processed, count) => {
        setPreviewContent(processed);
        setPreviewLinksCount(count);
      });
    }
  };

  const updateEodontoBlog = (field: keyof BlogPost, value: any) => {
    setEodontoBlogPost(prev => prev ? ({ ...prev, [field]: value }) : null);
    if (field === 'content' && autoLinksEnabled && value) {
      debouncedPreviewLinks(value, (processed, count) => {
        setPreviewContent(processed);
        setPreviewLinksCount(count);
      });
    }
  };

  const handleInsertSolutionImage = (domain: 'dentala' | 'eodonto') => {
    setActiveEditor(domain);
    setImageSelectorOpen(true);
  };

  const handleImageSelect = (imageMarkdown: string, imageUrl: string) => {
    if (!activeEditor) return;
    
    const editorInstance = activeEditor === 'dentala' ? dentalaEditorInstance : eodontoEditorInstance;
    
    // Se o editor está focado, inserir na posição do cursor
    if (editorInstance && editorInstance.isFocused) {
      editorInstance.commands.insertContent(imageMarkdown);
      toast({
        title: "Imagem inserida",
        description: "Imagem adicionada na posição do cursor",
      });
    } else {
      // Fallback: inserir no final do conteúdo
      const currentBlog = activeEditor === 'dentala' ? dentalaBlogPost : eodontoBlogPost;
      if (!currentBlog) return;
      
      const updatedContent = currentBlog.content + '\n\n' + imageMarkdown + '\n\n';
      
      if (activeEditor === 'dentala') {
        updateDentalaBlog('content', updatedContent);
      } else {
        updateEodontoBlog('content', updatedContent);
      }
      
      toast({
        title: "Imagem inserida",
        description: "Imagem adicionada ao final do conteúdo",
      });
    }
  };

  const generatePreviewHTML = (content: string, title: string) => {
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
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

  const getBlogStatus = () => {
    const hasDentala = dentalaBlogPost?.content;
    const hasEodonto = eodontoBlogPost?.content;
    
    if (generating) return "Gerando...";
    if (hasDentala && hasEodonto) return "Ambos gerados";
    if (hasDentala || hasEodonto) return "Parcialmente gerado";
    return "Sem blogs";
  };

  return (
    <Accordion type="multiple" defaultValue={["product-curation"]} className="w-full space-y-4">
      {/* Editor de Blog Estratégico - Dual Domain */}
      <AccordionItem value="strategic-blog" className="border rounded-lg">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">Editor de Blog Estratégico (Dentala + Eodonto)</h3>
                <p className="text-sm text-muted-foreground">
                  {getBlogStatus()} • Blogs opcionais da landing page
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mr-4">
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
              {blogGenerated && (
                <Badge variant="default" className="bg-green-600">
                  ✓ Blogs Gerados
                </Badge>
              )}
              <Badge variant={(dentalaBlogPost || eodontoBlogPost) ? "default" : "secondary"}>
                {dentalaBlogPost && eodontoBlogPost ? "Ambos gerados" : (dentalaBlogPost || eodontoBlogPost) ? "Parcial" : "Vazio"}
              </Badge>
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-6 pb-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateBlogContent}
                  disabled={generating || !selectedProductIds?.length}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {generating 
                    ? "Gerando Dentala + Eodonto..." 
                    : blogGenerated 
                      ? "Regenerar Blogs" 
                      : "Gerar Blogs Estratégicos"}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={saveDualBlog}
                  disabled={saving || (!dentalaBlogPost && !eodontoBlogPost)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : `Salvar ${selectedDomain === 'dentala' ? 'Dentala' : 'Eodonto'}`}
                </Button>
              </div>

              {error && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-orange-700">⚠️ {error}</p>
                </div>
              )}

              {!selectedProductIds?.length && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-orange-700">
                    ⚠️ <strong>Produtos necessários:</strong> Selecione produtos no repositório para gerar os blogs contextuais
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent className="px-0 space-y-6">
              <Tabs value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as 'dentala' | 'eodonto')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dentala" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Dentala
                    {dentalaBlogPost && (
                      <Badge variant="secondary" className="ml-1">
                        v{dentalaHistory.length || 1}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="eodonto" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Eodonto
                    {eodontoBlogPost && (
                      <Badge variant="secondary" className="ml-1">
                        v{eodontoHistory.length || 1}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* TAB DENTALA */}
                <TabsContent value="dentala" className="space-y-6 mt-4">
                  {dentalaBlogPost ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="dentala-title">Título do Blog (Dentala)</Label>
                        <Input
                          id="dentala-title"
                          value={dentalaBlogPost.title}
                          onChange={(e) => updateDentalaBlog('title', e.target.value)}
                          placeholder="Título otimizado para profissionais..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dentala-meta">Meta Descrição (Dentala)</Label>
                        <Textarea
                          id="dentala-meta"
                          value={dentalaBlogPost.meta_description}
                          onChange={(e) => updateDentalaBlog('meta_description', e.target.value)}
                          placeholder="Descrição SEO para dentistas..."
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          {dentalaBlogPost.meta_description.length}/160 caracteres
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Palavras-chave (Dentala)</Label>
                        <TagInput
                          value={dentalaBlogPost.keywords}
                          onChange={(keywords) => updateDentalaBlog('keywords', keywords)}
                          placeholder="Adicionar palavra-chave técnica..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Conteúdo (Dentala)</Label>
                        <RichTextEditor
                          content={dentalaBlogPost.content}
                          onChange={(content) => updateDentalaBlog('content', content)}
                          placeholder="Conteúdo para profissionais..."
                          onInsertSolutionImage={() => handleInsertSolutionImage('dentala')}
                          onEditorReady={setDentalaEditorInstance}
                          className="min-h-[400px]"
                        />
                      </div>

                      {dentalaHistory.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Histórico de Versões (Dentala)
                            <Badge variant="secondary">{dentalaHistory.length}/10</Badge>
                          </h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {dentalaHistory.map((version, index) => (
                              <div key={version.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                <div>
                                  <span className="text-sm font-medium">
                                    Versão {index + 1}
                                    {index === 0 && <Badge className="ml-2" variant="default">Atual</Badge>}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(version.generated_at).toLocaleString('pt-BR')} • {version.ai_source}
                                  </p>
                                </div>
                                {index > 0 && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => restoreVersion('dentala', version)}
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Restaurar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => openDeleteDialog('dentala', index)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum blog Dentala gerado ainda</p>
                      <p className="text-sm">Clique em "Gerar Blogs" para criar</p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB EODONTO */}
                <TabsContent value="eodonto" className="space-y-6 mt-4">
                  {eodontoBlogPost ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="eodonto-title">Título do Blog (Eodonto)</Label>
                        <Input
                          id="eodonto-title"
                          value={eodontoBlogPost.title}
                          onChange={(e) => updateEodontoBlog('title', e.target.value)}
                          placeholder="Título otimizado para consumidores..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="eodonto-meta">Meta Descrição (Eodonto)</Label>
                        <Textarea
                          id="eodonto-meta"
                          value={eodontoBlogPost.meta_description}
                          onChange={(e) => updateEodontoBlog('meta_description', e.target.value)}
                          placeholder="Descrição SEO para e-commerce..."
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          {eodontoBlogPost.meta_description.length}/160 caracteres
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Palavras-chave (Eodonto)</Label>
                        <TagInput
                          value={eodontoBlogPost.keywords}
                          onChange={(keywords) => updateEodontoBlog('keywords', keywords)}
                          placeholder="Adicionar palavra-chave comercial..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Conteúdo (Eodonto)</Label>
                        <RichTextEditor
                          content={eodontoBlogPost.content}
                          onChange={(content) => updateEodontoBlog('content', content)}
                          placeholder="Conteúdo para consumidores..."
                          onInsertSolutionImage={() => handleInsertSolutionImage('eodonto')}
                          onEditorReady={setEodontoEditorInstance}
                          className="min-h-[400px]"
                        />
                      </div>

                      {eodontoHistory.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Histórico de Versões (Eodonto)
                            <Badge variant="secondary">{eodontoHistory.length}/10</Badge>
                          </h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {eodontoHistory.map((version, index) => (
                              <div key={version.id} className="flex items-center justify-between p-2 bg-background rounded border">
                                <div>
                                  <span className="text-sm font-medium">
                                    Versão {index + 1}
                                    {index === 0 && <Badge className="ml-2" variant="default">Atual</Badge>}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(version.generated_at).toLocaleString('pt-BR')} • {version.ai_source}
                                  </p>
                                </div>
                                {index > 0 && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => restoreVersion('eodonto', version)}
                                    >
                                      <RotateCcw className="h-3 w-3 mr-1" />
                                      Restaurar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => openDeleteDialog('eodonto', index)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Excluir
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum blog Eodonto gerado ainda</p>
                      <p className="text-sm">Clique em "Gerar Blogs" para criar</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>

      {/* Curadoria de Blogs dos Produtos */}
      <AccordionItem value="product-curation" className="border rounded-lg">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <div className="text-left">
              <h3 className="font-semibold">Curadoria de Blogs dos Produtos</h3>
              <p className="text-sm text-muted-foreground">
                Configure blogs dos produtos para consolidação
              </p>
            </div>
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-6 pb-6">
          <BlogConsolidationInterface
            landingPageId={landingPageId}
            selectedProductIds={selectedProductIds || []}
            onGenerateBlog={generateBlogContent}
            isGenerating={generating}
            blogGenerated={blogGenerated}
          />
        </AccordionContent>
      </AccordionItem>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a <strong>Versão {(versionToDelete?.index || 0) + 1}</strong> do histórico?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (versionToDelete) {
                  deleteVersion(versionToDelete.domain, versionToDelete.index);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Seletor de Imagens das Soluções */}
      <SolutionImageSelector
        open={imageSelectorOpen}
        onClose={() => {
          setImageSelectorOpen(false);
          setActiveEditor(null);
        }}
        solutions={landingPageData?.solutions || []}
        onImageSelect={handleImageSelect}
      />
    </Accordion>
  );
}