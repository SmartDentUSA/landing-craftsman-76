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
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Package,
  Download,
  MessageCircle,
  Copy,
  Check,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { 
  useSpinSellingSolutions, 
  SpinSellingSolution,
  SuccessCase,
  SpinJourneyQuote
} from '@/hooks/useSpinSellingSolutions';
import { SpinProductSelector } from './SpinProductSelector';
import { useToast } from '@/hooks/use-toast';

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

const METRIC_LABELS: Record<string, string> = {
  ROI: 'Tempo retorno de investimento',
  lab_time: 'Tempo de entrega atual',
  digital_time: 'Tempo com a solução',
  patient_loss: 'Perde % de pacientes',
  revenue_loss: 'Perde R$ por mês',
};

export function SpinSolutionEditModal({ solutionId, onClose }: SpinSolutionEditModalProps) {
  const { createSolution, updateSolution } = useSpinSellingSolutions();
  const { toast } = useToast();
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newMetric, setNewMetric] = useState({ key: '', value: '' });

  // Form state
  const [formData, setFormData] = useState<Partial<SpinSellingSolution>>({
    title: '',
    pain_type: 'delivery_speed',
    priority: 1,
    frequency: '',
    product_ids: [],
    
    // ✅ Arrays vazios por padrão
    success_cases: [],
    real_quotes: [],
    pain_metrics: {},
    
    // ✅ URL personalizada
    custom_url: {
      url: '',
      enabled: false,
      label: 'Saiba Mais'
    },
    
    // ⚡ Campos gerados pela IA (inicialmente null)
    google_ads_campaign: undefined,
    whatsapp_complete_message: undefined,
    storytelling_auto_generated: undefined,
    
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
      return data as any;
    },
    enabled: !!solutionId
  });

  useEffect(() => {
    if (existingSolution) {
      setFormData({
        ...existingSolution,
        success_cases: existingSolution.success_cases || [],
        real_quotes: existingSolution.real_quotes || [],
        pain_metrics: existingSolution.pain_metrics || {},
        custom_url: existingSolution.custom_url || { url: '', enabled: false, label: 'Saiba Mais' }
      });
    }
  }, [existingSolution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.pain_type) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o tipo de dor",
        variant: "destructive"
      });
      return;
    }

    const dataToSubmit = {
      title: formData.title,
      pain_type: formData.pain_type,
      priority: formData.priority || 1,
      frequency: formData.frequency,
      product_ids: formData.product_ids || [],
      
      // ✅ ARRAYS de casos e jornadas
      success_cases: formData.success_cases || [],
      real_quotes: formData.real_quotes || [],
      pain_metrics: formData.pain_metrics || {},
      
      // ✅ URL Personalizada
      custom_url: formData.custom_url || { url: '', enabled: false, label: 'Saiba Mais' },
      
      // ⚡ Campos gerados pela IA (só salvos se existirem)
      google_ads_campaign: formData.google_ads_campaign,
      whatsapp_complete_message: formData.whatsapp_complete_message,
      storytelling_auto_generated: formData.storytelling_auto_generated,
      
      active: formData.active ?? true,
    };

    try {
      if (solutionId) {
        await updateSolution.mutateAsync({ id: solutionId, updates: dataToSubmit });
      } else {
        await createSolution.mutateAsync(dataToSubmit as any);
      }
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Success Cases Handlers
  const addSuccessCase = () => {
    setFormData(prev => ({
      ...prev,
      success_cases: [
        ...(prev.success_cases || []),
        {
          client_name: '',
          specialty: '',
          area: '',
          city: '',
          state: '',
          instagram: '',
          clinic_name: '',
          usage_time: '',
          results_achieved: ''
        }
      ]
    }));
  };

  const removeSuccessCase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      success_cases: prev.success_cases?.filter((_, i) => i !== index) || []
    }));
  };

  const updateSuccessCase = (index: number, field: keyof SuccessCase, value: string) => {
    setFormData(prev => ({
      ...prev,
      success_cases: prev.success_cases?.map((sc, i) =>
        i === index ? { ...sc, [field]: value } : sc
      ) || []
    }));
  };

  // SPIN Journey Handlers
  const addSpinQuote = () => {
    setFormData(prev => ({
      ...prev,
      real_quotes: [
        ...(prev.real_quotes || []),
        { client_name: '', desire: '', pain: '', expected_result: '' }
      ]
    }));
  };

  const removeSpinQuote = (index: number) => {
    setFormData(prev => ({
      ...prev,
      real_quotes: prev.real_quotes?.filter((_, i) => i !== index) || []
    }));
  };

  const updateSpinQuote = (index: number, field: keyof SpinJourneyQuote, value: string) => {
    setFormData(prev => ({
      ...prev,
      real_quotes: prev.real_quotes?.map((quote, i) =>
        i === index ? { ...quote, [field]: value } : quote
      ) || []
    }));
  };

  // Metrics Handlers
  const removeMetric = (key: string) => {
    setFormData(prev => {
      const newMetrics = { ...(prev.pain_metrics || {}) };
      delete newMetrics[key];
      return { ...prev, pain_metrics: newMetrics };
    });
  };

  const updateMetric = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pain_metrics: {
        ...(prev.pain_metrics || {}),
        [key]: value
      }
    }));
  };

  const addCustomMetric = () => {
    const trimmedKey = newMetric.key.trim();
    const trimmedValue = newMetric.value.trim();
    
    if (!trimmedKey || !trimmedValue) return;
    
    // Verificar se já existe
    if (formData.pain_metrics && trimmedKey in formData.pain_metrics) {
      toast({
        title: "Métrica já existe",
        description: `A métrica "${trimmedKey}" já foi adicionada`,
        variant: "destructive"
      });
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      pain_metrics: { 
        ...(prev.pain_metrics || {}), 
        [trimmedKey]: trimmedValue 
      }
    }));
    
    setNewMetric({ key: '', value: '' });
    
    toast({
      title: "✅ Métrica adicionada!",
      description: `${trimmedKey}: ${trimmedValue}`,
    });
  };

  // AI Generation Handlers
  const handleGenerateGoogleAds = async () => {
    if (!solutionId) {
      toast({
        title: "Salve primeiro!",
        description: "Salve a solução antes de gerar campanhas",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spin-campaign', {
        body: {
          solutionId: solutionId,
          contentType: 'google_ads'
        }
      });
      
      if (error) throw error;
      
      // Download CSV
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spin-google-ads-${formData.title?.replace(/\s+/g, '-') || 'solution'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      // ✅ SOBRESCREVER google_ads_campaign no formData
      setFormData(prev => ({
        ...prev,
        google_ads_campaign: data.campaign
      }));
      
      toast({ 
        title: "✅ Sucesso!", 
        description: "CSV baixado. Salve novamente para persistir no banco." 
      });
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWhatsApp = async () => {
    if (!solutionId) {
      toast({
        title: "Salve primeiro!",
        description: "Salve a solução antes de gerar mensagens",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spin-campaign', {
        body: {
          solutionId: solutionId,
          contentType: 'whatsapp'
        }
      });
      
      if (error) throw error;
      
      // ✅ SOBRESCREVER whatsapp_complete_message e storytelling no formData
      setFormData(prev => ({
        ...prev,
        whatsapp_complete_message: data.message,
        storytelling_auto_generated: data.storytelling
      }));
      
      toast({ 
        title: "✅ Sucesso!", 
        description: "Mensagem gerada. Salve novamente para persistir no banco." 
      });
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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

            {/* ===== SEÇÃO: CASOS DE SUCESSO (MÚLTIPLOS) ===== */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold">✅ Casos de Sucesso</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSuccessCase}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Caso
                </Button>
              </div>
              
              {formData.success_cases?.map((successCase, index) => (
                <Card key={index} className="p-4 mb-3 bg-muted/30">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">Caso #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSuccessCase(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Nome Completo *"
                      value={successCase.client_name}
                      onChange={(e) => updateSuccessCase(index, 'client_name', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Instagram (@usuario)"
                      value={successCase.instagram}
                      onChange={(e) => updateSuccessCase(index, 'instagram', e.target.value)}
                    />
                    <Input
                      placeholder="Especialidade *"
                      value={successCase.specialty}
                      onChange={(e) => updateSuccessCase(index, 'specialty', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Área de Atuação *"
                      value={successCase.area}
                      onChange={(e) => updateSuccessCase(index, 'area', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Cidade *"
                      value={successCase.city}
                      onChange={(e) => updateSuccessCase(index, 'city', e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Estado (UF) *"
                      maxLength={2}
                      value={successCase.state}
                      onChange={(e) => updateSuccessCase(index, 'state', e.target.value.toUpperCase())}
                      required
                    />
                    <Input
                      placeholder="Nome da Clínica (opcional)"
                      value={successCase.clinic_name || ''}
                      onChange={(e) => updateSuccessCase(index, 'clinic_name', e.target.value)}
                    />
                    <Input
                      placeholder="Tempo de Uso (opcional)"
                      value={successCase.usage_time || ''}
                      onChange={(e) => updateSuccessCase(index, 'usage_time', e.target.value)}
                    />
                  </div>
                  
                  <Textarea
                    className="mt-3"
                    placeholder="Resultados Alcançados *"
                    value={successCase.results_achieved}
                    onChange={(e) => updateSuccessCase(index, 'results_achieved', e.target.value)}
                    rows={3}
                    required
                  />
                </Card>
              ))}
              
              {formData.success_cases?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum caso adicionado ainda. Clique em "Adicionar Caso" para começar.
                </p>
              )}
            </Card>

            {/* ===== SEÇÃO: JORNADA SPIN DOS CLIENTES ===== */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold">💬 Jornada SPIN (Desejo → Dor → Resultado)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpinQuote}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Jornada
                </Button>
              </div>
              
              {formData.real_quotes?.map((quote, index) => (
                <Card key={index} className="p-4 mb-3 bg-blue-50/50">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium text-blue-900">Cliente #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSpinQuote(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <Input
                    placeholder="Nome do Cliente"
                    value={quote.client_name}
                    onChange={(e) => updateSpinQuote(index, 'client_name', e.target.value)}
                    className="mb-3"
                  />
                  
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-1">
                      🎯 Campo 1: O que o cliente QUERIA?
                    </Label>
                    <Textarea
                      placeholder='Ex: "Queria aumentar a produtividade em 50%"'
                      value={quote.desire}
                      onChange={(e) => updateSpinQuote(index, 'desire', e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-1">
                      ⚠️ Campo 2: Qual DOR ele enfrentava?
                    </Label>
                    <Textarea
                      placeholder='Ex: "Perdia 3h/dia em processos manuais"'
                      value={quote.pain}
                      onChange={(e) => updateSpinQuote(index, 'pain', e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">
                      ✅ Campo 3: Qual RESULTADO esperava?
                    </Label>
                    <Textarea
                      placeholder='Ex: "Reduzir tempo de entrega de 7 dias para 24h"'
                      value={quote.expected_result}
                      onChange={(e) => updateSpinQuote(index, 'expected_result', e.target.value)}
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
              
              {formData.real_quotes?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma jornada adicionada ainda.
                </p>
              )}
            </Card>

            {/* ===== SEÇÃO: MÉTRICAS DE IMPACTO ===== */}
            <Card className="p-4">
              <Label className="text-lg font-semibold mb-4 block">📊 Métricas de Impacto</Label>
              
              {/* Métricas Recomendadas */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded" />
                  Métricas Recomendadas
                </h4>
                <div className="space-y-3">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <div key={key} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                          {label}
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded">
                            {key}
                          </span>
                        </Label>
                        <Input
                          placeholder={`Ex: ${key === 'ROI' ? '6 meses' : key === 'patient_loss' ? '15%' : key === 'revenue_loss' ? 'R$ 5.000' : '7 dias → 24h'}`}
                          value={formData.pain_metrics?.[key] || ''}
                          onChange={(e) => updateMetric(key, e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Divisor */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    Métricas Personalizadas
                  </span>
                </div>
              </div>
              
              {/* Adicionar Métrica Personalizada */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Adicionar Métrica Personalizada
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex.: lead_time, capex, opex"
                    value={newMetric.key}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, key: e.target.value }))}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="Valor da métrica"
                    value={newMetric.value}
                    onChange={(e) => setNewMetric(prev => ({ ...prev, value: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addCustomMetric}
                    disabled={!newMetric.key.trim() || !newMetric.value.trim()}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Métricas Personalizadas Existentes */}
              {(() => {
                const customMetrics = Object.entries(formData.pain_metrics || {})
                  .filter(([key]) => !(key in METRIC_LABELS));
                
                return customMetrics.length > 0 ? (
                  <div className="space-y-2">
                    {customMetrics.map(([key, value]) => (
                      <div key={key} className="flex gap-2 items-center">
                        <Input value={key} disabled className="w-1/3 bg-muted" />
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
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg border-2 border-dashed">
                    <p className="font-medium mb-1">Nenhuma métrica personalizada</p>
                    <p className="text-xs">Preencha os campos acima e clique em "+" para adicionar</p>
                  </div>
                );
              })()}
            </Card>

            {/* ===== SEÇÃO: URL PERSONALIZADA ===== */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  URL Personalizada para Campanhas
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.custom_url?.enabled || false}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({
                        ...prev,
                        custom_url: { 
                          ...prev.custom_url!, 
                          url: prev.custom_url?.url || '', 
                          label: prev.custom_url?.label || 'Saiba Mais',
                          enabled: checked 
                        }
                      }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.custom_url?.enabled ? '✅ Ativado' : '⚪ Desativado'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="URL (ex: https://smartdent.com.br/promo)"
                  value={formData.custom_url?.url || ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      custom_url: { 
                        ...prev.custom_url!, 
                        url: e.target.value 
                      }
                    }))
                  }
                  type="url"
                  disabled={!formData.custom_url?.enabled}
                />
                <Input
                  placeholder='Texto do Link (ex: "Comprar Agora")'
                  value={formData.custom_url?.label || 'Saiba Mais'}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      custom_url: { 
                        ...prev.custom_url!, 
                        label: e.target.value 
                      }
                    }))
                  }
                  disabled={!formData.custom_url?.enabled}
                />
              </div>
              
              {formData.custom_url?.enabled && formData.custom_url?.url && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Esta URL será usada em: Google Ads CSV, Mensagens WhatsApp e Landing Pages
                </p>
              )}
            </Card>

            {/* ===== GERAÇÃO DE CONTEÚDO POR IA (APENAS SE JÁ SALVO) ===== */}
            {solutionId && formData.product_ids && formData.product_ids.length > 0 && (
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Gerar Conteúdos por IA</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  ⚠️ Os conteúdos gerados <strong>sobrescreverão</strong> os campos correspondentes. 
                  Salve novamente após gerar.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Google Ads CSV */}
                  <Button
                    type="button"
                    onClick={handleGenerateGoogleAds}
                    disabled={isGenerating}
                    className="h-auto py-4 flex flex-col items-start gap-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Download className="w-5 h-5" />
                      <span className="font-semibold">Google Ads CSV</span>
                    </div>
                    <span className="text-xs opacity-80 text-left">
                      Gera campanha completa com keywords dos produtos
                    </span>
                  </Button>
                  
                  {/* WhatsApp Completo */}
                  <Button
                    type="button"
                    onClick={handleGenerateWhatsApp}
                    disabled={isGenerating || !formData.success_cases || formData.success_cases.length === 0}
                    className="h-auto py-4 flex flex-col items-start gap-2"
                    variant="secondary"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">WhatsApp Completo</span>
                    </div>
                    <span className="text-xs opacity-80 text-left">
                      Gera mensagem copy-paste com storytelling + case
                    </span>
                  </Button>
                </div>
                
                {/* Preview WhatsApp Message */}
                {formData.whatsapp_complete_message && (
                  <Card className="mt-4 p-4 bg-background">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-green-700 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Mensagem WhatsApp Gerada
                      </h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.whatsapp_complete_message!);
                          toast({ title: "Copiado!", description: "Mensagem copiada" });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-3 rounded-lg border max-h-60 overflow-y-auto">
                      {formData.whatsapp_complete_message}
                    </pre>
                  </Card>
                )}
                
                {/* Storytelling Gerado */}
                {formData.storytelling_auto_generated && (
                  <Card className="mt-4 p-4 bg-background">
                    <h4 className="font-semibold text-blue-700 mb-2">📖 Storytelling Gerado</h4>
                    <p className="text-sm">{formData.storytelling_auto_generated}</p>
                  </Card>
                )}
              </Card>
            )}

            {/* Aviso caso não tenha salvado ainda */}
            {!solutionId && (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Salve a solução primeiro</strong> para poder gerar conteúdos por IA
                </p>
              </Card>
            )}

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
