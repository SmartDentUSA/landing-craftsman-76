import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/tag-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Combobox } from '@/components/ui/combobox';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { useCategoryContext } from '@/contexts/CategoryContext';
import { Plus, Edit, Trash2, Save, X, Info, FileEdit, Users, Target, Hash, TrendingUp, Search, Calendar, CheckCircle, AlertTriangle, XCircle, Folder, User, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ConfigCard } from './ConfigCard';

interface CategoryFormData {
  category: string;
  subcategory: string;
  target_audience: string[];
  keywords: string[];
  market_keywords: string[];
  search_intent_keywords: string[];
}

interface RenameData {
  type: 'category' | 'subcategory';
  oldName: string;
  newName: string;
  category?: string;
}

const CategoryManager = () => {
  const { configs, loading, createConfig, updateConfig, deleteConfig } = useCategoryConfig();
  const { unifiedCategories, unifiedSubcategories, getUnifiedSubcategoriesForCategory, notifyCategoryChange } = useCategoryContext();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [renameMode, setRenameMode] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameData, setRenameData] = useState<RenameData>({
    type: 'category',
    oldName: '',
    newName: '',
    category: ''
  });
  const [formData, setFormData] = useState<CategoryFormData>({
    category: '',
    subcategory: '',
    target_audience: [],
    keywords: [],
    market_keywords: [],
    search_intent_keywords: []
  });
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(new Set());

  // Filtrar subcategorias com base na categoria selecionada
  const availableSubcategories = useMemo(() => {
    if (!formData.category) return unifiedSubcategories;
    return getUnifiedSubcategoriesForCategory(formData.category);
  }, [formData.category, unifiedSubcategories, getUnifiedSubcategoriesForCategory]);

  // Verificar se já existe configuração para a combinação categoria/subcategoria
  const existingConfig = useMemo(() => {
    if (!formData.category || !formData.subcategory) return null;
    return configs.find(config => 
      config.category === formData.category && 
      config.subcategory === formData.subcategory &&
      config.id !== editingConfig
    );
  }, [formData.category, formData.subcategory, configs, editingConfig]);

  // Estatísticas de completude
  const stats = useMemo(() => {
    const counts = { complete: 0, good: 0, regular: 0, critical: 0 };
    configs.forEach(config => {
      const completeness = calculateConfigCompleteness(config);
      if (completeness.percentage >= 90) counts.complete++;
      else if (completeness.percentage >= 70) counts.good++;
      else if (completeness.percentage >= 50) counts.regular++;
      else counts.critical++;
    });
    return counts;
  }, [configs]);

  // Group configurations by category
  const groupConfigsByCategory = () => {
    const grouped: { [key: string]: any[] } = {};
    
    configs.forEach(config => {
      const category = config.category || 'Sem categoria';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(config);
    });

    // Sort categories by config count (descending) and then alphabetically
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sem categoria') return 1;
      if (b === 'Sem categoria') return -1;
      if (grouped[b].length !== grouped[a].length) {
        return grouped[b].length - grouped[a].length;
      }
      return a.localeCompare(b);
    });

    const result: { category: string; configs: any[] }[] = [];
    sortedCategories.forEach(category => {
      result.push({ category, configs: grouped[category] });
    });

    return result;
  };

  const toggleCategoryOpen = (category: string) => {
    setOpenCategory(prev => (prev === category ? null : category));
  };

  const toggleCategorySelection = (category: string) => {
    const categoryConfigs = configs.filter(c => (c.category || 'Sem categoria') === category);
    const categoryConfigIds = categoryConfigs.map(c => c.id);
    const selectedInCategory = categoryConfigIds.filter(id => selectedConfigIds.has(id));
    
    setSelectedConfigIds(prev => {
      const newSet = new Set(prev);
      
      if (selectedInCategory.length === categoryConfigIds.length) {
        // All selected, unselect all
        categoryConfigIds.forEach(id => newSet.delete(id));
      } else {
        // Some or none selected, select all
        categoryConfigIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  };

  const toggleConfigSelection = (configId: string) => {
    setSelectedConfigIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(configId)) {
        newSet.delete(configId);
      } else {
        newSet.add(configId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setFormData({
      category: '',
      subcategory: '',
      target_audience: [],
      keywords: [],
      market_keywords: [],
      search_intent_keywords: []
    });
    setEditingConfig(null);
  };

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category,
      subcategory: '' // Reset subcategoria quando categoria muda
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== DEBUG CategoryManager handleSubmit ===');
    console.log('formData antes do submit:', JSON.stringify(formData, null, 2));
    console.log('target_audience length:', formData.target_audience.length);
    console.log('keywords length:', formData.keywords.length);
    console.log('market_keywords length:', formData.market_keywords.length);
    console.log('search_intent_keywords length:', formData.search_intent_keywords.length);
    
    try {
      if (editingConfig) {
        console.log('Editando config:', editingConfig);
        await updateConfig(editingConfig, formData);
      } else {
        console.log('Criando nova config');
        await createConfig(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  const handleEdit = (config: any) => {
    setFormData({
      category: config.category,
      subcategory: config.subcategory,
      target_audience: config.target_audience || [],
      keywords: config.keywords || [],
      market_keywords: config.market_keywords || [],
      search_intent_keywords: config.search_intent_keywords || []
    });
    setEditingConfig(config.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteConfig(id);
  };

  const handleRename = async () => {
    if (!renameData.newName.trim() || renameData.newName === renameData.oldName) {
      toast({
        title: "Erro",
        description: "Digite um novo nome válido e diferente do atual.",
        variant: "destructive"
      });
      return;
    }

    setIsRenaming(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('rename-category', {
        body: renameData
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message,
      });

      // Notify global category change for automatic synchronization
      await notifyCategoryChange('rename', {
        type: renameData.type,
        oldName: renameData.oldName,
        newName: renameData.newName,
        category: renameData.category
      });
      
      setIsRenameDialogOpen(false);
      setRenameData({ type: 'category', oldName: '', newName: '', category: '' });
      
    } catch (error) {
      console.error('Error renaming:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao renomear. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const openRenameDialog = (type: 'category' | 'subcategory', oldName: string, category?: string) => {
    setRenameData({
      type,
      oldName,
      newName: oldName,
      category: category || ''
    });
    setIsRenameDialogOpen(true);
  };

  // Função para calcular completude da configuração
  function calculateConfigCompleteness(config: any) {
    const fields = [
      { name: 'target_audience', data: config.target_audience, icon: Target },
      { name: 'keywords', data: config.keywords, icon: Hash },
      { name: 'market_keywords', data: config.market_keywords, icon: TrendingUp },
      { name: 'search_intent_keywords', data: config.search_intent_keywords, icon: Search }
    ];
    
    const filledFields = fields.filter(field => field.data && field.data.length > 0);
    const completeness = Math.round((filledFields.length / fields.length) * 100);
    
    return {
      percentage: completeness,
      filledCount: filledFields.length,
      totalCount: fields.length,
      fields: fields.map(field => ({
        ...field,
        filled: field.data && field.data.length > 0,
        count: field.data ? field.data.length : 0
      }))
    };
  }

  // Função para obter cor baseada na completude
  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 90) return 'default';
    if (percentage >= 70) return 'secondary';
    if (percentage >= 50) return 'outline';
    return 'destructive';
  };

  // Função para obter label baseado na completude
  const getCompletenessLabel = (percentage: number) => {
    if (percentage >= 90) return 'Completo';
    if (percentage >= 70) return 'Bom';
    if (percentage >= 50) return 'Regular';
    return 'Crítico';
  };


  const categoryGroups = groupConfigsByCategory();

  return (
    <Card className="border-border/20 shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Gerenciar Categorias
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Configuração
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Editar' : 'Criar'} Configuração de Categoria
                </DialogTitle>
                <DialogDescription>
                  Configure os campos padrões que serão preenchidos automaticamente nos produtos
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Categoria</Label>
                      {formData.category && unifiedCategories.includes(formData.category) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openRenameDialog('category', formData.category)}
                          className="h-6 text-xs"
                        >
                          <FileEdit className="h-3 w-3 mr-1" />
                          Renomear
                        </Button>
                      )}
                    </div>
                    <Combobox
                      value={formData.category}
                      onValueChange={handleCategoryChange}
                      options={unifiedCategories}
                      placeholder="Selecione ou digite nova categoria"
                      searchPlaceholder="Buscar categoria..."
                      emptyText="Nenhuma categoria encontrada."
                      createText="Criar categoria"
                    />
                    <div className="text-xs text-muted-foreground">
                      {unifiedCategories.length} categorias existentes no repositório
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Subcategoria</Label>
                      {formData.subcategory && formData.category && availableSubcategories.includes(formData.subcategory) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openRenameDialog('subcategory', formData.subcategory, formData.category)}
                          className="h-6 text-xs"
                        >
                          <FileEdit className="h-3 w-3 mr-1" />
                          Renomear
                        </Button>
                      )}
                    </div>
                    <Combobox
                      value={formData.subcategory}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory: value }))}
                      options={availableSubcategories}
                      placeholder="Selecione ou digite nova subcategoria"
                      searchPlaceholder="Buscar subcategoria..."
                      emptyText={formData.category ? "Nenhuma subcategoria para esta categoria." : "Selecione uma categoria primeiro."}
                      createText="Criar subcategoria"
                    />
                    <div className="text-xs text-muted-foreground">
                      {formData.category 
                        ? `${availableSubcategories.length} subcategorias para "${formData.category}"`
                        : "Selecione uma categoria para ver subcategorias"
                      }
                    </div>
                  </div>
                </div>

                {existingConfig && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Configuração já existe
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        Já existe uma configuração para "{formData.category} → {formData.subcategory}". 
                        Criar uma nova configuração irá sobrescrever a existente.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Público-Alvo</Label>
                  <TagInput
                    value={formData.target_audience}
                    onChange={(value) => {
                      console.log('DEBUG TagInput target_audience onChange:', value);
                      setFormData(prev => ({ ...prev, target_audience: value }));
                    }}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <TagInput
                    value={formData.keywords}
                    onChange={(value) => {
                      console.log('DEBUG TagInput keywords onChange:', value);
                      setFormData(prev => ({ ...prev, keywords: value }));
                    }}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords de Mercado</Label>
                  <TagInput
                    value={formData.market_keywords}
                    onChange={(value) => {
                      console.log('DEBUG TagInput market_keywords onChange:', value);
                      setFormData(prev => ({ ...prev, market_keywords: value }));
                    }}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords de Intenção de Busca</Label>
                  <TagInput
                    value={formData.search_intent_keywords}
                    onChange={(value) => {
                      console.log('DEBUG TagInput search_intent_keywords onChange:', value);
                      setFormData(prev => ({ ...prev, search_intent_keywords: value }));
                    }}
                    placeholder="Digite e pressione Enter para adicionar"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingConfig ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Rename Dialog */}
          <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Renomear {renameData.type === 'category' ? 'Categoria' : 'Subcategoria'}
                </DialogTitle>
                <DialogDescription>
                  {renameData.type === 'category' 
                    ? 'Esta ação irá renomear a categoria em todos os produtos e configurações.'
                    : `Esta ação irá renomear a subcategoria em todos os produtos da categoria "${renameData.category}".`
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome atual</Label>
                  <Input value={renameData.oldName} disabled className="bg-muted" />
                </div>
                
                <div className="space-y-2">
                  <Label>Novo nome</Label>
                  <Input
                    value={renameData.newName}
                    onChange={(e) => setRenameData(prev => ({ ...prev, newName: e.target.value }))}
                    placeholder="Digite o novo nome"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsRenameDialogOpen(false)}
                  disabled={isRenaming}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRename}
                  disabled={isRenaming || !renameData.newName.trim() || renameData.newName === renameData.oldName}
                >
                  {isRenaming ? 'Renomeando...' : 'Renomear'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumo das estatísticas */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
              <div className="text-xs text-muted-foreground">Completo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.good}</div>
              <div className="text-xs text-muted-foreground">Bom</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.regular}</div>
              <div className="text-xs text-muted-foreground">Regular</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-xs text-muted-foreground">Crítico</div>
            </div>
          </div>
        </div>

        {/* Lista de configurações agrupadas por categoria */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Carregando configurações...</div>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Nenhuma configuração encontrada</div>
            </div>
          ) : (
            categoryGroups.map(({ category, configs: categoryConfigs }) => {
              const categoryConfigIds = categoryConfigs.map(c => c.id);
              const selectedInCategory = categoryConfigIds.filter(id => selectedConfigIds.has(id));
              const isIndeterminate = selectedInCategory.length > 0 && selectedInCategory.length < categoryConfigIds.length;
              const isAllSelected = selectedInCategory.length === categoryConfigIds.length;
              const isOpen = openCategory === category;
              
              // Calculate category average completeness
              const avgCompleteness = Math.round(
                categoryConfigs.reduce((sum, config) => {
                  return sum + calculateConfigCompleteness(config).percentage;
                }, 0) / categoryConfigs.length
              );

              return (
                <Card key={category} className="overflow-hidden border-border/20 shadow-soft">
                  <Collapsible open={isOpen} onOpenChange={(open) => setOpenCategory(open ? category : null)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isAllSelected}
                                ref={(el) => {
                                  if (el && 'indeterminate' in el) {
                                    (el as any).indeterminate = isIndeterminate;
                                  }
                                }}
                                onCheckedChange={() => toggleCategorySelection(category)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Folder className="h-5 w-5 text-muted-foreground" />
                              <h3 className="font-semibold text-lg">
                                {category}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {categoryConfigs.length} config{categoryConfigs.length !== 1 ? 's' : ''}
                            </Badge>
                            {selectedInCategory.length > 0 && (
                              <Badge variant="default" className="text-xs">
                                {selectedInCategory.length} selecionada{selectedInCategory.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            <Badge variant={getCompletenessColor(avgCompleteness)} className="text-xs">
                              {getCompletenessLabel(avgCompleteness)} ({avgCompleteness}%)
                            </Badge>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </CollapsibleTrigger>
                    
                     <CollapsibleContent className="border-t border-border/20">
                       <div className="p-4 space-y-4">
                         {categoryConfigs.map((config) => {
                            const completeness = calculateConfigCompleteness(config);
                            const isSelected = selectedConfigIds.has(config.id);
                            
                            return (
                              <ConfigCard
                                key={config.id}
                                config={{
                                  id: config.id,
                                  categoria: config.category,
                                  subcategoria: config.subcategory,
                                  publico_alvo: config.target_audience?.join(', ') || '',
                                  palavras_chave: [...(config.keywords || []), ...(config.market_keywords || []), ...(config.search_intent_keywords || [])]
                                }}
                                isSelected={isSelected}
                                completenessPercentage={completeness.percentage}
                                onToggleSelection={toggleConfigSelection}
                                onEdit={(configData) => handleEdit({
                                  id: configData.id,
                                  category: configData.categoria,
                                  subcategory: configData.subcategoria,
                                  target_audience: configData.publico_alvo.split(', ').filter(Boolean),
                                  keywords: config.keywords || [],
                                  market_keywords: config.market_keywords || [],
                                  search_intent_keywords: config.search_intent_keywords || []
                                })}
                                onDelete={handleDelete}
                              />
                            );
                         })}
                       </div>
                     </CollapsibleContent>
                   </Collapsible>
                 </Card>
               );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryManager;