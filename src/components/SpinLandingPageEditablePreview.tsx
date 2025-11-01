import { useState, useRef, useEffect, useCallback } from 'react';
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
  Clock,
  RotateCcw
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
  comparison_title?: string;
  comparison_subtitle?: string;
  [key: string]: string | undefined;
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
    comparison_title: '',
    comparison_subtitle: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentEditingField, setCurrentEditingField] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState(generatedAt);
  const [editableElementsCount, setEditableElementsCount] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // ✅ Event Handlers com tipo genérico Event (compatível com iframe)
  const handleElementClick = useCallback((event: Event) => {
    console.log('🎯 [Editor] handleElementClick disparado!', event.type);
    const target = event.target as HTMLElement | null;
    console.log('🎯 [Editor] Target:', target?.tagName, target?.getAttribute('data-field'));
    
    const editable = target?.closest('[data-editable]') as HTMLElement | null;
    
    if (!editable) {
      console.log('⚠️ [Editor] Elemento clicado não é editável');
      return;
    }
    
    event.preventDefault();
    event.stopPropagation(); // Prevenir propagação
    
    const field = editable.getAttribute('data-field');
    console.log('🖱️ [Editor] Clicou em:', field, '→', editable.textContent?.substring(0, 50));
    
    // Caso FAQ: garantir que <details> fique aberto
    if (editable.tagName.toLowerCase() === 'summary') {
      const details = editable.closest('details') as HTMLDetailsElement | null;
      if (details) details.open = true;
    }
    
    // Desabilitar outros elementos editáveis
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.querySelectorAll('[contenteditable="true"]').forEach(el => {
        el.setAttribute('contenteditable', 'false');
      });
    }
    
    // Habilitar edição com fallback plaintext-only
    editable.setAttribute('contenteditable', 'plaintext-only');
    if (editable.contentEditable !== 'plaintext-only') {
      editable.setAttribute('contenteditable', 'true');
    }
    
    // Remover user-select: none durante edição (especialmente em summary)
    editable.dataset.prevUserSelect = editable.style.userSelect || '';
    editable.style.userSelect = 'text';
    (editable.style as any).webkitUserSelect = 'text';
    
    // Focar e posicionar caret ao final
    const sel = iframeRef.current?.contentWindow?.getSelection();
    const range = doc!.createRange();
    range.selectNodeContents(editable);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    
    setCurrentEditingField(field);
    setIsEditing(true);
    
    console.log('✅ [Editor] Campo ativado para edição:', field);
  }, []);

  const handleElementBlur = useCallback((event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.hasAttribute('contenteditable')) {
      console.log('⚠️ [Editor] Elemento sem contenteditable');
      return;
    }
    
    const field = target.getAttribute('data-field') || '';
    const newValue = target.textContent || '';
    
    console.log('💾 [Editor] Salvou edição:', field, '→', newValue.substring(0, 50));
    
    // Atualizar editedData
    if (field) {
      setEditedData(prev => {
        const updated = {
          ...prev,
          [field]: newValue
        };
        console.log('💾 [Editor] editedData atualizado:', Object.keys(updated).filter(k => updated[k]).length, 'campos');
        return updated;
      });
      
      setHasChanges(true);
    }
    
    // Restaurar user-select original e desativar edição
    target.style.userSelect = target.dataset.prevUserSelect || '';
    (target.style as any).webkitUserSelect = target.dataset.prevUserSelect || '';
    target.removeAttribute('data-prev-user-select');
    target.setAttribute('contenteditable', 'false');
    
    setCurrentEditingField(null);
    setIsEditing(false);
  }, []);

  // 🔄 Mudança 1: Sincronizar HTML quando initialHTML mudar
  useEffect(() => {
    setHtml(initialHTML);
  }, [initialHTML]);

  // Habilitar modo de edição no iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const injectListeners = (attempt = 1) => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.body) {
        console.log(`🎯 [Editor] Tentativa ${attempt} - Documento não disponível`);
        return false;
      }

      // Remover listeners antigos do document (previne duplicatas)
      doc.removeEventListener('click', handleElementClick as any, true);
      doc.removeEventListener('pointerdown', handleElementClick as any, true);
      doc.removeEventListener('focusout', handleElementBlur as any, true);

      // Verificar se já injetou CSS (evitar duplicatas)
      if (doc.head.querySelector('style[data-editable-injected]')) {
        console.log('✅ [Editor] CSS já injetado, apenas reaplicando listeners');
      } else {
        // Injetar CSS para elementos editáveis
        const style = doc.createElement('style');
        style.setAttribute('data-editable-injected', 'true');
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
      }

      const editableElements = doc.querySelectorAll('[data-editable]');
      setEditableElementsCount(editableElements.length);
      console.log(`🎯 [Editor] Tentativa ${attempt} - Elementos editáveis encontrados:`, editableElements.length);

      if (editableElements.length === 0) {
        console.error('❌ [Editor] NENHUM elemento [data-editable] encontrado!');
        console.log('📄 [Editor] Amostra do HTML (primeiros 500 chars):');
        console.log(doc.body.innerHTML.substring(0, 500));
      } else {
        console.log('✅ [Editor] Primeiro elemento editável:', editableElements[0]);
        console.log('  - Tag:', editableElements[0].tagName);
        console.log('  - data-field:', editableElements[0].getAttribute('data-field'));
        console.log('  - Text content:', editableElements[0].textContent?.substring(0, 50));
      }

      // Adicionar listeners ao document com capture
      doc.addEventListener('click', handleElementClick as any, true);
      doc.addEventListener('pointerdown', handleElementClick as any, true);
      doc.addEventListener('focusout', handleElementBlur as any, true);
      
      console.log(`✅ [Editor] Listeners injetados com sucesso na tentativa ${attempt}`);
      console.log('  - click handler:', typeof handleElementClick);
      console.log('  - blur handler:', typeof handleElementBlur);
      console.log('  - document element:', !!doc);
      return true;
    };

    // ✅ TENTATIVA 1: Injetar imediatamente se iframe já carregou (200ms de delay)
    if (iframe.contentDocument?.readyState === 'complete' || 
        iframe.contentDocument?.readyState === 'interactive') {
      console.log('🔄 [Editor] Iframe já carregado, injetando imediatamente');
      setTimeout(() => injectListeners(1), 200);
    }

    // ✅ TENTATIVA 2: Listener de load como backup
    const handleLoad = () => {
      console.log('🔄 [Editor] Evento load disparado, injetando listeners');
      setTimeout(() => injectListeners(2), 100);
    };

    iframe.addEventListener('load', handleLoad);

    // ✅ TENTATIVA 3: Polling robusto como último recurso (3 tentativas, 300ms cada)
    let pollingAttempts = 0;
    const maxPollingAttempts = 3;
    const pollingInterval = setInterval(() => {
      pollingAttempts++;
      
      if (pollingAttempts > maxPollingAttempts) {
        clearInterval(pollingInterval);
        console.error('❌ [Editor] Falha após 3 tentativas de polling. Elementos editáveis podem não funcionar.');
        toast({
          title: '⚠️ Aviso do Editor',
          description: 'Clique em "Recarregar Editor" se a edição não funcionar',
          variant: 'default'
        });
        return;
      }

      const doc = iframe.contentDocument;
      if (doc && doc.body && doc.querySelectorAll('[data-editable]').length > 0) {
        const alreadyInjected = doc.head.querySelector('style[data-editable-injected]');
        if (!alreadyInjected) {
          console.log(`🔄 [Editor] Polling tentativa ${pollingAttempts}/${maxPollingAttempts}`);
          const success = injectListeners(2 + pollingAttempts);
          if (success) {
            clearInterval(pollingInterval);
          }
        } else {
          clearInterval(pollingInterval);
        }
      }
    }, 300);
    
    return () => {
      iframe.removeEventListener('load', handleLoad);
      clearInterval(pollingInterval);
    };
  }, [html, handleElementClick, handleElementBlur, toast]); // ✅ FASE 1.3: Adicionar handlers como dependências

  // ✅ FASE 1.4: Funções antigas removidas (agora são useCallback antes do useEffect)

  // ✅ FASE 2: Função para forçar reinjeção manual dos listeners (CORRIGIDA)
  const forceInjectListeners = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) {
      toast({
        title: '❌ Erro',
        description: 'Iframe não está carregado',
        variant: 'destructive'
      });
      return;
    }

    const doc = iframe.contentDocument;
    
    // Remover listeners antigos do document
    doc.removeEventListener('click', handleElementClick as any, true);
    doc.removeEventListener('pointerdown', handleElementClick as any, true);
    doc.removeEventListener('focusout', handleElementBlur as any, true);
    
    // ✅ Remover estilo CSS anterior
    const existingStyle = doc.head.querySelector('style[data-editable-injected]');
    if (existingStyle) {
      existingStyle.remove();
    }

    // ✅ Reinjetar CSS completo
    const style = doc.createElement('style');
    style.setAttribute('data-editable-injected', 'true');
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

    // Readicionar listeners ao document com capture
    doc.addEventListener('click', handleElementClick as any, true);
    doc.addEventListener('pointerdown', handleElementClick as any, true);
    doc.addEventListener('focusout', handleElementBlur as any, true);
    
    const editableElements = doc.querySelectorAll('[data-editable]');
    setEditableElementsCount(editableElements.length);
    console.log('✅ [Editor] Listeners reinjetados manualmente:', editableElements.length, 'elementos');
    
    toast({
      title: '✅ Editor reiniciado',
      description: `${editableElements.length} elementos editáveis prontos`,
    });
  }, [handleElementClick, handleElementBlur, toast]);

  const saveChanges = async () => {
    setIsSaving(true);
    
    try {
      // Ler o HTML atual do iframe
      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        throw new Error('Iframe não está disponível');
      }

      // Clonar documento para sanitizar
      const clone = doc.cloneNode(true) as Document;
      
      // Remover CSS injetado do editor
      clone.head.querySelector('style[data-editable-injected]')?.remove();
      
      // Remover todos os atributos contenteditable
      clone.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
      });
      
      // Remover atributos data-prev-user-select
      clone.querySelectorAll('[data-prev-user-select]').forEach(el => {
        el.removeAttribute('data-prev-user-select');
      });
      
      // Remover estilos inline de user-select
      clone.querySelectorAll('[style]').forEach(el => {
        const element = el as HTMLElement;
        const style = element.style;
        
        if (style.userSelect || (style as any).webkitUserSelect || 
            (style as any).mozUserSelect || (style as any).msUserSelect) {
          style.userSelect = '';
          (style as any).webkitUserSelect = '';
          (style as any).mozUserSelect = '';
          (style as any).msUserSelect = '';
          
          // Se não sobrou nenhum estilo, remover o atributo style
          if (!element.getAttribute('style')?.trim()) {
            element.removeAttribute('style');
          }
        }
      });

      // Serializar HTML limpo
      const finalHtml = '<!DOCTYPE html>\n' + clone.documentElement.outerHTML;
      
      // Salvar diretamente no banco de dados
      const newTimestamp = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('spin_selling_solutions')
        .update({
          landing_page_html: finalHtml,
          landing_page_generated_at: newTimestamp
        })
        .eq('id', solutionId);

      if (updateError) throw updateError;

      // Atualizar estado local
      setHtml(finalHtml);
      setLastGeneratedAt(newTimestamp);
      setHasChanges(false);

      toast({
        title: '✅ HTML sobrescrito',
        description: 'Landing page atualizada com sucesso'
      });
      
      // Notificar componente pai para recarregar dados
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
      // Copiar HTML sanitizado do iframe (igual ao que é salvo)
      const doc = iframeRef.current?.contentDocument;
      if (!doc) {
        await navigator.clipboard.writeText(html);
      } else {
        const clone = doc.cloneNode(true) as Document;
        
        // Sanitizar (mesma lógica do saveChanges)
        clone.head.querySelector('style[data-editable-injected]')?.remove();
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        clone.querySelectorAll('[data-prev-user-select]').forEach(el => el.removeAttribute('data-prev-user-select'));
        
        clone.querySelectorAll('[style]').forEach(el => {
          const element = el as HTMLElement;
          const style = element.style;
          if (style.userSelect || (style as any).webkitUserSelect || 
              (style as any).mozUserSelect || (style as any).msUserSelect) {
            style.userSelect = '';
            (style as any).webkitUserSelect = '';
            (style as any).mozUserSelect = '';
            (style as any).msUserSelect = '';
            if (!element.getAttribute('style')?.trim()) {
              element.removeAttribute('style');
            }
          }
        });
        
        const finalHtml = '<!DOCTYPE html>\n' + clone.documentElement.outerHTML;
        await navigator.clipboard.writeText(finalHtml);
      }
      
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
              {/* Badge de Debug - Mostra quantas edições foram capturadas */}
              {Object.keys(editedData).filter(k => editedData[k]).length > 0 && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                  ✅ {Object.keys(editedData).filter(k => editedData[k]).length} edições capturadas
                </Badge>
              )}
              {/* ✅ FASE 3.3: Badge de contador de elementos editáveis */}
              {editableElementsCount > 0 && (
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-300">
                  🎯 {editableElementsCount} campos editáveis
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
                onClick={forceInjectListeners}
                title="Recarregar listeners de edição se a edição não funcionar"
              >
                🔄 Recarregar Editor
              </Button>

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
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm('⚠️ Isso vai resetar TODAS as edições manuais e regenerar do zero. Confirmar?')) return;
                  
                  setIsSaving(true);
                  try {
                    // Limpar landing_page_custom_text do banco
                    const { error } = await supabase
                      .from('spin_selling_solutions')
                      .update({ landing_page_custom_text: null })
                      .eq('id', solutionId);
                    
                    if (error) throw error;
                    
                    // Regenerar HTML do zero
                    const { error: regenerateError } = await supabase.functions.invoke(
                      'generate-spin-landing-page',
                      { body: { solutionId } }
                    );
                    
                    if (regenerateError) throw regenerateError;
                    
                    toast({
                      title: "✅ Resetado!",
                      description: "Textos originais da IA foram restaurados",
                    });
                    
                    // Recarregar preview
                    setTimeout(() => regenerateHTML(), 2000);
                  } catch (err) {
                    console.error(err);
                    toast({
                      title: "❌ Erro",
                      description: "Falha ao resetar landing page",
                      variant: "destructive"
                    });
                  } finally {
                    setIsSaving(false);
                  }
                }}
                title="Resetar todas as edições e regenerar do zero"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Tudo
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
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals"
            title="Preview da Landing Page"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
