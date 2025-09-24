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
import { Plus, Edit, Trash2, Save, X, Info, FileEdit, Users, Target, Hash, TrendingUp, Search, Calendar, CheckCircle, AlertTriangle, XCircle, Folder, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const calculateConfigCompleteness = (config: any) => {
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
  };

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

  if (loading) {
    return <div className="p-6">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Categorias</h2>
          <p className="text-muted-foreground">
            Configure campos padrões para categorias e subcategorias
          </p>
        </div>
        
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
              
              <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
                <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Esta operação pode afetar múltiplos produtos no repositório.
                </div>
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

      {/* Estatísticas gerais */}
      {configs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Completas</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {configs.filter(c => calculateConfigCompleteness(c).percentage >= 90).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Boas</p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                    {configs.filter(c => {
                      const p = calculateConfigCompleteness(c).percentage;
                      return p >= 70 && p < 90;
                    }).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Regulares</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                    {configs.filter(c => {
                      const p = calculateConfigCompleteness(c).percentage;
                      return p >= 50 && p < 70;
                    }).length}
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">Críticas</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                    {configs.filter(c => calculateConfigCompleteness(c).percentage < 50).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {configs.length === 0 ? (
          <Card className="bg-gradient-to-br from-muted/30 to-muted/10">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 rounded-full bg-muted">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Nenhuma configuração de categoria encontrada
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Crie uma nova configuração para definir campos padrões que serão preenchidos automaticamente nos produtos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => {
            const completeness = calculateConfigCompleteness(config);
            const completenessColor = getCompletenessColor(completeness.percentage);
            const completenessLabel = getCompletenessLabel(completeness.percentage);
            
            return (
              <Card 
                key={config.id} 
                className={cn(
                  "group relative transition-all duration-200 hover:shadow-md p-4",
                  completeness.percentage < 50 && "border-destructive/20",
                  completeness.percentage >= 90 && "border-success/20"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Ícone da categoria */}
                  <div className="w-12 h-12 rounded-md bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                    <Folder className="h-6 w-6 text-muted-foreground/50" />
                  </div>

                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm leading-tight truncate">
                      {config.category}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {config.subcategory}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      Criada em {new Date(config.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    
                    <div className="mt-2 space-y-1">
                      {/* Status badges compactos */}
                      <div className="flex flex-wrap gap-1">
                        <Badge 
                          variant={completenessColor as any}
                          className="text-xs px-1.5 py-0.5 h-5"
                        >
                          {completenessLabel} • {completeness.percentage}%
                        </Badge>
                        
                        {/* Indicadores de campos preenchidos */}
                        {completeness.fields.map((field) => {
                          if (!field.filled) return null;
                          return (
                            <Badge 
                              key={field.name}
                              variant="secondary" 
                              className="text-xs px-1.5 py-0.5 h-5"
                            >
                              {field.name === 'target_audience' && (
                                <>
                                  <User className="h-3 w-3 mr-1" />
                                  {field.count}
                                </>
                              )}
                              {field.name === 'keywords' && (
                                <>
                                  <Hash className="h-3 w-3 mr-1" />
                                  {field.count}
                                </>
                              )}
                              {field.name === 'market_keywords' && (
                                <>
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {field.count}
                                </>
                              )}
                              {field.name === 'search_intent_keywords' && (
                                <>
                                  <Search className="h-3 w-3 mr-1" />
                                  {field.count}
                                </>
                              )}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Score compacto */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-1">
                      {completeness.percentage >= 90 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : completeness.percentage >= 50 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-bold text-sm">{completeness.percentage}%</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a configuração para "{config.category} → {config.subcategory}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(config.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CategoryManager;