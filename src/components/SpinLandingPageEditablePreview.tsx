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
  X,
  RefreshCw,
  Clock
} from 'lucide-react';

interface SpinLandingPageEditablePreviewProps {
  solutionId: string;
  initialHTML: string;
  onClose: () => void;
  onSaved?: () => void;
  generatedAt?: string;
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
  onSaved,
  generatedAt
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
  const [lastGeneratedAt, setLastGeneratedAt] = useState(generatedAt);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // 🔄 Mudança 1: Sincronizar HTML quando initialHTML mudar
  useEffect(() => {
    setHtml(initialHTML);
  }, [initialHTML]);

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

      toast({
        title: '💾 Salvando...',
        description: 'Regenerando HTML com as alterações'
      });

      // 🔥 Mudança 3: Chamar Edge Function para regenerar HTML
      const { error: generateError } = await supabase.functions.invoke(
        'generate-spin-landing-page',
        { body: { solutionId } }
      );

      if (generateError) throw generateError;

      // ⏳ Mudança 3: Aguardar Edge Function salvar no banco (polling até 4 tentativas, 500ms cada)
      const currentTimestamp = lastGeneratedAt;
      let attempts = 0;
      let newTimestamp = currentTimestamp;

      while (attempts < 4 && newTimestamp === currentTimestamp) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: check } = await supabase
          .from('spin_selling_solutions')
          .select('landing_page_generated_at')
          .eq('id', solutionId)
          .single();
        
        if (check?.landing_page_generated_at !== currentTimestamp) {
          newTimestamp = check.landing_page_generated_at;
          break;
        }
        
        attempts++;
      }

      console.log(`⏱️ Polling concluído após ${attempts} tentativas`);

      // Buscar HTML regenerado
      await regenerateHTML();

      toast({
        title: '✅ Alterações salvas e HTML regenerado',
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
      toast({
        title: '🔄 Recarregando HTML...',
        description: 'Buscando versão atualizada do banco de dados',
      });

      // 🔄 Mudança 4: Buscar HTML E timestamp atualizado
      const { data: solution, error } = await supabase
        .from('spin_selling_solutions')
        .select('landing_page_html, landing_page_generated_at')
        .eq('id', solutionId)
        .single();
      
      if (error) throw error;
      
      if (solution?.landing_page_html) {
        setHtml(solution.landing_page_html);
        setLastGeneratedAt(solution.landing_page_generated_at);
        toast({
          title: '✅ HTML recarregado',
          description: 'Preview atualizado com a versão mais recente',
        });
      }
    } catch (error: any) {
      console.error('Erro ao recarregar HTML:', error);
      toast({
        title: '❌ Erro ao recarregar',
        description: error.message,
        variant: 'destructive',
      });
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
              {lastGeneratedAt && (
                <Badge variant="outline" className="ml-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(lastGeneratedAt).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </Badge>
              )}
            </span>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateHTML}
                title="Recarregar HTML do banco de dados"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              
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
                Salvar
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={copyUpdatedHTML}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
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
