import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Edit, Trash2, Loader2, Sparkles, Save, X, FileCode, Eye, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductEcommerceGeneratorProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ProductEcommerceGenerator({ 
  productId, 
  isOpen, 
  onClose, 
  onUpdate 
}: ProductEcommerceGeneratorProps) {
  const [state, setState] = useState<'empty' | 'generating' | 'generated' | 'editing'>('empty');
  const [htmlContent, setHtmlContent] = useState('');
  const [editedHtml, setEditedHtml] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [options, setOptions] = useState({
    includeBenefits: true,
    includeFAQ: true,
    includeVideoCollections: true,
    faqLimit: 8,
    regenerateBenefits: false
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    loadExistingHTML();
  }, [productId, isOpen]);

  const loadExistingHTML = async () => {
    try {
      const { data, error } = await supabase
        .from('products_repository')
        .select('ecommerce_html')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const ecommerceData = data?.ecommerce_html as any;
      if (ecommerceData?.html_content) {
        setHtmlContent(ecommerceData.html_content);
        setMetadata(ecommerceData);
        setState('generated');
      } else {
        setState('empty');
      }
    } catch (error) {
      console.error('Erro ao carregar HTML:', error);
      setState('empty');
    }
  };

  const handleGenerate = async () => {
    setState('generating');
    try {
      const { data, error } = await supabase.functions.invoke('generate-ecommerce-html', {
        body: { productId, options }
      });

      if (error) throw error;

      setHtmlContent(data.html_content);
      setMetadata(data.metadata);
      setState('generated');

      toast({
        title: 'HTML Gerado com Sucesso!',
        description: 'Descrição e-commerce criada com IA'
      });
    } catch (error) {
      console.error('Erro ao gerar HTML:', error);
      toast({
        title: 'Erro ao Gerar HTML',
        description: error.message,
        variant: 'destructive'
      });
      setState('empty');
    }
  };

  const handleEdit = () => {
    setEditedHtml(htmlContent);
    setState('editing');
  };

  const handleSaveEdit = async () => {
    try {
      const updatedData = {
        ...metadata,
        html_content: editedHtml,
        last_edited_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products_repository')
        .update({ ecommerce_html: updatedData })
        .eq('id', productId);

      if (error) throw error;

      setHtmlContent(editedHtml);
      setMetadata(updatedData);
      setState('generated');

      toast({
        title: 'Alterações Salvas!',
        description: 'HTML atualizado com sucesso'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao Salvar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlContent);
    toast({
      title: 'HTML Copiado!',
      description: 'Conteúdo copiado para área de transferência'
    });
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir o HTML gerado?')) return;

    try {
      const { error } = await supabase
        .from('products_repository')
        .update({ ecommerce_html: null })
        .eq('id', productId);

      if (error) throw error;

      setHtmlContent('');
      setMetadata(null);
      setState('empty');

      toast({
        title: 'HTML Excluído',
        description: 'Conteúdo removido com sucesso'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: 'Erro ao Excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const renderContent = () => {
    // Estado: EMPTY
    if (state === 'empty') {
      return (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerar Descrição E-commerce
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="benefits">Incluir Benefícios (IA)</Label>
              <Switch
                id="benefits"
                checked={options.includeBenefits}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeBenefits: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="faq">Incluir FAQ</Label>
              <Switch
                id="faq"
                checked={options.includeFAQ}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeFAQ: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="videos">Incluir Coleções de Vídeos</Label>
              <Switch
                id="videos"
                checked={options.includeVideoCollections}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, includeVideoCollections: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="regenerate">Regenerar Benefícios com IA</Label>
              <Switch
                id="regenerate"
                checked={options.regenerateBenefits}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, regenerateBenefits: checked }))}
              />
            </div>
          </div>

          <Button onClick={handleGenerate} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Descrição E-commerce
          </Button>
        </CardContent>
      </Card>
      );
    }

    // Estado: GENERATING
    if (state === 'generating') {
      return (
        <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Gerando HTML com IA...</p>
          </div>
        </CardContent>
      </Card>
      );
    }

    // Estado: GENERATED
    if (state === 'generated') {
      return (
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                HTML E-commerce Gerado
              </CardTitle>
              <div className="flex gap-2 text-sm text-muted-foreground">
                {metadata?.generated_at && (
                  <Badge variant="outline">Gerado: {new Date(metadata.generated_at).toLocaleString('pt-BR')}</Badge>
                )}
                {metadata?.last_edited_at && (
                  <Badge variant="secondary">Editado: {new Date(metadata.last_edited_at).toLocaleString('pt-BR')}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar HTML
              </Button>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="w-full">
              <TabsTrigger value="preview" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="flex-1">
                <FileCode className="h-4 w-4 mr-2" />
                Código HTML
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="border rounded-md p-4">
              <iframe
                srcDoc={htmlContent}
                title="Preview HTML"
                className="w-full h-[600px] border-0"
              />
            </TabsContent>
            <TabsContent value="code">
              <Textarea
                value={htmlContent}
                readOnly
                className="font-mono text-xs h-[600px]"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      );
    }

    // Estado: EDITING
    if (state === 'editing') {
      return (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar HTML E-commerce
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="editor">
            <TabsList className="w-full">
              <TabsTrigger value="editor" className="flex-1">
                <FileCode className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <Textarea
                value={editedHtml}
                onChange={(e) => setEditedHtml(e.target.value)}
                className="font-mono text-xs h-[600px]"
                placeholder="Edite o HTML aqui..."
              />
            </TabsContent>
            <TabsContent value="preview">
              <iframe
                srcDoc={editedHtml}
                title="Preview Editado"
                className="w-full h-[600px] border rounded-md"
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
            <Button variant="outline" onClick={() => setState('generated')} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            Descrição E-commerce
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
