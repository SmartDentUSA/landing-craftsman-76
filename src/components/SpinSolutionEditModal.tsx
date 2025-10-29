import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Package } from 'lucide-react';
import { useSpinSellingSolutions, SpinSellingSolution } from '@/hooks/useSpinSellingSolutions';
import { SpinProductSelector } from './SpinProductSelector';

interface SpinSolutionEditModalProps {
  solutionId?: string;
  onClose: () => void;
}

const PAIN_TYPES = [
  { value: 'delivery_speed', label: 'Velocidade de Entrega' },
  { value: 'competitive_edge', label: 'Vantagem Competitiva' },
  { value: 'patient_loss', label: 'Perda de Pacientes' },
  { value: 'training_fear', label: 'Medo de Treinamento' },
  { value: 'high_lab_costs', label: 'Custos Altos com Laboratório' },
  { value: 'lab_dependency', label: 'Dependência de Laboratório' },
  { value: 'financial_roi', label: 'Retorno Financeiro' },
  { value: 'quality_durability', label: 'Qualidade e Durabilidade' },
];

export function SpinSolutionEditModal({ solutionId, onClose }: SpinSolutionEditModalProps) {
  const { createSolution, updateSolution } = useSpinSellingSolutions();
  const [showProductSelector, setShowProductSelector] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<SpinSellingSolution>>({
    title: '',
    pain_type: 'delivery_speed',
    priority: 1,
    frequency: '',
    product_ids: [],
    real_quotes: [],
    pain_metrics: {},
    google_ads_headline: '',
    whatsapp_hook: '',
    storytelling_hook: '',
    case_study_name: '',
    active: true,
  });

  // Load existing solution
  const { data: existingSolution } = useQuery({
    queryKey: ['spin-solution', solutionId],
    queryFn: async () => {
      if (!solutionId) return null;
      const { data, error } = await supabase
        .from('spin_selling_solutions')
        .select('*')
        .eq('id', solutionId)
        .single();
      
      if (error) throw error;
      return data as SpinSellingSolution;
    },
    enabled: !!solutionId
  });

  useEffect(() => {
    if (existingSolution) {
      setFormData(existingSolution);
    }
  }, [existingSolution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.pain_type) {
      return;
    }

    const dataToSubmit = {
      title: formData.title,
      pain_type: formData.pain_type,
      priority: formData.priority || 1,
      frequency: formData.frequency,
      product_ids: formData.product_ids || [],
      real_quotes: formData.real_quotes || [],
      pain_metrics: formData.pain_metrics || {},
      google_ads_headline: formData.google_ads_headline,
      whatsapp_hook: formData.whatsapp_hook,
      storytelling_hook: formData.storytelling_hook,
      case_study_name: formData.case_study_name,
      active: formData.active ?? true,
    };

    if (solutionId) {
      await updateSolution.mutateAsync({ id: solutionId, updates: dataToSubmit });
    } else {
      await createSolution.mutateAsync(dataToSubmit);
    }
    
    onClose();
  };

  const addQuote = () => {
    setFormData(prev => ({
      ...prev,
      real_quotes: [
        ...(prev.real_quotes || []),
        { quote: '', timestamp: '', speaker: '' }
      ]
    }));
  };

  const removeQuote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      real_quotes: prev.real_quotes?.filter((_, i) => i !== index) || []
    }));
  };

  const updateQuote = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      real_quotes: prev.real_quotes?.map((quote, i) => 
        i === index ? { ...quote, [field]: value } : quote
      ) || []
    }));
  };

  const addMetric = () => {
    const key = prompt('Nome da métrica (ex: lab_time, digital_time):');
    if (key) {
      setFormData(prev => ({
        ...prev,
        pain_metrics: {
          ...prev.pain_metrics,
          [key]: ''
        }
      }));
    }
  };

  const removeMetric = (key: string) => {
    setFormData(prev => {
      const newMetrics = { ...prev.pain_metrics };
      delete newMetrics[key];
      return { ...prev, pain_metrics: newMetrics };
    });
  };

  const updateMetric = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pain_metrics: {
        ...prev.pain_metrics,
        [key]: value
      }
    }));
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {solutionId ? 'Editar Solução SPIN' : 'Nova Solução SPIN'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título da Solução *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Solução Velocidade Total"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="pain_type">Tipo de Dor *</Label>
                  <Select
                    value={formData.pain_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pain_type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAIN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>

                <div>
                  <Label htmlFor="frequency">Frequência</Label>
                  <Input
                    id="frequency"
                    value={formData.frequency || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="Ex: 14/20 reuniões"
                  />
                </div>
              </div>
            </div>

            {/* Products Selection */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Produtos da Solução</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductSelector(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Selecionar Produtos
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {formData.product_ids?.length || 0} produto(s) selecionado(s)
              </p>
            </Card>

            {/* Quotes */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Quotes Reais de Clientes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuote}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Quote
                </Button>
              </div>
              <div className="space-y-3">
                {formData.real_quotes?.map((quote, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Quote do cliente"
                        value={quote.quote}
                        onChange={(e) => updateQuote(index, 'quote', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Timestamp (ex: 02:20)"
                          value={quote.timestamp}
                          onChange={(e) => updateQuote(index, 'timestamp', e.target.value)}
                        />
                        <Input
                          placeholder="Nome do cliente"
                          value={quote.speaker || ''}
                          onChange={(e) => updateQuote(index, 'speaker', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuote(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Metrics */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label>Métricas de Impacto</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMetric}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Métrica
                </Button>
              </div>
              <div className="space-y-2">
                {Object.entries(formData.pain_metrics || {}).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <Input
                      value={key}
                      disabled
                      className="w-1/3"
                    />
                    <Input
                      placeholder="Valor da métrica"
                      value={value}
                      onChange={(e) => updateMetric(key, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMetric(key)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Campaign Content */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="google_ads">Google Ads Headline</Label>
                <Input
                  id="google_ads"
                  value={formData.google_ads_headline || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, google_ads_headline: e.target.value }))}
                  placeholder="Headline para Google Ads"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp Hook</Label>
                <Textarea
                  id="whatsapp"
                  value={formData.whatsapp_hook || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_hook: e.target.value }))}
                  placeholder="Gancho inicial para WhatsApp"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="storytelling">Storytelling Hook</Label>
                <Textarea
                  id="storytelling"
                  value={formData.storytelling_hook || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, storytelling_hook: e.target.value }))}
                  placeholder="História de transformação"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="case_study">Nome do Case</Label>
                <Input
                  id="case_study"
                  value={formData.case_study_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, case_study_name: e.target.value }))}
                  placeholder="Ex: Dr. João - Transformação Digital"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createSolution.isPending || updateSolution.isPending}
              >
                {solutionId ? 'Atualizar' : 'Criar'} Solução
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SpinProductSelector
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        selectedProductIds={formData.product_ids || []}
        onSelectProducts={(ids) => setFormData(prev => ({ ...prev, product_ids: ids }))}
      />
    </>
  );
}
