import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Target, TrendingUp, MessageCircle, Copy } from 'lucide-react';
import { useSpinSellingSolutions } from '@/hooks/useSpinSellingSolutions';
import { SpinSolutionEditModal } from './SpinSolutionEditModal';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAIN_TYPE_LABELS: Record<string, string> = {
  delivery_speed: 'Velocidade de Entrega',
  competitive_edge: 'Vantagem Competitiva',
  patient_loss: 'Perda de Pacientes',
  training_fear: 'Medo de Treinamento',
  high_lab_costs: 'Custos Altos',
  lab_dependency: 'Dependência de Lab',
  financial_roi: 'ROI Financeiro',
  quality_durability: 'Qualidade',
};

export function SpinSellingManager() {
  const { solutions, isLoading, deleteSolution } = useSpinSellingSolutions();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deletingId) {
      await deleteSolution.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando soluções SPIN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            SPIN Selling
          </h2>
          <p className="text-muted-foreground mt-1">
            Estratégias comerciais baseadas em combinações de produtos
          </p>
        </div>
        <Button onClick={() => setEditingId('new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Solução
        </Button>
      </div>

      {/* Solutions Grid */}
      {solutions && solutions.length > 0 ? (
        <div className="grid gap-4">
          {solutions.map(solution => (
            <Card key={solution.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                {/* Main Content */}
                <div className="flex-1 space-y-3">
                  {/* Title and Priority */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        {solution.title}
                        <Badge variant="outline" className="ml-2">
                          Prioridade {solution.priority}
                        </Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {PAIN_TYPE_LABELS[solution.pain_type]}
                        {solution.frequency && ` • ${solution.frequency}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{solution.product_ids.length}</span>
                      <span className="text-muted-foreground">produtos</span>
                    </div>
                    
                    {solution.real_quotes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{solution.real_quotes.length}</span>
                        <span className="text-muted-foreground">quotes</span>
                      </div>
                    )}
                    
                    {Object.keys(solution.pain_metrics).length > 0 && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{Object.keys(solution.pain_metrics).length}</span>
                        <span className="text-muted-foreground">métricas</span>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Message Preview */}
                  {solution.whatsapp_complete_message && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-200">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                          <MessageCircle className="w-4 h-4" />
                          Mensagem WhatsApp pronta
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(solution.whatsapp_complete_message!);
                            toast({ title: "✅ Copiado!", description: "Mensagem WhatsApp copiada" });
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        {solution.whatsapp_complete_message.length} caracteres • 
                        {solution.whatsapp_complete_message.includes('Impacto real:') ? ' Com métricas' : ' Sem métricas'}
                      </p>
                    </div>
                  )}

                  {/* Metrics Preview */}
                  {Object.keys(solution.pain_metrics).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(solution.pain_metrics).slice(0, 3).map(([key, value]) => {
                        // Converter value para string se for CustomMetric
                        const displayValue = typeof value === 'object' && value !== null && 'label' in value
                          ? `${value.label}: ${value.value}${value.unit}`
                          : String(value);
                        
                        return (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {displayValue}
                          </Badge>
                        );
                      })}
                      {Object.keys(solution.pain_metrics).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{Object.keys(solution.pain_metrics).length - 3} mais
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingId(solution.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(solution.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma solução SPIN criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira estratégia comercial combinando produtos
            </p>
            <Button onClick={() => setEditingId('new')}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Solução
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Modal */}
      {editingId && (
        <SpinSolutionEditModal
          solutionId={editingId === 'new' ? undefined : editingId}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta solução SPIN? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
