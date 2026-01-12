import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Download, 
  Loader2, 
  BookOpen,
  Building2,
  Package,
  Tags,
  Users,
  Target,
  Link2,
  Layout,
  Video,
  Star,
  PenTool,
  Calendar,
  Film,
  FileJson,
  Code,
  ExternalLink
} from 'lucide-react';

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  paramKey: string;
}

const sections: SectionConfig[] = [
  { id: 'company', label: 'Perfil da Empresa', icon: <Building2 className="h-4 w-4" />, description: 'Dados institucionais, contato, redes sociais', paramKey: 'include_company' },
  { id: 'products', label: 'Catálogo de Produtos', icon: <Package className="h-4 w-4" />, description: 'Produtos com preços, benefícios, FAQ, specs', paramKey: 'include_products' },
  { id: 'categories', label: 'Categorias', icon: <Tags className="h-4 w-4" />, description: 'Categorias e subcategorias com keywords', paramKey: 'include_categories' },
  { id: 'kols', label: 'Especialistas (KOLs)', icon: <Users className="h-4 w-4" />, description: 'Key Opinion Leaders e especialistas', paramKey: 'include_kols' },
  { id: 'spin', label: 'SPIN Selling', icon: <Target className="h-4 w-4" />, description: 'Soluções comerciais SPIN', paramKey: 'include_spin' },
  { id: 'links', label: 'Links Externos', icon: <Link2 className="h-4 w-4" />, description: 'URLs e recursos para SEO', paramKey: 'include_links' },
  { id: 'landing_pages', label: 'Landing Pages', icon: <Layout className="h-4 w-4" />, description: 'Lista de landing pages', paramKey: 'include_landing_pages' },
  { id: 'testimonials', label: 'Depoimentos', icon: <Video className="h-4 w-4" />, description: 'Vídeo depoimentos de clientes', paramKey: 'include_testimonials' },
  { id: 'reviews', label: 'Avaliações', icon: <Star className="h-4 w-4" />, description: 'Reviews e avaliações de clientes', paramKey: 'include_reviews' },
  { id: 'blogs', label: 'Blog Posts', icon: <PenTool className="h-4 w-4" />, description: 'Posts do blog publicados', paramKey: 'include_blogs' },
  { id: 'milestones', label: 'Marcos Históricos', icon: <Calendar className="h-4 w-4" />, description: 'Timeline da empresa', paramKey: 'include_milestones' },
  { id: 'external_videos', label: 'Vídeos Externos', icon: <Film className="h-4 w-4" />, description: 'Biblioteca de vídeos com transcrições', paramKey: 'include_external_videos' },
];

export function CompleteHandbookExporter() {
  const [selectedSections, setSelectedSections] = useState<string[]>(sections.map(s => s.id));
  const [approvedOnly, setApprovedOnly] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [previewFormat, setPreviewFormat] = useState<'markdown' | 'json' | 'html'>('markdown');

  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAll = () => setSelectedSections(sections.map(s => s.id));
  const selectNone = () => setSelectedSections([]);

  const generateHandbook = async (format: 'markdown' | 'json' | 'html', download = false) => {
    if (selectedSections.length === 0) {
      toast.error('Selecione pelo menos uma seção');
      return;
    }

    setIsGenerating(true);
    setPreviewFormat(format);

    try {
      // Build params
      const params: Record<string, boolean | string> = {
        format,
        approved_only: approvedOnly,
      };

      sections.forEach(section => {
        params[section.paramKey] = selectedSections.includes(section.id);
      });

      const { data, error } = await supabase.functions.invoke('export-complete-handbook', {
        body: params
      });

      if (error) throw error;

      // Data comes as text for markdown/html, JSON for json format
      let content: string;
      if (format === 'json') {
        content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      } else {
        content = data;
      }

      if (download) {
        // Create download
        const blob = new Blob([content], { 
          type: format === 'json' ? 'application/json' : format === 'html' ? 'text/html' : 'text/markdown' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apostila-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`Apostila baixada em formato ${format.toUpperCase()}`);
      } else {
        setGeneratedContent(content);
        toast.success('Preview gerado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao gerar apostila:', error);
      toast.error(`Erro: ${error.message || 'Falha ao gerar apostila'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedContent) return;
    
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('Conteúdo copiado para área de transferência!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Exportar Apostila Completa
          </CardTitle>
          <CardDescription>
            Gere um documento estruturado com todas as informações do sistema, pronto para conversão em DOCX.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Seções a incluir</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Selecionar Todas</Button>
                <Button variant="outline" size="sm" onClick={selectNone}>Limpar</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sections.map(section => (
                <div 
                  key={section.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSections.includes(section.id) 
                      ? 'bg-primary/5 border-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleSection(section.id)}
                >
                  <Checkbox 
                    checked={selectedSections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {section.icon}
                      <span className="font-medium text-sm">{section.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox 
              id="approved-only"
              checked={approvedOnly}
              onCheckedChange={(checked) => setApprovedOnly(!!checked)}
            />
            <Label htmlFor="approved-only" className="cursor-pointer">
              Incluir apenas itens aprovados
            </Label>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => generateHandbook('markdown')}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Preview Markdown
            </Button>
            
            <Button 
              onClick={() => generateHandbook('markdown', true)}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Baixar .MD
            </Button>
            
            <Button 
              onClick={() => generateHandbook('html', true)}
              disabled={isGenerating}
              variant="secondary"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Code className="h-4 w-4 mr-2" />}
              Baixar .HTML
            </Button>
            
            <Button 
              onClick={() => generateHandbook('json', true)}
              disabled={isGenerating}
              variant="secondary"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileJson className="h-4 w-4 mr-2" />}
              Baixar .JSON
            </Button>
          </div>

          {/* Selected count badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedSections.length} de {sections.length} seções selecionadas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Preview do Documento</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  Copiar Conteúdo
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGeneratedContent(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full rounded-md border p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {generatedContent}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conversion Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Como Converter para DOCX
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📝 Google Docs</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra o Google Docs</li>
                <li>Arquivo → Importar</li>
                <li>Upload do arquivo .md ou .html</li>
                <li>Download como .docx</li>
              </ol>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">💻 Pandoc (Terminal)</h4>
              <code className="text-xs bg-muted p-2 rounded block mt-2">
                pandoc apostila.md -o apostila.docx --toc
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Instale via: brew install pandoc
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">📄 Microsoft Word</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Baixe o arquivo .html</li>
                <li>Abra no Word</li>
                <li>Salvar como → .docx</li>
              </ol>
            </div>
          </div>
          
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>💡 Dica:</strong> Para melhores resultados, use o formato HTML e abra no Word ou Google Docs. 
              O Markdown é ideal para edição técnica ou uso com Pandoc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
