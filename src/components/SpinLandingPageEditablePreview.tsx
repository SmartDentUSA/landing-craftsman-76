import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Copy, 
  AlertCircle, 
  Save,
  X
} from 'lucide-react';

interface SpinLandingPageEditablePreviewProps {
  solutionId: string;
  initialHTML: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface EditedData {
  hero_title: string;
  hero_subtitle: string;
  metrics_title: string;
  metrics_subtitle: string;
  faq_title: string;
  cta_text: string;
  [key: string]: string;
}

export function SpinLandingPageEditablePreview({
  solutionId,
  initialHTML,
  onClose,
  onSaved
}: SpinLandingPageEditablePreviewProps) {
  const [html, setHtml] = useState(initialHTML);
  const [editedData, setEditedData] = useState<EditedData>({
    hero_title: '',
    hero_subtitle: '',
    metrics_title: '',
    metrics_subtitle: '',
    faq_title: '',
    cta_text: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentEditingField, setCurrentEditingField] = useState<string | null>(null);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Habilitar modo de edição no iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Injetar CSS para elementos editáveis
      const style = doc.createElement('style');
      style.textContent = `
        [data-editable] {
          outline: 2px dashed transparent;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        [data-editable]:hover {
          outline-color: #EE7A3E;
          background: rgba(238, 122, 62, 0.05);
        }
        [data-editable][contenteditable="true"] {
          outline-color: #3E4B5E;
          outline-style: solid;
          background: rgba(62, 75, 94, 0.08);
          box-shadow: 0 0 0 4px rgba(62, 75, 94, 0.1);
        }
        [data-editable]:hover::after {
          content: "✏️ Clique para editar";
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #3E4B5E;
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `;
      doc.head.appendChild(style);

      // Adicionar event listeners para edição
      doc.body.addEventListener('click', handleElementClick);
      doc.body.addEventListener('blur', handleElementBlur, true);
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [html]);

  const handleElementClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const editable = target.closest('[data-editable]') as HTMLElement;
    
    if (editable) {
      event.preventDefault();
      const field = editable.getAttribute('data-field');
      
      // Desabilitar outros elementos editáveis
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
          el.setAttribute('contenteditable', 'false');
        });
      }
      
      // Habilitar este elemento
      editable.setAttribute('contenteditable', 'true');
      editable.focus();
      setCurrentEditingField(field);
      setIsEditing(true);
    }
  };

  const handleElementBlur = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    if (target.hasAttribute('contenteditable')) {
      const field = target.getAttribute('data-field');
      const newValue = target.textContent || '';
      
      // Atualizar editedData
      if (field) {
        setEditedData(prev => ({
          ...prev,
          [field]: newValue
        }));
        
        setHasChanges(true);
      }
      
      target.setAttribute('contenteditable', 'false');
      setCurrentEditingField(null);
      setIsEditing(false);
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      // Buscar solução atual
      const { data: solution, error: fetchError } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .eq('id', solutionId)
        .single();

      if (fetchError) throw fetchError;

      // Preparar dados para atualização
      const updates: any = {
        landing_page_custom_text: {
          ...editedData
        }
      };

      // Atualizar título se foi editado
      if (editedData.hero_title && editedData.hero_title !== solution.title) {
        updates.title = editedData.hero_title;
      }

      // Salvar no banco
      const { error: updateError } = await supabase
        .from('spin_selling_solutions')
        .update(updates)
        .eq('id', solutionId);

      if (updateError) throw updateError;

      // Regenerar HTML com novos dados
      await regenerateHTML();

      toast({
        title: '✅ Alterações salvas',
        description: 'Landing page atualizada com sucesso'
      });
      
      setHasChanges(false);
      onSaved?.();
      
    } catch (error: any) {
      toast({
        title: '❌ Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateHTML = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-spin-landing-page',
        { body: { solutionId } }
      );

      if (error) throw error;
      
      // Buscar HTML atualizado do banco
      const { data: solution } = await supabase
        .from('spin_selling_solutions')
        .select('landing_page_html')
        .eq('id', solutionId)
        .single();
      
      if (solution?.landing_page_html) {
        setHtml(solution.landing_page_html);
      }
    } catch (error: any) {
      console.error('Erro ao regenerar HTML:', error);
    }
  };

  const copyUpdatedHTML = async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: '📋 Código copiado',
        description: 'HTML atualizado copiado para área de transferência'
      });
    } catch (error) {
      toast({
        title: '❌ Erro ao copiar',
        description: 'Não foi possível copiar o código',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              ✏️ Editor Visual da Landing Page
              {hasChanges && (
                <Badge variant="destructive" className="ml-2">
                  Alterações não salvas
                </Badge>
              )}
              {isEditing && currentEditingField && (
                <Badge variant="secondary" className="ml-2">
                  Editando: {currentEditingField}
                </Badge>
              )}
            </span>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveChanges}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={copyUpdatedHTML}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Instruções */}
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Como editar:</AlertTitle>
          <AlertDescription>
            <strong>Clique em qualquer texto</strong> (títulos, subtítulos, métricas, FAQs, CTA) para editá-lo diretamente.
            As alterações ficam destacadas em <span className="text-orange-600 font-semibold">laranja</span> ao passar o mouse.
            Clique em <strong>"Salvar Alterações"</strong> quando terminar.
          </AlertDescription>
        </Alert>

        {/* Preview Iframe */}
        <div className="flex-1 border rounded-lg overflow-hidden bg-white shadow-lg">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts"
            title="Preview da Landing Page"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
